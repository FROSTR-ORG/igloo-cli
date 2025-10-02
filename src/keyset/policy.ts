import {normalizePubkey} from '@frostr/igloo-core';
import {
  ShareFileRecord,
  SharePeerPolicy,
  SharePolicy,
  SharePolicyDefaults
} from './types.js';

export const DEFAULT_POLICY_DEFAULTS: SharePolicyDefaults = {
  allowSend: true,
  allowReceive: true
};

export function createDefaultPolicy(timestamp = new Date().toISOString()): SharePolicy {
  return {
    defaults: {...DEFAULT_POLICY_DEFAULTS},
    peers: {},
    updatedAt: timestamp
  };
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function normalisePeerEntry(
  peerPolicy: SharePeerPolicy | undefined,
  defaults: SharePolicyDefaults
): SharePeerPolicy {
  if (!peerPolicy) {
    return {
      allowSend: defaults.allowSend,
      allowReceive: defaults.allowReceive
    };
  }

  return {
    allowSend: coerceBoolean(peerPolicy.allowSend, defaults.allowSend),
    allowReceive: coerceBoolean(peerPolicy.allowReceive, defaults.allowReceive),
    updatedAt: peerPolicy.updatedAt
  };
}

function normalisePolicyInput(policy: SharePolicy | undefined, timestamp?: string): SharePolicy {
  if (!policy) {
    return createDefaultPolicy(timestamp);
  }

  const defaults: SharePolicyDefaults = {
    allowSend: coerceBoolean(policy.defaults?.allowSend, true),
    allowReceive: coerceBoolean(policy.defaults?.allowReceive, true)
  };

  const peers: Record<string, SharePeerPolicy> = {};

  if (policy.peers) {
    for (const [rawKey, value] of Object.entries(policy.peers)) {
      if (!rawKey) {
        continue;
      }

      let normalizedKey = rawKey.toLowerCase();
      try {
        normalizedKey = normalizePubkey(rawKey);
      } catch {
        // Fall back to lowercase input when normalization fails.
      }
      const entry = normalisePeerEntry(value, defaults);

      peers[normalizedKey] = entry;
    }
  }

  const cleanPeers = Object.keys(peers).length > 0 ? peers : {};

  return {
    defaults,
    peers: cleanPeers,
    updatedAt: policy.updatedAt ?? timestamp ?? new Date().toISOString()
  };
}

export function ensurePolicy(record: ShareFileRecord, timestamp?: string): SharePolicy {
  const resolvedTimestamp = record.policy?.updatedAt ?? record.savedAt ?? timestamp;
  return normalisePolicyInput(record.policy, resolvedTimestamp);
}

export function updatePolicyTimestamp(policy: SharePolicy, timestamp = new Date().toISOString()): SharePolicy {
  return {
    ...policy,
    updatedAt: timestamp
  };
}

export function setPolicyDefaults(
  policy: SharePolicy,
  defaults: SharePolicyDefaults,
  timestamp = new Date().toISOString()
): SharePolicy {
  const normalisedDefaults: SharePolicyDefaults = {
    allowSend: coerceBoolean(defaults.allowSend, true),
    allowReceive: coerceBoolean(defaults.allowReceive, true)
  };

  const updatedPeers: Record<string, SharePeerPolicy> = {};
  if (policy.peers) {
    for (const [peer, entry] of Object.entries(policy.peers)) {
      updatedPeers[peer] = normalisePeerEntry(entry, normalisedDefaults);
    }
  }

  return {
    defaults: normalisedDefaults,
    peers: updatedPeers,
    updatedAt: timestamp
  };
}

export function upsertPeerPolicy(
  policy: SharePolicy,
  pubkey: string,
  peerPolicy: SharePeerPolicy,
  timestamp = new Date().toISOString()
): SharePolicy {
  const normalizedPubkey = (() => {
    try {
      return normalizePubkey(pubkey);
    } catch {
      return pubkey.toLowerCase();
    }
  })();

  const nextPeers: Record<string, SharePeerPolicy> = {
    ...(policy.peers ?? {})
  };

  const entry: SharePeerPolicy = {
    allowSend: coerceBoolean(peerPolicy.allowSend, policy.defaults.allowSend),
    allowReceive: coerceBoolean(peerPolicy.allowReceive, policy.defaults.allowReceive),
    updatedAt: timestamp
  };

  if (
    entry.allowSend === policy.defaults.allowSend &&
    entry.allowReceive === policy.defaults.allowReceive
  ) {
    delete nextPeers[normalizedPubkey];
  } else {
    nextPeers[normalizedPubkey] = entry;
  }

  return {
    defaults: policy.defaults,
    peers: nextPeers,
    updatedAt: timestamp
  };
}

export function removePeerPolicy(policy: SharePolicy, pubkey: string, timestamp = new Date().toISOString()): SharePolicy {
  const normalizedPubkey = (() => {
    try {
      return normalizePubkey(pubkey);
    } catch {
      return pubkey.toLowerCase();
    }
  })();

  const nextPeers = {...(policy.peers ?? {})};
  delete nextPeers[normalizedPubkey];

  return {
    defaults: policy.defaults,
    peers: nextPeers,
    updatedAt: timestamp
  };
}

export function pruneEmptyPeers(policy: SharePolicy): SharePolicy {
  if (!policy.peers || Object.keys(policy.peers).length > 0) {
    return policy;
  }

  const {peers, ...rest} = policy;
  return rest;
}
