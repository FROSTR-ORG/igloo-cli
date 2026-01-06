import test from 'node:test';
import assert from 'node:assert/strict';
import {gcm} from '@noble/ciphers/aes.js';

import {
  SHARE_FILE_VERSION,
  SHARE_FILE_PBKDF2_ITERATIONS,
  SHARE_FILE_PBKDF2_PREVIOUS_ITERATIONS,
  SHARE_FILE_PBKDF2_LEGACY_ITERATIONS,
  SHARE_FILE_PASSWORD_ENCODING,
  SHARE_FILE_SALT_LENGTH_BYTES,
  SHARE_FILE_SALT_PBKDF2_EXPANDED_BYTES,
  SHARE_FILE_IV_LENGTH_BYTES,
  SHARE_FILE_IV_LEGACY_LENGTH_BYTES,
  getIterationsForShareVersion,
  deriveSecret,
  encryptPayload,
  decryptPayload,
  randomSaltHex,
  assertShareCredentialFormat,
  decryptShareCredential
} from '../src/keyset/crypto.js';

// =============================================================================
// Constants
// =============================================================================

test('exports expected constants', () => {
  assert.equal(typeof SHARE_FILE_VERSION, 'number');
  assert.equal(typeof SHARE_FILE_PBKDF2_ITERATIONS, 'number');
  assert.equal(typeof SHARE_FILE_PBKDF2_PREVIOUS_ITERATIONS, 'number');
  assert.equal(typeof SHARE_FILE_PBKDF2_LEGACY_ITERATIONS, 'number');
  assert.equal(typeof SHARE_FILE_PASSWORD_ENCODING, 'string');
  assert.equal(typeof SHARE_FILE_SALT_LENGTH_BYTES, 'number');
  assert.equal(typeof SHARE_FILE_SALT_PBKDF2_EXPANDED_BYTES, 'number');
  assert.equal(typeof SHARE_FILE_IV_LENGTH_BYTES, 'number');
  assert.equal(typeof SHARE_FILE_IV_LEGACY_LENGTH_BYTES, 'number');
});

test('SHARE_FILE_VERSION is 1', () => {
  assert.equal(SHARE_FILE_VERSION, 1);
});

test('iteration constants have correct values', () => {
  assert.equal(SHARE_FILE_PBKDF2_ITERATIONS, 600_000);
  assert.equal(SHARE_FILE_PBKDF2_PREVIOUS_ITERATIONS, 100_000);
  assert.equal(SHARE_FILE_PBKDF2_LEGACY_ITERATIONS, 32);
  assert.equal(SHARE_FILE_PASSWORD_ENCODING, 'sha256');
  assert.equal(SHARE_FILE_SALT_LENGTH_BYTES, 16);
  assert.equal(SHARE_FILE_SALT_PBKDF2_EXPANDED_BYTES, 32);
  assert.equal(SHARE_FILE_IV_LENGTH_BYTES, 24);
  assert.equal(SHARE_FILE_IV_LEGACY_LENGTH_BYTES, 12);
});

// =============================================================================
// getIterationsForShareVersion
// =============================================================================

test('getIterationsForShareVersion returns legacy iterations for undefined version', () => {
  assert.equal(getIterationsForShareVersion(undefined), SHARE_FILE_PBKDF2_LEGACY_ITERATIONS);
});

test('getIterationsForShareVersion returns legacy iterations for version 0', () => {
  assert.equal(getIterationsForShareVersion(0), SHARE_FILE_PBKDF2_LEGACY_ITERATIONS);
});

test('getIterationsForShareVersion returns current iterations for version 1+', () => {
  assert.equal(getIterationsForShareVersion(1), SHARE_FILE_PBKDF2_ITERATIONS);
  assert.equal(getIterationsForShareVersion(2), SHARE_FILE_PBKDF2_ITERATIONS);
  assert.equal(getIterationsForShareVersion(99), SHARE_FILE_PBKDF2_ITERATIONS);
});

// =============================================================================
// deriveSecret
// =============================================================================

test('deriveSecret produces 64-char hex string', () => {
  const salt = '0'.repeat(32); // 16 bytes as hex
  const result = deriveSecret('password', salt, 32, 'raw');
  assert.equal(result.length, 64);
  assert.match(result, /^[0-9a-f]{64}$/);
});

test('deriveSecret is deterministic with same inputs', () => {
  const salt = 'abcd1234abcd1234abcd1234abcd1234';
  const result1 = deriveSecret('password', salt, 32, 'raw');
  const result2 = deriveSecret('password', salt, 32, 'raw');
  assert.equal(result1, result2);
});

test('deriveSecret differs with different passwords', () => {
  const salt = 'abcd1234abcd1234abcd1234abcd1234';
  const result1 = deriveSecret('password1', salt, 32, 'raw');
  const result2 = deriveSecret('password2', salt, 32, 'raw');
  assert.notEqual(result1, result2);
});

test('deriveSecret differs with different salts', () => {
  const salt1 = 'abcd1234abcd1234abcd1234abcd1234';
  const salt2 = '1234abcd1234abcd1234abcd1234abcd';
  const result1 = deriveSecret('password', salt1, 32, 'raw');
  const result2 = deriveSecret('password', salt2, 32, 'raw');
  assert.notEqual(result1, result2);
});

test('deriveSecret differs with different iterations', () => {
  const salt = 'abcd1234abcd1234abcd1234abcd1234';
  const result1 = deriveSecret('password', salt, 32, 'raw');
  const result2 = deriveSecret('password', salt, 64, 'raw');
  assert.notEqual(result1, result2);
});

test('deriveSecret sha256 encoding differs from raw encoding', () => {
  const salt = 'abcd1234abcd1234abcd1234abcd1234';
  const resultSha256 = deriveSecret('password', salt, 32, 'sha256');
  const resultRaw = deriveSecret('password', salt, 32, 'raw');
  assert.notEqual(resultSha256, resultRaw);
});

// =============================================================================
// encryptPayload
// =============================================================================

test('encryptPayload returns cipherText and iv', () => {
  const secretHex = 'a'.repeat(64); // 32 bytes as hex
  const result = encryptPayload(secretHex, 'hello world');
  assert.ok('cipherText' in result);
  assert.ok('iv' in result);
  assert.equal(typeof result.cipherText, 'string');
  assert.equal(typeof result.iv, 'string');
});

test('encryptPayload cipherText is valid base64url', () => {
  const secretHex = 'a'.repeat(64);
  const result = encryptPayload(secretHex, 'hello world');
  // base64url uses A-Z, a-z, 0-9, -, _ and no padding =
  assert.match(result.cipherText, /^[A-Za-z0-9_-]+$/);
  // Should be decodable
  const decoded = Buffer.from(result.cipherText, 'base64url');
  assert.ok(decoded.length > 0);
});

test('encryptPayload is deterministic with explicit IV', () => {
  const secretHex = 'a'.repeat(64);
  const ivHex = 'b'.repeat(48); // 24 bytes as hex
  const result1 = encryptPayload(secretHex, 'hello world', ivHex);
  const result2 = encryptPayload(secretHex, 'hello world', ivHex);
  assert.equal(result1.cipherText, result2.cipherText);
  assert.equal(result1.iv, result2.iv);
});

test('encryptPayload produces different output with random IV', () => {
  const secretHex = 'a'.repeat(64);
  const result1 = encryptPayload(secretHex, 'hello world');
  const result2 = encryptPayload(secretHex, 'hello world');
  // IVs should differ (with overwhelming probability)
  assert.notEqual(result1.iv, result2.iv);
  // Ciphertexts should differ due to different IVs
  assert.notEqual(result1.cipherText, result2.cipherText);
});

// =============================================================================
// decryptPayload
// =============================================================================

test('decryptPayload recovers original plaintext', () => {
  const secretHex = 'a'.repeat(64);
  const plaintext = 'hello world';
  const {cipherText} = encryptPayload(secretHex, plaintext);
  const decrypted = decryptPayload(secretHex, cipherText);
  assert.equal(decrypted, plaintext);
});

test('decryptPayload throws on wrong key', () => {
  const secretHex1 = 'a'.repeat(64);
  const secretHex2 = 'b'.repeat(64);
  const {cipherText} = encryptPayload(secretHex1, 'hello world');
  assert.throws(() => {
    decryptPayload(secretHex2, cipherText);
  });
});

test('decryptPayload throws on truncated ciphertext', () => {
  const secretHex = 'a'.repeat(64);
  // Ciphertext that's too short (less than IV length)
  const shortCipherText = Buffer.from('short').toString('base64url');
  assert.throws(() => {
    decryptPayload(secretHex, shortCipherText);
  }, /Ciphertext too short/);
});

test('decryptPayload throws on corrupted ciphertext', () => {
  const secretHex = 'a'.repeat(64);
  const {cipherText} = encryptPayload(secretHex, 'hello world');
  // Corrupt the ciphertext by modifying a character
  const corrupted = cipherText.slice(0, -1) + (cipherText.slice(-1) === 'a' ? 'b' : 'a');
  assert.throws(() => {
    decryptPayload(secretHex, corrupted);
  });
});

test('decryptPayload handles 12-byte legacy IV length', () => {
  const secretHex = 'a'.repeat(64);
  const plaintext = 'legacy payload';
  const ivHex12 = 'c'.repeat(24); // 12 bytes as hex

  // Manually construct a legacy-style encrypted payload with 12-byte IV
  const payloadBytes = new TextEncoder().encode(plaintext);
  const secretBytes = Buffer.from(secretHex, 'hex');
  const ivBytes = Buffer.from(ivHex12, 'hex');

  // Use noble/ciphers for encryption (matching the implementation)
  const cipher = gcm(secretBytes, ivBytes);
  const encrypted = cipher.encrypt(payloadBytes);

  // Combine IV + ciphertext
  const combined = Buffer.concat([ivBytes, Buffer.from(encrypted)]);
  const encoded = combined.toString('base64url');

  // Decrypt with legacy IV length
  const decrypted = decryptPayload(secretHex, encoded, 12);
  assert.equal(decrypted, plaintext);
});

// =============================================================================
// randomSaltHex
// =============================================================================

test('randomSaltHex returns 32-char hex string', () => {
  const salt = randomSaltHex();
  assert.equal(salt.length, 32);
  assert.match(salt, /^[0-9a-f]{32}$/);
});

test('randomSaltHex produces unique values', () => {
  const salt1 = randomSaltHex();
  const salt2 = randomSaltHex();
  const salt3 = randomSaltHex();
  assert.notEqual(salt1, salt2);
  assert.notEqual(salt2, salt3);
  assert.notEqual(salt1, salt3);
});

// =============================================================================
// assertShareCredentialFormat
// =============================================================================

test('assertShareCredentialFormat accepts bfshare prefix', () => {
  // Should not throw
  assertShareCredentialFormat('bfshare1abc123');
  assertShareCredentialFormat('bfshare');
});

test('assertShareCredentialFormat rejects non-bfshare strings', () => {
  assert.throws(() => {
    assertShareCredentialFormat('nsec1abc123');
  }, /not a valid bfshare/);

  assert.throws(() => {
    assertShareCredentialFormat('npub1abc123');
  }, /not a valid bfshare/);

  assert.throws(() => {
    assertShareCredentialFormat('');
  }, /not a valid bfshare/);

  assert.throws(() => {
    assertShareCredentialFormat('bf_share_typo');
  }, /not a valid bfshare/);
});

// =============================================================================
// decryptShareCredential
// =============================================================================

test('decryptShareCredential decrypts v1 format with correct password', () => {
  const password = 'test-password';
  const salt = randomSaltHex();
  const shareCredential = 'bfshare1testcredential';

  // Create v1 encrypted record
  const secretHex = deriveSecret(password, salt, SHARE_FILE_PBKDF2_ITERATIONS, 'sha256');
  const {cipherText} = encryptPayload(secretHex, shareCredential);

  const record = {
    version: 1,
    salt,
    share: cipherText,
    metadata: {
      pbkdf2Iterations: SHARE_FILE_PBKDF2_ITERATIONS,
      passwordEncoding: 'sha256' as const
    }
  };

  const result = decryptShareCredential(record, password);
  assert.equal(result.shareCredential, shareCredential);
  assert.equal(result.iterations, SHARE_FILE_PBKDF2_ITERATIONS);
  assert.equal(result.encoding, 'sha256');
});

test('decryptShareCredential fails with wrong password', {timeout: 30000}, () => {
  // This test is slow because decryptShareCredential tries multiple iteration
  // counts (600k, 100k, 32) as fallbacks before giving up - unavoidable for
  // wrong password scenarios
  const password = 'correct-password';
  const salt = randomSaltHex();
  const shareCredential = 'bfshare1testcredential';

  // Use legacy format (no version) to minimize iterations tried
  const secretHex = deriveSecret(password, salt, SHARE_FILE_PBKDF2_LEGACY_ITERATIONS, 'raw');
  const {cipherText} = encryptPayload(secretHex, shareCredential);

  const record = {
    version: undefined, // Legacy - only tries 32 iterations first
    salt,
    share: cipherText,
    metadata: undefined
  };

  assert.throws(() => {
    decryptShareCredential(record, 'wrong-password');
  });
});

test('decryptShareCredential decrypts legacy v0 format (32 iterations, 12-byte IV)', () => {
  const password = 'legacy-password';
  const salt = randomSaltHex();
  const shareCredential = 'bfshare1legacycred';

  // Create legacy v0 encrypted record with 32 iterations, raw encoding, 12-byte IV
  const secretHex = deriveSecret(password, salt, 32, 'raw');

  // Manually encrypt with 12-byte IV
  const ivHex12 = 'd'.repeat(24); // 12 bytes
  const payloadBytes = new TextEncoder().encode(shareCredential);
  const secretBytes = Buffer.from(secretHex, 'hex');
  const ivBytes = Buffer.from(ivHex12, 'hex');

  const cipher = gcm(secretBytes, ivBytes);
  const encrypted = cipher.encrypt(payloadBytes);

  const combined = Buffer.concat([ivBytes, Buffer.from(encrypted)]);
  const cipherText = combined.toString('base64url');

  const record = {
    version: undefined, // Legacy has no version
    salt,
    share: cipherText,
    metadata: undefined
  };

  const result = decryptShareCredential(record, password);
  assert.equal(result.shareCredential, shareCredential);
  assert.equal(result.iterations, 32);
  assert.equal(result.encoding, 'raw');
  assert.equal(result.ivLength, 12);
});

test('decryptShareCredential returns used parameters', () => {
  const password = 'test-password';
  const salt = randomSaltHex();
  const shareCredential = 'bfshare1testcredential';

  const secretHex = deriveSecret(password, salt, SHARE_FILE_PBKDF2_ITERATIONS, 'sha256');
  const {cipherText} = encryptPayload(secretHex, shareCredential);

  const record = {
    version: 1,
    salt,
    share: cipherText,
    metadata: {}
  };

  const result = decryptShareCredential(record, password);

  assert.ok('shareCredential' in result);
  assert.ok('secretHex' in result);
  assert.ok('iterations' in result);
  assert.ok('encoding' in result);
  assert.ok('saltLength' in result);
  assert.ok('ivLength' in result);

  assert.equal(typeof result.secretHex, 'string');
  assert.equal(result.secretHex.length, 64);
  assert.equal(typeof result.iterations, 'number');
  assert.ok(result.encoding === 'sha256' || result.encoding === 'raw');
  assert.equal(typeof result.saltLength, 'number');
  assert.equal(typeof result.ivLength, 'number');
});

test('decryptShareCredential handles metadata-specified iterations', () => {
  const password = 'test-password';
  const salt = randomSaltHex();
  const shareCredential = 'bfshare1customiter';
  const customIterations = 50_000;

  const secretHex = deriveSecret(password, salt, customIterations, 'sha256');
  const {cipherText} = encryptPayload(secretHex, shareCredential);

  const record = {
    version: 1,
    salt,
    share: cipherText,
    metadata: {
      pbkdf2Iterations: customIterations
    }
  };

  const result = decryptShareCredential(record, password);
  assert.equal(result.shareCredential, shareCredential);
  assert.equal(result.iterations, customIterations);
});

test('decryptShareCredential handles metadata-specified encoding', () => {
  const password = 'test-password';
  const salt = randomSaltHex();
  const shareCredential = 'bfshare1rawencoding';

  // Use raw encoding
  const secretHex = deriveSecret(password, salt, SHARE_FILE_PBKDF2_ITERATIONS, 'raw');
  const {cipherText} = encryptPayload(secretHex, shareCredential);

  const record = {
    version: 1,
    salt,
    share: cipherText,
    metadata: {
      passwordEncoding: 'raw' as const
    }
  };

  const result = decryptShareCredential(record, password);
  assert.equal(result.shareCredential, shareCredential);
  assert.equal(result.encoding, 'raw');
});

// =============================================================================
// Integration
// =============================================================================

test('full roundtrip: create encrypted record and decrypt', () => {
  const password = 'integration-test-password';
  const shareCredential = 'bfshare1integrationtest123456789';

  // Step 1: Generate salt
  const salt = randomSaltHex();

  // Step 2: Derive key and encrypt (simulating save)
  const secretHex = deriveSecret(password, salt, SHARE_FILE_PBKDF2_ITERATIONS, 'sha256');
  const {cipherText} = encryptPayload(secretHex, shareCredential);

  // Step 3: Create record as it would be stored
  const record = {
    version: SHARE_FILE_VERSION,
    salt,
    share: cipherText,
    metadata: {
      pbkdf2Iterations: SHARE_FILE_PBKDF2_ITERATIONS,
      passwordEncoding: 'sha256' as const
    }
  };

  // Step 4: Decrypt (simulating load)
  const result = decryptShareCredential(record, password);

  // Verify
  assert.equal(result.shareCredential, shareCredential);
  assert.equal(result.iterations, SHARE_FILE_PBKDF2_ITERATIONS);
  assert.equal(result.encoding, 'sha256');
  assert.equal(result.ivLength, SHARE_FILE_IV_LENGTH_BYTES);
});
