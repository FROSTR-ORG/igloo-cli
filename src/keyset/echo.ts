import {randomBytes} from 'node:crypto';
import {sendEcho, DEFAULT_ECHO_RELAYS} from '@frostr/igloo-core';

export type SendShareEchoOptions = {
  relays?: string[];
  challenge?: string;
  timeout?: number;
};

/**
 * Sends an echo signal using the @frostr/igloo-core@0.2.1 API.
 * Generates a random challenge if not provided.
 */
export async function sendShareEcho(
  groupCredential: string,
  shareCredential: string,
  {relays, challenge, timeout = 10000}: SendShareEchoOptions = {}
): Promise<void> {
  // Generate random challenge if not provided (32 bytes = 64 hex chars)
  const finalChallenge = challenge ?? randomBytes(32).toString('hex');

  // sendEcho in v0.2.1: sendEcho(groupCredential: string, shareCredential: string, challenge: string, options?: { relays?: string[]; timeout?: number; eventConfig?: NodeEventConfig; })
  await sendEcho(groupCredential, shareCredential, finalChallenge, {
    relays: relays ?? DEFAULT_ECHO_RELAYS,
    timeout
  });
}
