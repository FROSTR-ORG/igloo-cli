import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text} from 'ink';
import path from 'node:path';
import {normalizePubkey, decodeGroup} from '@frostr/igloo-core';
import {
  readShareFiles,
  saveShareRecord,
  ShareMetadata,
  SharePolicy,
  SharePeerPolicy,
  SHARE_FILE_VERSION,
  loadShareRecord,
  setPolicyDefaults,
  upsertPeerPolicy,
  removePeerPolicy,
  ensurePolicy
} from '../../keyset/index.js';
import {Prompt} from '../ui/Prompt.js';

export type KeysetPolicyProps = {
  flags: Record<string, string | boolean>;
  args: string[];
};

type LoadState = {
  loading: boolean;
  error: string | null;
  shares: ShareMetadata[];
};

type Mode =
  | 'select'
  | 'menu'
  | 'defaults-send'
  | 'defaults-receive'
  | 'peer-select'
  | 'peer-custom'
  | 'peer-send'
  | 'peer-receive'
  | 'remove-peer'
  | 'saving';

type DraftDefaults = {
  allowSend: boolean;
  allowReceive: boolean;
};

type DraftPeer = {
  pubkey: string;
  allowSend: boolean;
  allowReceive: boolean;
  index?: number;
};

type PeerOption = {
  raw: string;
  normalized: string;
  index?: number;
};

const POSITIVE_VALUES = ['y', 'yes', 'true', '1', 'allow', 'allowed', 'enable', 'enabled'];
const NEGATIVE_VALUES = ['n', 'no', 'false', '0', 'deny', 'denied', 'disable', 'disabled', 'block', 'blocked'];

function formatBoolean(value: boolean): string {
  return value ? 'allowed' : 'blocked';
}

function formatTimestamp(timestamp?: string | null): string {
  if (!timestamp) {
    return 'unknown';
  }

  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }
    return date.toISOString();
  } catch {
    return timestamp;
  }
}

function resolveBooleanInput(value: string, fallback: boolean): {ok: true; value: boolean} | {ok: false; error: string} {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return {ok: true, value: fallback};
  }
  const normalised = trimmed.toLowerCase();
  if (POSITIVE_VALUES.includes(normalised)) {
    return {ok: true, value: true};
  }
  if (NEGATIVE_VALUES.includes(normalised)) {
    return {ok: true, value: false};
  }
  return {
    ok: false,
    error: 'Enter yes or no (leave blank to keep current).'
  };
}

function normalisePeerKey(value: string): string {
  try {
    return normalizePubkey(value);
  } catch {
    return value.trim().toLowerCase();
  }
}

function shorten(value: string, prefix = 6, suffix = 4): string {
  if (value.length <= prefix + suffix + 1) {
    return value;
  }
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}

function derivePeerOptions(groupCredential: string): PeerOption[] {
  try {
    const group = decodeGroup(groupCredential) as any;
    const commits: any[] = Array.isArray(group?.commits) ? group.commits : [];

    const options: PeerOption[] = [];
    const seen = new Set<string>();

    commits.forEach((commit, idx) => {
      let raw: string | undefined;

      if (typeof commit === 'string') {
        raw = commit;
      } else if (commit && typeof commit === 'object') {
        if (typeof commit.pubkey === 'string') {
          raw = commit.pubkey;
        } else if (typeof (commit as any).pub === 'string') {
          raw = (commit as any).pub;
        } else if (typeof (commit as any).key === 'string') {
          raw = (commit as any).key;
        }
      }

      if (!raw) {
        return;
      }

      const normalized = normalisePeerKey(raw);
      if (seen.has(normalized)) {
        return;
      }
      seen.add(normalized);

      const index = typeof commit?.idx === 'number' ? commit.idx : idx + 1;

      options.push({
        raw,
        normalized,
        index
      });
    });

    return options;
  } catch {
    return [];
  }
}

function formatPeerLabel(peer: DraftPeer, keysetLabel: string): string {
  const normalized = normalisePeerKey(peer.pubkey);
  const indexPart = peer.index !== undefined ? `index ${peer.index}` : 'peer';
  return `${keysetLabel} • ${indexPart} — ${shorten(normalized)}`;
}

function deriveKeysetLabel(share: ShareMetadata): string {
  if (share.keysetName && share.keysetName.trim().length > 0) {
    return share.keysetName;
  }

  const name = share.name ?? '';
  const match = name.match(/^(.*) share \d+$/i);
  if (match && match[1]) {
    return match[1];
  }

  return name || share.id;
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

async function persistPolicy(
  share: ShareMetadata,
  policy: SharePolicy
): Promise<ShareMetadata> {
  const {filepath, savedAt, ...rest} = share;
  await saveShareRecord(
    {
      ...rest,
      version: SHARE_FILE_VERSION,
      policy
    },
    {directory: path.dirname(filepath)}
  );

  const refreshed = await loadShareRecord({filepath});
  if (!refreshed) {
    throw new Error('Policy saved but share could not be reloaded.');
  }

  return refreshed;
}

export function KeysetPolicy({flags, args}: KeysetPolicyProps) {
  const [state, setState] = useState<LoadState>({loading: true, error: null, shares: []});
  const [mode, setMode] = useState<Mode>('select');
  const [selectedShare, setSelectedShare] = useState<ShareMetadata | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draftDefaults, setDraftDefaults] = useState<DraftDefaults | null>(null);
  const [draftPeer, setDraftPeer] = useState<DraftPeer | null>(null);

  const shareToken = typeof flags.share === 'string' ? flags.share : args[0];

  useEffect(() => {
    void (async () => {
      try {
        const shares = await readShareFiles();
        setState({loading: false, error: null, shares});
      } catch (error: any) {
        setState({
          loading: false,
          error: error?.message ?? 'Failed to read saved shares.',
          shares: []
        });
      }
    })();
  }, []);

  const preselectedShare = useMemo(() => {
    if (state.shares.length === 0) {
      return null;
    }
    return findShare(state.shares, shareToken);
  }, [state.shares, shareToken]);

  useEffect(() => {
    if (preselectedShare && !selectedShare) {
      setSelectedShare(preselectedShare);
      setMode('menu');
    }
  }, [preselectedShare, selectedShare]);

  const peerOptions = useMemo<PeerOption[]>(() => {
    if (!selectedShare) {
      return [];
    }
    return derivePeerOptions(selectedShare.groupCredential);
  }, [selectedShare]);

  const peerOptionLookup = useMemo(() => {
    return new Map(peerOptions.map(option => [option.normalized, option]));
  }, [peerOptions]);

  const applyShareUpdate = (next: ShareMetadata, message: string) => {
    setState(prev => ({
      ...prev,
      shares: prev.shares.map(share => (share.filepath === next.filepath ? next : share))
    }));
    setSelectedShare(next);
    setFeedback(message);
  };

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
        <Text color="yellow">No saved shares available. Create a keyset before configuring policy.</Text>
      </Box>
    );
  }

  if (mode === 'select') {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Select a share to configure policy</Text>
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
            setMode('menu');
            setFeedback(null);
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

  const policy = selectedShare.policy ?? ensurePolicy(selectedShare);
  const peerEntries = Object.entries(policy.peers ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const keysetLabel = deriveKeysetLabel(selectedShare);

  if (mode === 'saving') {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Persisting policy changes…</Text>
      </Box>
    );
  }

  if (mode === 'menu') {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Policy controls: {selectedShare.name}</Text>
        <Text color="gray">Share id: {selectedShare.id}</Text>
        <Text color="gray">Keyset: {keysetLabel}</Text>
        <Text color="gray">Last updated: {formatTimestamp(policy.updatedAt)}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Defaults</Text>
          <Text color="gray">Send: {formatBoolean(policy.defaults.allowSend)}</Text>
          <Text color="gray">Receive: {formatBoolean(policy.defaults.allowReceive)}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Peer overrides</Text>
          {peerEntries.length === 0 ? (
            <Text color="gray">None — all peers follow defaults.</Text>
          ) : (
            peerEntries.map(([peer, config]) => (
              <Text key={peer} color="gray">
                {keysetLabel} • {peerOptionLookup.get(peer)?.index ? `index ${peerOptionLookup.get(peer)?.index}` : 'peer'} — {shorten(peer)} — send {formatBoolean(config.allowSend)}, receive {formatBoolean(config.allowReceive)} (updated {formatTimestamp(config.updatedAt)})
              </Text>
            ))
          )}
        </Box>
        {feedback ? (
          <Box marginTop={1}>
            <Text color="green">{feedback}</Text>
          </Box>
        ) : null}
        <Box marginTop={1} flexDirection="column">
          <Text color="cyanBright">Choose an action</Text>
          <Text>1. Update defaults</Text>
          <Text>2. Set or update a peer override</Text>
          <Text>3. Remove a peer override</Text>
          <Text>4. Switch share</Text>
          <Text>5. Exit</Text>
        </Box>
        <Prompt
          key="policy-menu"
          label="Enter choice"
          onSubmit={value => {
            const trimmed = value.trim();
            if (trimmed === '1') {
              setDraftDefaults({
                allowSend: policy.defaults.allowSend,
                allowReceive: policy.defaults.allowReceive
              });
              setMode('defaults-send');
              setFeedback(null);
              return undefined;
            }
            if (trimmed === '2') {
              if (peerOptions.length === 0) {
                setDraftPeer({
                  pubkey: '',
                  allowSend: policy.defaults.allowSend,
                  allowReceive: policy.defaults.allowReceive
                });
                setMode('peer-custom');
                setFeedback(`No peers discovered for keyset ${keysetLabel}; enter a pubkey manually.`);
                return undefined;
              }

              setDraftPeer(null);
              setMode('peer-select');
              setFeedback(null);
              return undefined;
            }
            if (trimmed === '3') {
              if (peerEntries.length === 0) {
                setFeedback('No peer overrides to remove.');
                return undefined;
              }
              setMode('remove-peer');
              setFeedback(null);
              return undefined;
            }
            if (trimmed === '4') {
              setSelectedShare(null);
              setMode('select');
              setFeedback(null);
              return undefined;
            }
            if (trimmed === '5') {
              process.exit(0);
            }
            return 'Choose 1, 2, 3, 4, or 5.';
          }}
        />
      </Box>
    );
  }

  if (mode === 'defaults-send' && draftDefaults) {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Update defaults — step 1 of 2</Text>
        <Text color="gray">
          Current send policy: {formatBoolean(policy.defaults.allowSend)} (blank keeps current)
        </Text>
        <Prompt
          key="defaults-send"
          label="Allow sending to peers? (y/n)"
          onSubmit={value => {
            const result = resolveBooleanInput(value, draftDefaults.allowSend);
            if (!result.ok) {
              return result.error;
            }
            setDraftDefaults(current => ({
              ...(current ?? draftDefaults),
              allowSend: result.value
            }));
            setMode('defaults-receive');
            return undefined;
          }}
        />
      </Box>
    );
  }

  if (mode === 'defaults-receive' && draftDefaults) {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Update defaults — step 2 of 2</Text>
        <Text color="gray">
          Current receive policy: {formatBoolean(policy.defaults.allowReceive)} (blank keeps current)
        </Text>
        <Prompt
          key="defaults-receive"
          label="Allow receiving from peers? (y/n)"
          onSubmit={value => {
            const result = resolveBooleanInput(value, draftDefaults.allowReceive);
            if (!result.ok) {
              return result.error;
            }
            const nextDefaults: DraftDefaults = {
              allowSend: draftDefaults.allowSend,
              allowReceive: result.value
            };
            setMode('saving');
            void (async () => {
              try {
                const nextPolicy = setPolicyDefaults(policy, nextDefaults);
                const refreshed = await persistPolicy(selectedShare, nextPolicy);
                applyShareUpdate(refreshed, 'Defaults updated.');
              } catch (error: any) {
                setFeedback(error?.message ?? 'Failed to update defaults.');
              } finally {
                setDraftDefaults(null);
                setMode('menu');
              }
            })();
            return undefined;
          }}
        />
      </Box>
    );
  }

  if (mode === 'peer-select') {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Peer override — choose a peer</Text>
        <Text color="gray">Keyset: {keysetLabel}</Text>
        {peerOptions.map((option, index) => (
          <Text key={option.normalized}>
            {index + 1}. {keysetLabel} • index {option.index ?? '?'} — {shorten(option.normalized)}
          </Text>
        ))}
        <Text color="gray">m. Enter a custom pubkey</Text>
        <Text color="gray">0. Cancel</Text>
        <Prompt
          key="peer-select"
          label="Select peer"
          onSubmit={value => {
            const trimmed = value.trim().toLowerCase();
            if (trimmed === '' || trimmed === '0') {
              setMode('menu');
              return undefined;
            }

            if (trimmed === 'm' || trimmed === 'manual') {
              setDraftPeer({
                pubkey: '',
                allowSend: policy.defaults.allowSend,
                allowReceive: policy.defaults.allowReceive
              });
              setMode('peer-custom');
              return undefined;
            }

            const index = Number(trimmed);
            if (!Number.isInteger(index) || index < 1 || index > peerOptions.length) {
              return 'Choose a listed number, 0 to cancel, or m for manual entry.';
            }

            const option = peerOptions[index - 1];
            const existing = policy.peers?.[option.normalized];
            const initial: SharePeerPolicy = existing ?? {
              allowSend: policy.defaults.allowSend,
              allowReceive: policy.defaults.allowReceive
            };

            setDraftPeer({
              pubkey: option.raw,
              allowSend: initial.allowSend,
              allowReceive: initial.allowReceive,
              index: option.index
            });
            setMode('peer-send');
            return undefined;
          }}
        />
      </Box>
    );
  }

  if (mode === 'peer-custom' && draftPeer) {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Peer override — enter pubkey</Text>
        <Text color="gray">Provide a peer pubkey (hex or npub). Leave blank to cancel.</Text>
        <Prompt
          key="peer-custom"
          label="Peer pubkey"
          onSubmit={value => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
              setDraftPeer(null);
              setMode('menu');
              return undefined;
            }

            const normalized = normalisePeerKey(trimmed);
            const existing = policy.peers?.[normalized];
            const option = peerOptionLookup.get(normalized);
            const initial: SharePeerPolicy = existing ?? {
              allowSend: policy.defaults.allowSend,
              allowReceive: policy.defaults.allowReceive
            };

            setDraftPeer({
              pubkey: trimmed,
              allowSend: initial.allowSend,
              allowReceive: initial.allowReceive,
              index: option?.index
            });
            setMode('peer-send');
            return undefined;
          }}
        />
      </Box>
    );
  }

  if (mode === 'peer-send' && draftPeer) {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Peer override — step 2 of 3</Text>
        <Text color="gray">Peer: {formatPeerLabel(draftPeer, keysetLabel)}</Text>
        <Text color="gray">
          Current send policy: {formatBoolean(draftPeer.allowSend)} (blank keeps current)
        </Text>
        <Prompt
          key="peer-send"
          label="Allow sending to this peer? (y/n)"
          onSubmit={value => {
            const result = resolveBooleanInput(value, draftPeer.allowSend);
            if (!result.ok) {
              return result.error;
            }
            setDraftPeer(current =>
              current
                ? {
                    ...current,
                    allowSend: result.value
                  }
                : null
            );
            setMode('peer-receive');
            return undefined;
          }}
        />
      </Box>
    );
  }

  if (mode === 'peer-receive' && draftPeer) {
    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Peer override — step 3 of 3</Text>
        <Text color="gray">Peer: {formatPeerLabel(draftPeer, keysetLabel)}</Text>
        <Text color="gray">
          Current receive policy: {formatBoolean(draftPeer.allowReceive)} (blank keeps current)
        </Text>
        <Prompt
          key="peer-receive"
          label="Allow receiving from this peer? (y/n)"
          onSubmit={value => {
            const result = resolveBooleanInput(value, draftPeer.allowReceive);
            if (!result.ok) {
              return result.error;
            }

            const nextPeer: DraftPeer = {
              ...draftPeer,
              allowReceive: result.value
            };

            setMode('saving');
            void (async () => {
              try {
                const nextPolicy = upsertPeerPolicy(policy, nextPeer.pubkey, nextPeer);
                const refreshed = await persistPolicy(selectedShare, nextPolicy);
                applyShareUpdate(refreshed, 'Peer override saved.');
              } catch (error: any) {
                setFeedback(error?.message ?? 'Failed to save peer override.');
              } finally {
                setDraftPeer(null);
                setMode('menu');
              }
            })();
            return undefined;
          }}
        />
      </Box>
    );
  }

  if (mode === 'remove-peer') {
    if (peerEntries.length === 0) {
      setMode('menu');
      setFeedback('No peer overrides to remove.');
      return null;
    }

    return (
      <Box flexDirection="column">
        <Text color="cyanBright">Remove peer override</Text>
        {peerEntries.map(([peer], index) => (
          <Text key={peer}>
            {index + 1}. {peer}
          </Text>
        ))}
        <Prompt
          key="remove-peer"
          label="Enter number to remove (blank cancels)"
          onSubmit={value => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
              setMode('menu');
              return undefined;
            }

            const index = Number(trimmed);
            if (!Number.isInteger(index) || index < 1 || index > peerEntries.length) {
              return 'Enter a valid number.';
            }

            const [peer] = peerEntries[index - 1];
            setMode('saving');
            void (async () => {
              try {
                const nextPolicy = removePeerPolicy(policy, peer);
                const refreshed = await persistPolicy(selectedShare, nextPolicy);
                applyShareUpdate(refreshed, 'Peer override removed.');
              } catch (error: any) {
                setFeedback(error?.message ?? 'Failed to remove peer override.');
              } finally {
                setMode('menu');
              }
            })();
            return undefined;
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="red">Unknown policy state.</Text>
    </Box>
  );
}
