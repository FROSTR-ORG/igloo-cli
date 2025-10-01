import React from 'react';
import {Box, Text} from 'ink';

export function About() {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="cyanBright">Why FROSTR</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>- Break any nsec into durable Shamir shares.</Text>
        <Text>- Compose flexible k-of-n multi signer networks.</Text>
        <Text>- Keep your npub and signature shapes unchanged.</Text>
        <Text>- Rotate shares on demand without touching clients.</Text>
        <Text>- Communicate over encrypted nostr relays via bifrost.</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan">Other Igloo projects</Text>
        <Text>- Igloo Desktop: local signing device and share manager.</Text>
        <Text>- Frost2x: browser signer that speaks NIP-07 and NIP-46.</Text>
        <Text>- Igloo Server: personal relay and signing service.</Text>
        <Text>- Igloo Mobile and Serverless: upcoming footprints.</Text>
      </Box>
    </Box>
  );
}
