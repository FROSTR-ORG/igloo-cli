import {randomBytes} from 'node:crypto';
import {pbkdf2} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {gcm} from '@noble/ciphers/aes.js';

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

export function deriveSecret(password: string, saltHex: string): string {
  const passwordBytes = stringToUint8(password);
  const saltBytes = hexToUint8(saltHex, 16);
  const derived = pbkdf2(sha256, passwordBytes, saltBytes, {c: 32, dkLen: 32});
  return uint8ToHex(derived);
}

export function encryptPayload(secretHex: string, payload: string, ivHex?: string): {
  cipherText: string;
  iv: string;
} {
  const payloadBytes = stringToUint8(payload);
  const secretBytes = hexToUint8(secretHex, 32);
  const ivBytes = ivHex ? hexToUint8(ivHex, 24) : new Uint8Array(randomBytes(24));
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

export function decryptPayload(secretHex: string, encoded: string): string {
  const combined = Buffer.from(encoded, 'base64url');
  const iv = combined.subarray(0, 24);
  const encrypted = combined.subarray(24);
  const secretBytes = hexToUint8(secretHex, 32);
  const cipher = gcm(secretBytes, iv);
  const decrypted = cipher.decrypt(encrypted);
  return new TextDecoder().decode(decrypted);
}

export function randomSaltHex(): string {
  return Buffer.from(randomBytes(16)).toString('hex');
}
