import {
  createBifrostNode,
  connectNode,
  cleanupBifrostNode,
  decodeShare,
  decodeGroup,
  DEFAULT_ECHO_RELAYS,
  type NodeEventConfig
} from '@frostr/igloo-core';

export type AwaitShareEchoOptions = {
  relays?: string[];
  timeout?: number;
  eventConfig?: NodeEventConfig;
};

const HEX_CHALLENGE_REGEX = /^[0-9a-f]+$/i;

function resolveEchoRelays(groupCredential: string, explicitRelays?: string[]): string[] {
  if (Array.isArray(explicitRelays) && explicitRelays.length > 0) {
    return explicitRelays;
  }
  try {
    const decoded: any = decodeGroup(groupCredential);
    const relays: unknown = decoded?.relays ?? decoded?.relayUrls ?? decoded?.relay_urls;
    if (Array.isArray(relays) && relays.length > 0) {
      return relays.filter((relay): relay is string => typeof relay === 'string' && relay.length > 0);
    }
  } catch {
    // If group decoding fails we fall back to defaults.
  }
  return DEFAULT_ECHO_RELAYS;
}

function isHexChallenge(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length % 2 !== 0) {
    return false;
  }
  return HEX_CHALLENGE_REGEX.test(trimmed);
}

export function isEchoConfirmationPayload(data: unknown): boolean {
  if (typeof data !== 'string') return false;
  const trimmed = data.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.toLowerCase() === 'echo') return true;
  return isHexChallenge(trimmed);
}

export async function awaitShareEchoCompat(
  groupCredential: string,
  shareCredential: string,
  {relays, timeout = 30_000, eventConfig = {}}: AwaitShareEchoOptions = {}
): Promise<boolean> {
  const shareDetails = decodeShare(shareCredential);
  const resolvedRelays = resolveEchoRelays(groupCredential, relays);

  let node: any | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let settled = false;

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (node) {
      cleanupBifrostNode(node);
      node = null;
    }
  };

  const prefixLogger = (level: string, message: string, payload?: unknown) => {
    const prefix = `[awaitShareEcho:${shareDetails.idx}] ${message}`;
    if (eventConfig.customLogger) {
      eventConfig.customLogger(level, prefix, payload);
    } else if (eventConfig.enableLogging) {
      // eslint-disable-next-line no-console
      console.log(prefix, payload ?? '');
    }
  };

  return new Promise<boolean>((resolve, reject) => {
    const safeResolve = (value: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const safeReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      const err = error instanceof Error ? error : new Error(String(error));
      reject(err);
    };

    try {
      const mergedEventConfig: NodeEventConfig = {
        ...eventConfig,
        customLogger: prefixLogger
      };

      node = createBifrostNode(
        {group: groupCredential, share: shareCredential, relays: resolvedRelays},
        mergedEventConfig
      );

      const onMessage = (payload: any) => {
        if (!payload || payload.tag !== '/echo/req') {
          return;
        }
        if (!isEchoConfirmationPayload(payload.data)) {
          return;
        }
        prefixLogger('info', 'Echo confirmation received', payload);
        safeResolve(true);
      };

      const onError = (error: unknown) => {
        prefixLogger('error', 'Node error while waiting for echo', error);
        safeReject(error);
      };

      const onClosed = () => {
        if (settled) return;
        prefixLogger('warn', 'Connection closed before echo arrived');
        safeReject(new Error('Connection closed before echo confirmation was received.'));
      };

      node.on('message', onMessage);
      node.on('error', onError);
      node.on('closed', onClosed);

      timeoutId = setTimeout(() => {
        safeReject(new Error(`No echo confirmation within ${timeout / 1000}s.`));
      }, timeout);

      void connectNode(node)
        .then(() => {
          if (settled) {
            return;
          }
          prefixLogger('info', 'Listening for echo confirmation');
        })
        .catch(error => {
          safeReject(error);
        });
    } catch (error) {
      safeReject(error);
    }
  });
}
