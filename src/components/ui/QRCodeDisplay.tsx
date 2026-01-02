import {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import QRCode from 'qrcode';

type QRCodeDisplayProps = {
  value: string;
  label?: string;
  labelColor?: string;
  small?: boolean;
};

export function QRCodeDisplay({
  value,
  label,
  labelColor = 'cyan',
  small = true
}: QRCodeDisplayProps) {
  const [qrString, setQrString] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setQrString(null);
      setError(null);
      return;
    }

    let canceled = false;

    void (async () => {
      try {
        const result = await QRCode.toString(value, {
          type: 'terminal',
          small,
          errorCorrectionLevel: 'M'
        });
        if (!canceled) {
          setQrString(result);
          setError(null);
        }
      } catch (err: any) {
        if (!canceled) {
          setError(err?.message ?? 'Failed to generate QR code');
          setQrString(null);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [value, small]);

  if (error) {
    return (
      <Box flexDirection="column">
        {label ? <Text color={labelColor}>{label}</Text> : null}
        <Text color="red">QR error: {error}</Text>
      </Box>
    );
  }

  if (!qrString) {
    return (
      <Box flexDirection="column">
        {label ? <Text color={labelColor}>{label}</Text> : null}
        <Text color="gray">Generating QR code...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {label ? <Text color={labelColor}>{label}</Text> : null}
      <Text>{qrString}</Text>
    </Box>
  );
}
