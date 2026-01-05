import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_POLICY_DEFAULTS,
  createDefaultPolicy,
  ensurePolicy,
  updatePolicyTimestamp,
  setPolicyDefaults,
  upsertPeerPolicy,
  removePeerPolicy,
  pruneEmptyPeers
} from '../src/keyset/policy.js';
import type {ShareFileRecord, SharePolicy, SharePeerPolicy} from '../src/keyset/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestPolicy(overrides: Partial<SharePolicy> = {}): SharePolicy {
  return {
    defaults: {allowSend: true, allowReceive: true},
    peers: {},
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  };
}

function createTestRecord(policyOverrides?: Partial<SharePolicy>): ShareFileRecord {
  return {
    id: 'test-share',
    name: 'Test Share',
    share: 'encrypted-share-data',
    salt: 'a'.repeat(32),
    groupCredential: 'bfgroup1testcredential',
    policy: policyOverrides ? createTestPolicy(policyOverrides) : undefined
  };
}

// =============================================================================
// DEFAULT_POLICY_DEFAULTS
// =============================================================================

test('DEFAULT_POLICY_DEFAULTS has allowSend true', () => {
  assert.equal(DEFAULT_POLICY_DEFAULTS.allowSend, true);
});

test('DEFAULT_POLICY_DEFAULTS has allowReceive true', () => {
  assert.equal(DEFAULT_POLICY_DEFAULTS.allowReceive, true);
});

// =============================================================================
// createDefaultPolicy
// =============================================================================

test('createDefaultPolicy returns allowSend true', () => {
  const policy = createDefaultPolicy();
  assert.equal(policy.defaults.allowSend, true);
});

test('createDefaultPolicy returns allowReceive true', () => {
  const policy = createDefaultPolicy();
  assert.equal(policy.defaults.allowReceive, true);
});

test('createDefaultPolicy returns empty peers object', () => {
  const policy = createDefaultPolicy();
  assert.deepEqual(policy.peers, {});
});

test('createDefaultPolicy uses provided timestamp', () => {
  const timestamp = '2024-06-15T12:00:00.000Z';
  const policy = createDefaultPolicy(timestamp);
  assert.equal(policy.updatedAt, timestamp);
});

test('createDefaultPolicy uses current time when no timestamp provided', () => {
  const before = new Date().toISOString();
  const policy = createDefaultPolicy();
  const after = new Date().toISOString();

  assert.ok(policy.updatedAt >= before);
  assert.ok(policy.updatedAt <= after);
});

// =============================================================================
// coerceBoolean (tested via ensurePolicy)
// =============================================================================

test('coerceBoolean handles true boolean', () => {
  const record = createTestRecord({
    defaults: {allowSend: true, allowReceive: true}
  });
  const result = ensurePolicy(record);
  assert.equal(result.defaults.allowSend, true);
  assert.equal(typeof result.defaults.allowSend, 'boolean');
});

test('coerceBoolean handles false boolean', () => {
  const record = createTestRecord({
    defaults: {allowSend: false, allowReceive: false}
  });
  const result = ensurePolicy(record);
  assert.equal(result.defaults.allowSend, false);
  assert.equal(result.defaults.allowReceive, false);
});

test('coerceBoolean coerces "true" string to true', () => {
  const record: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {
        allowSend: 'true' as unknown as boolean,
        allowReceive: true
      },
      peers: {},
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result = ensurePolicy(record);
  assert.equal(result.defaults.allowSend, true);
  assert.equal(typeof result.defaults.allowSend, 'boolean');
});

test('coerceBoolean coerces "false" string to false', () => {
  const record: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {
        allowSend: 'false' as unknown as boolean,
        allowReceive: 'false' as unknown as boolean
      },
      peers: {},
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result = ensurePolicy(record);
  assert.equal(result.defaults.allowSend, false);
  assert.equal(result.defaults.allowReceive, false);
});

test('coerceBoolean coerces "1" and "0" strings', () => {
  const record: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {
        allowSend: '1' as unknown as boolean,
        allowReceive: '0' as unknown as boolean
      },
      peers: {},
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result = ensurePolicy(record);
  assert.equal(result.defaults.allowSend, true);
  assert.equal(result.defaults.allowReceive, false);
});

test('coerceBoolean coerces "yes"/"no" strings', () => {
  const record: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {
        allowSend: 'yes' as unknown as boolean,
        allowReceive: 'no' as unknown as boolean
      },
      peers: {},
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result = ensurePolicy(record);
  assert.equal(result.defaults.allowSend, true);
  assert.equal(result.defaults.allowReceive, false);
});

test('coerceBoolean coerces "on"/"off" strings', () => {
  const record: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {
        allowSend: 'on' as unknown as boolean,
        allowReceive: 'off' as unknown as boolean
      },
      peers: {},
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result = ensurePolicy(record);
  assert.equal(result.defaults.allowSend, true);
  assert.equal(result.defaults.allowReceive, false);
});

test('coerceBoolean is case insensitive', () => {
  const record: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {
        allowSend: 'TRUE' as unknown as boolean,
        allowReceive: 'FALSE' as unknown as boolean
      },
      peers: {},
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result = ensurePolicy(record);
  assert.equal(result.defaults.allowSend, true);
  assert.equal(result.defaults.allowReceive, false);

  // Also test mixed case
  const record2: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {
        allowSend: 'Yes' as unknown as boolean,
        allowReceive: 'No' as unknown as boolean
      },
      peers: {},
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result2 = ensurePolicy(record2);
  assert.equal(result2.defaults.allowSend, true);
  assert.equal(result2.defaults.allowReceive, false);
});

test('coerceBoolean returns fallback for invalid values', () => {
  const record: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {
        allowSend: 'invalid' as unknown as boolean,
        allowReceive: 'maybe' as unknown as boolean
      },
      peers: {},
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result = ensurePolicy(record);
  // Fallback is true for both
  assert.equal(result.defaults.allowSend, true);
  assert.equal(result.defaults.allowReceive, true);
});

// =============================================================================
// ensurePolicy
// =============================================================================

test('ensurePolicy creates default for undefined policy', () => {
  const record: ShareFileRecord = {
    id: 'test',
    name: 'Test',
    share: 'encrypted',
    salt: 'a'.repeat(32),
    groupCredential: 'bfgroup1...',
    policy: undefined
  };
  const result = ensurePolicy(record);
  assert.equal(result.defaults.allowSend, true);
  assert.equal(result.defaults.allowReceive, true);
  assert.deepEqual(result.peers, {});
});

test('ensurePolicy normalizes peer pubkeys', () => {
  // Use a pubkey with 02 prefix which normalizePubkey should strip
  const prefixedPubkey = '02abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234';
  const expectedNormalized = 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234';
  const record: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {allowSend: true, allowReceive: true},
      peers: {
        [prefixedPubkey]: {allowSend: false, allowReceive: true}
      },
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result = ensurePolicy(record);
  // Key should be normalized (02 prefix stripped)
  const peerKeys = Object.keys(result.peers!);
  assert.equal(peerKeys.length, 1);
  assert.equal(peerKeys[0], expectedNormalized);
  // Verify the policy values are preserved
  assert.equal(result.peers![expectedNormalized].allowSend, false);
  assert.equal(result.peers![expectedNormalized].allowReceive, true);
});

test('ensurePolicy preserves valid peers', () => {
  const pubkey = 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234';
  const record: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {allowSend: true, allowReceive: true},
      peers: {
        [pubkey]: {allowSend: false, allowReceive: false}
      },
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result = ensurePolicy(record);
  assert.ok(pubkey in result.peers!);
  assert.equal(result.peers![pubkey].allowSend, false);
  assert.equal(result.peers![pubkey].allowReceive, false);
});

test('ensurePolicy skips empty string pubkey keys', () => {
  const record: ShareFileRecord = {
    ...createTestRecord(),
    policy: {
      defaults: {allowSend: true, allowReceive: true},
      peers: {
        '': {allowSend: false, allowReceive: false},
        'validpubkey': {allowSend: false, allowReceive: true}
      },
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  };
  const result = ensurePolicy(record);
  assert.ok(!('' in result.peers!));
  assert.ok('validpubkey' in result.peers!);
});

test('ensurePolicy uses savedAt as timestamp fallback', () => {
  const savedAt = '2024-03-15T10:30:00.000Z';
  const record: ShareFileRecord = {
    id: 'test',
    name: 'Test',
    share: 'encrypted',
    salt: 'a'.repeat(32),
    groupCredential: 'bfgroup1...',
    savedAt,
    policy: undefined
  };
  const result = ensurePolicy(record);
  assert.equal(result.updatedAt, savedAt);
});

// =============================================================================
// setPolicyDefaults
// =============================================================================

test('setPolicyDefaults updates defaults', () => {
  const policy = createTestPolicy({
    defaults: {allowSend: true, allowReceive: true}
  });
  const result = setPolicyDefaults(policy, {allowSend: false, allowReceive: false});
  assert.equal(result.defaults.allowSend, false);
  assert.equal(result.defaults.allowReceive, false);
});

test('setPolicyDefaults re-normalizes existing peers', () => {
  const pubkey = 'testpeer';
  const policy: SharePolicy = {
    defaults: {allowSend: true, allowReceive: true},
    peers: {
      [pubkey]: {
        allowSend: 'yes' as unknown as boolean,
        allowReceive: 'no' as unknown as boolean
      }
    },
    updatedAt: '2024-01-01T00:00:00.000Z'
  };
  const result = setPolicyDefaults(policy, {allowSend: false, allowReceive: false});
  // Peer values should be coerced to proper booleans
  assert.equal(result.peers![pubkey].allowSend, true);
  assert.equal(result.peers![pubkey].allowReceive, false);
});

test('setPolicyDefaults updates timestamp', () => {
  const policy = createTestPolicy();
  const newTimestamp = '2024-06-15T12:00:00.000Z';
  const result = setPolicyDefaults(policy, {allowSend: true, allowReceive: true}, newTimestamp);
  assert.equal(result.updatedAt, newTimestamp);
});

// =============================================================================
// upsertPeerPolicy
// =============================================================================

test('upsertPeerPolicy adds new peer', () => {
  const policy = createTestPolicy();
  const pubkey = 'newpeer1234';
  const result = upsertPeerPolicy(policy, pubkey, {allowSend: false, allowReceive: true});
  assert.ok(pubkey in result.peers!);
  assert.equal(result.peers![pubkey].allowSend, false);
  assert.equal(result.peers![pubkey].allowReceive, true);
});

test('upsertPeerPolicy updates existing peer', () => {
  const pubkey = 'existingpeer';
  const policy: SharePolicy = {
    defaults: {allowSend: true, allowReceive: true},
    peers: {
      [pubkey]: {allowSend: false, allowReceive: false}
    },
    updatedAt: '2024-01-01T00:00:00.000Z'
  };
  const result = upsertPeerPolicy(policy, pubkey, {allowSend: true, allowReceive: false});
  // Since allowSend matches default (true) but allowReceive doesn't (false vs true),
  // the peer entry should still exist
  assert.ok(pubkey in result.peers!);
  assert.equal(result.peers![pubkey].allowReceive, false);
});

test('upsertPeerPolicy removes peer when matching defaults', () => {
  const pubkey = 'removablepeer';
  const policy: SharePolicy = {
    defaults: {allowSend: true, allowReceive: true},
    peers: {
      [pubkey]: {allowSend: false, allowReceive: false}
    },
    updatedAt: '2024-01-01T00:00:00.000Z'
  };
  // Update peer to match defaults - should be removed
  const result = upsertPeerPolicy(policy, pubkey, {allowSend: true, allowReceive: true});
  assert.ok(!(pubkey in result.peers!));
});

test('upsertPeerPolicy handles non-standard pubkey formats', () => {
  const policy = createTestPolicy();
  const nonStandardPubkey = 'INVALID_NOT_HEX!@#';
  // Use policy that differs from defaults so peer is stored
  const result = upsertPeerPolicy(policy, nonStandardPubkey, {allowSend: false, allowReceive: false});
  // normalizePubkey may return the input unchanged for invalid formats
  // The peer should be stored under some key
  const peerKeys = Object.keys(result.peers!);
  assert.equal(peerKeys.length, 1);
  // Verify the policy values are correct regardless of key normalization
  const storedKey = peerKeys[0];
  assert.equal(result.peers![storedKey].allowSend, false);
  assert.equal(result.peers![storedKey].allowReceive, false);
});

// =============================================================================
// removePeerPolicy
// =============================================================================

test('removePeerPolicy deletes peer', () => {
  const pubkey = 'peertodelete';
  const policy: SharePolicy = {
    defaults: {allowSend: true, allowReceive: true},
    peers: {
      [pubkey]: {allowSend: false, allowReceive: false}
    },
    updatedAt: '2024-01-01T00:00:00.000Z'
  };
  const result = removePeerPolicy(policy, pubkey);
  assert.ok(!(pubkey in result.peers!));
});

test('removePeerPolicy is no-op for missing peer', () => {
  const policy = createTestPolicy();
  // Should not throw
  const result = removePeerPolicy(policy, 'nonexistent');
  assert.deepEqual(result.peers, {});
});

test('removePeerPolicy updates timestamp', () => {
  const policy = createTestPolicy();
  const newTimestamp = '2024-06-15T12:00:00.000Z';
  const result = removePeerPolicy(policy, 'anypeer', newTimestamp);
  assert.equal(result.updatedAt, newTimestamp);
});

// =============================================================================
// updatePolicyTimestamp
// =============================================================================

test('updatePolicyTimestamp changes updatedAt', () => {
  const policy = createTestPolicy({updatedAt: '2024-01-01T00:00:00.000Z'});
  const newTimestamp = '2024-12-25T00:00:00.000Z';
  const result = updatePolicyTimestamp(policy, newTimestamp);
  assert.equal(result.updatedAt, newTimestamp);
  // Original should be unchanged
  assert.equal(policy.updatedAt, '2024-01-01T00:00:00.000Z');
});

// =============================================================================
// pruneEmptyPeers
// =============================================================================

test('pruneEmptyPeers removes peers key when empty', () => {
  const policy: SharePolicy = {
    defaults: {allowSend: true, allowReceive: true},
    peers: {},
    updatedAt: '2024-01-01T00:00:00.000Z'
  };
  const result = pruneEmptyPeers(policy);
  assert.ok(!('peers' in result));
});

test('pruneEmptyPeers preserves non-empty peers', () => {
  const policy: SharePolicy = {
    defaults: {allowSend: true, allowReceive: true},
    peers: {
      somepeer: {allowSend: false, allowReceive: true}
    },
    updatedAt: '2024-01-01T00:00:00.000Z'
  };
  const result = pruneEmptyPeers(policy);
  assert.ok('peers' in result);
  assert.ok('somepeer' in result.peers!);
});

// =============================================================================
// Immutability
// =============================================================================

test('policy functions do not mutate input objects', () => {
  const originalPolicy: SharePolicy = {
    defaults: {allowSend: true, allowReceive: true},
    peers: {
      existingpeer: {allowSend: false, allowReceive: false}
    },
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  // Deep clone for comparison
  const originalSnapshot = JSON.stringify(originalPolicy);

  // Test each function
  updatePolicyTimestamp(originalPolicy, '2024-12-25T00:00:00.000Z');
  assert.equal(JSON.stringify(originalPolicy), originalSnapshot);

  setPolicyDefaults(originalPolicy, {allowSend: false, allowReceive: false});
  assert.equal(JSON.stringify(originalPolicy), originalSnapshot);

  upsertPeerPolicy(originalPolicy, 'newpeer', {allowSend: false, allowReceive: true});
  assert.equal(JSON.stringify(originalPolicy), originalSnapshot);

  removePeerPolicy(originalPolicy, 'existingpeer');
  assert.equal(JSON.stringify(originalPolicy), originalSnapshot);

  pruneEmptyPeers(originalPolicy);
  assert.equal(JSON.stringify(originalPolicy), originalSnapshot);
});
