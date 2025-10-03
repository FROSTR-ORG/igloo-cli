import React from 'react';
import {KeysetSigner} from '../keyset/KeysetSigner.js';
import {ShareNamespaceFrame, ShareInvocationHint} from './ShareNamespaceFrame.js';

type ShareSignerProps = {
  flags: Record<string, string | boolean>;
  args: string[];
  invokedVia?: ShareInvocationHint;
};

export function ShareSigner({flags, args, invokedVia = 'share'}: ShareSignerProps) {
  return (
    <ShareNamespaceFrame invokedVia={invokedVia}>
      <KeysetSigner flags={flags} args={args} />
    </ShareNamespaceFrame>
  );
}
