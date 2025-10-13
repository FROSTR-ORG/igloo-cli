import './polyfills/websocket.js';
import React from 'react';
import {render} from 'ink';
import App from './App.js';
import {Help} from './components/Help.js';
import packageJson from '../package.json' with {type: 'json'};

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

  return {
    command: positionals[0] ?? 'intro',
    args: positionals.slice(1),
    flags,
    showHelp,
    showVersion
  };
}

function showHelpScreen(version: string) {
  const instance = render(<Help version={version} />);
  instance.waitUntilExit().then(() => process.exit(0));
}

function showVersion(version: string) {
  console.log(version);
  process.exit(0);
}

const {command, args, flags, showHelp, showVersion: shouldShowVersion} = parseArgv(
  process.argv.slice(2)
);

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
      />
    );
  } else {
    showHelpScreen(packageJson.version);
  }
} else {
  render(
    <App
      command={command}
      args={args}
      flags={flags}
      version={packageJson.version}
    />
  );
}
