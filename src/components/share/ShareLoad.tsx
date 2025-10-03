import React from 'react';
import {KeysetLoad} from '../keyset/KeysetLoad.js';
import {ShareNamespaceFrame, ShareInvocationHint} from './ShareNamespaceFrame.js';

type ShareLoadProps = {
  args: string[];
  invokedVia?: ShareInvocationHint;
};

export function ShareLoad({args, invokedVia = 'share'}: ShareLoadProps) {
  return (
    <ShareNamespaceFrame invokedVia={invokedVia}>
      <KeysetLoad args={args} />
    </ShareNamespaceFrame>
  );
}
