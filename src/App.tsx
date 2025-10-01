import React from 'react';
import {Box, Text} from 'ink';
import {Intro} from './components/Intro.js';
import {Setup} from './components/Setup.js';
import {About} from './components/About.js';

type AppProps = {
  command: string;
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

function StatusStub() {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="cyanBright">Status probes are on the roadmap.</Text>
      <Text>
        The goal is to query Igloo Desktop, Frost2x, and other bifrost nodes to
        confirm relay reachability plus signer readiness.
      </Text>
      <Text>
        Open an issue if you would like to help shape the diagnostics payloads.
      </Text>
    </Box>
  );
}

export function App({command, flags, version}: AppProps) {
  const normalized = command.toLowerCase();
  const threshold = parseNumber(flags.threshold, 2);
  const total = parseNumber(flags.total, 3);

  switch (normalized) {
    case 'setup':
      return <Setup threshold={threshold} total={total} />;
    case 'about':
      return <About />;
    case 'status':
      return <StatusStub />;
    default:
      return (
        <Intro
          version={version}
          commandExamples={[
            'igloo-cli setup --threshold 2 --total 3',
            'igloo-cli about',
            'igloo-cli status'
          ]}
        />
      );
  }
}

export default App;
