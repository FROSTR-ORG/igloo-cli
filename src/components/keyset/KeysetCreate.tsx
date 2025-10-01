import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text} from 'ink';
import path from 'node:path';
import fs from 'node:fs/promises';
import {nip19} from 'nostr-tools';
import {ed25519} from '@noble/curves/ed25519.js';
import {randomBytes} from 'node:crypto';
import {generateKeysetWithSecret} from '@frostr/igloo-core';
import {
  readShareFiles,
  slugifyKeysetName,
  keysetNameExists,
  KeyMaterial,
  GeneratedKeyset,
  ShareMetadata
} from '../../keyset/index.js';
import {Prompt} from '../ui/Prompt.js';
import {ShareSaver} from './ShareSaver.js';

type KeysetCreateProps = {
  flags: Record<string, string | boolean>;
};

type StepId = 'name' | 'total' | 'threshold' | 'nsec';

type ValidationState = Record<StepId, boolean>;

type LoadState<T> = {
  loading: boolean;
  error: string | null;
  data: T;
};

function parseNumberFlag(value: string | boolean | undefined, fallback: number): number {
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function generateKeyMaterial(): KeyMaterial {
  const secretBuffer = randomBytes(32);
  const secretBytes = Uint8Array.from(secretBuffer);
  const secretHex = Buffer.from(secretBytes).toString('hex');
  const publicKey = ed25519.getPublicKey(secretBytes);
  const publicKeyHex = Buffer.from(publicKey).toString('hex');
  const npub = nip19.npubEncode(publicKeyHex);
  const nsec = nip19.nsecEncode(secretBytes);
  return {
    secretHex,
    npub,
    nsec
  };
}

function decodeSecret(input: string): KeyMaterial | string {
  const trimmed = input.trim();

  if (trimmed.toLowerCase() === 'generate') {
    return generateKeyMaterial();
  }

  if (trimmed.startsWith('nsec')) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type !== 'nsec') {
        return 'Provided value is not an nsec secret key.';
      }
      const secretBytes = Uint8Array.from(decoded.data as Uint8Array);
      const secretHex = Buffer.from(secretBytes).toString('hex');
      if (secretHex.length !== 64) {
        return 'Secret key must be 32 bytes.';
      }
      const publicKey = ed25519.getPublicKey(secretBytes);
      const publicKeyHex = Buffer.from(publicKey).toString('hex');
      const npub = nip19.npubEncode(publicKeyHex);
      return {
        secretHex,
        nsec: trimmed,
        npub
      } satisfies KeyMaterial;
    } catch (error: any) {
      return `Failed to decode nsec: ${error.message ?? error}`;
    }
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const secretHex = trimmed.toLowerCase();
    const secretBytes = Uint8Array.from(Buffer.from(secretHex, 'hex'));
    const publicKey = ed25519.getPublicKey(secretBytes);
    const publicKeyHex = Buffer.from(publicKey).toString('hex');
    const npub = nip19.npubEncode(publicKeyHex);
    const nsec = nip19.nsecEncode(secretBytes);
    return {
      secretHex,
      nsec,
      npub
    } satisfies KeyMaterial;
  }

  return 'Enter an nsec (bech32) secret key or 64-character hex string, or type "generate".';
}

export function KeysetCreate({flags}: KeysetCreateProps) {
  const [sharesState, setSharesState] = useState<LoadState<ShareMetadata[]>>({
    loading: true,
    error: null,
    data: []
  });
  const [form, setForm] = useState({
    name: typeof flags.name === 'string' ? flags.name : '',
    threshold: parseNumberFlag(flags.threshold, 2),
    total: parseNumberFlag(flags.total, 3)
  });
  const [validated, setValidated] = useState<ValidationState>({
    name: false,
    threshold: false,
    total: false,
    nsec: false
  });
  const [keyMaterial, setKeyMaterial] = useState<KeyMaterial | null>(null);
  const [keyset, setKeyset] = useState<GeneratedKeyset | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'pending' | 'error' | 'ready'>('idle');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const directPassword = typeof flags.password === 'string' ? flags.password : undefined;
  const passwordFilePath = typeof flags['password-file'] === 'string' ? flags['password-file'] : undefined;
  const outputDirFlag = typeof flags.output === 'string' ? flags.output : undefined;
  const resolvedOutputDir = outputDirFlag ? path.resolve(process.cwd(), outputDirFlag) : undefined;
  const [automationPassword, setAutomationPassword] = useState<string | undefined>(directPassword);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [automationLoading, setAutomationLoading] = useState<boolean>(Boolean(passwordFilePath && !directPassword));
  const automationRequested = Boolean(directPassword || passwordFilePath || outputDirFlag);

  useEffect(() => {
    void (async () => {
      try {
        const data = await readShareFiles();
        setSharesState({loading: false, error: null, data});
      } catch (error: any) {
        setSharesState({
          loading: false,
          error: error?.message ?? 'Unable to load saved shares',
          data: []
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (directPassword) {
      setAutomationPassword(directPassword);
      setAutomationLoading(false);
      return;
    }

    if (!passwordFilePath) {
      setAutomationLoading(false);
      return;
    }

    setAutomationLoading(true);
    setAutomationError(null);

    void (async () => {
      try {
        const raw = await fs.readFile(passwordFilePath, 'utf8');
        const firstLine = raw.split(/\r?\n/)[0] ?? '';
        const trimmed = firstLine.trim();
        setAutomationPassword(trimmed.length > 0 ? trimmed : undefined);
        setAutomationLoading(false);
      } catch (error: any) {
        setAutomationError(`Unable to read password file: ${error?.message ?? error}`);
        setAutomationLoading(false);
      }
    })();
  }, [directPassword, passwordFilePath]);

  const existingSlugs = useMemo(() => {
    return new Set(
      sharesState.data.map(record => {
        if (record.keysetName) {
          return slugifyKeysetName(record.keysetName);
        }

        const match = record.name.match(/(.+) share \d+$/i);
        const base = match ? match[1] : record.name;
        return slugifyKeysetName(base);
      })
    );
  }, [sharesState.data]);

  const thresholdFlagProvided =
    typeof flags.threshold === 'string' || (typeof flags.threshold === 'boolean' && flags.threshold);
  const totalFlagProvided =
    typeof flags.total === 'string' || (typeof flags.total === 'boolean' && flags.total);

  useEffect(() => {
    if (sharesState.loading || prefilled) {
      return;
    }

    const nextValidated: ValidationState = {...validated};
    let changed = false;

    if (!nextValidated.name && form.name.trim().length > 0) {
      const slug = slugifyKeysetName(form.name);
      if (!existingSlugs.has(slug)) {
        nextValidated.name = true;
        changed = true;
      }
    }

    const shouldPrefillTotal = automationRequested || totalFlagProvided;
    if (!nextValidated.total && shouldPrefillTotal && form.total >= form.threshold) {
      nextValidated.total = true;
      changed = true;
    }

    const shouldPrefillThreshold = automationRequested || thresholdFlagProvided;
    if (!nextValidated.threshold && shouldPrefillThreshold && form.threshold > 0) {
      nextValidated.threshold = true;
      changed = true;
    }

    const nsecFlag = typeof flags.nsec === 'string' ? flags.nsec : undefined;
    if (!nextValidated.nsec && nsecFlag) {
      const decoded = decodeSecret(nsecFlag);
      if (typeof decoded !== 'string') {
        setKeyMaterial(decoded);
        nextValidated.nsec = true;
        changed = true;
      }
    }

    if (changed) {
      setValidated(nextValidated);
    }

    setPrefilled(true);
  }, [
    sharesState.loading,
    prefilled,
    form.name,
    form.threshold,
    form.total,
    existingSlugs,
    flags.nsec,
    validated,
    automationRequested,
    thresholdFlagProvided,
    totalFlagProvided
  ]);

  useEffect(() => {
    if (generationStatus !== 'idle' || keyset !== null) {
      return;
    }

    if (!validated.name || !validated.threshold || !validated.total || !validated.nsec) {
      return;
    }

    if (!keyMaterial) {
      return;
    }

    setGenerationStatus('pending');
    setGenerationError(null);

    try {
      const generated = generateKeysetWithSecret(form.threshold, form.total, keyMaterial.secretHex);
      setKeyset(generated);
      setGenerationStatus('ready');
    } catch (error: any) {
      setGenerationStatus('error');
      setGenerationError(error?.message ?? 'Failed to generate keyset');
    }
  }, [validated, keyMaterial, form.threshold, form.total, generationStatus, keyset]);

  if (sharesState.loading) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Loading existing shares…</Text>
      </Box>
    );
  }

  if (sharesState.error) {
    return (
      <Box flexDirection="column">
        <Text color="red">{sharesState.error}</Text>
      </Box>
    );
  }

  if (automationError) {
    return (
      <Box flexDirection="column">
        <Text color="red">{automationError}</Text>
      </Box>
    );
  }

  if (automationRequested && !prefilled) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Preparing automation inputs…</Text>
      </Box>
    );
  }

  const currentStep = (() => {
    if (!validated.name) {
      return 'name' as const;
    }
    if (!validated.total) {
      return 'total' as const;
    }
    if (!validated.threshold) {
      return 'threshold' as const;
    }
    if (!validated.nsec) {
      return 'nsec' as const;
    }
    return undefined;
  })();

  if (currentStep === 'name') {
    return (
      <Prompt
        key="keyset-name"
        label="Keyset name"
        initialValue={form.name}
        hint="Choose a unique name."
        onSubmit={async value => {
          const trimmed = value.trim();
          if (trimmed.length === 0) {
            return 'Keyset name cannot be empty.';
          }

          if (await keysetNameExists(trimmed) || existingSlugs.has(slugifyKeysetName(trimmed))) {
            return 'A keyset with this name already exists in your share directory.';
          }

          setForm(current => ({...current, name: trimmed}));
          setValidated(current => ({...current, name: true}));
          return undefined;
        }}
      />
    );
  }

  if (currentStep === 'total') {
    return (
      <Prompt
        key="total"
        label="Total number of shares"
        initialValue={String(form.total)}
        hint="Must be an integer between 1 and 16."
        onSubmit={value => {
          const numeric = Number(value.trim());
          if (!Number.isInteger(numeric) || numeric < 1) {
            return 'Total shares must be an integer greater than 0.';
          }
          if (numeric > 16) {
            return 'Total shares is capped at 16 for now.';
          }

          const wasThresholdValidated = validated.threshold;
          if (wasThresholdValidated && numeric < form.threshold) {
            return 'Total shares cannot be smaller than the threshold.';
          }
          const shouldClampThreshold = !wasThresholdValidated && form.threshold > numeric;

          setForm(current => {
            const nextThreshold = shouldClampThreshold ? Math.min(current.threshold, numeric) : current.threshold;
            return {...current, total: numeric, threshold: nextThreshold};
          });

          setValidated(current => ({
            ...current,
            total: true,
            threshold: wasThresholdValidated ? current.threshold : false
          }));
          return undefined;
        }}
      />
    );
  }

  if (currentStep === 'threshold') {
    return (
      <Prompt
        key="threshold"
        label="Threshold (number of shares required)"
        initialValue={String(form.threshold)}
        hint="Must be at least 1 and not greater than total shares."
        onSubmit={value => {
          const numeric = Number(value.trim());
          if (!Number.isInteger(numeric) || numeric < 1) {
            return 'Threshold must be an integer greater than 0.';
          }
          if (numeric > form.total) {
            return 'Threshold cannot exceed total number of shares.';
          }
          setForm(current => ({...current, threshold: numeric}));
          setValidated(current => ({...current, threshold: true}));
          return undefined;
        }}
      />
    );
  }

  if (currentStep === 'nsec') {
    return (
      <Prompt
        key="nsec"
        label="Secret key"
        hint="Paste an nsec, 64-char hex key, or type 'generate' to create a fresh one."
        onSubmit={value => {
          const decoded = decodeSecret(value);
          if (typeof decoded === 'string') {
            return decoded;
          }
          setKeyMaterial(decoded);
          setValidated(current => ({...current, nsec: true}));
          return undefined;
        }}
      />
    );
  }

  if (generationStatus === 'pending') {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Generating keyset…</Text>
      </Box>
    );
  }

  if (generationStatus === 'error' || generationError) {
    return (
      <Box flexDirection="column">
        <Text color="red">{generationError ?? 'Failed to generate keyset.'}</Text>
      </Box>
    );
  }

  if (!keyset || !keyMaterial) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Preparing key material…</Text>
      </Box>
    );
  }

  if (automationLoading) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Preparing automation inputs…</Text>
      </Box>
    );
  }

  if (automationPassword && automationPassword.length > 0 && automationPassword.length < 8) {
    return (
      <Box flexDirection="column">
        <Text color="red">Automation password must be at least 8 characters.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="cyanBright">Keyset ready</Text>
      <Text>Name: {form.name}</Text>
      <Text>Threshold: {form.threshold}</Text>
      <Text>Total shares: {form.total}</Text>
      <Text>npub: {keyMaterial.npub}</Text>
      <Text>nsec: {keyMaterial.nsec}</Text>
      {resolvedOutputDir ? (
        <Text color="gray">Output directory: {resolvedOutputDir}</Text>
      ) : null}
      <Box marginTop={1} flexDirection="column">
        <ShareSaver
          keysetName={form.name}
          groupCredential={keyset.groupCredential}
          shareCredentials={keyset.shareCredentials}
          onComplete={() => {
            setGenerationStatus('ready');
          }}
          autoPassword={automationPassword}
          outputDir={resolvedOutputDir}
        />
      </Box>
    </Box>
  );
}
