import React, {useState} from 'react';
import {Box, Text, useInput, useStdin} from 'ink';

type PromptProps = {
  label: string;
  hint?: string;
  initialValue?: string;
  mask?: boolean;
  allowEmpty?: boolean;
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void | string | Promise<void | string>;
};

function maskValue(value: string, mask?: boolean) {
  if (!mask) {
    return value;
  }
  return '•'.repeat(value.length);
}

export function Prompt({
  label,
  hint,
  initialValue = '',
  mask,
  allowEmpty = false,
  validate,
  onSubmit
}: PromptProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const {isRawModeSupported} = useStdin();

  async function handleSubmit() {
    if (busy) {
      return;
    }

    const trimmed = value.trim();
    if (!allowEmpty && trimmed.length === 0) {
      setError('Value is required');
      return;
    }

    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setBusy(true);
    try {
      const result = await onSubmit(value);
      if (typeof result === 'string' && result.length > 0) {
        setError(result);
        setBusy(false);
        return;
      }
      setError(null);
    } finally {
      setBusy(false);
    }
  }

  useInput((input, key) => {
    if (busy || !isRawModeSupported) {
      return;
    }

    if (key.ctrl && input === 'c') {
      return;
    }

    if (key.return) {
      void handleSubmit();
      return;
    }

    if (key.backspace || key.delete) {
      setValue(current => current.slice(0, -1));
      setError(null);
      return;
    }

    if (key.escape) {
      setValue('');
      setError(null);
      return;
    }

    if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
      return;
    }

    if (input) {
      setValue(current => current + input);
      setError(null);
    }
  }, {isActive: isRawModeSupported && !busy});

  return (
    <Box flexDirection="column">
      <Text>{label}</Text>
      {isRawModeSupported ? (
        <Text>
          {maskValue(value, mask)}
          {value.length === 0 && !mask ? '▁' : ''}
        </Text>
      ) : (
        <Text color="red">Interactive input is not supported in this environment. Supply values via CLI flags.</Text>
      )}
      {hint ? <Text color="gray">{hint}</Text> : null}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
