import test from 'node:test';
import assert from 'node:assert/strict';
import {computeEchoRelays, normalizeRelayUrl} from '../src/keyset/echoRelays.js';

test('normalizeRelayUrl converts hostnames and http→ws', () => {
  assert.equal(normalizeRelayUrl('relay.example'), 'wss://relay.example');
  assert.equal(normalizeRelayUrl('HTTP://foo.bar'), 'ws://foo.bar');
  assert.equal(normalizeRelayUrl('wss://ok.example'), 'wss://ok.example');
  assert.equal(normalizeRelayUrl('ws://ok.example'), 'ws://ok.example');
});

test('normalizeRelayUrl preserves path/query casing while mapping scheme', () => {
  assert.equal(
    normalizeRelayUrl('HTTP://Foo.Example/Path/ECHO?X=Y'),
    'ws://Foo.Example/Path/ECHO?X=Y'
  );
  assert.equal(
    normalizeRelayUrl('https://Foo.Example/Path/ECHO?X=Y'),
    'wss://Foo.Example/Path/ECHO?X=Y'
  );
});

test('computeEchoRelays forms a deduped union in priority order (no env override)', () => {
  const explicit = ['wss://a.relay', 'relay.b', 'HTTP://c.relay', 'ws://d.relay'];
  const groupRelays = ['wss://a.relay', 'relay.e'];
  const baseRelays = ['wss://default.relay'];

  const result = computeEchoRelays(
    /* groupCredential */ undefined,
    explicit,
    /* envRelay */ undefined,
    {groupRelays, baseRelays}
  );

  assert.deepEqual(result, [
    // explicit
    'wss://a.relay',
    'wss://relay.b',
    'ws://c.relay',
    'ws://d.relay',
    // group (a.relay was duplicate)
    'wss://relay.e',
    // base
    'wss://default.relay'
  ]);
});

test('computeEchoRelays tolerates missing inputs', () => {
  const result = computeEchoRelays(undefined, undefined, undefined, {
    baseRelays: ['wss://default.relay']
  });
  assert.deepEqual(result, ['wss://default.relay']);
});

test('computeEchoRelays preserves original casing when deduping', () => {
  const result = computeEchoRelays(
    undefined,
    ['HTTP://Relay.Example/ECHO', 'http://relay.example/ECHO'],
    undefined,
    {baseRelays: []}
  );
  assert.deepEqual(result, ['ws://Relay.Example/ECHO']);
});

test('computeEchoRelays respects env override with explicit relays', () => {
  const result = computeEchoRelays(
    undefined,
    ['wss://a.relay', 'wss://b.relay'],
    'wss://env.relay',
    {groupRelays: ['wss://c.relay'], baseRelays: ['wss://default.relay']}
  );
  assert.deepEqual(result, ['wss://a.relay', 'wss://b.relay', 'wss://env.relay']);
});

test('computeEchoRelays env override with no explicit relays returns only env', () => {
  const result = computeEchoRelays(
    undefined,
    undefined,
    'wss://env.relay',
    {groupRelays: ['wss://c.relay'], baseRelays: ['wss://default.relay']}
  );
  assert.deepEqual(result, ['wss://env.relay']);
});
