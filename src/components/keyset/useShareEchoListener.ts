import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {computeEchoRelays} from '../../keyset/echoRelays.js';
import {awaitShareEchoCompat} from '../../keyset/awaitShareEchoCompat.js';

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
    const envRelay = typeof process !== 'undefined' ? process.env.IGLOO_TEST_RELAY : undefined;
    // computeEchoRelays will short‑circuit to ONLY envRelay when provided
    // (IGLOO_TEST_RELAY), ensuring tests/local runs do not hit public relays.
    return computeEchoRelays(groupCredential ?? undefined, undefined, envRelay);
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
        const debugEnabled = ((process.env.IGLOO_DEBUG_ECHO ?? '').toLowerCase() === '1' || (process.env.IGLOO_DEBUG_ECHO ?? '').toLowerCase() === 'true');
        const debugLogger = debugEnabled
          ? ((level: string, message: string, data?: unknown) => {
              try {
                // eslint-disable-next-line no-console
                console.log(`[echo-listen] ${level.toUpperCase()} ${message}`, data ?? '');
              } catch {}
            })
          : undefined;
        if (debugEnabled) {
          try {
            // eslint-disable-next-line no-console
            console.log('[echo-listen] INFO using relays', relays ?? 'default');
          } catch {}
        }
        const result = await awaitShareEchoCompat(
          groupCredential,
          shareCredential,
          { relays, timeout: timeoutMs, eventConfig: { enableLogging: debugEnabled, customLogger: debugLogger } }
        );
        if (controller.cancelled) return;
        if (result) {
          setStatus('success');
          setMessage(null);
          retryCountRef.current = 0;
        } else {
          setStatus('listening');
          setMessage('No echo yet.');
        }
      } catch (err: any) {
        if (controller.cancelled) return;
        const reason = err?.message ?? 'No echo confirmation received yet.';
        if (retryCountRef.current >= maxRetries) {
          setStatus('idle');
          setMessage(reason);
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
