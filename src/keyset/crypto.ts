import {randomBytes} from 'node:crypto';
import {pbkdf2} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {gcm} from '@noble/ciphers/aes.js';
import {ShareFileRecord} from './types.js';

export const SHARE_FILE_VERSION = 1;
export const SHARE_FILE_PBKDF2_ITERATIONS = 600_000;
export const SHARE_FILE_PBKDF2_PREVIOUS_ITERATIONS = 100_000;
export const SHARE_FILE_PBKDF2_LEGACY_ITERATIONS = 32;
export const SHARE_FILE_PASSWORD_ENCODING: SharePasswordEncoding = 'sha256';
export const SHARE_FILE_SALT_LENGTH_BYTES = 16;
export const SHARE_FILE_SALT_PBKDF2_EXPANDED_BYTES = 32;
export const SHARE_FILE_IV_LENGTH_BYTES = 24;
export const SHARE_FILE_IV_LEGACY_LENGTH_BYTES = 12;

export type SharePasswordEncoding = 'sha256' | 'raw';

function hexToUint8(hex: string, expectedLength?: number): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    throw new Error(`Expected ${expectedLength} bytes, received ${bytes.length}`);
  }
  return bytes;
}

function uint8ToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function stringToUint8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function encodePassword(password: string, encoding: SharePasswordEncoding): Uint8Array {
  const passwordBytes = stringToUint8(password);
  if (encoding === 'sha256') {
    return sha256(passwordBytes);
  }

  return passwordBytes;
}

export function getIterationsForShareVersion(version?: number): number {
  if (version === undefined || version < SHARE_FILE_VERSION) {
    return SHARE_FILE_PBKDF2_LEGACY_ITERATIONS;
  }

  return SHARE_FILE_PBKDF2_ITERATIONS;
}

function expandSaltLength(bytes: Uint8Array, targetLength?: number): Uint8Array {
  if (targetLength === undefined) {
    return bytes;
  }

  if (bytes.length === targetLength) {
    return bytes;
  }

  if (bytes.length > targetLength) {
    throw new Error(
      `Salt is longer than expected (${bytes.length} > ${targetLength} bytes).`
    );
  }

  const padded = new Uint8Array(targetLength);
  padded.set(bytes, 0);
  return padded;
}

export function deriveSecret(
  password: string,
  saltHex: string,
  iterations = SHARE_FILE_PBKDF2_ITERATIONS,
  encoding: SharePasswordEncoding = SHARE_FILE_PASSWORD_ENCODING,
  saltLength?: number
): string {
  const passwordBytes = encodePassword(password, encoding);
  const saltBytes = expandSaltLength(hexToUint8(saltHex), saltLength);
  const derived = pbkdf2(sha256, passwordBytes, saltBytes, {c: iterations, dkLen: 32});
  return uint8ToHex(derived);
}

export function encryptPayload(secretHex: string, payload: string, ivHex?: string): {
  cipherText: string;
  iv: string;
} {
  const payloadBytes = stringToUint8(payload);
  const secretBytes = hexToUint8(secretHex, 32);
  const ivBytes = ivHex
    ? hexToUint8(ivHex, SHARE_FILE_IV_LENGTH_BYTES)
    : new Uint8Array(randomBytes(SHARE_FILE_IV_LENGTH_BYTES));
  const cipher = gcm(secretBytes, ivBytes);
  const encrypted = cipher.encrypt(payloadBytes);
  const combined = new Uint8Array(ivBytes.length + encrypted.length);
  combined.set(ivBytes, 0);
  combined.set(encrypted, ivBytes.length);
  const cipherText = Buffer.from(combined).toString('base64url');
  return {
    cipherText,
    iv: uint8ToHex(ivBytes)
  };
}

export function decryptPayload(
  secretHex: string,
  encoded: string,
  ivLength = SHARE_FILE_IV_LENGTH_BYTES
): string {
  const combined = Buffer.from(encoded, 'base64url');
  if (combined.length <= ivLength) {
    throw new Error(`Ciphertext too short for IV length ${ivLength}`);
  }
  const iv = combined.subarray(0, ivLength);
  const encrypted = combined.subarray(ivLength);
  const secretBytes = hexToUint8(secretHex, 32);
  const cipher = gcm(secretBytes, iv);
  const decrypted = cipher.decrypt(encrypted);
  return new TextDecoder().decode(decrypted);
}

export function randomSaltHex(): string {
  return Buffer.from(randomBytes(16)).toString('hex');
}

export function assertShareCredentialFormat(value: string): void {
  if (!value.startsWith('bfshare')) {
    throw new Error('Decrypted payload is not a valid bfshare credential.');
  }
}

function readMetadataIterations(metadata?: ShareFileRecord['metadata']): number | undefined {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }

  const value = (metadata as Record<string, unknown>).pbkdf2Iterations;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  return undefined;
}

function readMetadataPasswordEncoding(
  metadata?: ShareFileRecord['metadata']
): SharePasswordEncoding | undefined {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }

  const value = (metadata as Record<string, unknown>).passwordEncoding;
  if (value === 'sha256' || value === 'raw') {
    return value;
  }

  return undefined;
}

function buildIterationCandidates(record: Pick<ShareFileRecord, 'version' | 'metadata'>): number[] {
  const candidates: number[] = [];

  const pushUnique = (value: number | undefined) => {
    if (typeof value === 'number' && !candidates.includes(value)) {
      candidates.push(value);
    }
  };

  pushUnique(readMetadataIterations(record.metadata));
  pushUnique(getIterationsForShareVersion(record.version));
  pushUnique(SHARE_FILE_PBKDF2_PREVIOUS_ITERATIONS);
  pushUnique(SHARE_FILE_PBKDF2_LEGACY_ITERATIONS);

  return candidates;
}

function buildPasswordEncodingCandidates(
  record: Pick<ShareFileRecord, 'metadata'>
): SharePasswordEncoding[] {
  const candidates: SharePasswordEncoding[] = [];

  const pushUnique = (value: SharePasswordEncoding | undefined) => {
    if (value && !candidates.includes(value)) {
      candidates.push(value);
    }
  };

  pushUnique(readMetadataPasswordEncoding(record.metadata));
  pushUnique(SHARE_FILE_PASSWORD_ENCODING);
  pushUnique('raw');

  return candidates;
}

function buildSaltLengthCandidates(record: Pick<ShareFileRecord, 'version' | 'salt'>): number[] {
  const candidates: number[] = [];

  const pushUnique = (value: number | undefined) => {
    if (typeof value === 'number' && !candidates.includes(value)) {
      candidates.push(value);
    }
  };

  const declaredLength = Math.ceil(record.salt.length / 2);

  pushUnique(declaredLength);
  pushUnique(SHARE_FILE_SALT_LENGTH_BYTES);

  pushUnique(SHARE_FILE_SALT_PBKDF2_EXPANDED_BYTES);

  return candidates;
}

function buildIvLengthCandidates(record: Pick<ShareFileRecord, 'version'>): number[] {
  const isLegacy = record.version === undefined || record.version < SHARE_FILE_VERSION;
  const primary = isLegacy ? SHARE_FILE_IV_LEGACY_LENGTH_BYTES : SHARE_FILE_IV_LENGTH_BYTES;
  const secondary = isLegacy ? SHARE_FILE_IV_LENGTH_BYTES : SHARE_FILE_IV_LEGACY_LENGTH_BYTES;

  return [primary, secondary].filter((value, index, array) => {
    return value > 0 && array.indexOf(value) === index;
  });
}

export function decryptShareCredential(
  record: Pick<ShareFileRecord, 'version' | 'salt' | 'share' | 'metadata'>,
  password: string
): {
  shareCredential: string;
  secretHex: string;
  iterations: number;
  encoding: SharePasswordEncoding;
  saltLength: number;
  ivLength: number;
} {
  const candidates = buildIterationCandidates(record);
  const encodings = buildPasswordEncodingCandidates(record);
  const saltLengths = buildSaltLengthCandidates(record);
  const ivLengths = buildIvLengthCandidates(record);
  let lastError: unknown = null;

  for (const encoding of encodings) {
    for (const iterations of candidates) {
      for (const saltLength of saltLengths) {
        for (const ivLength of ivLengths) {
          try {
            const secretHex = deriveSecret(
              password,
              record.salt,
              iterations,
              encoding,
              saltLength
            );
            const shareCredential = decryptPayload(secretHex, record.share, ivLength);
            assertShareCredentialFormat(shareCredential);
            return {
              shareCredential,
              secretHex,
              iterations,
              encoding,
              saltLength,
              ivLength
            };
          } catch (error) {
            lastError = error;
          }
        }
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Failed to decrypt share.');
}
