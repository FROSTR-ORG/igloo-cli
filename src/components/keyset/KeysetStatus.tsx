import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text} from 'ink';
import fs from 'node:fs/promises';
import {
  createAndConnectNode,
  closeNode,
  checkPeerStatus,
  DEFAULT_PING_RELAYS,
  DEFAULT_PING_TIMEOUT,
  decodeGroup,
  decodeShare,
  pingPeer
} from '@frostr/igloo-core';
import {convert_pubkey} from '@frostr/bifrost/util';
import {readShareFiles, decryptShareCredential, ShareMetadata} from '../../keyset/index.js';
import {Prompt} from '../ui/Prompt.js';
import {resolveRelaysWithFallbackSync} from '../../keyset/relays.js';

export type KeysetStatusProps = {
  flags: Record<string, string | boolean>;
  args: string[];
};

type LoadState = {
  loading: boolean;
  error: string | null;
  shares: ShareMetadata[];
};

type DiagnosticsResult = {
  relays: string[];
  peers: Array<{
    pubkey: string;
    status: 'online' | 'offline';
  }>;
};

type Phase = 'select' | 'password' | 'diagnosing' | 'result';

function normaliseString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value.trim().toLowerCase() : undefined;
}

function extractCommitPubkey(commit: any): string | undefined {
  if (!commit || typeof commit !== 'object') {
    return undefined;
  }

  const candidates = [commit.pubkey, commit.pub, commit.public_key];
  return candidates.find(candidate => typeof candidate === 'string' && candidate.length > 0);
}

function deriveSelfPubkeyFromPackages(groupPackage: any, sharePackage: any): string | undefined {
  const commits = Array.isArray(groupPackage?.commits) ? groupPackage.commits : [];

  const sharePubkeyCandidates = [sharePackage?.pubkey, sharePackage?.pub, sharePackage?.public_key];
  const directPubkey = sharePubkeyCandidates.find(
    candidate => typeof candidate === 'string' && candidate.length > 0
  );
  if (directPubkey) {
    return directPubkey;
  }

  const shareIdxRaw = sharePackage?.idx ?? sharePackage?.index ?? sharePackage?.member_idx;
  const shareIdx =
    typeof shareIdxRaw === 'number'
      ? shareIdxRaw
      : typeof shareIdxRaw === 'string'
        ? Number.parseInt(shareIdxRaw, 10)
        : undefined;
  if (Number.isFinite(shareIdx)) {
    const commitByIdx = commits.find((commit: any) => {
      const commitIdxRaw = commit?.idx ?? commit?.index ?? commit?.member_idx;
      if (typeof commitIdxRaw === 'number') {
        return commitIdxRaw === shareIdx;
      }
      if (typeof commitIdxRaw === 'string') {
        const parsed = Number.parseInt(commitIdxRaw, 10);
        return Number.isFinite(parsed) && parsed === shareIdx;
      }
      return false;
    });
    const pubkey = extractCommitPubkey(commitByIdx);
    if (pubkey) {
      return pubkey;
    }
  }

  const shareBinder = normaliseString(
    sharePackage?.binder_sn ?? sharePackage?.binder_pn ?? sharePackage?.binder
  );
  if (shareBinder) {
    const commitByBinder = commits.find((commit: any) => {
      const binderCandidates = [commit?.binder_sn, commit?.binder_pn, commit?.binder];
      return binderCandidates
        .map(normaliseString)
        .some(value => value !== undefined && value === shareBinder);
    });
    const pubkey = extractCommitPubkey(commitByBinder);
    if (pubkey) {
      return pubkey;
    }
  }

  return undefined;
}

type PeerKeyCandidate = {
  ping: string;
  display: string;
};

function normalisePeerPubkey(value: unknown): PeerKeyCandidate | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    const ping = convert_pubkey(value, 'bip340');
    const display = convert_pubkey(ping, 'ecdsa');
    return {ping, display};
  } catch {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    return {ping: trimmed, display: trimmed};
  }
}

function collectPeerPubkeys(groupPackage: any, selfPubkey: string): PeerKeyCandidate[] {
  const candidates = new Map<string, PeerKeyCandidate>();

  const addCandidate = (value: unknown) => {
    const candidate = normalisePeerPubkey(value);
    if (!candidate) {
      return;
    }
    if (candidate.ping === selfPubkey) {
      return;
    }

    if (!candidates.has(candidate.ping)) {
      candidates.set(candidate.ping, candidate);
    }
  };

  const commits = Array.isArray(groupPackage?.commits) ? groupPackage.commits : [];
  commits.forEach((commit: any) => addCandidate(extractCommitPubkey(commit)));

  const participants = Array.isArray(groupPackage?.participants) ? groupPackage.participants : [];
  participants.forEach((entry: any) => {
    if (typeof entry === 'string') {
      addCandidate(entry);
    } else if (entry && typeof entry === 'object') {
      addCandidate(entry.pubkey ?? entry.pub ?? entry.public_key);
    }
  });

  const members = Array.isArray(groupPackage?.members) ? groupPackage.members : [];
  members.forEach((member: any) => {
    if (typeof member === 'string') {
      addCandidate(member);
      return;
    }

    addCandidate(member?.pubkey ?? member?.pub ?? member?.public_key);
  });

  return Array.from(candidates.values());
}

async function checkPeerStatusCompat(
  node: any,
  groupCredential: string,
  shareCredential: string
): Promise<DiagnosticsResult['peers']> {
  try {
    return await checkPeerStatus(node, groupCredential, shareCredential);
  } catch (originalError: any) {
    try {
      const sharePackage = decodeShare(shareCredential) as any;
      const groupPackage = decodeGroup(groupCredential) as any;

      const selfPubkeyRaw = deriveSelfPubkeyFromPackages(groupPackage, sharePackage);
      if (!selfPubkeyRaw) {
        throw new Error('Unable to determine signing pubkey for selected share.');
      }

      const selfPubkeyCandidate = normalisePeerPubkey(selfPubkeyRaw);
      if (!selfPubkeyCandidate) {
        throw new Error('Unable to normalise signing pubkey for compatibility ping.');
      }

      const peerPubkeys = collectPeerPubkeys(groupPackage, selfPubkeyCandidate.ping);
      if (peerPubkeys.length === 0) {
        throw new Error('No peer public keys found in the provided group credential.');
      }

      const results = await Promise.all(
        peerPubkeys.map(async peer => {
          const outcome = await pingPeer(node, peer.ping, {
            timeout: DEFAULT_PING_TIMEOUT,
            eventConfig: {enableLogging: false}
          });
          return {
            pubkey: peer.display,
            status: outcome.success ? 'online' : 'offline'
          } as DiagnosticsResult['peers'][number];
        })
      );

      return results;
    } catch (fallbackError: any) {
      const originalMessage =
        originalError instanceof Error ? originalError.message : String(originalError ?? 'Unknown error');
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError ?? 'Unknown fallback error');
      throw new Error(`${originalMessage} (compat fallback failed: ${fallbackMessage})`);
    }
  }
}

function parseRelayFlags(flags: Record<string, string | boolean>): string[] | undefined {
  const relayString =
    typeof flags.relays === 'string'
      ? flags.relays
      : typeof flags.relay === 'string'
        ? flags.relay
        : undefined;

  if (!relayString) {
    return undefined;
  }

  return relayString
    .split(',')
    .map(relay => relay.trim())
    .filter(Boolean);
}

function findShare(shares: ShareMetadata[], token: string | undefined): ShareMetadata | null {
  if (!token) {
    return null;
  }

  const direct = shares.find(share => share.id === token || share.name === token);
  if (direct) {
    return direct;
  }

  const numeric = Number(token);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= shares.length) {
    return shares[numeric - 1];
  }

  return null;
}

export function KeysetStatus({flags, args}: KeysetStatusProps) {
  const [state, setState] = useState<LoadState>({loading: true, error: null, shares: []});
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedShare, setSelectedShare] = useState<ShareMetadata | null>(null);
  const [result, setResult] = useState<DiagnosticsResult | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [autoRan, setAutoRan] = useState(false);

  const directPassword = typeof flags.password === 'string' ? flags.password : undefined;
  const passwordFilePath = typeof flags['password-file'] === 'string' ? flags['password-file'] : undefined;
  const [automationPassword, setAutomationPassword] = useState<string | undefined>(directPassword);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [automationLoading, setAutomationLoading] = useState<boolean>(Boolean(passwordFilePath && !directPassword));

  const shareToken = typeof flags.share === 'string' ? flags.share : args[0];
  const relayOverrides = parseRelayFlags(flags);
  const relays = resolveRelaysWithFallbackSync(relayOverrides, DEFAULT_PING_RELAYS);

  useEffect(() => {
    void (async () => {
      try {
        const shares = await readShareFiles();
        setState({loading: false, error: null, shares});
      } catch (error: any) {
        setState({
          loading: false,
          error: error?.message ?? 'Failed to load saved shares.',
          shares: []
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

  const preselectedShare = useMemo(() => {
    if (state.shares.length === 0) {
      return null;
    }
    return findShare(state.shares, shareToken ?? undefined);
  }, [state.shares, shareToken]);

  useEffect(() => {
    if (preselectedShare && !selectedShare) {
      setSelectedShare(preselectedShare);
      setPhase(prev => (prev === 'select' ? 'password' : prev));
    }
  }, [preselectedShare, selectedShare]);

  useEffect(() => {
    if (!automationPassword || automationPassword.length === 0) {
      return;
    }

    if (automationPassword.length < 8) {
      setAutomationError('Automation password must be at least 8 characters.');
      return;
    }
  }, [automationPassword]);

  const isAutomated = Boolean(automationPassword && shareToken);
  const autoReady =
    isAutomated &&
    !automationLoading &&
    !automationError &&
    !autoRan &&
    selectedShare !== null &&
    automationPassword !== undefined &&
    automationPassword.length >= 8;

  useEffect(() => {
    if (!autoReady) {
      return;
    }

    setAutoRan(true);
    void startDiagnostics(automationPassword as string, selectedShare as ShareMetadata);
  }, [autoReady, automationPassword, selectedShare]);

  async function startDiagnostics(password: string, share: ShareMetadata) {
    setPhase('diagnosing');
    setStatusError(null);
    setResult(null);

    let node: any;

    try {
      const {shareCredential} = decryptShareCredential(share, password);

      node = await createAndConnectNode(
        {
          group: share.groupCredential,
          share: shareCredential,
          relays
        },
        {enableLogging: false}
      );

      const peers = await checkPeerStatusCompat(node, share.groupCredential, shareCredential);
      setResult({relays, peers});
      setPhase('result');
    } catch (error: any) {
      setStatusError(error?.message ?? 'Failed to collect peer status.');
      setPhase('result');
    } finally {
      if (node) {
        try {
          closeNode(node);
        } catch (closeError) {
          // Ignore close errors to avoid masking diagnostic results.
        }
      }
    }
  }

  if (state.loading || automationLoading) {
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

  if (automationError) {
    return (
      <Box flexDirection="column">
        <Text color="red">{automationError}</Text>
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
        <Text color="cyanBright">Select a share to diagnose</Text>
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

            const chosen = findShare(state.shares, trimmed);
            if (!chosen) {
              return 'Share not found. Enter a listed number or id.';
            }

            setSelectedShare(chosen);
            setPhase('password');
            return undefined;
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

  if (!isAutomated && phase === 'password') {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Decrypt share: {selectedShare.name}</Text>
        <Text color="gray">Saved at {selectedShare.savedAt ?? 'unknown time'}</Text>
        <Prompt
          key={`password-${selectedShare.id}`}
          label="Enter password"
          mask
          onSubmit={value => {
            if (value.length < 8) {
              return 'Password must be at least 8 characters.';
            }

            setAutomationPassword(value);
            void startDiagnostics(value, selectedShare);
            return undefined;
          }}
        />
      </Box>
    );
  }

  if (phase === 'diagnosing') {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Checking peer status via relays…</Text>
        <Text color="gray">Relays: {relays.join(', ')}</Text>
      </Box>
    );
  }

  if (phase === 'result') {
    if (statusError) {
      return (
        <Box flexDirection="column">
          <Text color="red">{statusError}</Text>
        </Box>
      );
    }

    if (!result) {
      return (
        <Box flexDirection="column">
          <Text color="red">No diagnostics result available.</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text color="green">Peer diagnostics complete.</Text>
        <Text color="cyan">Relays</Text>
        <Text color="gray">{result.relays.join(', ')}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Peer status</Text>
          {result.peers.length === 0 ? (
            <Text color="yellow">No peers discovered in this keyset.</Text>
          ) : (
            result.peers.map(peer => (
              <Text key={peer.pubkey} color={peer.status === 'online' ? 'green' : 'red'}>
                {peer.pubkey} — {peer.status}
              </Text>
            ))
          )}
        </Box>
      </Box>
    );
  }

  return null;
}
