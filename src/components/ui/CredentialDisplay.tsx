import React from 'react';
import {Box, Text} from 'ink';
import {QRCodeDisplay} from './QRCodeDisplay.js';

type CredentialDisplayProps = {
  label: string;
  credential: string;
  labelColor?: string;
  textColor?: string;
  showQR?: boolean;
};

export function CredentialDisplay({
  label,
  credential,
  labelColor = 'cyanBright',
  textColor = 'white',
  showQR = false
}: CredentialDisplayProps) {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text color={labelColor}>{label}</Text>
      <Text color={textColor}>{credential}</Text>
      {showQR ? (
        <Box marginTop={1}>
          <QRCodeDisplay value={credential} small />
        </Box>
      ) : null}
    </Box>
  );
}
