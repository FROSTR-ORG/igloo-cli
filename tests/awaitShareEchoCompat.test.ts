import test from 'node:test';
import assert from 'node:assert/strict';
import {isEchoConfirmationPayload} from '../src/keyset/awaitShareEchoCompat.js';

test('isEchoConfirmationPayload accepts legacy "echo" token', () => {
  assert.equal(isEchoConfirmationPayload('echo'), true);
  assert.equal(isEchoConfirmationPayload(' ECHO '), true);
});

test('isEchoConfirmationPayload accepts even-length hex challenges', () => {
  assert.equal(
    isEchoConfirmationPayload('810907ac3915c5d4f50e6751ea476b708fe7178f53711d1a185bb3d49987b3d4'),
    true
  );
  assert.equal(isEchoConfirmationPayload('aaff00cc'), true);
});

test('isEchoConfirmationPayload rejects invalid payloads', () => {
  assert.equal(isEchoConfirmationPayload(''), false);
  assert.equal(isEchoConfirmationPayload('   '), false);
  assert.equal(isEchoConfirmationPayload('abc'), false); // odd length
  assert.equal(isEchoConfirmationPayload('xyz123'), false); // non-hex
  assert.equal(isEchoConfirmationPayload(undefined), false);
  assert.equal(isEchoConfirmationPayload(null), false);
});
