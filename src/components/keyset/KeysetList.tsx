import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {readShareFiles, ensureShareDirectory} from '../../keyset/index.js';

type ListState = {
  loading: boolean;
  error: string | null;
  shareDir: string | null;
  shares: Awaited<ReturnType<typeof readShareFiles>>;
};

export function KeysetList() {
  const [state, setState] = useState<ListState>({
    loading: true,
    error: null,
    shareDir: null,
    shares: []
  });

  // In non-interactive environments (tests/CI), auto-exit once we've rendered
  // a final state so spawn-based harnesses don't hang waiting for Ink to idle.
  const nonInteractive = (() => {
    const a = (process.env.IGLOO_DISABLE_RAW_MODE ?? '').toLowerCase();
    const b = (process.env.IGLOO_TEST_AUTOPILOT ?? '').toLowerCase();
    return a === '1' || a === 'true' || b === '1' || b === 'true';
  })();

  useEffect(() => {
    void (async () => {
      try {
        const [dir, entries] = await Promise.all([
          ensureShareDirectory(),
          readShareFiles()
        ]);
        setState({loading: false, error: null, shareDir: dir, shares: entries});
      } catch (error: any) {
        setState({
          loading: false,
          error: error?.message ?? 'Failed to read share directory.',
          shareDir: null,
          shares: []
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!nonInteractive || state.loading) return;
    const t = setTimeout(() => {
      try { process.exit(0); } catch {}
    }, 10);
    return () => clearTimeout(t);
  }, [nonInteractive, state.loading, state.shares.length, state.error]);

  if (state.loading) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Scanning saved shares…</Text>
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
        <Text color="yellow">No saved shares found yet.</Text>
        {state.shareDir ? (
          <Text color="gray">Share directory: {state.shareDir}</Text>
        ) : null}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="cyanBright">Saved shares</Text>
      {state.shareDir ? (
        <Text color="gray">Directory: {state.shareDir}</Text>
      ) : null}
      <Box flexDirection="column" marginTop={1}>
        {state.shares.map((share, index) => (
          <Box key={share.id} flexDirection="column" marginBottom={1}>
            <Text>
              {index + 1}. {share.name} ({share.id})
            </Text>
            <Text color="gray">Saved at: {share.savedAt ?? 'unknown time'}</Text>
            <Text color="gray">File: {share.filepath}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
