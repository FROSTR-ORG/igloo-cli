import React from 'react';
import {Box, Text} from 'ink';

export function KeyHelp() {
  return (
    <Box flexDirection="column">
      <Text color="cyanBright">Key conversion helpers</Text>
      <Text>- igloo-cli keys convert --from nsec --value nsec1...        Convert nsec to hex + derived pubkey.</Text>
      <Text>- igloo-cli keys convert --from npub --value npub1...        Reveal the hex public key.</Text>
      <Text>- igloo-cli keys convert --from hex-private --value 64hex    Convert private hex to nsec + npub.</Text>
      <Text>- igloo-cli keys convert --from hex-public --value 64hex     Convert public hex to npub.</Text>
      <Box marginTop={1}>
        <Text color="gray">
          Flags `--nsec`, `--npub`, `--hex-private`, or `--hex-public` work as short-hands.
          Use `--hex` with `--kind public|private` if you prefer a generic flag.
        </Text>
      </Box>
    </Box>
  );
}
