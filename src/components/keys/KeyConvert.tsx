import React, {useMemo} from 'react';
import {Box, Text} from 'ink';
import {
  derivePublicKey,
  hexToNpub,
  hexToNsec,
  npubToHex,
  nsecToHex,
  validateHexKey,
  validateNostrKey
} from '@frostr/igloo-core';

type KeyConvertProps = {
  flags: Record<string, string | boolean>;
  args: string[];
};

type InputType = 'npub' | 'nsec' | 'hex-public' | 'hex-private';

type Candidate = {
  type: InputType;
  rawValue: string;
  sources: string[];
};

type DetectionResult = {
  type?: InputType;
  rawValue?: string;
  error?: string;
};

type ConversionRow = {
  label: string;
  value: string;
};

type ConversionResult = {
  inputLabel: string;
  inputValue: string;
  note?: string;
  rows: ConversionRow[];
};

const TYPE_ALIASES: Record<string, InputType> = {
  npub: 'npub',
  nsec: 'nsec',
  'hex-public': 'hex-public',
  'public-hex': 'hex-public',
  public: 'hex-public',
  pub: 'hex-public',
  'hex-private': 'hex-private',
  'private-hex': 'hex-private',
  private: 'hex-private',
  secret: 'hex-private',
  priv: 'hex-private',
  'secret-hex': 'hex-private'
};

function normalizeInputType(value?: string): InputType | undefined {
  if (!value) {
    return undefined;
  }
  const lookup = TYPE_ALIASES[value.trim().toLowerCase()];
  return lookup;
}

function stripHexPrefix(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    return trimmed.slice(2);
  }
  return trimmed;
}

function getStringFlag(flags: Record<string, string | boolean>, key: string) {
  const value = flags[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function getFlagValue(flags: Record<string, string | boolean>, keys: string[]) {
  for (const key of keys) {
    const value = getStringFlag(flags, key);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function inferInputType(value: string): InputType | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('npub1')) {
    return 'npub';
  }
  if (lower.startsWith('nsec1')) {
    return 'nsec';
  }
  return undefined;
}

function isRawHexKey(value: string): boolean {
  const hex = stripHexPrefix(value.trim());
  return /^[0-9a-fA-F]{64}$/.test(hex);
}

function formatTypeLabel(type: InputType) {
  switch (type) {
    case 'npub':
      return 'npub';
    case 'nsec':
      return 'nsec';
    case 'hex-public':
      return 'public hex';
    case 'hex-private':
      return 'private hex';
    default:
      return type;
  }
}

function detectInput(
  flags: Record<string, string | boolean>,
  args: string[]
): DetectionResult {
  const candidates = new Map<InputType, Candidate>();
  let conflict: string | null = null;

  function addCandidate(type: InputType, rawValue: string, source: string) {
    const value = rawValue.trim();
    if (value.length === 0) {
      return;
    }
    const existing = candidates.get(type);
    if (existing) {
      if (existing.rawValue !== value) {
        conflict = `Conflicting ${formatTypeLabel(type)} inputs from ${existing.sources.join(', ')} and ${source}.`;
        return;
      }
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
      }
      return;
    }
    candidates.set(type, {type, rawValue: value, sources: [source]});
  }

  const fromFlag = normalizeInputType(getStringFlag(flags, 'from'));
  if (fromFlag) {
    const valueFlag = getStringFlag(flags, 'value');
    if (!valueFlag) {
      return {error: 'Provide --value when using --from.'};
    }
    addCandidate(fromFlag, valueFlag, '--from/--value');
  }

  const valueOnly = !fromFlag ? getStringFlag(flags, 'value') : undefined;
  if (valueOnly) {
    const inferred = inferInputType(valueOnly);
    if (!inferred) {
      const suffix = isRawHexKey(valueOnly)
        ? ' Detected a 64-character hex value. Specify --from hex-public|hex-private (or use --hex with --kind public|private).'
        : '';
      return {
        error:
          'Could not infer key type from --value. Add --from npub|nsec|hex-public|hex-private.' +
          suffix
      };
    }
    addCandidate(inferred, valueOnly, '--value');
  }

  const nsecFlag = getFlagValue(flags, ['nsec']);
  if (nsecFlag) {
    addCandidate('nsec', nsecFlag, '--nsec');
  }

  const npubFlag = getFlagValue(flags, ['npub']);
  if (npubFlag) {
    addCandidate('npub', npubFlag, '--npub');
  }

  const hexPrivateFlag = getFlagValue(flags, [
    'hex-private',
    'private-hex',
    'hexPrivate',
    'privateHex'
  ]);
  if (hexPrivateFlag) {
    addCandidate('hex-private', hexPrivateFlag, '--hex-private');
  }

  const hexPublicFlag = getFlagValue(flags, [
    'hex-public',
    'public-hex',
    'hexPublic',
    'publicHex'
  ]);
  if (hexPublicFlag) {
    addCandidate('hex-public', hexPublicFlag, '--hex-public');
  }

  const hexValue = getStringFlag(flags, 'hex');
  const kindFlag = normalizeInputType(getStringFlag(flags, 'kind'));
  if (hexValue) {
    if (!kindFlag || (kindFlag !== 'hex-private' && kindFlag !== 'hex-public')) {
      return {error: 'Use --kind public|private alongside --hex.'};
    }
    addCandidate(kindFlag, hexValue, '--hex/--kind');
  } else if (kindFlag) {
    return {error: 'Provide --hex when specifying --kind.'};
  }

  if (args.length > 0) {
    const positionalType = normalizeInputType(args[0]);
    if (positionalType) {
      const positionalValue = args[1];
      if (!positionalValue) {
        return {error: `Provide a value after positional type "${args[0]}".`};
      }
      addCandidate(positionalType, positionalValue, 'positional');
      if (args.length > 2) {
        return {error: 'Too many positional arguments for key conversion.'};
      }
    } else {
      const inferred = inferInputType(args[0]);
      if (!inferred) {
        const suffix = isRawHexKey(args[0])
          ? ' Detected a 64-character hex value. Specify --from hex-public|hex-private (or use --hex with --kind public|private).'
          : '';
        return {
          error:
            `Could not infer key type from "${args[0]}". Use --from npub|nsec|hex-public|hex-private.` +
            suffix
        };
      }
      addCandidate(inferred, args[0], 'positional');
      if (args.length > 1) {
        return {error: 'Too many positional arguments for key conversion.'};
      }
    }
  }

  if (conflict) {
    return {error: conflict};
  }

  const collected = Array.from(candidates.values());

  if (collected.length === 0) {
    return {
      error:
        'Provide a key via --npub, --nsec, --hex-public, --hex-private, or --from/--value.'
    };
  }

  if (collected.length > 1) {
    const details = collected
      .map(candidate => `${candidate.sources.join(', ')} (${formatTypeLabel(candidate.type)})`)
      .join('; ');
    return {
      error: `Multiple key inputs detected: ${details}. Provide exactly one key per invocation.`
    };
  }

  const [candidate] = collected;
  return {type: candidate.type, rawValue: candidate.rawValue};
}

function performConversion(type: InputType, rawValue: string): ConversionResult {
  switch (type) {
    case 'npub': {
      validateNostrKey(rawValue, 'npub');
      const hexPublic = npubToHex(rawValue);
      return {
        inputLabel: 'npub',
        inputValue: rawValue,
        rows: [{label: 'Public hex', value: hexPublic}]
      };
    }
    case 'nsec': {
      validateNostrKey(rawValue, 'nsec');
      const hexPrivate = nsecToHex(rawValue);
      const {npub, hexPublicKey} = derivePublicKey(rawValue);
      return {
        inputLabel: 'nsec',
        inputValue: rawValue,
        rows: [
          {label: 'Private hex', value: hexPrivate},
          {label: 'Public hex', value: hexPublicKey},
          {label: 'npub', value: npub}
        ]
      };
    }
    case 'hex-public': {
      const normalized = stripHexPrefix(rawValue);
      validateHexKey(normalized, 'public');
      const npub = hexToNpub(normalized);
      return {
        inputLabel: 'public hex',
        inputValue: normalized,
        note: normalized !== rawValue ? 'Removed 0x prefix before processing.' : undefined,
        rows: [{label: 'npub', value: npub}]
      };
    }
    case 'hex-private': {
      const normalized = stripHexPrefix(rawValue);
      validateHexKey(normalized, 'private');
      const nsec = hexToNsec(normalized);
      const {npub, hexPublicKey} = derivePublicKey(normalized);
      return {
        inputLabel: 'private hex',
        inputValue: normalized,
        note: normalized !== rawValue ? 'Removed 0x prefix before processing.' : undefined,
        rows: [
          {label: 'nsec', value: nsec},
          {label: 'Public hex', value: hexPublicKey},
          {label: 'npub', value: npub}
        ]
      };
    }
    default:
      return {
        inputLabel: type,
        inputValue: rawValue,
        rows: []
      };
  }
}

function renderError(message: string) {
  return (
    <Box flexDirection="column">
      <Text color="red">{message}</Text>
      <Text color="gray">Usage: igloo-cli keys convert --from nsec|npub|hex-public|hex-private --value &lt;key&gt;</Text>
    </Box>
  );
}

export function KeyConvert({flags, args}: KeyConvertProps) {
  const detection = useMemo(() => detectInput(flags, args), [flags, args]);

  if (detection.error) {
    return renderError(detection.error);
  }

  if (!detection.type || !detection.rawValue) {
    return renderError('No key input detected.');
  }

  try {
    const conversion = performConversion(detection.type, detection.rawValue);
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Key conversion</Text>
        <Text>
          <Text color="green">Input ({conversion.inputLabel}):</Text> {conversion.inputValue}
        </Text>
        {conversion.note ? <Text color="gray">{conversion.note}</Text> : null}
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Outputs</Text>
          {conversion.rows.map(row => (
            <Text key={row.label}>
              - {row.label}: {row.value}
            </Text>
          ))}
        </Box>
      </Box>
    );
  } catch (error: any) {
    const message = error?.message ?? 'Failed to convert key.';
    return renderError(message);
  }
}
