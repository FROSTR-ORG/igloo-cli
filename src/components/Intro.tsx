import {useState, useEffect} from 'react';
import {Box, Text} from 'ink';

// Animation frames for twirling key (z-axis rotation)
const ICON_FRAMES = [
  // Frame 0: front view (0°)
  `  \\  |  /
   \\ | /
----(o)----
   / | \\
  /  |  \\
     |
     |
     |--
     |--`,
  // Frame 1: compressing (~45°)
  `   \\ | /
    \\|/
 ---(o)---
    /|\\
   / | \\
     |
     |
     |-
     |-`,
  // Frame 2: edge view (90°)
  `     |
     |
    (o)
     |
     |
     |
     |
     |
     |`,
  // Frame 3: expanding (~135°)
  `   / | \\
    /|\\
 ---(o)---
    \\|/
   \\ | /
     |
     |
    -|
    -|`,
  // Frame 4: back view (180°)
  `  /  |  \\
   / | \\
----(o)----
   \\ | /
  \\  |  /
     |
     |
   --|
   --|`,
  // Frame 5: compressing (~225°)
  `   / | \\
    /|\\
 ---(o)---
    \\|/
   \\ | /
     |
     |
    -|
    -|`,
  // Frame 6: edge view (270°)
  `     |
     |
    (o)
     |
     |
     |
     |
     |
     |`,
  // Frame 7: expanding (~315°)
  `   \\ | /
    \\|/
 ---(o)---
    /|\\
   / | \\
     |
     |
     |-
     |-`,
];

type IntroProps = {
  version: string;
  commandExamples: string[];
};

export function Intro({version, commandExamples}: IntroProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % ICON_FRAMES.length);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text color="cyan">{ICON_FRAMES[frameIndex]}</Text>
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
