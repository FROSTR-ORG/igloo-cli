import React from 'react';
import {Box, Text} from 'ink';

type HelpProps = {
  version: string;
};

export function Help({version}: HelpProps) {
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
        <Text color="cyan">See subcommands</Text>
        <Text>- igloo-cli share     → lists add | list | load | status | signer | policy</Text>
        <Text>- igloo-cli keyset    → lists create</Text>
        <Text>- igloo-cli keys      → lists convert (with flag variants)</Text>
        <Text>- igloo-cli relays    → lists set | add | remove | reset</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Common options</Text>
        <Text>-h, --help         Show this help</Text>
        <Text>-v, --version      Print version</Text>
        <Text>--share value      Target a saved share by id/name</Text>
        <Text>--password value   Supply password non-interactively</Text>
        <Text>--password-file    Read password from file</Text>
        <Text>--relays list      Override relay list (comma-separated)</Text>
        <Text>--verbose          Stream signer diagnostics</Text>
        <Text>--log-level level  Signer log level (debug|info|warn|error)</Text>
      </Box>
    </Box>
  );
}
