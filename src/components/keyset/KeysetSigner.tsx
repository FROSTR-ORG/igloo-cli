import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {Box, Text, useInput} from 'ink';
import fs from 'node:fs/promises';
import {
  createAndConnectNode,
  cleanupBifrostNode,
  DEFAULT_PING_RELAYS,
  decodeGroup,
  decodeShare,
  extractSelfPubkeyFromCredentials,
  normalizePubkey,
  PeerManager
} from '@frostr/igloo-core';
import type {BifrostNode} from '@frostr/igloo-core';
import {SimplePool} from 'nostr-tools';
import {Prompt} from '../ui/Prompt.js';
import {
  readShareFiles,
  decryptShareCredential,
  ShareMetadata
} from '../../keyset/index.js';

export type KeysetSignerProps = {
  args: string[];
  flags: Record<string, string | boolean>;
};

type LoadState = {
  loading: boolean;
  error: string | null;
  shares: ShareMetadata[];
};

type Phase = 'select' | 'password' | 'starting' | 'running';

type RunningInfo = {
  shareId: string;
  shareName: string;
  shareIndex?: number;
  groupCredential: string;
  relays: string[];
};

type NodeListeners = {
  error?: (error: any) => void;
  closed?: () => void;
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  id: number;
  level: string;
  message: string;
  data?: unknown;
  summary?: string;
  timestamp: Date;
};

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function parseBooleanFlag(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return false;
}

function parseLogLevelFlag(value: string | boolean | undefined, fallback: LogLevel): LogLevel {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if ((LOG_LEVELS as string[]).includes(normalized)) {
      return normalized as LogLevel;
    }
  }

  return fallback;
}

function formatLogData(data: unknown): string | undefined {
  if (data === null || data === undefined) {
    return undefined;
  }

  if (typeof data === 'string') {
    const normalized = data.replace(/\s+/g, ' ').trim();
    return normalized.length > 200 ? `${normalized.slice(0, 197)}…` : normalized;
  }

  try {
    const serialized = JSON.stringify(data);
    const normalized = serialized.replace(/\s+/g, ' ').trim();
    return normalized.length > 200 ? `${normalized.slice(0, 197)}…` : normalized;
  } catch (error) {
    return String(data);
  }
}

function shorten(value: string, prefix = 6, suffix = 4): string {
  if (value.length <= prefix + suffix + 1) {
    return value;
  }
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}

function summarizeLogData(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const record = data as Record<string, unknown>;
  const parts: string[] = [];

  const tag = typeof record.tag === 'string' ? record.tag : undefined;
  if (tag) {
    parts.push(`tag=${tag}`);
  }

  const env = record.env;
  if (env && typeof env === 'object') {
    const envRecord = env as Record<string, unknown>;
    const envId = typeof envRecord.id === 'string' ? envRecord.id : undefined;
    if (envId) {
      parts.push(`id=${shorten(envId)}`);
    }

    const envPubkey = typeof envRecord.pubkey === 'string' ? envRecord.pubkey : undefined;
    if (envPubkey) {
      parts.push(`pubkey=${shorten(normalizePubkey(envPubkey))}`);
    }

    if (typeof envRecord.created_at === 'number') {
      parts.push(`at=${envRecord.created_at}`);
    }
  }

  const peer = typeof (record as any).pubkey === 'string' ? (record as any).pubkey : undefined;
  if (peer) {
    parts.push(`peer=${shorten(normalizePubkey(peer))}`);
  }

  const relay = typeof (record as any).relay === 'string' ? (record as any).relay : undefined;
  if (relay) {
    parts.push(`relay=${relay}`);
  }

  if (parts.length === 0) {
    return undefined;
  }

  return parts.join(' ');
}

function formatTimestamp(date: Date): string {
  const iso = date.toISOString();
  return iso.slice(11, 19);
}

function logColor(level: string): 'gray' | 'green' | 'yellow' | 'red' | 'magenta' {
  switch (level) {
    case 'error':
      return 'red';
    case 'warn':
      return 'yellow';
    case 'debug':
      return 'magenta';
    case 'info':
      return 'green';
    default:
      return 'gray';
  }
}

function parseRelayFlags(flags: Record<string, string | boolean>): string[] | undefined {
  const relayString =
    typeof flags.relays === 'string'
      ? flags.relays
      : typeof flags.relay === 'string'
        ? flags.relay
        : undefined;

  if (!relayString) {
    return undefined;
  }

  return relayString
    .split(',')
    .map(relay => relay.trim())
    .filter(Boolean);
}

function findShare(shares: ShareMetadata[], token: string | undefined): ShareMetadata | null {
  if (!token) {
    return null;
  }

  const direct = shares.find(share => share.id === token || share.name === token);
  if (direct) {
    return direct;
  }

  const numeric = Number(token);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= shares.length) {
    return shares[numeric - 1];
  }

  return null;
}

export function KeysetSigner({args, flags}: KeysetSignerProps) {
  const [loadState, setLoadState] = useState<LoadState>({loading: true, error: null, shares: []});
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedShare, setSelectedShare] = useState<ShareMetadata | null>(null);
  const [runningInfo, setRunningInfo] = useState<RunningInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [nodeError, setNodeError] = useState<string | null>(null);

  const verboseFlag = parseBooleanFlag(flags.verbose);
  const logLevelDefault = parseLogLevelFlag(flags['log-level'], 'info');
  const initialLogsVisible = verboseFlag || typeof flags['log-level'] === 'string';
  const [logsVisible, setLogsVisible] = useState<boolean>(initialLogsVisible);
  const [currentLogLevel] = useState<LogLevel>(logLevelDefault);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  const directPassword = typeof flags.password === 'string' ? flags.password : undefined;
  const passwordFilePath = typeof flags['password-file'] === 'string' ? flags['password-file'] : undefined;
  const [automationPassword, setAutomationPassword] = useState<string | undefined>(directPassword);
  const [passwordLoading, setPasswordLoading] = useState<boolean>(Boolean(passwordFilePath && !directPassword));
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [autoRan, setAutoRan] = useState(false);

  const shareToken = typeof flags.share === 'string' ? flags.share : args[0];
  const relayOverrides = parseRelayFlags(flags);
  const relays = relayOverrides && relayOverrides.length > 0 ? relayOverrides : DEFAULT_PING_RELAYS;

  const nodeRef = useRef<BifrostNode | null>(null);
  const peerManagerRef = useRef<PeerManager | null>(null);
  const closingRef = useRef(false);
  const listenersRef = useRef<NodeListeners>({});
  const autoSelectRef = useRef(false);
  const logIdRef = useRef(0);
  const lastLogKeyRef = useRef<string | null>(null);

  const appendLog = useCallback((level: string, message: string, data?: unknown) => {
    if (message === 'Event emitted: message') {
      return;
    }

    logIdRef.current += 1;
    const summary = summarizeLogData(data) ?? formatLogData(data);
    const dedupeKey = `${level}|${message}|${summary ?? ''}`;
    if (lastLogKeyRef.current === dedupeKey) {
      return;
    }
    lastLogKeyRef.current = dedupeKey;

    const entry: LogEntry = {
      id: logIdRef.current,
      level,
      message,
      data,
      summary,
      timestamp: new Date()
    };
    setLogEntries(previous => {
      const next = [...previous, entry];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  const recentLogs = useMemo(() => {
    const start = Math.max(logEntries.length - 12, 0);
    return logEntries.slice(start);
  }, [logEntries]);

  useEffect(() => {
    void (async () => {
      try {
        const shares = await readShareFiles();
        setLoadState({loading: false, error: null, shares});
      } catch (error: any) {
        setLoadState({
          loading: false,
          error: error?.message ?? 'Failed to read saved shares.',
          shares: []
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (directPassword) {
      if (directPassword.length < 8) {
        setAutomationError('Automation password must be at least 8 characters.');
      }
      setAutomationPassword(directPassword);
      setPasswordLoading(false);
      return;
    }

    if (!passwordFilePath) {
      setPasswordLoading(false);
      return;
    }

    setPasswordLoading(true);
    setAutomationError(null);

    void (async () => {
      try {
        const raw = await fs.readFile(passwordFilePath, 'utf8');
        const firstLine = raw.split(/\r?\n/)[0] ?? '';
        const trimmed = firstLine.trim();
        if (trimmed.length === 0) {
          setAutomationPassword(undefined);
          setAutomationError('Password file is empty.');
        } else if (trimmed.length < 8) {
          setAutomationPassword(trimmed);
          setAutomationError('Automation password must be at least 8 characters.');
        } else {
          setAutomationPassword(trimmed);
          setAutomationError(null);
        }
      } catch (error: any) {
        setAutomationError(`Unable to read password file: ${error?.message ?? error}`);
      } finally {
        setPasswordLoading(false);
      }
    })();
  }, [directPassword, passwordFilePath]);

  useEffect(() => {
    if (!automationPassword) {
      return;
    }

    if (automationPassword.length < 8) {
      setAutomationError('Automation password must be at least 8 characters.');
    }
  }, [automationPassword]);

  const availableShare = useMemo(() => {
    if (loadState.shares.length === 0) {
      return null;
    }
    return findShare(loadState.shares, shareToken);
  }, [loadState.shares, shareToken]);

  useEffect(() => {
    if (!availableShare || autoSelectRef.current) {
      return;
    }
    setSelectedShare(availableShare);
    setPhase(prev => (prev === 'select' ? 'password' : prev));
    autoSelectRef.current = true;
  }, [availableShare]);

  const removeNodeListener = useCallback((event: 'error' | 'closed') => {
    const listener = listenersRef.current[event];
    if (!listener || !nodeRef.current) {
      return;
    }
    const node = nodeRef.current as any;
    if (typeof node.off === 'function') {
      node.off(event, listener);
    } else if (typeof node.removeListener === 'function') {
      node.removeListener(event, listener);
    }
  }, []);

  const stopSigner = useCallback(
    (reason?: string, options?: {silent?: boolean}) => {
      if (closingRef.current) {
        return;
      }
      closingRef.current = true;

      removeNodeListener('error');
      removeNodeListener('closed');
      listenersRef.current = {};

      if (peerManagerRef.current) {
        try {
          peerManagerRef.current.cleanup();
        } catch {
          // ignore cleanup errors to prioritise signer shutdown
        }
        peerManagerRef.current = null;
      }

      if (nodeRef.current) {
        try {
          cleanupBifrostNode(nodeRef.current);
        } catch (error) {
          // ignore cleanup errors to avoid masking shutdown reasons
        }
        nodeRef.current = null;
      }

      if (!options?.silent) {
        if (reason) {
          setStatusMessage(reason);
        }
        setPhase('select');
        setSelectedShare(null);
        setRunningInfo(null);
        setNodeError(null);
        setAutomationPassword(undefined);
        setAutoRan(false);
      }

      closingRef.current = false;
    },
    [removeNodeListener]
  );

  useEffect(() => {
    return () => {
      stopSigner(undefined, {silent: true});
    };
  }, [stopSigner]);

  useEffect(() => {
    const handleSignal = () => {
      stopSigner(undefined, {silent: true});
    };

    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);

    return () => {
      process.off('SIGINT', handleSignal);
      process.off('SIGTERM', handleSignal);
    };
  }, [stopSigner]);

  const startSigner = useCallback(
    async (share: ShareMetadata, password: string) => {
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }

      let shareCredential: string;
      let shareIndex: number | undefined;
      try {
        const decrypted = decryptShareCredential(share, password);
        shareCredential = decrypted.shareCredential;
        try {
          const decoded = decodeShare(shareCredential);
          shareIndex = decoded.idx;
        } catch {
          shareIndex = undefined;
        }
      } catch (error: any) {
        throw new Error(error?.message ?? 'Failed to decrypt share. Check your password.');
      }

      setPhase('starting');
      setStatusMessage(null);
      setNodeError(null);
      setRunningInfo(null);
      setLogEntries([]);
      logIdRef.current = 0;

      try {
        const node = await createAndConnectNode(
          {
            group: share.groupCredential,
            share: shareCredential,
            relays
          },
          {
            enableLogging: true,
            logLevel: currentLogLevel,
            customLogger: (level, message, data) => {
              appendLog(level, message, data);
            }
          }
        );

        nodeRef.current = node;

        try {
          const {pubkey: derivedPubkey, warnings: pubkeyWarnings} = extractSelfPubkeyFromCredentials(
            share.groupCredential,
            shareCredential,
            {suppressWarnings: true}
          );

          pubkeyWarnings?.forEach(warning => appendLog('warn', warning));

          if (!derivedPubkey) {
            appendLog('warn', 'Peer monitoring disabled: unable to derive signer pubkey');
            setStatusMessage(prev => prev ?? 'Peer monitoring disabled: unable to derive signer pubkey.');
            peerManagerRef.current = null;
          } else {
            const normalizedSelf = normalizePubkey(derivedPubkey);
            const group = decodeGroup(share.groupCredential);
            const commits = Array.isArray(group?.commits) ? group.commits : [];

            const peerPubkeys = commits
              .map(commit => {
                if (typeof commit === 'string') {
                  return commit;
                }
                if (commit && typeof commit === 'object') {
                  if (typeof commit.pubkey === 'string') {
                    return commit.pubkey;
                  }
                  if (typeof (commit as any).pub === 'string') {
                    return (commit as any).pub as string;
                  }
                }
                return undefined;
              })
              .filter((value): value is string => typeof value === 'string' && value.length > 0)
              .map(pubkey => normalizePubkey(pubkey))
              .filter(pubkey => pubkey !== normalizedSelf);

            if (peerPubkeys.length === 0) {
              setStatusMessage(prev => prev ?? 'Peer monitoring: no other peers found in this group.');
              peerManagerRef.current = null;
            } else {
              const manager = new PeerManager(node, normalizedSelf, {
                autoMonitor: true,
                pingInterval: 30_000,
                customLogger: (level, message, data) => {
                  appendLog(level, message, data);
                }
              });
              manager.initializePeersFromList(peerPubkeys);
              peerManagerRef.current = manager;
              void manager
                .pingPeers()
                .catch(error => appendLog('warn', 'Initial peer ping failed', error instanceof Error ? error.message : error));
            }
          }
        } catch (error: any) {
          // Peer monitoring is best-effort; surface error but keep signer alive.
          appendLog('warn', 'Peer monitoring disabled', error?.message ?? error);
          setStatusMessage(prev => prev ?? `Peer monitoring disabled: ${error?.message ?? error}`);
          peerManagerRef.current = null;
        }

        const handleError = (error: any) => {
          const message = error?.message ?? String(error ?? 'Unknown node error');
          setNodeError(message);
          stopSigner(`Signer error: ${message}`);
        };

        const handleClosed = () => {
          stopSigner('Signer disconnected from relays.');
        };

        listenersRef.current = {
          error: handleError,
          closed: handleClosed
        };

        const nodeAny = node as any;
        if (typeof nodeAny.on === 'function') {
          nodeAny.on('error', handleError);
          nodeAny.on('closed', handleClosed);
        }

        setRunningInfo({
          shareId: share.id,
          shareName: share.name,
          shareIndex,
          groupCredential: share.groupCredential,
          relays
        });

        setPhase('running');
      } catch (error: any) {
        setPhase('password');
        throw new Error(error?.message ?? 'Failed to start signer.');
      }
    },
    [appendLog, currentLogLevel, relays, stopSigner]
  );

  const automationReady =
    Boolean(automationPassword && automationPassword.length >= 8) &&
    !passwordLoading &&
    !automationError &&
    selectedShare !== null &&
    !autoRan;

  useEffect(() => {
    if (!automationReady || !selectedShare) {
      return;
    }

    setAutoRan(true);
    void (async () => {
      try {
        await startSigner(selectedShare, automationPassword as string);
      } catch (error: any) {
        setAutomationError(error?.message ?? 'Automation failed to start signer.');
        setPhase('password');
      }
    })();
  }, [automationReady, selectedShare, automationPassword, startSigner]);

  useInput((input, key) => {
    if (phase !== 'running') {
      return;
    }

    if (input?.toLowerCase() === 'l') {
      setLogsVisible(value => !value);
      return;
    }

    if (input?.toLowerCase() === 'q' || key.escape) {
      stopSigner('Signer stopped by user.');
    }
  });

  if (loadState.loading || passwordLoading) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Loading saved shares…</Text>
      </Box>
    );
  }

  if (loadState.error) {
    return (
      <Box flexDirection="column">
        <Text color="red">{loadState.error}</Text>
      </Box>
    );
  }

  if (automationError && phase !== 'running') {
    return (
      <Box flexDirection="column">
        <Text color="red">{automationError}</Text>
      </Box>
    );
  }

  if (loadState.shares.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No saved shares available. Generate and save a share before running the signer.</Text>
      </Box>
    );
  }

  if (phase === 'select') {
    return (
      <Box flexDirection="column">
        {statusMessage ? <Text color="yellow">{statusMessage}</Text> : null}
        <Text color="cyanBright">Select a share to run as signer</Text>
        {loadState.shares.map((share, index) => (
          <Text key={share.id}>
            {index + 1}. {share.name} ({share.id})
          </Text>
        ))}
        <Prompt
          key="select-share"
          label="Enter number or share id"
          onSubmit={value => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
              return 'Please choose a share (or press Ctrl+C to exit).';
            }

            const chosen = findShare(loadState.shares, trimmed);
            if (!chosen) {
              return 'Share not found. Enter a listed number or id.';
            }

            setSelectedShare(chosen);
            setPhase('password');
            setStatusMessage(null);
            return undefined;
          }}
        />
      </Box>
    );
  }

  if (!selectedShare) {
    return (
      <Box flexDirection="column">
        <Text color="red">Share selection missing.</Text>
      </Box>
    );
  }

  if (phase === 'password') {
    return (
      <Box flexDirection="column">
        {statusMessage ? <Text color="yellow">{statusMessage}</Text> : null}
        <Text color="cyanBright">Decrypt share: {selectedShare.name}</Text>
        <Text color="gray">Saved at {selectedShare.savedAt ?? 'unknown time'}</Text>
        <Prompt
          key={`password-${selectedShare.id}`}
          label="Enter password"
          mask
          onSubmit={async value => {
            try {
              await startSigner(selectedShare, value);
              return undefined;
            } catch (error: any) {
              return error?.message ?? 'Failed to start signer.';
            }
          }}
        />
      </Box>
    );
  }

  if (phase === 'starting') {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Starting signer…</Text>
        <Text color="gray">Connecting via relays: {relays.join(', ')}</Text>
      </Box>
    );
  }

  if (phase === 'running' && runningInfo) {
    return (
      <Box flexDirection="column">
        <Text color="green">Signer is running.</Text>
        {statusMessage ? <Text color="yellow">{statusMessage}</Text> : null}
        {nodeError ? <Text color="red">{nodeError}</Text> : null}
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Share</Text>
          <Text color="gray">
            {runningInfo.shareName} ({runningInfo.shareId})
          </Text>
          {runningInfo.shareIndex !== undefined ? (
            <Text color="gray">Index: {runningInfo.shareIndex}</Text>
          ) : null}
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Group credential</Text>
          <Text color="gray">{runningInfo.groupCredential}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Relays</Text>
          <Text color="gray">{runningInfo.relays.join(', ')}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">
            Press q or Esc to stop the signer. Press l to {logsVisible ? 'hide' : 'show'} logs.
          </Text>
        </Box>
        {logsVisible ? (
          <Box marginTop={1} flexDirection="column">
            <Text color="cyan">Logs (level ≥ {currentLogLevel.toUpperCase()})</Text>
            {recentLogs.length === 0 ? (
              <Text color="gray">No events yet.</Text>
            ) : (
              recentLogs.map(entry => (
                <Text key={entry.id} color={logColor(entry.level)}>
                  {formatTimestamp(entry.timestamp)} {entry.level.toUpperCase()} {entry.message}
                  {entry.summary ? ` — ${entry.summary}` : ''}
                </Text>
              ))
            )}
          </Box>
        ) : null}
      </Box>
    );
  }

  return null;
}

export default KeysetSigner;
let simplePoolPatched = false;

function ensureSimplePoolPatched() {
  if (simplePoolPatched) {
    return;
  }

  const prototype = (SimplePool as any)?.prototype;
  if (!prototype) {
    simplePoolPatched = true;
    return;
  }

  if (prototype.__iglooFilterNormalizePatched) {
    simplePoolPatched = true;
    return;
  }

  const originalSubscribeMany = prototype.subscribeMany;
  if (typeof originalSubscribeMany !== 'function') {
    simplePoolPatched = true;
    return;
  }

  prototype.subscribeMany = function patchedSubscribeMany(this: unknown, relays: unknown, filters: unknown, params: unknown) {
    const normalizedFilters =
      Array.isArray(filters) &&
      filters.length === 1 &&
      filters[0] !== null &&
      typeof filters[0] === 'object' &&
      !Array.isArray(filters[0])
        ? filters[0]
        : filters;

    return originalSubscribeMany.call(this, relays, normalizedFilters, params);
  };

  Object.defineProperty(prototype, '__iglooFilterNormalizePatched', {
    value: true,
    enumerable: false
  });

  simplePoolPatched = true;
}

ensureSimplePoolPatched();
