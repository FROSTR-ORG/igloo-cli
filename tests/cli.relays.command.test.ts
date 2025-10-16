import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {runCli} from './helpers/runCli.js';
import {makeTmp} from './helpers/tmp.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await makeTmp();
  process.env.IGLOO_APPDATA = tmpDir;
});

afterEach(async () => {
  delete process.env.IGLOO_APPDATA;
  await fs.rm(tmpDir, {recursive: true, force: true});
});

test('relays list shows sections', async () => {
  const {stdout, exitCode} = await runCli(['relays']);
  assert.equal(exitCode, 0);
  assert.match(stdout, /Relay Defaults/);
  assert.match(stdout, /Effective defaults/);
  assert.match(stdout, /Configured override/);
});

test('relays set/add/remove/reset mutate config', async () => {
  let res = await runCli(['relays', 'set', 'ws://localhost:1111', 'ws://localhost:2222']);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Saved 2 default relays/);

  res = await runCli(['relays', 'add', 'ws://localhost:3333']);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Saved 3 default relays/);

  res = await runCli(['relays', 'remove', 'ws://localhost:1111']);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Saved 2 default relays/);

  res = await runCli(['relays', 'reset']);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Reset relay defaults to built-in values/);
});

