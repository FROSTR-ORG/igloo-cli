import React from 'react';
import {Box, Text} from 'ink';

export function KeysetHelp() {
  return (
    <Box flexDirection="column">
      <Text color="cyanBright">Keyset commands</Text>
      <Text>- igloo-cli keyset create   Interactive keyset and share generator.</Text>
      <Box marginTop={1}>
        <Text color="gray">
          Example: igloo-cli keyset create --name "Vault" --threshold 2 --total 3
        </Text>
      </Box>
      <Box>
        <Text color="gray">
          Automation: --password-file ./pass.txt --share my-share --relays wss://relay.damus.io --verbose
        </Text>
      </Box>
      <Box>
        <Text color="gray">All saved-share operations now live under: igloo-cli share …</Text>
      </Box>
    </Box>
  );
}
