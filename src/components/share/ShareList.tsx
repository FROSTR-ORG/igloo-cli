import React from 'react';
import {KeysetList} from '../keyset/KeysetList.js';
import {ShareNamespaceFrame, ShareInvocationHint} from './ShareNamespaceFrame.js';

type ShareListProps = {
  invokedVia?: ShareInvocationHint;
};

export function ShareList({invokedVia = 'share'}: ShareListProps) {
  return (
    <ShareNamespaceFrame invokedVia={invokedVia}>
      <KeysetList />
    </ShareNamespaceFrame>
  );
}
