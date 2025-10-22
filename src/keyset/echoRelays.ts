import {decodeGroup, DEFAULT_ECHO_RELAYS} from '@frostr/igloo-core';
import {resolveRelaysWithFallbackSync} from './relays.js';

export type ComputeEchoRelaysOverrides = {
  groupRelays?: string[];
  baseRelays?: string[];
};

function normalize(urlish: string): string {
  const v = String(urlish).trim();
  if (!v) return v;
  // If already a WebSocket URL, keep as-is (normalize scheme casing)
  if (/^wss?:\/\//i.test(v)) {
    return v.replace(/^wss?:\/\//i, m => m.toLowerCase());
  }
  // If an HTTP(S) URL, map to WS/WSS respectively
  if (/^https?:\/\//i.test(v)) {
    return v.replace(/^(https?):\/\//i, (_m, p1) => (String(p1).toLowerCase() === 'https' ? 'wss://' : 'ws://'));
  }
  // Bare host/path -> default to secure WebSocket
  return `wss://${v}`;
}

function extractGroupRelays(groupCredential?: string): string[] {
  if (!groupCredential) return [];
  try {
    const decoded: any = decodeGroup(groupCredential);
    const candidate: unknown = decoded?.relays ?? decoded?.relayUrls ?? decoded?.relay_urls;
    if (Array.isArray(candidate)) {
      return candidate
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .map(normalize);
    }
  } catch {}
  return [];
}

function computeBaseRelays(override?: string[]): string[] {
  if (Array.isArray(override)) return override.map(normalize);
  return resolveRelaysWithFallbackSync(undefined, DEFAULT_ECHO_RELAYS).map(normalize);
}

export function computeEchoRelays(
  groupCredential?: string,
  explicitRelays?: string[],
  envRelay?: string,
  overrides?: ComputeEchoRelaysOverrides
): string[] {
  const explicit = Array.isArray(explicitRelays) ? explicitRelays.map(normalize) : [];

  // IGLOO_TEST_RELAY behavior:
  // - If envRelay is set and there are NO explicit relays, return ONLY envRelay
  //   to keep tests/local runs isolated from public relays.
  // - If envRelay is set AND there ARE explicit relays, honor the explicit list
  //   but add envRelay to ensure overlap with cooperating apps. Do not include
  //   group/base relays in this mode to avoid accidental public connections.
  if (envRelay && envRelay.trim().length > 0) {
    const envOnly = [normalize(envRelay)];
    if (explicit.length === 0) {
      return envOnly;
    }
    const map = new Map<string, string>();
    for (const r of [...explicit, ...envOnly]) {
      const key = r.toLowerCase();
      if (!map.has(key)) map.set(key, r);
    }
    return Array.from(map.values());
  }

  const group = overrides?.groupRelays
    ? overrides.groupRelays.map(normalize)
    : extractGroupRelays(groupCredential);
  const base = computeBaseRelays(overrides?.baseRelays);

  // Deduplicate by lowercase key but preserve original casing in output.
  const map = new Map<string, string>();
  for (const list of [explicit, group, base]) {
    for (const r of list) {
      const key = r.toLowerCase();
      if (!map.has(key)) map.set(key, r);
    }
  }
  return Array.from(map.values());
}

export {normalize as normalizeRelayUrl};
