import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {getAppDataPath} from './paths.js';

export type RelaysConfig = {
  relays: string[];
  updatedAt?: string;
};

// Built-in signer fallback (when no overrides and no configured defaults)
export const DEFAULT_SIGNER_RELAYS = ['wss://relay.primal.net'];

function getConfigDirectory(): string {
  return path.join(getAppDataPath(), 'igloo');
}

export function getRelaysConfigPath(): string {
  return path.join(getConfigDirectory(), 'relays.json');
}

function isWsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'wss:' || u.protocol === 'ws:';
  } catch {
    return false;
  }
}

export function normalizeRelays(input: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (!isWsUrl(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export async function readConfiguredRelays(): Promise<string[] | undefined> {
  const file = getRelaysConfigPath();
  try {
    const raw = await fsp.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<RelaysConfig>;
    const relays = Array.isArray(parsed.relays) ? parsed.relays.filter(r => typeof r === 'string') : [];
    const normalized = normalizeRelays(relays);
    return normalized.length > 0 ? normalized : undefined;
  } catch (err: any) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
      return undefined;
    }
    // On malformed JSON, treat as no config rather than crashing the CLI
    return undefined;
  }
}

export function readConfiguredRelaysSync(): string[] | undefined {
  const file = getRelaysConfigPath();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<RelaysConfig>;
    const relays = Array.isArray(parsed.relays) ? parsed.relays.filter(r => typeof r === 'string') : [];
    const normalized = normalizeRelays(relays);
    return normalized.length > 0 ? normalized : undefined;
  } catch (err: any) {
    return undefined;
  }
}

export async function writeConfiguredRelays(relays: string[]): Promise<string[]> {
  const normalized = normalizeRelays(relays);
  const dir = getConfigDirectory();
  await fsp.mkdir(dir, {recursive: true});
  const file = getRelaysConfigPath();
  const payload: RelaysConfig = {relays: normalized, updatedAt: new Date().toISOString()};
  await fsp.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
  return normalized;
}

export async function removeConfiguredRelays(): Promise<void> {
  const file = getRelaysConfigPath();
  try {
    await fsp.unlink(file);
  } catch (err: any) {
    if (err && err.code !== 'ENOENT') {
      throw err;
    }
  }
}

// Resolve with precedence: explicit override → configured defaults → supplied fallback
export function resolveRelaysWithFallbackSync(
  override: string[] | undefined,
  fallback: string[]
): string[] {
  if (Array.isArray(override) && override.length > 0) {
    const normalizedOverride = normalizeRelays(override);
    if (normalizedOverride.length > 0) {
      return normalizedOverride;
    }
    // fall through to configured/fallback if overrides normalize away
  }
  const configured = readConfiguredRelaysSync();
  if (configured && configured.length > 0) {
    return configured;
  }
  return normalizeRelays(fallback);
}
