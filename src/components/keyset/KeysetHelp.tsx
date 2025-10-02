import React from 'react';
import {Box, Text} from 'ink';

export function KeysetHelp() {
  return (
    <Box flexDirection="column">
      <Text color="cyanBright">Keyset commands</Text>
      <Text>- igloo-cli keyset create   Interactive keyset and share generator.</Text>
      <Text>- igloo-cli keyset list     Show saved shares on this machine.</Text>
      <Text>- igloo-cli keyset load     Decrypt a saved share for export.</Text>
      <Text>- igloo-cli keyset status   Ping peers for a saved share.</Text>
      <Text>- igloo-cli keyset policy   Configure send/receive permissions per peer.</Text>
      <Text>- igloo-cli keyset signer   Decrypt and run a share as a signer.</Text>
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
    </Box>
  );
}
