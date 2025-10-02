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
        <Text color="cyan">What you can do right now</Text>
        <Text>- igloo-cli setup -- bootstrap a FROSTR signing stack</Text>
        <Text>- igloo-cli signer -- bring a saved share online</Text>
        <Text>- igloo-cli status -- quick health probes</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Quick start</Text>
        {commandExamples.map(example => (
          <Text key={example}>› {example}</Text>
        ))}
      </Box>
    </Box>
  );
}
