import React from 'react';
import {Box, Text} from 'ink';

type HelpProps = {
  version: string;
};

export function Help({version}: HelpProps) {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="cyanBright">igloo-cli v{version}</Text>
      <Text>Usage: igloo-cli [command] [options]</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Commands</Text>
        <Text>- intro (default)  Show the animated welcome.</Text>
        <Text>- setup            Step through signer bootstrapping.</Text>
        <Text>- about            Outline the FROSTR stack.</Text>
        <Text>- signer           Decrypt a share and run it as a signer.</Text>
        <Text>- status           Check peer reachability with a saved share.</Text>
        <Text>- policy           Configure send/receive permissions per peer.</Text>
        <Text>- keyset           Manage keyset creation, saving, loading, status.</Text>
        <Text>- keys             Convert between npub/nsec/hex formats.</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Options</Text>
        <Text>-h, --help       Print this message.</Text>
        <Text>-v, --version    Print the version.</Text>
        <Text>--threshold n    Override default share threshold.</Text>
        <Text>--total n        Override total number of shares.</Text>
        <Text>--name value     Provide a keyset name during creation.</Text>
        <Text>--nsec value     Provide secret material during creation.</Text>
        <Text>--password value Use a password non-interactively.</Text>
        <Text>--password-file  Read password from file.</Text>
        <Text>--output path    Save encrypted shares to a custom directory.</Text>
        <Text>--share value    Identify which saved share to load/status.</Text>
        <Text>--relays list    Override relay list (comma-separated).</Text>
        <Text>--verbose        Stream signer diagnostics to the console.</Text>
        <Text>--log-level val  Set signer log verbosity (debug|info|warn|error).</Text>
        <Text>--from type      Specify input type for keys convert (npub|nsec|hex-public|hex-private).</Text>
        <Text>--value key      Provide the key value for conversion.</Text>
        <Text>--npub key       Convert from an npub value.</Text>
        <Text>--nsec key       Convert from an nsec value.</Text>
        <Text>--hex-public key Convert from a public hex key.</Text>
        <Text>--hex-private key Convert from a private hex key.</Text>
        <Text>--hex key        Generic hex input (requires --kind public|private).</Text>
        <Text>--kind type      Pair with --hex to set the kind (public|private).</Text>
      </Box>
    </Box>
  );
}
