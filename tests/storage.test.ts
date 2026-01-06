import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {makeTmp} from './helpers/tmp.js';

import {
  ensureShareDirectory,
  readShareFiles,
  saveShareRecord,
  loadShareRecord
} from '../src/keyset/storage.js';
import {getShareDirectory} from '../src/keyset/paths.js';
import {SHARE_FILE_VERSION} from '../src/keyset/crypto.js';
import type {ShareFileRecord} from '../src/keyset/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestRecord(overrides: Partial<ShareFileRecord> = {}): ShareFileRecord {
  return {
    id: 'test-share-1',
    name: 'Test Keyset share 1',
    share: 'encrypted-share-data-base64url',
    salt: 'a'.repeat(32),
    groupCredential: 'bfgroup1testcredential',
    ...overrides
  };
}

// =============================================================================
// Test Setup / Teardown
// =============================================================================

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await makeTmp('igloo-storage-');
  process.env.IGLOO_APPDATA = tmpDir;
});

afterEach(async () => {
  delete process.env.IGLOO_APPDATA;
  await fs.rm(tmpDir, {recursive: true, force: true});
});

// =============================================================================
// ensureShareDirectory
// =============================================================================

test('ensureShareDirectory creates directory when missing', async () => {
  const dir = await ensureShareDirectory();
  const stat = await fs.stat(dir);
  assert.ok(stat.isDirectory());
});

test('ensureShareDirectory respects directory override', async () => {
  const customDir = path.join(tmpDir, 'custom-shares');
  const result = await ensureShareDirectory(customDir);
  assert.equal(result, customDir);

  const stat = await fs.stat(customDir);
  assert.ok(stat.isDirectory());

  // Default share directory should NOT be created
  const defaultDir = getShareDirectory();
  await assert.rejects(
    fs.stat(defaultDir),
    {code: 'ENOENT'}
  );
});

test('ensureShareDirectory is idempotent', async () => {
  const dir1 = await ensureShareDirectory();
  const dir2 = await ensureShareDirectory();
  assert.equal(dir1, dir2);

  const stat = await fs.stat(dir1);
  assert.ok(stat.isDirectory());
});

test('ensureShareDirectory returns correct path', async () => {
  const result = await ensureShareDirectory();
  const expected = getShareDirectory();
  assert.equal(result, expected);
});

// =============================================================================
// readShareFiles
// =============================================================================

test('readShareFiles returns empty array when directory missing', async () => {
  // Don't create the directory - just read
  const result = await readShareFiles();
  assert.deepEqual(result, []);
});

test('readShareFiles returns empty array for empty directory', async () => {
  await ensureShareDirectory();
  const result = await readShareFiles();
  assert.deepEqual(result, []);
});

test('readShareFiles parses valid JSON share files', async () => {
  const dir = await ensureShareDirectory();
  const record = createTestRecord({id: 'valid-share'});
  const filepath = path.join(dir, 'valid-share.json');
  await fs.writeFile(filepath, JSON.stringify(record), 'utf8');

  const result = await readShareFiles();
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'valid-share');
  assert.equal(result[0].name, record.name);
  assert.equal(result[0].share, record.share);
});

test('readShareFiles ignores non-JSON files', async () => {
  const dir = await ensureShareDirectory();

  // Create a valid JSON share file
  const record = createTestRecord({id: 'json-share'});
  await fs.writeFile(path.join(dir, 'json-share.json'), JSON.stringify(record), 'utf8');

  // Create non-JSON files
  await fs.writeFile(path.join(dir, 'readme.txt'), 'This is not JSON', 'utf8');
  await fs.writeFile(path.join(dir, 'backup.bak'), 'backup data', 'utf8');
  await fs.writeFile(path.join(dir, '.hidden'), 'hidden file', 'utf8');

  const result = await readShareFiles();
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'json-share');
});

test('readShareFiles skips malformed JSON silently', async () => {
  const dir = await ensureShareDirectory();

  // Create a valid share file
  const goodRecord = createTestRecord({id: 'good-share'});
  await fs.writeFile(path.join(dir, 'good-share.json'), JSON.stringify(goodRecord), 'utf8');

  // Create a malformed JSON file
  await fs.writeFile(path.join(dir, 'bad-share.json'), '{broken json', 'utf8');

  // Create another valid share file
  const anotherRecord = createTestRecord({id: 'another-share'});
  await fs.writeFile(path.join(dir, 'another-share.json'), JSON.stringify(anotherRecord), 'utf8');

  const result = await readShareFiles();
  // Should have 2 valid shares, malformed one is silently skipped
  assert.equal(result.length, 2);
  const ids = result.map(r => r.id).sort();
  assert.deepEqual(ids, ['another-share', 'good-share']);
});

test('readShareFiles attaches filepath to each entry', async () => {
  const dir = await ensureShareDirectory();
  const record = createTestRecord({id: 'filepath-test'});
  const expectedPath = path.join(dir, 'filepath-test.json');
  await fs.writeFile(expectedPath, JSON.stringify(record), 'utf8');

  const result = await readShareFiles();
  assert.equal(result.length, 1);
  assert.equal(result[0].filepath, expectedPath);
});

test('readShareFiles ensures policy on loaded data', async () => {
  const dir = await ensureShareDirectory();
  // Create a record WITHOUT a policy field
  const record = createTestRecord({id: 'no-policy'});
  delete (record as any).policy;
  await fs.writeFile(path.join(dir, 'no-policy.json'), JSON.stringify(record), 'utf8');

  const result = await readShareFiles();
  assert.equal(result.length, 1);
  // Policy should be ensured with defaults
  assert.ok(result[0].policy);
  assert.equal(result[0].policy.defaults.allowSend, true);
  assert.equal(result[0].policy.defaults.allowReceive, true);
});

// =============================================================================
// saveShareRecord
// =============================================================================

test('saveShareRecord creates JSON file in share directory', async () => {
  const record = createTestRecord({id: 'save-test'});
  const filepath = await saveShareRecord(record);

  assert.ok(filepath.endsWith('save-test.json'));
  const stat = await fs.stat(filepath);
  assert.ok(stat.isFile());
});

test('saveShareRecord uses record.id as filename', async () => {
  const record1 = createTestRecord({id: 'share-alpha'});
  const record2 = createTestRecord({id: 'share-beta'});

  const filepath1 = await saveShareRecord(record1);
  const filepath2 = await saveShareRecord(record2);

  assert.ok(filepath1.endsWith('share-alpha.json'));
  assert.ok(filepath2.endsWith('share-beta.json'));
});

test('saveShareRecord adds version if missing', async () => {
  const record = createTestRecord({id: 'no-version'});
  delete (record as any).version;

  await saveShareRecord(record);

  const dir = getShareDirectory();
  const raw = await fs.readFile(path.join(dir, 'no-version.json'), 'utf8');
  const saved = JSON.parse(raw);
  assert.equal(saved.version, SHARE_FILE_VERSION);
});

test('saveShareRecord adds savedAt timestamp if missing', async () => {
  const record = createTestRecord({id: 'no-timestamp'});
  delete (record as any).savedAt;

  const before = new Date().toISOString();
  await saveShareRecord(record);
  const after = new Date().toISOString();

  const dir = getShareDirectory();
  const raw = await fs.readFile(path.join(dir, 'no-timestamp.json'), 'utf8');
  const saved = JSON.parse(raw);

  assert.ok(saved.savedAt >= before);
  assert.ok(saved.savedAt <= after);
});

test('saveShareRecord prunes empty peers from policy', async () => {
  const record = createTestRecord({
    id: 'empty-peers',
    policy: {
      defaults: {allowSend: true, allowReceive: true},
      peers: {},
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  });

  await saveShareRecord(record);

  const dir = getShareDirectory();
  const raw = await fs.readFile(path.join(dir, 'empty-peers.json'), 'utf8');
  const saved = JSON.parse(raw);

  // Empty peers should be pruned
  assert.ok(!('peers' in saved.policy) || Object.keys(saved.policy.peers).length === 0);
});

test('saveShareRecord respects directory override', async () => {
  const customDir = path.join(tmpDir, 'custom-save-dir');
  const record = createTestRecord({id: 'custom-dir-share'});

  const filepath = await saveShareRecord(record, {directory: customDir});

  assert.ok(filepath.startsWith(customDir));
  assert.ok(filepath.endsWith('custom-dir-share.json'));

  const stat = await fs.stat(filepath);
  assert.ok(stat.isFile());
});

// =============================================================================
// loadShareRecord
// =============================================================================

test('loadShareRecord loads by id', async () => {
  const record = createTestRecord({id: 'load-by-id'});
  await saveShareRecord(record);

  const loaded = await loadShareRecord({id: 'load-by-id'});
  assert.ok(loaded);
  assert.equal(loaded.id, 'load-by-id');
  assert.equal(loaded.name, record.name);
  assert.equal(loaded.share, record.share);
});

test('loadShareRecord loads by filepath', async () => {
  const record = createTestRecord({id: 'load-by-path'});
  const savedPath = await saveShareRecord(record);

  const loaded = await loadShareRecord({filepath: savedPath});
  assert.ok(loaded);
  assert.equal(loaded.id, 'load-by-path');
  assert.equal(loaded.filepath, savedPath);
});

test('loadShareRecord returns undefined for missing id', async () => {
  const result = await loadShareRecord({id: 'nonexistent-id'});
  assert.equal(result, undefined);
});

test('loadShareRecord returns undefined for missing filepath', async () => {
  const result = await loadShareRecord({filepath: '/nonexistent/path/share.json'});
  assert.equal(result, undefined);
});

test('loadShareRecord ensures policy on loaded data', async () => {
  // Manually write a file without policy
  const dir = await ensureShareDirectory();
  const record = createTestRecord({id: 'no-policy-load'});
  delete (record as any).policy;
  const filepath = path.join(dir, 'no-policy-load.json');
  await fs.writeFile(filepath, JSON.stringify(record), 'utf8');

  const loaded = await loadShareRecord({id: 'no-policy-load'});
  assert.ok(loaded);
  assert.ok(loaded.policy);
  assert.equal(loaded.policy.defaults.allowSend, true);
  assert.equal(loaded.policy.defaults.allowReceive, true);
});

// =============================================================================
// Integration: Roundtrip
// =============================================================================

test('roundtrip: save then load returns equivalent data', async () => {
  const original = createTestRecord({
    id: 'roundtrip-test',
    name: 'Roundtrip Test Share',
    share: 'encrypted-data-for-roundtrip',
    salt: 'b'.repeat(32),
    groupCredential: 'bfgroup1roundtrip',
    keysetName: 'TestKeyset',
    index: 2,
    policy: {
      defaults: {allowSend: false, allowReceive: true},
      peers: {
        somepeer: {allowSend: true, allowReceive: false}
      },
      updatedAt: '2024-06-15T12:00:00.000Z'
    }
  });

  const savedPath = await saveShareRecord(original);
  const loaded = await loadShareRecord({filepath: savedPath});

  assert.ok(loaded);
  assert.equal(loaded.id, original.id);
  assert.equal(loaded.name, original.name);
  assert.equal(loaded.share, original.share);
  assert.equal(loaded.salt, original.salt);
  assert.equal(loaded.groupCredential, original.groupCredential);
  assert.equal(loaded.keysetName, original.keysetName);
  assert.equal(loaded.index, original.index);

  // Policy should be normalized but values preserved
  assert.equal(loaded.policy.defaults.allowSend, false);
  assert.equal(loaded.policy.defaults.allowReceive, true);
  assert.ok('somepeer' in loaded.policy.peers!);
});
