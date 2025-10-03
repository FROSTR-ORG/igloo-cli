import React from 'react';
import {KeysetStatus} from '../keyset/KeysetStatus.js';
import {ShareNamespaceFrame, ShareInvocationHint} from './ShareNamespaceFrame.js';

type ShareStatusProps = {
  flags: Record<string, string | boolean>;
  args: string[];
  invokedVia?: ShareInvocationHint;
};

export function ShareStatus({flags, args, invokedVia = 'share'}: ShareStatusProps) {
  return (
    <ShareNamespaceFrame invokedVia={invokedVia}>
      <KeysetStatus flags={flags} args={args} />
    </ShareNamespaceFrame>
  );
}
