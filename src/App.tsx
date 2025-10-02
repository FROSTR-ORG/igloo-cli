import React from 'react';
import {Intro} from './components/Intro.js';
import {Setup} from './components/Setup.js';
import {About} from './components/About.js';
import {KeysetCreate} from './components/keyset/KeysetCreate.js';
import {KeysetList} from './components/keyset/KeysetList.js';
import {KeysetLoad} from './components/keyset/KeysetLoad.js';
import {KeysetHelp} from './components/keyset/KeysetHelp.js';
import {KeysetStatus} from './components/keyset/KeysetStatus.js';
import {KeysetSigner} from './components/keyset/KeysetSigner.js';
import {KeysetPolicy} from './components/keyset/KeysetPolicy.js';

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
    case 'list':
      return <KeysetList />;
    case 'load':
      return <KeysetLoad args={args.slice(1)} />;
    case 'status':
      return <KeysetStatus flags={flags} args={args.slice(1)} />;
    case 'signer':
      return <KeysetSigner flags={flags} args={args.slice(1)} />;
    case 'policy':
      return <KeysetPolicy flags={flags} args={args.slice(1)} />;
    case undefined:
      return <KeysetHelp />;
    default:
      return <KeysetHelp />;
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
      return <KeysetStatus flags={flags} args={args} />;
    case 'signer':
      return <KeysetSigner flags={flags} args={args} />;
    case 'policy':
      return <KeysetPolicy flags={flags} args={args} />;
    case 'keyset':
      return renderKeyset(args, flags);
    default:
      return (
        <Intro
          version={version}
          commandExamples={[
            'igloo-cli setup --threshold 2 --total 3',
            'igloo-cli about',
            'igloo-cli signer --share my-share --password-file ./pass.txt',
            'igloo-cli keyset create --password-file ./pass.txt --output ./shares'
          ]}
        />
      );
  }
}

export default App;
