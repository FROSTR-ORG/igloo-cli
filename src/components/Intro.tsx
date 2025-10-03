import React from 'react';
import {Box, Text} from 'ink';

type IntroProps = {
  version: string;
  commandExamples: string[];
};

export function Intro({version, commandExamples}: IntroProps) {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text color="cyanBright">IGLOO CLI</Text>
        <Text color="white">FROSTR remote signing toolkit</Text>
        <Text color="gray">version {version}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Core commands</Text>
        <Text>- igloo-cli setup          -- bootstrap a fresh keyset</Text>
        <Text>- igloo-cli keyset create  -- generate & encrypt shares headlessly</Text>
        <Text>- igloo-cli share add      -- import a share using its group</Text>
        <Text>- igloo-cli share list     -- review saved shares on this device</Text>
        <Text>- igloo-cli share status   -- check relay and peer reachability</Text>
        <Text>- igloo-cli share policy   -- tune defaults and peer overrides</Text>
        <Text>- igloo-cli signer         -- bring a share online as a signer</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Quick start</Text>
        {commandExamples.map(example => (
          <Text key={example}>› {example}</Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray">
          Saved-share operations live under `igloo-cli share …`; use setup or
          keyset create whenever you need new shares.
        </Text>
      </Box>
    </Box>
  );
}
