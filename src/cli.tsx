import './polyfills/websocket.js';
import './polyfills/nostr.js';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import App from './App.js';
import {Help} from './components/Help.js';
import packageJson from '../package.json' with {type: 'json'};

// Swallow benign Nostr pool shutdown rejections from nostr-tools
// that can surface as unhandled promise rejections in Node 20+.
// See: AbstractRelay.closeAllSubscriptions("relay connection closed by us").
// We specifically ignore only this message to avoid hiding real errors.
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('unhandledRejection', (reason: unknown) => {
    let benign = false;
    try {
      const msg = typeof reason === 'string' ? reason : (reason as any)?.message ?? '';
      if (String(msg).toLowerCase() === 'relay connection closed by us') {
        benign = true;
      }
    } catch {}
    if (benign) return; // ignore expected shutdown noise

    // Surface all other rejections by rethrowing as an uncaught exception.
    // This preserves Node's default fail-fast behavior and visibility.
    try {
      // eslint-disable-next-line no-console
      console.error('Unhandled promise rejection:', reason);
    } catch {}
    setImmediate(() => {
      if (reason instanceof Error) {
        throw reason;
      }
      throw new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
    });
  });
} else {
  try {
    // eslint-disable-next-line no-console
    console.error('Failed to register unhandledRejection handler: process.on is not available');
  } catch {}
}

type Flags = Record<string, string | boolean>;

type ParsedArgs = {
  command: string;
  args: string[];
  flags: Flags;
  showHelp: boolean;
  showVersion: boolean;
};

function parseArgv(argv: string[]): ParsedArgs {
  const flags: Flags = {};
  const positionals: string[] = [];
  let showHelp = false;
  let showVersion = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--help' || value === '-h') {
      showHelp = true;
      continue;
    }

    if (value === '--version' || value === '-v') {
      showVersion = true;
      continue;
    }

    if (value.startsWith('--')) {
      const [name, inline] = value.slice(2).split('=');

      if (inline !== undefined && inline.length > 0) {
        flags[name] = inline;
        continue;
      }

      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[name] = next;
        index += 1;
      } else {
        flags[name] = true;
      }

      continue;
    }

    if (value.startsWith('-') && value.length > 1) {
      const name = value.slice(1);
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[name] = next;
        index += 1;
      } else {
        flags[name] = true;
      }
      continue;
    }

    positionals.push(value);
  }

  if (flags.t !== undefined && flags.threshold === undefined) {
    flags.threshold = flags.t;
    delete flags.t;
  }

  if (flags.T !== undefined && flags.total === undefined) {
    flags.total = flags.T;
    delete flags.T;
  }

  // Short alias: -E → --debug-echo
  if (flags.E !== undefined && flags['debug-echo'] === undefined) {
    flags['debug-echo'] = flags.E;
    delete flags.E;
  }

  return {
    command: positionals[0] ?? 'intro',
    args: positionals.slice(1),
    flags,
    showHelp,
    showVersion
  };
}

function toBool(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(v)) return true;
    if (['0', 'false', 'no', 'off'].includes(v)) return false;
  }
  return false;
}

function showHelpScreen(version: string, opts?: any) {
  const instance = render(<Help version={version} />, opts);
  instance.waitUntilExit().then(() => process.exit(0));
}

function showVersion(version: string) {
  console.log(version);
  process.exit(0);
}

const {command, args, flags, showHelp, showVersion: shouldShowVersion} = parseArgv(
  process.argv.slice(2)
);

// Allow --debug-echo to enable/disable echo diagnostics without env vars.
// This is read by echo send/listen utilities.
(() => {
  const raw = (flags['debug-echo'] ?? (flags as any).debugEcho) as string | boolean | undefined;
  if (raw !== undefined) {
    process.env.IGLOO_DEBUG_ECHO = toBool(raw) ? '1' : '0';
  }
})();

// In non-interactive environments (CI/tests), Ink raw mode can throw.
// Allow tests to opt-out via IGLOO_DISABLE_RAW_MODE=1
let inkOptions: any | undefined;
if (process.env.IGLOO_DISABLE_RAW_MODE === '1' || process.env.IGLOO_DISABLE_RAW_MODE === 'true') {
  const fakeIn: any = new PassThrough();
  fakeIn.isTTY = true;
  // Ensure Ink doesn't attempt to keep the event loop open via ref/unref
  fakeIn.ref = () => {};
  fakeIn.unref = () => {};
  fakeIn.setRawMode = () => {};
  inkOptions = {
    // Explicitly tell Ink that raw mode is NOT supported in this environment.
    // This prevents Ink from calling stdin.ref()/stdin.setRawMode(true).
    isRawModeSupported: false,
    stdin: fakeIn
  };
}

// Provide light polyfills for Bun or environments lacking ref/unref on stdin.
// These are no-ops and safe under Node.
try {
  const stdinPoly: any = process.stdin as any;
  if (stdinPoly && typeof stdinPoly.ref !== 'function') {
    stdinPoly.ref = () => {};
  }
  if (stdinPoly && typeof stdinPoly.unref !== 'function') {
    stdinPoly.unref = () => {};
  }
} catch {
  // best-effort only
}

if (shouldShowVersion) {
  showVersion(packageJson.version);
}

if (showHelp) {
  const helpable = new Set(['share', 'keyset', 'keys', 'relays']);
  if (helpable.has((command ?? '').toLowerCase())) {
    render(
      <App
        command={command}
        args={args}
        flags={flags}
        version={packageJson.version}
      />,
      inkOptions
    );
  } else {
    showHelpScreen(packageJson.version, inkOptions);
  }
} else {
  render(
    <App
      command={command}
      args={args}
      flags={flags}
      version={packageJson.version}
    />,
    inkOptions
  );
}
