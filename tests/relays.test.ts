import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import {
  normalizeRelays,
  resolveRelaysWithFallbackSync,
  writeConfiguredRelays,
  readConfiguredRelaysSync,
  removeConfiguredRelays,
  getRelaysConfigPath
} from '../src/keyset/relays.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'igloo-tests-'));
  process.env.IGLOO_APPDATA = tmpDir;
  // ensure starting clean
  await removeConfiguredRelays();
});

afterEach(async () => {
  delete process.env.IGLOO_APPDATA;
  await fs.rm(tmpDir, {recursive: true, force: true});
});

test('normalizeRelays filters invalid and de-duplicates', () => {
  const input = [
    ' wss://A.example ', // valid
    'ws://b.example', // valid
    'https://nope', // invalid scheme
    'WSS://a.example' // duplicate (case-insensitive)
  ];
  const out = normalizeRelays(input);
  assert.deepEqual(out, ['wss://A.example', 'ws://b.example']);
});

test('resolve precedence: override > configured > fallback', async () => {
  // No config yet: use fallback
  let resolved = resolveRelaysWithFallbackSync(undefined, ['wss://fallback']);
  assert.deepEqual(resolved, ['wss://fallback']);

  // Configure one relay, should win over fallback
  await writeConfiguredRelays(['wss://foo']);
  resolved = resolveRelaysWithFallbackSync(undefined, ['wss://fallback']);
  assert.deepEqual(resolved, ['wss://foo']);

  // Explicit override should win over configured
  resolved = resolveRelaysWithFallbackSync(['wss://bar'], ['wss://fallback']);
  assert.deepEqual(resolved, ['wss://bar']);
});

test('invalid override falls back to configured', async () => {
  await writeConfiguredRelays(['wss://foo']);
  const resolved = resolveRelaysWithFallbackSync(['wss//typo', 'ftp://host'], ['wss://fallback']);
  assert.deepEqual(resolved, ['wss://foo']);
});

test('invalid override falls back to fallback when no config', () => {
  const resolved = resolveRelaysWithFallbackSync(['wss//typo', 'ftp://host'], ['wss://fallback']);
  assert.deepEqual(resolved, ['wss://fallback']);
});

test('disk-first add preserves existing configured relays', async () => {
  await writeConfiguredRelays(['wss://foo']);
  const disk = readConfiguredRelaysSync() ?? [];
  const next = normalizeRelays([...disk, 'wss://bar']);
  await writeConfiguredRelays(next);
  const final = readConfiguredRelaysSync();
  assert.deepEqual(final, ['wss://foo', 'wss://bar']);
});

test('disk-first remove prunes targeted relays', async () => {
  await writeConfiguredRelays(['wss://foo', 'wss://bar']);
  const disk = readConfiguredRelaysSync() ?? [];
  const toRemove = new Set(['wss://foo']);
  const next = disk.filter(r => !toRemove.has(r.toLowerCase()));
  await writeConfiguredRelays(next);
  const final = readConfiguredRelaysSync();
  assert.deepEqual(final, ['wss://bar']);
});

test('writes to IGLOO_APPDATA and not global config', async () => {
  const file = getRelaysConfigPath();
  assert.ok(file.startsWith(tmpDir));
  await writeConfiguredRelays(['wss://foo']);
  const stat = await fs.stat(file);
  assert.ok(stat.isFile());
});
