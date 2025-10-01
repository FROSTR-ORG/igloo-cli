import React from 'react';
import {Box, Text} from 'ink';

type SetupProps = {
  threshold: number;
  total: number;
};

export function Setup({threshold, total}: SetupProps) {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="cyanBright">Bootstrap your FROSTR signing circle</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>1. Launch Igloo Desktop and create a fresh nsec.</Text>
        <Text>
          2. Split it into a {threshold}/{total} share set; stash the recovery share
          offline.
        </Text>
        <Text>
          3. Load one share into Igloo Desktop, configure nostr relays, and start
          the local signer.
        </Text>
        <Text>
          4. Load an additional share into Frost2x or another remote signer so it
          can co-sign requests.
        </Text>
        <Text>
          5. Share relay URLs with every signer; all nodes must speak on the same
          relays.
        </Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan">Next actions</Text>
        <Text>- "igloo-cli status" -- planned: probe connected signers.</Text>
        <Text>- "igloo-cli rotate" -- planned: guide share rotation drills.</Text>
      </Box>
    </Box>
  );
}
