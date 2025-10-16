import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {runCli} from './helpers/runCli.js';
import {makeTmp} from './helpers/tmp.js';
import pkg from '../package.json' assert { type: 'json' };

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await makeTmp();
  process.env.IGLOO_APPDATA = tmpDir;
});

afterEach(async () => {
  delete process.env.IGLOO_APPDATA;
  await fs.rm(tmpDir, {recursive: true, force: true});
});

test('default intro screen renders', async () => {
  const {stdout, exitCode, timedOut} = await runCli([]);
  assert.equal(exitCode, 0);
  assert.equal(timedOut, false);
  assert.match(stdout, /IGLOO CLI/);
  assert.match(stdout, /Core commands/);
});

test('--version prints package version', async () => {
  const {stdout, exitCode} = await runCli(['--version']);
  assert.equal(exitCode, 0);
  assert.equal(stdout.trim(), pkg.version);
});

test('--help shows top-level help', async () => {
  const {stdout, exitCode} = await runCli(['--help']);
  assert.equal(exitCode, 0);
  assert.match(stdout, /IGLOO CLI/);
  assert.match(stdout, /Core commands/);
});

test('share --help routes to share help', async () => {
  const {stdout, exitCode} = await runCli(['share', '--help']);
  assert.equal(exitCode, 0);
  assert.match(stdout, /Share commands/);
});

test('keyset --help routes to keyset help', async () => {
  const {stdout, exitCode} = await runCli(['keyset', '--help']);
  assert.equal(exitCode, 0);
  assert.match(stdout, /Keyset commands/);
});

test('keys (no args) shows conversion help', async () => {
  const {stdout, exitCode} = await runCli(['keys']);
  assert.equal(exitCode, 0);
  assert.match(stdout, /Key conversion helpers/);
});

test('about renders static info', async () => {
  const {stdout, exitCode} = await runCli(['about']);
  assert.equal(exitCode, 0);
  assert.match(stdout, /Why FROSTR/);
});

test('setup renders getting started guide', async () => {
  const {stdout, exitCode} = await runCli(['setup', '--threshold', '2', '--total', '3']);
  assert.equal(exitCode, 0);
  assert.match(stdout, /Bootstrap your FROSTR signing circle/);
});

test('status with no shares informs user', async () => {
  const {stdout, exitCode} = await runCli(['status']);
  assert.equal(exitCode, 0);
  assert.match(stdout, /No saved shares available/);
});

test('signer with no shares informs user', {timeout: 15000}, async () => {
  const {stdout, exitCode} = await runCli(['signer'], { env: { IGLOO_CLI_NO_INPUT: '1' } });
  assert.equal(exitCode, 0);
  assert.match(stdout, /No saved shares available/);
});

test('policy alias (root) with no shares informs user', async () => {
  const {stdout, exitCode} = await runCli(['policy']);
  assert.equal(exitCode, 0);
  assert.match(stdout, /No saved shares available/);
});
