import React from 'react';
import {Box, Text} from 'ink';

export function ShareHelp() {
  return (
    <Box flexDirection="column">
      <Text color="cyanBright">Share commands</Text>
      <Text>- igloo-cli share add      Import a single share using a group credential.</Text>
      <Text>- igloo-cli share list     Display encrypted shares saved on this machine.</Text>
      <Text>- igloo-cli share load     Decrypt a saved share for export.</Text>
      <Text>- igloo-cli share status   Ping peers for a saved share.</Text>
      <Text>- igloo-cli share signer   Decrypt and run a share as a signer.</Text>
      <Text>- igloo-cli share policy   Configure send/receive permissions per saved share.</Text>
      <Box marginTop={1}>
        <Text color="gray">Example: igloo-cli share status --share "vault-share-1" --password-file ./pass.txt</Text>
      </Box>
      <Box>
        <Text color="gray">Tip: share add requires the bfgroup credential first; supply --group/--share/--password flags to automate.</Text>
      </Box>
    </Box>
  );
}
