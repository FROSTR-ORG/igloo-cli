import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {runCli} from './helpers/runCli.js';
import {makeTmp, writePasswordFile} from './helpers/tmp.js';
import {startEphemeralRelay} from '../src/test-relay/NostrRelay.js';
import {generateKeysetWithSecret} from '@frostr/igloo-core';
import {buildShareId} from '../src/keyset/naming.js';

let appdataDir: string;
let outDir: string;
let passFile: string;
let stopRelay: (() => Promise<void>) | null = null;

beforeEach(async () => {
  appdataDir = await makeTmp('igloo-appdata-');
  outDir = await makeTmp('igloo-output-');
  passFile = await writePasswordFile(appdataDir, 'strongpassword123');
  process.env.IGLOO_APPDATA = appdataDir;
});

afterEach(async () => {
  delete process.env.IGLOO_APPDATA;
  delete process.env.IGLOO_TEST_RELAY;
  await fs.rm(appdataDir, {recursive: true, force: true});
  await fs.rm(outDir, {recursive: true, force: true});
  if (stopRelay) {
    await stopRelay();
    stopRelay = null;
  }
});

test('share add (automated) saves file and share list shows it; share load decrypts it', {timeout: 30000}, async () => {
  // Start ephemeral relay and point echo to it
  const {relay, url} = await startEphemeralRelay({port: 0, info: false});
  process.env.IGLOO_TEST_RELAY = url;
  stopRelay = async () => relay.stop();

  // Prepare a deterministic keyset
  const secretHex = 'cd'.repeat(32); // 32 bytes hex
  const keyset = generateKeysetWithSecret(2, 2, secretHex);
  const group = keyset.groupCredential;
  const share = keyset.shareCredentials[0]!;

  // Import the share via CLI (non-interactive)
  const name = 'Test Keyset';
  const resAdd = await runCli([
    'share', 'add',
    '--group', group,
    '--share', share,
    '--name', name,
    '--password', 'strongpassword123',
    '--output', outDir
  ], {
    timeoutMs: 25000,
    env: { IGLOO_TEST_AUTOPILOT: '1' },
    successPattern: /Share saved\./
  });
  assert.match(resAdd.stdout, /Share saved\./);

  // Verify file exists
  const id = buildShareId(name, 1);
  const filepath = path.join(outDir, `${id}.json`);
  const stat = await fs.stat(filepath);
  assert.ok(stat.isFile());

  // Listing shows the saved share
  const resList = await runCli(['share', 'list']);
  assert.equal(resList.exitCode, 0);
  assert.match(resList.stdout, /Saved shares/);
  assert.match(resList.stdout, new RegExp(`${name} share 1`));

  // Load and decrypt the share (feed password via stdin)
  const resLoad = await runCli(
    ['share', 'load', id],
    { env: {IGLOO_AUTOPASSWORD: 'strongpassword123'} }
  );
  assert.equal(resLoad.exitCode, 0);
  assert.match(resLoad.stdout, /Share decrypted successfully/);

  // Ensure our relay saw at least one EVENT (echo attempts)
  assert.ok(relay.events.length > 0);
});
