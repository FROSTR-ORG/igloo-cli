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
        <Text>- igloo-cli setup    -- bootstrap a fresh keyset</Text>
        <Text>- igloo-cli keyset   -- create keysets and shares</Text>
        <Text>- igloo-cli share    -- manage saved shares</Text>
        <Text>- igloo-cli signer   -- bring a share online as a signer</Text>
        <Text>- igloo-cli status   -- check relay and peer reachability</Text>
        <Text>- igloo-cli keys     -- translate between npub/nsec/hex</Text>
        <Text>- igloo-cli relays   -- manage default relay endpoints</Text>
        <Text>- igloo-cli about    -- outline the FROSTR stack</Text>
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
