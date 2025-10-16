import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {runCli} from './helpers/runCli.js';
import {makeTmp} from './helpers/tmp.js';
import {
  hexToNsec,
  hexToNpub,
  derivePublicKey
} from '@frostr/igloo-core';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await makeTmp();
  process.env.IGLOO_APPDATA = tmpDir;
});

afterEach(async () => {
  delete process.env.IGLOO_APPDATA;
  await fs.rm(tmpDir, {recursive: true, force: true});
});

test('convert from hex-private (with --from/--value)', async () => {
  const secretHex = '1b3f1b3f1b3f1b3f1b3f1b3f1b3f1b3f1b3f1b3f1b3f1b3f1b3f1b3f1b3f1b3f';
  const expectedNsec = hexToNsec(secretHex);
  const {npub, hexPublicKey} = derivePublicKey(secretHex);

  const {stdout, exitCode} = await runCli(['keys', 'convert', '--from', 'hex-private', '--value', secretHex]);
  assert.equal(exitCode, 0);
  assert.match(stdout, new RegExp(`nsec: ${expectedNsec}`));
  assert.match(stdout, new RegExp(`Public hex: ${hexPublicKey}`));
  assert.match(stdout, new RegExp(`npub: ${npub}`));
});

test('convert from npub (positional)', async () => {
  const secretHex = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const npub = hexToNpub(derivePublicKey(secretHex).hexPublicKey);

  const {stdout, exitCode} = await runCli(['keys', 'convert', 'npub', npub]);
  assert.equal(exitCode, 0);
  assert.match(stdout, /Input \(npub\):/);
  // Should show public hex
  assert.match(stdout, /Public hex: [0-9a-f]{64}/);
});

test('detection via --nsec works', async () => {
  const secretHex = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const nsec = hexToNsec(secretHex);
  const {npub} = derivePublicKey(secretHex);
  const {stdout, exitCode} = await runCli(['keys', 'convert', '--nsec', nsec]);
  assert.equal(exitCode, 0);
  assert.match(stdout, new RegExp(`npub: ${npub}`));
});

test('bad flag combination yields helpful error', async () => {
  const {stdout, exitCode} = await runCli(['keys', 'convert', '--kind', 'public']);
  assert.equal(exitCode, 0);
  assert.match(stdout, /Provide --hex when specifying --kind/);
});

