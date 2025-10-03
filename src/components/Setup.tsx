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
        <Text>{`1. Run \`igloo-cli keyset create --threshold ${threshold} --total ${total}\` and follow the prompts to pick your total/threshold, then either generate a new nsec or import an existing one.`}</Text>
        <Text>{
          '2. The wizard reveals each share in turn - enter a password when prompted to encrypt it into a local file that igloo-cli and Igloo Desktop will reuse automatically.'
        }</Text>
        <Text>{
          '3. Aim to keep the minimum shares needed on this device; if you park more than one here, protect each with a distinct password and move any extras to other signers or offline backups (find options at https://frostr.org/apps).'
        }</Text>
        <Text>{
          '4. Once your shares are saved, unlock one with its password when needed the signer command will prompt for it and run `igloo-cli signer --share <share-name>` so this node listens for peer requests; use `igloo-cli share policy` (and related commands) to tune peer rules.'
        }</Text>
        <Text>{'5. Share relay URLs with every signer; all nodes must speak on the same relays.'}</Text>
      </Box>
    </Box>
  );
}
