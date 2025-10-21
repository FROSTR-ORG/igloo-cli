import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text} from 'ink';
import {decodeGroup, decodeShare} from '@frostr/igloo-core';
import {readShareFiles, decryptShareCredential, ShareMetadata} from '../../keyset/index.js';
import {Prompt} from '../ui/Prompt.js';
import {useShareEchoListener} from './useShareEchoListener.js';

type KeysetLoadProps = {
  args: string[];
  flags?: Record<string, string | boolean>;
};

type LoadState = {
  loading: boolean;
  error: string | null;
  shares: ShareMetadata[];
};

type Phase = 'select' | 'password' | 'result';

export function KeysetLoad({args, flags}: KeysetLoadProps) {
  const [state, setState] = useState<LoadState>({loading: true, error: null, shares: []});
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedShare, setSelectedShare] = useState<ShareMetadata | null>(null);
  const [result, setResult] = useState<{share: string; group: string} | null>(null);
  const [autoDecrypting, setAutoDecrypting] = useState<boolean>(false);
  const [autoError, setAutoError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const shares = await readShareFiles();
        setState({loading: false, error: null, shares});
      } catch (error: any) {
        setState({loading: false, error: error?.message ?? 'Failed to read shares.', shares: []});
      }
    })();
  }, []);

  const attemptPreselect = useMemo(() => {
    if (state.shares.length === 0 || args.length === 0) {
      // Fall through to flag-based selection if provided
      // even when args are empty
    }

    const tokenFromFlag = typeof flags?.share === 'string' ? flags!.share : undefined;
    const token = tokenFromFlag ?? args[0];
    if (!token) return null;
    const byId = state.shares.find(share => share.id === token || share.name === token);
    if (byId) {
      return byId;
    }

    const numeric = Number(token);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= state.shares.length) {
      return state.shares[numeric - 1];
    }

    return null;
  }, [state.shares, args, flags]);

  useEffect(() => {
    if (attemptPreselect && !selectedShare) {
      setSelectedShare(attemptPreselect);
      setPhase('password');
    }
  }, [attemptPreselect, selectedShare]);

  // Clear any previous automation error when the user changes share selection.
  useEffect(() => {
    setAutoError(null);
  }, [selectedShare]);

  // Attempt non-interactive decryption when we reach password phase and a valid
  // IGLOO_AUTOPASSWORD is present. Runs outside render and guards against
  // updates after unmount via a cancellation flag. Skips re-attempts once an
  // error is shown to avoid retry loops.
  useEffect(() => {
    let cancelled = false;

    async function tryAutoDecrypt() {
      if (phase !== 'password' || !selectedShare) return;

      const autoPassword = typeof process !== 'undefined' ? process.env.IGLOO_AUTOPASSWORD : undefined;
      if (!autoPassword || autoPassword.length < 8) {
        return; // keep interactive prompt visible; no auto attempt
      }

      if (autoError !== null) return;
      setAutoDecrypting(true);

      try {
        const {shareCredential} = decryptShareCredential(selectedShare, autoPassword);
        if (cancelled) return;
        setResult({share: shareCredential, group: selectedShare.groupCredential});
        setPhase('result');
      } catch (error: any) {
        if (cancelled) return;
        setAutoError(error?.message ?? 'Failed to decrypt share with automation password.');
      } finally {
        if (!cancelled) setAutoDecrypting(false);
      }
    }

    void tryAutoDecrypt();
    return () => {
      cancelled = true;
    };
  }, [phase, selectedShare, autoError]);

  // In non-interactive test environments, auto-exit shortly after a successful
  // result to avoid hanging the child process. Trigger via effect to avoid
  // side-effects during render and to clean up timers on re-renders/unmount.
  useEffect(() => {
    if (!result) return;
    const shouldAutoExit =
      process.env.IGLOO_DISABLE_RAW_MODE === '1' || process.env.IGLOO_TEST_AUTOPILOT === '1';
    if (!shouldAutoExit) return;

    if (typeof window !== 'undefined') return; // ensure Node/CLI context
    if (typeof process === 'undefined' || typeof process.exit !== 'function') return;

    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      try {
        process.exit(0);
      } catch {}
    }, 20);
    return () => clearTimeout(timer);
  }, [result]);

  const decryptedShare = result?.share ?? null;
  const decryptedGroup = result?.group ?? null;
  const skipEcho = (() => {
    const a = (process.env.IGLOO_SKIP_ECHO ?? '').toLowerCase();
    return a === '1' || a === 'true';
  })();
  const {status: echoStatus, message: echoMessage} = useShareEchoListener(
    skipEcho ? undefined : decryptedGroup,
    skipEcho ? undefined : decryptedShare
  );

  if (state.loading) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Loading saved shares…</Text>
      </Box>
    );
  }

  if (state.error) {
    return (
      <Box flexDirection="column">
        <Text color="red">{state.error}</Text>
      </Box>
    );
  }

  if (state.shares.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No saved shares available.</Text>
      </Box>
    );
  }

  if (phase === 'select') {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Select a share to load</Text>
        {state.shares.map((share, index) => (
          <Text key={share.id}>
            {index + 1}. {share.name} ({share.id})
          </Text>
        ))}
        <Prompt
          key="select-share"
          label="Enter number or share id"
          onSubmit={value => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
              return 'Please choose a share (or press Ctrl+C to exit).';
            }

            const byId = state.shares.find(share => share.id === trimmed || share.name === trimmed);
            if (byId) {
              setSelectedShare(byId);
              setPhase('password');
              return undefined;
            }

            const numeric = Number(trimmed);
            if (Number.isInteger(numeric) && numeric >= 1 && numeric <= state.shares.length) {
              setSelectedShare(state.shares[numeric - 1]);
              setPhase('password');
              return undefined;
            }

            return 'Share not found. Enter a listed number or id.';
          }}
        />
      </Box>
    );
  }

  if (!selectedShare) {
    return (
      <Box flexDirection="column">
        <Text color="red">Share selection missing.</Text>
      </Box>
    );
  }

  if (phase === 'password') {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Decrypt share: {selectedShare.name}</Text>
        <Text color="gray">Saved at {selectedShare.savedAt ?? 'unknown time'}</Text>
        {autoDecrypting ? (
          <Text color="cyan">Decrypting with automation password…</Text>
        ) : null}
        {autoError ? (
          <Text color="red">{autoError}</Text>
        ) : null}
        <Prompt
          key={`password-${selectedShare.id}`}
          label="Enter password"
          mask
          onSubmit={value => {
            if (value.length < 8) {
              return 'Password must be at least 8 characters.';
            }

            try {
              const {shareCredential} = decryptShareCredential(selectedShare, value);
              setResult({share: shareCredential, group: selectedShare.groupCredential});
              setPhase('result');
              return undefined;
            } catch (error: any) {
              return error?.message ?? 'Failed to decrypt share. Check your password.';
            }
          }}
        />
      </Box>
    );
  }

  if (!result) {
    return (
      <Box flexDirection="column">
        <Text color="red">Failed to decrypt share.</Text>
      </Box>
    );
  }

  let shareIndex: number | undefined;
  try {
    const decodedShare = decodeShare(result.share);
    shareIndex = decodedShare.idx;
  } catch {
    shareIndex = undefined;
  }

  let groupInfo: {threshold?: number; totalMembers?: number} | undefined;
  try {
    const decodedGroup = decodeGroup(result.group) as any;
    groupInfo = {
      threshold: decodedGroup.threshold,
      totalMembers: decodedGroup.total_members ?? decodedGroup.totalMembers
    };
  } catch {
    groupInfo = undefined;
  }


  return (
    <Box flexDirection="column">
      <Text color="green">Share decrypted successfully.</Text>
      <Text color="cyan">Share credential</Text>
      <Text color="gray">{result.share}</Text>
      <Box marginTop={1}>
        <Text color="cyan">Group credential</Text>
      </Box>
      <Text color="gray">{result.group}</Text>
      {shareIndex !== undefined ? (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Share details</Text>
          <Text color="gray">Index: {shareIndex}</Text>
        </Box>
      ) : null}
      {groupInfo ? (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Group details</Text>
          {groupInfo.threshold !== undefined ? (
            <Text color="gray">Threshold: {groupInfo.threshold}</Text>
          ) : null}
          {groupInfo.totalMembers !== undefined ? (
            <Text color="gray">Total members: {groupInfo.totalMembers}</Text>
          ) : null}
        </Box>
      ) : null}
      <Box marginTop={1} flexDirection="column">
        {echoStatus === 'listening' ? (
          <Box flexDirection="column">
          <Text color="cyan">
            Waiting for echo confirmation{shareIndex !== undefined ? ` on share ${shareIndex}` : ''}…
          </Text>
            {echoMessage ? <Text color="yellow">{echoMessage}</Text> : null}
          </Box>
        ) : null}
        {echoStatus === 'success' ? (
          <Text color="green">Echo confirmed by the receiving device.</Text>
        ) : null}
      </Box>
    </Box>
  );
}
