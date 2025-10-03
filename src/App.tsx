import React from 'react';
import {Intro} from './components/Intro.js';
import {Setup} from './components/Setup.js';
import {About} from './components/About.js';
import {KeysetCreate} from './components/keyset/KeysetCreate.js';
import {KeysetHelp} from './components/keyset/KeysetHelp.js';
import {KeyConvert} from './components/keys/KeyConvert.js';
import {KeyHelp} from './components/keys/KeyHelp.js';
import {SharePolicy} from './components/share/SharePolicy.js';
import {ShareHelp} from './components/share/ShareHelp.js';
import {ShareList} from './components/share/ShareList.js';
import {ShareLoad} from './components/share/ShareLoad.js';
import {ShareStatus} from './components/share/ShareStatus.js';
import {ShareSigner} from './components/share/ShareSigner.js';
import {ShareAdd} from './components/share/ShareAdd.js';

type AppProps = {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
  version: string;
};

function parseNumber(value: string | boolean | undefined, fallback: number) {
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function renderKeyset(args: string[], flags: Record<string, string | boolean>) {
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case 'create':
      return <KeysetCreate flags={flags} />;
    case undefined:
      return <KeysetHelp />;
    default:
      return <KeysetHelp />;
  }
}

function hasKeyInputs(flags: Record<string, string | boolean>) {
  const stringKeys = [
    'npub',
    'nsec',
    'hex',
    'hex-public',
    'hex-private',
    'public-hex',
    'private-hex',
    'hexPublic',
    'hexPrivate',
    'publicHex',
    'privateHex',
    'value'
  ];

  return stringKeys.some(key => {
    const value = flags[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

const KEY_TYPE_SUBCOMMANDS = new Set([
  'npub',
  'nsec',
  'hex-public',
  'hex-private',
  'public-hex',
  'private-hex',
  'public',
  'private',
  'secret'
]);

function renderKeys(args: string[], flags: Record<string, string | boolean>) {
  const subcommand = args[0]?.toLowerCase();
  const remainingArgs = subcommand ? args.slice(1) : args;

  if (subcommand === 'convert') {
    return <KeyConvert flags={flags} args={remainingArgs} />;
  }

  if (subcommand && KEY_TYPE_SUBCOMMANDS.has(subcommand)) {
    return <KeyConvert flags={flags} args={args} />;
  }

  if (!subcommand && hasKeyInputs(flags)) {
    return <KeyConvert flags={flags} args={args} />;
  }

  return <KeyHelp />;
}

function renderShare(args: string[], flags: Record<string, string | boolean>) {
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case 'policy':
      return <SharePolicy flags={flags} args={args.slice(1)} />;
    case 'add':
      return <ShareAdd flags={flags} args={args.slice(1)} />;
    case 'list':
      return <ShareList />;
    case 'load':
      return <ShareLoad args={args.slice(1)} />;
    case 'status':
      return <ShareStatus flags={flags} args={args.slice(1)} />;
    case 'signer':
      return <ShareSigner flags={flags} args={args.slice(1)} />;
    case undefined:
      return <ShareHelp />;
    default:
      return <ShareHelp />;
  }
}

export function App({command, args, flags, version}: AppProps) {
  const normalized = command.toLowerCase();
  const threshold = parseNumber(flags.threshold, 2);
  const total = parseNumber(flags.total, 3);

  switch (normalized) {
    case 'setup':
      return <Setup threshold={threshold} total={total} />;
    case 'about':
      return <About />;
    case 'status':
      return <ShareStatus flags={flags} args={args} />;
    case 'signer':
      return <ShareSigner flags={flags} args={args} />;
    case 'policy':
      return <SharePolicy flags={flags} args={args} invokedVia="alias:root:policy" />;
    case 'share':
      return renderShare(args, flags);
    case 'keyset':
      return renderKeyset(args, flags);
    case 'keys':
      return renderKeys(args, flags);
    default:
      return (
        <Intro
          version={version}
          commandExamples={[
            'igloo-cli setup --threshold 2 --total 3',
            'igloo-cli keyset create --password-file ./pass.txt --output ./shares',
            'igloo-cli share add --group bfgroup1... --share bfshare1...',
            'igloo-cli share status --share vault-share-1 --password-file ./pass.txt',
            'igloo-cli signer --share vault-share-1 --password-file ./pass.txt',
            'igloo-cli keys convert --from nsec --value nsec1example...'
          ]}
        />
      );
  }
}

export default App;
