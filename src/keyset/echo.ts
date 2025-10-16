import {randomBytes} from 'node:crypto';
import {sendEcho, DEFAULT_ECHO_RELAYS, type NodeEventConfig} from '@frostr/igloo-core';

export type SendShareEchoOptions = {
  relays?: string[];
  challenge?: string;
  timeout?: number;
  eventConfig?: NodeEventConfig;
};

/**
 * Sends an echo signal using the @frostr/igloo-core@0.2.1 API.
 * Generates a random challenge if not provided.
 */
export async function sendShareEcho(
  groupCredential: string,
  shareCredential: string,
  {relays, challenge, timeout = 10000, eventConfig}: SendShareEchoOptions = {}
): Promise<void> {
  const skip = (process.env.IGLOO_SKIP_ECHO ?? '').toLowerCase();
  if (skip === '1' || skip === 'true') {
    return;
  }
  // Generate random challenge if not provided (32 bytes = 64 hex chars)
  const finalChallenge = challenge ?? randomBytes(32).toString('hex');

  // sendEcho in v0.2.1: sendEcho(groupCredential: string, shareCredential: string, challenge: string, options?: { relays?: string[]; timeout?: number; eventConfig?: NodeEventConfig; })
  const override = typeof process !== 'undefined' ? process.env.IGLOO_TEST_RELAY : undefined;
  const resolvedRelays = override && override.length > 0 ? [override] : (relays ?? DEFAULT_ECHO_RELAYS);

  await sendEcho(groupCredential, shareCredential, finalChallenge, {
    relays: resolvedRelays,
    timeout,
    eventConfig: {
      enableLogging: false,
      ...eventConfig
    }
  });
}
