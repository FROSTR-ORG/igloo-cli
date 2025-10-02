import {createRequire} from 'node:module';

if (typeof globalThis.WebSocket === 'undefined') {
  const require = createRequire(import.meta.url);
  try {
    const wsModule = require('ws');
    const WebSocketImpl = wsModule?.WebSocket ?? wsModule;
    if (typeof WebSocketImpl === 'function') {
      (globalThis as {WebSocket?: unknown}).WebSocket = WebSocketImpl as unknown;
    }
  } catch (error) {
    console.warn('Unable to install ws polyfill:', error);
  }
}
