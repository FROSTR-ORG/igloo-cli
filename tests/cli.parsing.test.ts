import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArgv, toBool} from '../src/lib/parseArgv.js';

// =============================================================================
// parseArgv - Basic Positional Parsing
// =============================================================================

test('parseArgv empty array returns intro command', () => {
  const result = parseArgv([]);
  assert.equal(result.command, 'intro');
  assert.deepEqual(result.args, []);
  assert.deepEqual(result.flags, {});
  assert.equal(result.showHelp, false);
  assert.equal(result.showVersion, false);
});

test('parseArgv single positional as command', () => {
  const result = parseArgv(['setup']);
  assert.equal(result.command, 'setup');
  assert.deepEqual(result.args, []);
});

test('parseArgv multiple positionals', () => {
  const result = parseArgv(['share', 'add', 'extra']);
  assert.equal(result.command, 'share');
  assert.deepEqual(result.args, ['add', 'extra']);
});

test('parseArgv --help sets showHelp', () => {
  const result = parseArgv(['--help']);
  assert.equal(result.showHelp, true);
  assert.equal(result.showVersion, false);
});

test('parseArgv --version sets showVersion', () => {
  const result = parseArgv(['--version']);
  assert.equal(result.showVersion, true);
  assert.equal(result.showHelp, false);
});

// =============================================================================
// parseArgv - Flag Parsing
// =============================================================================

test('parseArgv --flag value', () => {
  const result = parseArgv(['--share', 'abc123']);
  assert.equal(result.flags.share, 'abc123');
});

test('parseArgv --flag=value inline format', () => {
  const result = parseArgv(['--share=abc123']);
  assert.equal(result.flags.share, 'abc123');
});

test('parseArgv --flag= with empty value yields empty string', () => {
  const result = parseArgv(['--name=']);
  assert.equal(result.flags.name, '');
});

test('parseArgv --flag= does not consume next arg', () => {
  const result = parseArgv(['--name=', 'command']);
  assert.equal(result.flags.name, '');
  assert.equal(result.command, 'command');
});

test('parseArgv -f value short flag', () => {
  const result = parseArgv(['-s', 'abc123']);
  assert.equal(result.flags.s, 'abc123');
});

test('parseArgv boolean flag (no value)', () => {
  const result = parseArgv(['--verbose']);
  assert.equal(result.flags.verbose, true);
});

test('parseArgv -h sets showHelp', () => {
  const result = parseArgv(['-h']);
  assert.equal(result.showHelp, true);
});

test('parseArgv -v sets showVersion', () => {
  const result = parseArgv(['-v']);
  assert.equal(result.showVersion, true);
});

// =============================================================================
// parseArgv - Flag Aliases
// =============================================================================

test('parseArgv -t alias for --threshold', () => {
  const result = parseArgv(['-t', '2']);
  assert.equal(result.flags.threshold, '2');
  assert.equal(result.flags.t, undefined); // Original short flag should be deleted
});

test('parseArgv -T alias for --total', () => {
  const result = parseArgv(['-T', '3']);
  assert.equal(result.flags.total, '3');
  assert.equal(result.flags.T, undefined); // Original short flag should be deleted
});

test('parseArgv -E alias for --debug-echo', () => {
  const result = parseArgv(['-E']);
  assert.equal(result.flags['debug-echo'], true);
  assert.equal(result.flags.E, undefined); // Original short flag should be deleted
});

// =============================================================================
// parseArgv - Mixed Positionals and Flags
// =============================================================================

test('parseArgv mixed positionals and flags', () => {
  const result = parseArgv([
    'keyset',
    'create',
    '--threshold', '2',
    '-T', '3',
    '--name=MyKeyset',
    '--verbose'
  ]);

  assert.equal(result.command, 'keyset');
  assert.deepEqual(result.args, ['create']);
  assert.equal(result.flags.threshold, '2');
  assert.equal(result.flags.total, '3');
  assert.equal(result.flags.name, 'MyKeyset');
  assert.equal(result.flags.verbose, true);
});

test('parseArgv flag followed by flag (boolean detection)', () => {
  // When a flag is followed by another flag, the first should be boolean
  const result = parseArgv(['--verbose', '--debug']);
  assert.equal(result.flags.verbose, true);
  assert.equal(result.flags.debug, true);
});

test('parseArgv help flag with command', () => {
  const result = parseArgv(['share', '--help']);
  assert.equal(result.command, 'share');
  assert.equal(result.showHelp, true);
});

// =============================================================================
// toBool
// =============================================================================

test('toBool handles string true values', () => {
  assert.equal(toBool('true'), true);
  assert.equal(toBool('1'), true);
  assert.equal(toBool('yes'), true);
  assert.equal(toBool('on'), true);
  assert.equal(toBool('TRUE'), true);
  assert.equal(toBool('Yes'), true);
  assert.equal(toBool('ON'), true);
});

test('toBool handles string false values', () => {
  assert.equal(toBool('false'), false);
  assert.equal(toBool('0'), false);
  assert.equal(toBool('no'), false);
  assert.equal(toBool('off'), false);
  assert.equal(toBool('FALSE'), false);
  assert.equal(toBool('No'), false);
  assert.equal(toBool('OFF'), false);
});

test('toBool handles boolean values', () => {
  assert.equal(toBool(true), true);
  assert.equal(toBool(false), false);
});

test('toBool handles undefined', () => {
  assert.equal(toBool(undefined), false);
});

test('toBool handles invalid strings', () => {
  assert.equal(toBool('invalid'), false);
  assert.equal(toBool('maybe'), false);
  assert.equal(toBool(''), false);
});
