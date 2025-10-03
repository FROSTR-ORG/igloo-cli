import React, {useMemo} from 'react';
import {Box, Text} from 'ink';

export type ShareInvocationHint = 'share' | 'alias:root:policy';

type ShareNamespaceFrameProps = {
  invokedVia?: ShareInvocationHint;
  children: React.ReactNode;
};

function resolveAliasNotice(invokedVia: ShareInvocationHint | undefined): string | null {
  switch (invokedVia) {
    case 'alias:root:policy':
      return '`igloo policy` now lives under the share namespace as `igloo share policy`.';
    default:
      return null;
  }
}

export function ShareNamespaceFrame({invokedVia, children}: ShareNamespaceFrameProps) {
  const aliasNotice = useMemo(() => resolveAliasNotice(invokedVia), [invokedVia]);

  if (!aliasNotice) {
    return <>{children}</>;
  }

  return (
    <Box flexDirection="column">
      <Text color="yellow">{aliasNotice}</Text>
      <Box marginTop={1} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
}
