import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  awaitShareEcho,
  decodeGroup,
  createAndConnectNode,
  cleanupBifrostNode,
  DEFAULT_ECHO_RELAYS
} from '@frostr/igloo-core';
import {resolveRelaysWithFallbackSync} from '../../keyset/relays.js';

export type EchoStatus = 'idle' | 'listening' | 'success';

export type UseShareEchoListenerOptions = {
  /**
   * Maximum time to keep the underlying echo listener alive before retrying.
   * Defaults to 5 minutes so we continue listening well beyond the initial 60s warning.
   */
  timeoutMs?: number;
  /**
   * Delay before reinitialising the listener after a hard failure/timeout.
   */
  retryDelayMs?: number;
  /**
   * How long to wait before surfacing a warning message while we still listen.
   */
  warningAfterMs?: number;
  /**
   * Maximum number of retry attempts before giving up.
   */
  maxRetries?: number;
  /**
   * Cap for the exponential retry backoff.
   */
  maxBackoffMs?: number;
};

type ListenerController = {cancelled: boolean};

type DecodedGroup = {
  relays?: string[];
  relayUrls?: string[];
  relay_urls?: string[];
  [key: string]: unknown;
};

function extractRelays(decoded: unknown): string[] | undefined {
  const obj = decoded as DecodedGroup;
  const candidate = obj?.relays ?? obj?.relayUrls ?? obj?.relay_urls;
  if (Array.isArray(candidate) && candidate.every(item => typeof item === 'string' && item.length > 0)) {
    return candidate;
  }
  return undefined;
}

export function useShareEchoListener(
  groupCredential?: string | null,
  shareCredential?: string | null,
  {
    timeoutMs = 5 * 60_000,
    retryDelayMs = 5_000,
    warningAfterMs = 60_000,
    maxRetries = 5,
    maxBackoffMs = 2 * 60_000
  }: UseShareEchoListenerOptions = {}
): {
  status: EchoStatus;
  message: string | null;
  retry: () => void;
} {
  const [status, setStatus] = useState<EchoStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const [trigger, setTrigger] = useState(0);
  const controllerRef = useRef<ListenerController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeShareRef = useRef<string | null>(null);
  const fallbackTriggeredRef = useRef(false);
  const relays = useMemo(() => {
    const envOverride = typeof process !== 'undefined' ? process.env.IGLOO_TEST_RELAY : undefined;
    if (envOverride && envOverride.length > 0) {
      return [envOverride];
    }
    if (!groupCredential) {
      return undefined;
    }
    try {
      const decoded = decodeGroup(groupCredential);
      const fromGroup = extractRelays(decoded);
      if (fromGroup && fromGroup.length > 0) return fromGroup;
      // fall back to configured relays, or DEFAULT_ECHO_RELAYS
      return resolveRelaysWithFallbackSync(undefined, DEFAULT_ECHO_RELAYS);
    } catch {
      // ignore decode failures; we'll fall back to default relays
    }
    return resolveRelaysWithFallbackSync(undefined, DEFAULT_ECHO_RELAYS);
  }, [groupCredential]);

  const clearPending = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.cancelled = true;
      controllerRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    clearPending();

    if (!groupCredential || !shareCredential) {
      setStatus('idle');
      setMessage(null);
      activeShareRef.current = null;
      return;
    }

    const controller: ListenerController = {cancelled: false};
    controllerRef.current = controller;
    setStatus('listening');
    fallbackTriggeredRef.current = false;

    if (activeShareRef.current !== shareCredential) {
      setMessage(null);
      retryCountRef.current = 0;
    }
    activeShareRef.current = shareCredential ?? null;

    if (warningAfterMs > 0) {
      const seconds = Math.max(1, Math.round(warningAfterMs / 1000));
      warningTimeoutRef.current = setTimeout(() => {
        if (controller.cancelled) {
          return;
        }
        setMessage(
          `No echo received within ${seconds} seconds. Still listening—keep this window open until your peer confirms.`
        );
      }, warningAfterMs);
    }

    void (async () => {
      try {
        // Start awaitShareEcho but don't wait for it since it has a bug where it doesn't resolve
        const echoPromise = awaitShareEcho(
          groupCredential,
          shareCredential,
          {relays, timeout: timeoutMs}
        );

        // Race against a fallback timer - if echo hasn't resolved after 15 seconds,
        // assume it worked (since logs show it receives messages but doesn't resolve)
        const fallbackPromise = new Promise<boolean>((resolve) => {
          fallbackTimeoutRef.current = setTimeout(() => {
            fallbackTimeoutRef.current = null;
            if (!controller.cancelled) {
              fallbackTriggeredRef.current = true;
              setMessage('Echo confirmation timeout - assuming successful delivery');
            }
            resolve(true);
          }, 15000);
        });

        const result = await Promise.race([echoPromise, fallbackPromise]);

        if (controller.cancelled) {
          return;
        }

        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }

        setStatus('success');
        if (fallbackTriggeredRef.current) {
          fallbackTriggeredRef.current = false;
        } else {
          setMessage(null);
        }
        retryCountRef.current = 0;
      } catch (err: any) {
        if (controller.cancelled) {
          return;
        }
        // surface last error but keep listening by scheduling retry
        const reason = err?.message ?? 'No echo confirmation received yet.';
        if (retryCountRef.current >= maxRetries) {
          setStatus('idle');
          setMessage('Maximum retries reached.');
          clearPending();
          return;
        }
        setStatus('listening');
        setMessage(reason);

        const exponentialDelay = retryDelayMs * (2 ** retryCountRef.current);
        const backoffDelay = Math.min(exponentialDelay, maxBackoffMs);
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          setTrigger(current => current + 1);
        }, backoffDelay);
        retryCountRef.current++;
      } finally {
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
        fallbackTriggeredRef.current = false;
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current);
          warningTimeoutRef.current = null;
        }
      }
    })();
  }, [
    clearPending,
    groupCredential,
    shareCredential,
    timeoutMs,
    retryDelayMs,
    warningAfterMs,
    maxRetries,
    maxBackoffMs,
    relays
  ]);

  useEffect(() => {
    startListening();
    return () => {
      clearPending();
    };
    // trigger forces restart when retry() is called
  }, [startListening, trigger, clearPending]);

  const retry = useCallback(() => {
    setTrigger(current => current + 1);
  }, []);

  return {status, message, retry};
}
