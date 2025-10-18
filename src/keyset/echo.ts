import {randomBytes} from 'node:crypto';
import {sendEcho, type NodeEventConfig} from '@frostr/igloo-core';

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
  const normalize = (u: string) => (/^wss?:\/\//i.test(u) ? u.replace(/^http/i, 'ws') : `wss://${u}`);
  const explicitRelays = Array.isArray(relays) && relays.length > 0 ? relays.map(normalize) : undefined;
  const overrideRelays = envRelay ? [normalize(envRelay)] : undefined;

  await sendEcho(groupCredential, shareCredential, finalChallenge, {
    relays: explicitRelays ?? overrideRelays, // let igloo-core resolve group/defaults otherwise
    timeout,
    eventConfig: { enableLogging: false, ...eventConfig }
  });
}
