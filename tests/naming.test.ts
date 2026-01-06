import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {makeTmp} from './helpers/tmp.js';
import {
  slugifyKeysetName,
  buildShareId,
  buildShareFilePath,
  keysetNameExists
} from '../src/keyset/naming.js';
import {getShareDirectory} from '../src/keyset/paths.js';

// =============================================================================
// slugifyKeysetName
// =============================================================================

test('slugifyKeysetName lowercases', () => {
  assert.equal(slugifyKeysetName('MyKey'), 'mykey');
  assert.equal(slugifyKeysetName('UPPERCASE'), 'uppercase');
  assert.equal(slugifyKeysetName('MixedCase'), 'mixedcase');
});

test('slugifyKeysetName replaces spaces with hyphens', () => {
  assert.equal(slugifyKeysetName('my key'), 'my-key');
  assert.equal(slugifyKeysetName('my  key'), 'my-key'); // Multiple spaces become single hyphen
  assert.equal(slugifyKeysetName('my key set'), 'my-key-set');
});

test('slugifyKeysetName removes special chars', () => {
  assert.equal(slugifyKeysetName('key@123!'), 'key-123');
  assert.equal(slugifyKeysetName('test#$%name'), 'test-name');
  assert.equal(slugifyKeysetName('key_with_underscores'), 'key-with-underscores');
});

test('slugifyKeysetName trims leading/trailing hyphens', () => {
  assert.equal(slugifyKeysetName('--key--'), 'key');
  assert.equal(slugifyKeysetName('---test---'), 'test');
  assert.equal(slugifyKeysetName('@#$key@#$'), 'key');
});

test('slugifyKeysetName returns "keyset" for empty', () => {
  assert.equal(slugifyKeysetName(''), 'keyset');
  assert.equal(slugifyKeysetName('   '), 'keyset');
  assert.equal(slugifyKeysetName('@#$'), 'keyset'); // All special chars = empty result
});

// =============================================================================
// buildShareId
// =============================================================================

test('buildShareId combines slug and index', () => {
  assert.equal(buildShareId('test', 1), 'test_share_1');
  assert.equal(buildShareId('vault', 2), 'vault_share_2');
  assert.equal(buildShareId('backup', 10), 'backup_share_10');
});

test('buildShareId slugifies name', () => {
  assert.equal(buildShareId('My Keyset', 2), 'my-keyset_share_2');
  assert.equal(buildShareId('Test@Key', 1), 'test-key_share_1');
  assert.equal(buildShareId('UPPERCASE NAME', 3), 'uppercase-name_share_3');
});

// =============================================================================
// buildShareFilePath
// =============================================================================

test('buildShareFilePath builds full path with directory and .json', () => {
  // Set up temp directory for consistent path testing
  const originalAppdata = process.env.IGLOO_APPDATA;
  process.env.IGLOO_APPDATA = '/tmp/test-appdata';

  try {
    const result = buildShareFilePath('test', 1);
    const expectedDir = getShareDirectory();
    const expectedId = buildShareId('test', 1);

    assert.equal(result, path.join(expectedDir, `${expectedId}.json`));
    assert.ok(result.endsWith('.json'));
    assert.ok(result.includes('test_share_1'));
  } finally {
    // Restore original env
    if (originalAppdata !== undefined) {
      process.env.IGLOO_APPDATA = originalAppdata;
    } else {
      delete process.env.IGLOO_APPDATA;
    }
  }
});

// =============================================================================
// keysetNameExists (requires file I/O with temp directory)
// =============================================================================

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await makeTmp('igloo-naming-');
  process.env.IGLOO_APPDATA = tmpDir;
});

afterEach(async () => {
  delete process.env.IGLOO_APPDATA;
  await fs.rm(tmpDir, {recursive: true, force: true});
});

test('keysetNameExists returns true when shares exist', async () => {
  // Create the shares directory
  const shareDir = getShareDirectory();
  await fs.mkdir(shareDir, {recursive: true});

  // Create a share file that matches the keyset name pattern
  const shareFile = path.join(shareDir, 'mykeyset_share_1.json');
  await fs.writeFile(shareFile, '{}', 'utf8');

  const result = await keysetNameExists('mykeyset');
  assert.equal(result, true);

  // Also test with slugified name
  const shareFile2 = path.join(shareDir, 'my-keyset_share_2.json');
  await fs.writeFile(shareFile2, '{}', 'utf8');

  const result2 = await keysetNameExists('My Keyset');
  assert.equal(result2, true);
});

test('keysetNameExists returns false when no shares exist', async () => {
  // Create the shares directory but no matching files
  const shareDir = getShareDirectory();
  await fs.mkdir(shareDir, {recursive: true});

  // Create an unrelated file
  await fs.writeFile(path.join(shareDir, 'other_share_1.json'), '{}', 'utf8');

  const result = await keysetNameExists('nonexistent');
  assert.equal(result, false);
});

test('keysetNameExists returns false when directory is missing', async () => {
  // Don't create the directory - ENOENT should return false
  const result = await keysetNameExists('anyname');
  assert.equal(result, false);
});
