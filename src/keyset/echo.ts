import {randomBytes} from 'node:crypto';
import {sendEcho, type NodeEventConfig} from '@frostr/igloo-core';
import {computeEchoRelays} from './echoRelays.js';

// Simple echo wrapper using igloo-core >= 0.2.4. The library now handles
// both legacy and challenge formats on the listener side.

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
  const envRelay = (process.env.IGLOO_TEST_RELAY ?? '').trim();
  // computeEchoRelays: if envRelay is set (IGLOO_TEST_RELAY), it returns ONLY that relay
  // to keep test/dev runs isolated from public defaults.
  const relayUnion = computeEchoRelays(groupCredential, relays, envRelay);
  const debugEnabled = ((process.env.IGLOO_DEBUG_ECHO ?? '').toLowerCase() === '1' || (process.env.IGLOO_DEBUG_ECHO ?? '').toLowerCase() === 'true');
  const debugLogger = debugEnabled
    ? ((level: string, message: string, data?: unknown) => {
        try {
          // eslint-disable-next-line no-console
          console.log(`[echo-send] ${level.toUpperCase()} ${message}`, data ?? '');
        } catch {}
      })
    : undefined;

  if (debugEnabled) {
    try {
      // eslint-disable-next-line no-console
      console.log('[echo-send] INFO using relays', relayUnion);
    } catch {}
  }

  await sendEcho(groupCredential, shareCredential, finalChallenge, {
    relays: relayUnion,
    timeout,
    eventConfig: { enableLogging: debugEnabled, customLogger: debugLogger, ...eventConfig }
  });
}
