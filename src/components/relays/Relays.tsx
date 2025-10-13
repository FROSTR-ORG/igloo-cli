import React, {useEffect, useRef, useState} from 'react';
import {Box, Text} from 'ink';
import {
  readConfiguredRelays,
  writeConfiguredRelays,
  removeConfiguredRelays,
  readConfiguredRelaysSync,
} from '../../keyset/relays.js';
import {DEFAULT_PING_RELAYS} from '@frostr/igloo-core';
import {DEFAULT_SIGNER_RELAYS} from '../../keyset/relays.js';

export type RelaysProps = {
  flags: Record<string, string | boolean>;
  args: string[];
};

function parseRelayFlags(flags: Record<string, string | boolean>): string[] | undefined {
  const relayString =
    typeof flags.relays === 'string'
      ? flags.relays
      : typeof flags.relay === 'string'
        ? flags.relay
        : undefined;

  if (!relayString) return undefined;
  return relayString
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function parseRelayArgs(args: string[]): string[] | undefined {
  if (!args || args.length === 0) return undefined;
  // Support comma or space separated
  if (args.length === 1 && args[0].includes(',')) {
    return args[0].split(',').map(s => s.trim()).filter(Boolean);
  }
  return args.map(s => s.trim()).filter(Boolean);
}

function uniqueLower(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of list) {
    const k = x.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}

export function Relays({flags, args}: RelaysProps) {
  const [configured, setConfigured] = useState<string[] | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const mutatedRef = useRef(false);
  const sub = args[0]?.toLowerCase();
  const rest = sub ? args.slice(1) : args;

  // Recompute effective defaults for both Status and Signer on each render.
  const effectiveSigner = (configured && configured.length > 0) ? configured : DEFAULT_SIGNER_RELAYS;
  const effectiveStatus = (configured && configured.length > 0) ? configured : DEFAULT_PING_RELAYS;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const latest = await readConfiguredRelays();
      if (cancelled || mutatedRef.current) return;
      setConfigured(latest);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSet(list: string[]) {
    const written = await writeConfiguredRelays(list);
    mutatedRef.current = true;
    setConfigured(written);
    setMessage(`Saved ${written.length} default relay${written.length === 1 ? '' : 's'}.`);
  }

  async function handleAdd(list: string[]) {
    const disk = readConfiguredRelaysSync();
    const current = (disk && disk.length > 0)
      ? disk
      : (configured && configured.length > 0)
        ? configured
        : DEFAULT_PING_RELAYS;
    const next = uniqueLower([...current, ...list]);
    await handleSet(next);
  }

  async function handleRemove(list: string[]) {
    const disk = readConfiguredRelaysSync();
    const current = (disk && disk.length > 0)
      ? disk
      : (configured && configured.length > 0)
        ? configured
        : DEFAULT_PING_RELAYS;
    const toRemove = new Set(list.map(v => v.toLowerCase()));
    const next = current.filter(v => !toRemove.has(v.toLowerCase()));
    await handleSet(next);
  }

  async function handleReset() {
    await removeConfiguredRelays();
    mutatedRef.current = true;
    setConfigured(undefined);
    setMessage('Reset relay defaults to built-in values.');
  }

  // Command execution
  useEffect(() => {
    void (async () => {
      if (sub === 'set') {
        const fromFlags = parseRelayFlags(flags);
        const fromArgs = parseRelayArgs(rest);
        const list = fromArgs ?? fromFlags;
        if (!list || list.length === 0) {
          setMessage('Provide relays via args or --relays.');
          return;
        }
        await handleSet(list);
        return;
      }
      if (sub === 'add') {
        const list = parseRelayArgs(rest) ?? parseRelayFlags(flags);
        if (!list || list.length === 0) {
          setMessage('Provide one or more relay URLs to add.');
          return;
        }
        await handleAdd(list);
        return;
      }
      if (sub === 'remove' || sub === 'rm' || sub === 'del') {
        const list = parseRelayArgs(rest) ?? parseRelayFlags(flags);
        if (!list || list.length === 0) {
          setMessage('Provide one or more relay URLs to remove.');
          return;
        }
        await handleRemove(list);
        return;
      }
      if (sub === 'reset' || sub === 'clear') {
        await handleReset();
        return;
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub, JSON.stringify(rest), JSON.stringify(flags)]);

  const mode = sub ?? 'list';

  return (
    <Box flexDirection="column">
      <Text color="cyanBright">Relay Defaults</Text>
      {message ? <Text color="yellow">{message}</Text> : null}
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Effective defaults</Text>
        <Text color="gray">Used when no per-run --relays and no configured defaults exist.</Text>
        <Text>- Signer fallback</Text>
        {effectiveSigner.length === 0 ? (
          <Text color="gray">(none)</Text>
        ) : (
          effectiveSigner.map((r, i) => <Text key={`${r}|sign|${i}`}>{i + 1}. {r}</Text>)
        )}
        <Text>- Status fallback</Text>
        {effectiveStatus.length === 0 ? (
          <Text color="gray">(none)</Text>
        ) : (
          effectiveStatus.map((r, i) => <Text key={`${r}|stat|${i}`}>{i + 1}. {r}</Text>)
        )}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Configured override</Text>
        {configured && configured.length > 0 ? (
          configured.map((r, i) => <Text key={`${r}|cfg|${i}`}>{i + 1}. {r}</Text>)
        ) : (
          <Text color="gray">(none — using built-in defaults)</Text>
        )}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Usage</Text>
        <Text>- igloo-cli relays                   List current defaults</Text>
        <Text>- igloo-cli relays set wss://a wss://b   Set defaults</Text>
        <Text>- igloo-cli relays add wss://c           Add relay(s)</Text>
        <Text>- igloo-cli relays remove wss://a        Remove relay(s)</Text>
        <Text>- igloo-cli relays reset                 Revert to built-in defaults</Text>
        <Text color="gray">Override per run: igloo-cli signer --relays wss://a,wss://b</Text>
      </Box>
    </Box>
  );
}

export default Relays;
