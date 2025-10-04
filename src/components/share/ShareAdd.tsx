import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Box, Text} from 'ink';
import {promises as fs} from 'node:fs';
import {decodeGroup, decodeShare} from '@frostr/igloo-core';
import {is_group_member} from '@frostr/bifrost/lib';
import {
  readShareFiles,
  ShareMetadata,
  deriveSecret,
  encryptPayload,
  randomSaltHex,
  saveShareRecord,
  buildShareId,
  SHARE_FILE_PBKDF2_ITERATIONS,
  SHARE_FILE_PASSWORD_ENCODING,
  SHARE_FILE_SALT_PBKDF2_EXPANDED_BYTES,
  SHARE_FILE_VERSION,
  createDefaultPolicy,
  ShareFileRecord,
  sendShareEcho
} from '../../keyset/index.js';
import {Prompt} from '../ui/Prompt.js';
import {ShareNamespaceFrame, ShareInvocationHint} from './ShareNamespaceFrame.js';

function shorten(value: string, prefix = 6, suffix = 4): string {
  if (value.length <= prefix + suffix + 1) {
    return value;
  }
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}

function normaliseKeysetNameInput(value: string): string {
  return value.trim();
}

type Mode =
  | 'loading'
  | 'group'
  | 'share'
  | 'name'
  | 'password'
  | 'confirm-password'
  | 'saving'
  | 'done'
  | 'cancelled';

type ShareSummary = {
  credential: string;
  index: number;
  pubkey?: string;
};

type GroupSummary = {
  credential: string;
  threshold: number;
  totalMembers: number;
  pubkeys: {idx: number; pubkey: string}[];
  raw: any;
};

type ShareAddProps = {
  flags: Record<string, string | boolean>;
  args: string[];
  invokedVia?: ShareInvocationHint;
};

export function ShareAdd({flags, args: _args, invokedVia}: ShareAddProps) {
  const [mode, setMode] = useState<Mode>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareMetadata[]>([]);
  const [groupSummary, setGroupSummary] = useState<GroupSummary | null>(null);
  const [shareSummary, setShareSummary] = useState<ShareSummary | null>(null);
  const [keysetName, setKeysetName] = useState<string>('');
  const [passwordDraft, setPasswordDraft] = useState<string>('');
  const [automationPassword, setAutomationPassword] = useState<string | undefined>(
    typeof flags.password === 'string' ? flags.password : undefined
  );
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [automationLoading, setAutomationLoading] = useState<boolean>(
    Boolean(flags['password-file'] && !flags.password)
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [echoStatus, setEchoStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [echoError, setEchoError] = useState<string | null>(null);

  const groupFlag = typeof flags.group === 'string' ? flags.group.trim() : undefined;
  const shareFlag = typeof flags.share === 'string' ? flags.share.trim() : undefined;
  const nameFlag = typeof flags.name === 'string' ? flags.name : undefined;
  const outputDir = typeof flags.output === 'string' ? flags.output : undefined;

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const entries = await readShareFiles();
        if (!cancelled) {
          setShares(entries);
          setMode('group');
        }
      } catch (error: any) {
        if (!cancelled) {
          setLoadError(error?.message ?? 'Failed to read saved shares.');
          setMode('group');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const passwordFile = typeof flags['password-file'] === 'string' ? flags['password-file'] : undefined;
    if (!passwordFile || typeof flags.password === 'string') {
      setAutomationLoading(false);
      return;
    }

    let cancelled = false;
    setAutomationLoading(true);
    setAutomationError(null);

    void (async () => {
      try {
        const raw = await fs.readFile(passwordFile, 'utf8');
        const trimmed = raw.trim();
        if (trimmed.length < 8) {
          throw new Error('Password from file must be at least 8 characters.');
        }
        if (!cancelled) {
          setAutomationPassword(trimmed);
        }
      } catch (error: any) {
        if (!cancelled) {
          setAutomationError(error?.message ?? 'Failed to read password file.');
          setAutomationPassword(undefined);
        }
      } finally {
        if (!cancelled) {
          setAutomationLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [flags.password, flags['password-file']]);

  const ShareFrame = useMemo(() => {
    return ({children}: {children: React.ReactNode}) => (
      <ShareNamespaceFrame invokedVia={invokedVia}>{children}</ShareNamespaceFrame>
    );
  }, [invokedVia]);

  function initialiseGroup(value: string): string | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 'Group credential is required.';
    }
  try {
    const group = decodeGroup(trimmed) as any;
    const commits: any[] = Array.isArray(group?.commits) ? group.commits : [];
    const totalMembers = typeof group?.totalMembers === 'number'
      ? group.totalMembers
      : typeof group?.total_members === 'number'
      ? group.total_members
      : commits.length;
    const pubkeys = commits
      .map((commit, idx) => ({
        idx: typeof commit?.idx === 'number' ? commit.idx : idx + 1,
        pubkey: typeof commit?.pubkey === 'string' ? commit.pubkey : 'unknown'
      }))
      .sort((a, b) => a.idx - b.idx);
    const summary: GroupSummary = {
      credential: trimmed,
      threshold: typeof group?.threshold === 'number' ? group.threshold : commits.length,
      totalMembers,
      pubkeys,
      raw: group
    };
    setGroupSummary(summary);
    setFeedback(null);
    setMode('share');
    return undefined;
  } catch (error: any) {
    return error?.message ?? 'Failed to decode group credential. Ensure it starts with bfgroup.';
  }
  }

  function initialiseShare(value: string): string | undefined {
    if (!groupSummary) {
      return 'Provide a group credential before adding a share.';
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 'Share credential is required.';
    }
    try {
      const share = decodeShare(trimmed) as any;
      if (typeof share?.idx !== 'number') {
        return 'Share credential is missing an index.';
      }
      const belongs = (() => {
        try {
          return Boolean(groupSummary.raw) && is_group_member(groupSummary.raw, share ?? {});
        } catch {
          return false;
        }
      })();
      if (!belongs) {
        return 'Share does not belong to the provided group.';
      }
      const commit = groupSummary.pubkeys.find(entry => entry.idx === share.idx);
      setShareSummary({
        credential: trimmed,
        index: share.idx,
        pubkey: commit?.pubkey
      });
      if (!keysetName) {
        if (typeof nameFlag === 'string' && nameFlag.trim().length > 0) {
          setKeysetName(nameFlag.trim());
        } else {
          const existing = shares.find(s => s.groupCredential === groupSummary.credential);
          if (existing) {
            setKeysetName(existing.keysetName ?? existing.name?.replace(/ share \d+$/i, '') ?? 'Imported keyset');
          }
        }
      }
      setFeedback(null);
      setMode('name');
      return undefined;
    } catch (error: any) {
      return error?.message ?? 'Failed to decode share credential. Ensure it starts with bfshare.';
    }
  }

  useEffect(() => {
    if (mode !== 'group' || !groupFlag) {
      return;
    }
    const result = initialiseGroup(groupFlag);
    if (typeof result === 'string') {
      setFeedback(result);
    }
  }, [mode, groupFlag]);

  useEffect(() => {
    if (mode !== 'share' || !shareFlag) {
      return;
    }
    const result = initialiseShare(shareFlag);
    if (typeof result === 'string') {
      setFeedback(result);
    }
  }, [mode, shareFlag]);

  useEffect(() => {
    if (mode !== 'name') {
      return;
    }
    if (!keysetName && typeof nameFlag === 'string' && nameFlag.trim().length > 0) {
      setKeysetName(nameFlag.trim());
    }
  }, [mode, nameFlag, keysetName]);

  const resolvedKeysetName = keysetName || (typeof nameFlag === 'string' ? nameFlag.trim() : '');
  const duplicateRecord = useMemo(() => {
    if (!groupSummary || !shareSummary || resolvedKeysetName.length === 0) {
      return null;
    }
    const candidateId = buildShareId(resolvedKeysetName, shareSummary.index);
    return shares.find(record => record.id === candidateId) ?? null;
  }, [groupSummary, shareSummary, resolvedKeysetName, shares]);

  const groupDetails = groupSummary
    ? {
        threshold: groupSummary.threshold,
        totalMembers: groupSummary.totalMembers,
        pubkeys: groupSummary.pubkeys
      }
    : null;

  const shareDetails = shareSummary
    ? {
        index: shareSummary.index,
        pubkey: shareSummary.pubkey,
        id: resolvedKeysetName ? buildShareId(resolvedKeysetName, shareSummary.index) : null
      }
    : null;

  async function handleSave(password: string) {
    if (!groupSummary || !shareSummary) {
      setFeedback('Missing group or share context.');
      return;
    }
    setMode('saving');
    const now = new Date().toISOString();
    try {
      setEchoStatus('idle');
      setEchoError(null);
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }
      const salt = randomSaltHex();
      const secret = deriveSecret(
        password,
        salt,
        SHARE_FILE_PBKDF2_ITERATIONS,
        SHARE_FILE_PASSWORD_ENCODING,
        SHARE_FILE_SALT_PBKDF2_EXPANDED_BYTES
      );
      const {cipherText} = encryptPayload(secret, shareSummary.credential);
      const name = resolvedKeysetName || 'Imported keyset';
      const id = buildShareId(name, shareSummary.index);
      const record: ShareFileRecord = {
        id,
        name: `${name} share ${shareSummary.index}`,
        share: cipherText,
        salt,
        groupCredential: groupSummary.credential,
        version: SHARE_FILE_VERSION,
        savedAt: now,
        metadata: {
          createdBy: 'igloo-cli',
          importedAt: now,
          pbkdf2Iterations: SHARE_FILE_PBKDF2_ITERATIONS,
          passwordEncoding: SHARE_FILE_PASSWORD_ENCODING
        },
        keysetName: name,
        index: shareSummary.index,
        policy: createDefaultPolicy(now)
      };

      const filepath = await saveShareRecord(record, {directory: outputDir});
      let refreshed = shares;
      try {
        refreshed = await readShareFiles();
      } catch {
        // ignore refresh errors; the share was persisted already
      }
      setShares(refreshed);
      setSavedPath(filepath);
      setFeedback('Share imported successfully.');
      setEchoStatus('pending');
      setMode('done');
      void (async () => {
        try {
          await sendShareEcho(groupSummary.credential, shareSummary.credential);
          if (!isMountedRef.current) {
            return;
          }
          setEchoStatus('success');
        } catch (error: any) {
          if (!isMountedRef.current) {
            return;
          }
          setEchoStatus('error');
          setEchoError(error?.message ?? 'Failed to send echo confirmation.');
        }
      })();
    } catch (error: any) {
      setFeedback(error?.message ?? 'Failed to save share.');
      setMode('password');
      setPasswordDraft('');
    }
  }

  useEffect(() => {
    if (mode !== 'password' || automationLoading) {
      return;
    }
    if (!shareSummary || !groupSummary) {
      return;
    }
    if (automationError) {
      return;
    }
    if (automationPassword && automationPassword.length >= 8) {
      void handleSave(automationPassword);
    }
  }, [mode, automationPassword, automationError, automationLoading, shareSummary, groupSummary]);

  if (mode === 'loading') {
    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="cyan">Preparing share import…</Text>
        </Box>
      </ShareFrame>
    );
  }

  if (loadError && shares.length === 0) {
    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="yellow">{loadError}</Text>
        </Box>
      </ShareFrame>
    );
  }

  if (mode === 'group') {
    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="cyanBright">Import an individual share</Text>
          <Text color="gray">Step 1 of 5 — provide the group credential (bfgroup…)</Text>
          <Prompt
            key="share-add-group"
            label="Group credential"
            onSubmit={value => initialiseGroup(value) ?? undefined}
          />
          {feedback ? <Text color="red">{feedback}</Text> : null}
        </Box>
      </ShareFrame>
    );
  }

  if (mode === 'share' && groupDetails) {
    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="cyanBright">Group verified</Text>
          <Text color="gray">Threshold: {groupDetails.threshold} • Shares: {groupDetails.totalMembers}</Text>
          <Box marginTop={1} flexDirection="column">
            <Text color="cyan">Group members</Text>
            {groupDetails.pubkeys.map(entry => (
              <Text key={entry.idx} color="gray">
                Index {entry.idx}: {shorten(entry.pubkey)}
              </Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color="cyanBright">Step 2 of 5 — paste a share credential (bfshare…)</Text>
          </Box>
          <Prompt
            key="share-add-share"
            label="Share credential"
            onSubmit={value => initialiseShare(value) ?? undefined}
          />
          {feedback ? <Text color="red">{feedback}</Text> : null}
        </Box>
      </ShareFrame>
    );
  }

  if (mode === 'name' && groupDetails && shareDetails) {
    const defaultName = resolvedKeysetName || (shares.find(s => s.groupCredential === groupSummary?.credential)?.keysetName ?? '');
    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="cyanBright">Share recognised</Text>
          <Text color="gray">
            Index {shareDetails.index} • {groupDetails.threshold}-of-{groupDetails.totalMembers}{' '}
            {shareDetails.pubkey ? `• Pubkey ${shorten(shareDetails.pubkey)}` : ''}
          </Text>
          <Box marginTop={1}>
            <Text color="cyanBright">Step 3 of 5 — name this keyset</Text>
          </Box>
          <Prompt
            key="share-add-name"
            label="Keyset name"
            initialValue={defaultName}
            onSubmit={value => {
              const normalized = normaliseKeysetNameInput(value);
              if (normalized.length === 0) {
                return 'Keyset name is required.';
              }
              setKeysetName(normalized);
              setFeedback(null);
              setMode('password');
              return undefined;
            }}
          />
          {duplicateRecord ? (
            <Text color="yellow">
              Warning: this will overwrite an existing share file ({duplicateRecord.filepath}).
            </Text>
          ) : null}
          {feedback ? <Text color="red">{feedback}</Text> : null}
        </Box>
      </ShareFrame>
    );
  }

  if (!groupDetails || !shareDetails) {
    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="red">Share import context missing.</Text>
        </Box>
      </ShareFrame>
    );
  }

  if (mode === 'saving') {
    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="cyan">Encrypting and saving share…</Text>
        </Box>
      </ShareFrame>
    );
  }

  if (mode === 'done') {
    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="green">Share saved.</Text>
          <Text color="gray">
            Keyset: {resolvedKeysetName} • Share index: {shareDetails.index}
          </Text>
          {savedPath ? <Text color="gray">File: {savedPath}</Text> : null}
          <Box marginTop={1}>
            <Text color="gray">Run `igloo share list` to confirm the updated inventory.</Text>
          </Box>
          {feedback ? <Text color="green">{feedback}</Text> : null}
          {echoStatus === 'pending' ? (
            <Text color="cyan">Sending echo confirmation…</Text>
          ) : null}
          {echoStatus === 'success' ? (
            <Text color="green">Echo confirmation sent to the originating device.</Text>
          ) : null}
          {echoStatus === 'error' ? (
            <Text color="yellow">
              Failed to send echo confirmation{echoError ? `: ${echoError}` : '.'}
            </Text>
          ) : null}
        </Box>
      </ShareFrame>
    );
  }

  if (mode === 'cancelled') {
    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="yellow">Share import cancelled.</Text>
          {feedback ? <Text color="yellow">{feedback}</Text> : null}
        </Box>
      </ShareFrame>
    );
  }

  // Password entry flow
  if (mode === 'password') {
    if (!automationError && automationPassword && automationPassword.length >= 8) {
      return (
        <ShareFrame>
          <Box flexDirection="column">
            <Text color="cyan">Using automation password…</Text>
            <Text color="gray">
              Keyset: {resolvedKeysetName || 'unnamed'} • share index {shareDetails.index}
            </Text>
          </Box>
        </ShareFrame>
      );
    }

    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="cyanBright">Step 4 of 5 — set an encryption password</Text>
          <Text color="gray">Minimum 8 characters. Leave blank to cancel.</Text>
          <Text color="gray">
            Preparing {resolvedKeysetName || 'unnamed keyset'} • share index {shareDetails.index}
          </Text>
          {automationError ? <Text color="red">{automationError}</Text> : null}
          <Prompt
            key="share-add-password"
            label="Password"
            mask
            onSubmit={value => {
              const trimmed = value.trim();
              if (trimmed.length === 0) {
                setMode('cancelled');
                setFeedback('Import cancelled by user.');
                return undefined;
              }
              if (trimmed.length < 8) {
                return 'Password must be at least 8 characters.';
              }
              setPasswordDraft(trimmed);
              setMode('confirm-password');
              return undefined;
            }}
          />
          {feedback ? <Text color="red">{feedback}</Text> : null}
        </Box>
      </ShareFrame>
    );
  }

  if (mode === 'confirm-password') {
    return (
      <ShareFrame>
        <Box flexDirection="column">
          <Text color="cyanBright">Step 5 of 5 — confirm password</Text>
          <Text color="gray">
            Keyset: {resolvedKeysetName || 'unnamed'} • share index {shareDetails.index}
          </Text>
          <Prompt
            key="share-add-confirm"
            label="Re-enter password"
            mask
            onSubmit={value => {
              if (value !== passwordDraft) {
                setPasswordDraft('');
                setMode('password');
                return 'Passwords do not match. Try again.';
              }
              void handleSave(passwordDraft);
              return undefined;
            }}
          />
        </Box>
      </ShareFrame>
    );
  }

  return (
    <ShareFrame>
      <Box flexDirection="column">
        <Text color="red">Unknown share add state.</Text>
      </Box>
    </ShareFrame>
  );
}
