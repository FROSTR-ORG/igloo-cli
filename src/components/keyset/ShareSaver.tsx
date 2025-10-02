import React, {useMemo, useState} from 'react';
import {Box, Text} from 'ink';
import {decodeShare} from '@frostr/igloo-core';
import {
  deriveSecret,
  encryptPayload,
  randomSaltHex,
  saveShareRecord,
  buildShareId,
  ShareFileRecord,
  SHARE_FILE_VERSION,
  SHARE_FILE_PBKDF2_ITERATIONS,
  SHARE_FILE_PASSWORD_ENCODING,
  SHARE_FILE_SALT_LENGTH_BYTES,
  createDefaultPolicy
} from '../../keyset/index.js';
import {Prompt} from '../ui/Prompt.js';

type ShareSaverProps = {
  keysetName: string;
  groupCredential: string;
  shareCredentials: string[];
  onComplete?: (summary: {
    savedPaths: string[];
    skipped: number[];
  }) => void;
  autoPassword?: string;
  outputDir?: string;
};

type ShareState = {
  credential: string;
  index: number;
};

type StepPhase = 'password' | 'confirm' | 'saving' | 'done';

export function ShareSaver({
  keysetName,
  groupCredential,
  shareCredentials,
  onComplete,
  autoPassword,
  outputDir
}: ShareSaverProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<StepPhase>('password');
  const [passwordDraft, setPasswordDraft] = useState('');
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [notified, setNotified] = useState(false);
  const [autoState, setAutoState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [autoError, setAutoError] = useState<string | null>(null);

  const shares = useMemo<ShareState[]>(() => {
    return shareCredentials.map((credential, idx) => {
      try {
        const decoded = decodeShare(credential);
        return {
          credential,
          index: decoded.idx ?? idx + 1
        } satisfies ShareState;
      } catch (error) {
        return {
          credential,
          index: idx + 1
        } satisfies ShareState;
      }
    });
  }, [shareCredentials]);

  const share = shares[currentIndex];
  const isAutomated = typeof autoPassword === 'string' && autoPassword.length > 0;

  const summaryView = (
    <Box flexDirection="column">
      <Text color="cyan">All shares processed.</Text>
      <Text color="cyan">Group credential:</Text>
      <Text color="gray">{groupCredential}</Text>
      {savedPaths.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="cyan">Saved files</Text>
          {savedPaths.map(path => (
            <Text key={path} color="gray">{path}</Text>
          ))}
        </Box>
      ) : (
        <Text color="yellow">No shares were persisted.</Text>
      )}
      {skipped.length > 0 ? (
        <Text color="yellow">Skipped shares: {skipped.join(', ')}</Text>
      ) : null}
      <Box marginTop={1}>
        <Text color="gray">
          Run `igloo-cli keyset list` to review your saved shares later.
        </Text>
      </Box>
    </Box>
  );

  if (!share) {
    if (!notified && onComplete) {
      onComplete({savedPaths, skipped});
      setNotified(true);
    }

    return summaryView;
  }

  function resetForNext(nextIndex: number) {
    setCurrentIndex(nextIndex);
    setPhase('password');
    setPasswordDraft('');
    setFeedback(null);
  }

  const handleSaveInternal = async (password: string) => {
    const salt = randomSaltHex();
    const secret = deriveSecret(
      password,
      salt,
      SHARE_FILE_PBKDF2_ITERATIONS,
      SHARE_FILE_PASSWORD_ENCODING,
      SHARE_FILE_SALT_LENGTH_BYTES
    );
    const {cipherText} = encryptPayload(secret, share.credential);

    const record: ShareFileRecord = {
      id: buildShareId(keysetName, share.index),
      name: `${keysetName} share ${share.index}`,
      share: cipherText,
      salt,
      groupCredential,
      version: SHARE_FILE_VERSION,
      savedAt: new Date().toISOString(),
      metadata: {
        createdBy: 'igloo-cli',
        pbkdf2Iterations: SHARE_FILE_PBKDF2_ITERATIONS,
        passwordEncoding: SHARE_FILE_PASSWORD_ENCODING
      },
      keysetName,
      index: share.index,
      policy: createDefaultPolicy()
    };

    return saveShareRecord(record, {directory: outputDir});
  };

  async function handleSave(password: string) {
    setPhase('saving');
    try {
      const filepath = await handleSaveInternal(password);
      setSavedPaths(current => [...current, filepath]);
      setFeedback(`Share ${share.index} encrypted and saved.`);
      setPhase('done');
    } catch (error: any) {
      setFeedback(`Failed to save share: ${error?.message ?? error}`);
      setPhase('password');
      setPasswordDraft('');
    }
  }

  function handlePasswordSubmit(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setSkipped(current => [...current, share.index]);
      resetForNext(currentIndex + 1);
      return undefined;
    }

    if (trimmed.length < 8) {
      setFeedback('Password must be at least 8 characters.');
      return 'Password must be at least 8 characters.';
    }

    setPasswordDraft(trimmed);
    setPhase('confirm');
    return undefined;
  }

  function handleConfirmSubmit(value: string) {
    if (value !== passwordDraft) {
      setFeedback('Passwords do not match. Try again.');
      setPasswordDraft('');
      setPhase('password');
      return 'Passwords do not match. Try again.';
    }

    void handleSave(passwordDraft);
    return undefined;
  }

  if (isAutomated) {
    if (autoState === 'idle') {
      if (!autoPassword || autoPassword.length < 8) {
        setAutoError('Automation password must be at least 8 characters.');
        setAutoState('error');
      } else {
        setAutoState('running');
        void (async () => {
          try {
            const paths: string[] = [];
            for (const candidate of shares) {
              const salt = randomSaltHex();
              const secret = deriveSecret(
                autoPassword,
                salt,
                SHARE_FILE_PBKDF2_ITERATIONS,
                SHARE_FILE_PASSWORD_ENCODING,
                SHARE_FILE_SALT_LENGTH_BYTES
              );
              const {cipherText} = encryptPayload(secret, candidate.credential);

              const record: ShareFileRecord = {
                id: buildShareId(keysetName, candidate.index),
                name: `${keysetName} share ${candidate.index}`,
                share: cipherText,
                salt,
                groupCredential,
                version: SHARE_FILE_VERSION,
                savedAt: new Date().toISOString(),
                metadata: {
                  createdBy: 'igloo-cli',
                  pbkdf2Iterations: SHARE_FILE_PBKDF2_ITERATIONS,
                  passwordEncoding: SHARE_FILE_PASSWORD_ENCODING
                },
                keysetName,
                index: candidate.index,
                policy: createDefaultPolicy()
              };

              const filepath = await saveShareRecord(record, {directory: outputDir});
              paths.push(filepath);
            }

            setSavedPaths(paths);
            setAutoState('done');
            if (onComplete) {
              onComplete({savedPaths: paths, skipped: []});
            }
          } catch (error: any) {
            setAutoError(error?.message ?? 'Failed to save shares in automated mode.');
            setAutoState('error');
          }
        })();
      }
    }

    if (autoState === 'running') {
      return (
        <Box flexDirection="column">
          <Text color="cyan">Encrypting and saving shares…</Text>
        </Box>
      );
    }

    if (autoState === 'error') {
      return (
        <Box flexDirection="column">
          <Text color="red">{autoError ?? 'Automation failed.'}</Text>
        </Box>
      );
    }

    return summaryView;
  }

  if (phase === 'saving') {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Encrypting share {share.index}…</Text>
      </Box>
    );
  }

  if (phase === 'done') {
    return (
      <Box flexDirection="column">
        <Text color="green">Share {share.index} saved.</Text>
        {feedback ? <Text color="gray">{feedback}</Text> : null}
        <Prompt
          key={`continue-${share.index}`}
          label="Press Enter to continue"
          allowEmpty
          onSubmit={() => {
            resetForNext(currentIndex + 1);
            return undefined;
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan">Share {share.index} of {shareCredentials.length}</Text>
      <Text color="gray">{share.credential}</Text>
      <Text>
        Set a password to encrypt this share. Leave blank to skip saving and handle it manually.
      </Text>
      {feedback ? <Text color="yellow">{feedback}</Text> : null}
      {phase === 'password' ? (
        <Prompt
          key={`password-${share.index}`}
          label="Password (blank to skip)"
          mask
          allowEmpty
          onSubmit={handlePasswordSubmit}
        />
      ) : null}
      {phase === 'confirm' ? (
        <Prompt
          key={`confirm-${share.index}`}
          label="Confirm password"
          mask
          onSubmit={handleConfirmSubmit}
        />
      ) : null}
    </Box>
  );
}
