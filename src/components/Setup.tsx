import React from 'react';
import {Box, Text} from 'ink';
import {getShareDirectory} from '../keyset/paths.js';

type SetupProps = {
  threshold: number;
  total: number;
};

export function Setup({threshold, total}: SetupProps) {
  const shareDir = getShareDirectory();

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="cyanBright">Get started with FROSTR</Text>
      <Text color="gray">Tip: use either "igloo" or "igloo-cli" — both work.</Text>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">What you’ll do</Text>
        <Text>- Create a keyset (threshold-of-total) for your nsec.</Text>
        <Text>- Save one share here; hand off the rest to other devices.</Text>
        <Text>- Bring a share online later as a signer.</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">1) Create a keyset</Text>
        <Text>{`› igloo-cli keyset create --threshold ${threshold} --total ${total}`}</Text>
        <Text>
          Name the keyset, then either paste an existing nsec (or 64‑char hex)
          or type "generate" to create a fresh one.
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">2) Save encrypted shares</Text>
        <Text>
          The wizard shows each share in turn. To save a share on this device,
          enter a password (min 8 chars). To skip a share here, press Enter and
          handle it on another device.
        </Text>
        <Text color="gray">Saved to: {shareDir}</Text>
        <Text>
          If you intentionally save multiple shares on one machine, protect each
          with a distinct password.
        </Text>
        <Text>
          Automation: add {"`--password-file ./pass.txt`"} and/or
          {" `--output ./shares`"}. Note that automation uses one password for
          all saved shares in that run.
        </Text>
        <Text color="gray">List later with: igloo-cli share list</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">3) Place shares safely</Text>
        <Text>
          Keep only the minimum number of shares on this device. Prefer saving
          exactly one here and moving the others to fellow signers or offline
          backups. If you do store more than one locally, use unique passwords
          per share.
        </Text>
        <Text color="gray">
          Import on another device: igloo-cli share add --group &lt;bfgroup…&gt; --share &lt;bfshare…&gt;
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">4) Run a signer when needed</Text>
        <Text>› igloo-cli signer --share &lt;name-or-id&gt;</Text>
        <Text>
          You’ll be prompted for the share’s password (or use
          {" `--password-file ./pass.txt`"}). The signer connects to your relays
          and listens for peer requests.
        </Text>
        <Text color="gray">Check connectivity: igloo-cli share status --share &lt;name-or-id&gt;</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">5) Decrypt or export a share</Text>
        <Text>› igloo-cli share load --share &lt;name-or-id&gt;</Text>
        <Text>
          Unlocks a saved share and prints the plaintext credential (and group
          credential) so you can move it elsewhere if needed.
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Relays</Text>
        <Text>
          All signers must speak on the same relays. Configure defaults with
          {" `igloo-cli relays set wss://a wss://b`"} or override per‑run via
          {" `--relays wss://a,wss://b`"}.
        </Text>
      </Box>
    </Box>
  );
}
