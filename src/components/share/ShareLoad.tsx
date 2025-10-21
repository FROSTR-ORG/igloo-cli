import React from 'react';
import {KeysetLoad} from '../keyset/KeysetLoad.js';
import {ShareNamespaceFrame, ShareInvocationHint} from './ShareNamespaceFrame.js';

type ShareLoadProps = {
  args: string[];
  flags: Record<string, string | boolean>;
  invokedVia?: ShareInvocationHint;
};

export function ShareLoad({args, flags, invokedVia = 'share'}: ShareLoadProps) {
  return (
    <ShareNamespaceFrame invokedVia={invokedVia}>
      <KeysetLoad args={args} flags={flags} />
    </ShareNamespaceFrame>
  );
}
