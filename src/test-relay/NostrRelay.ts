import {EventEmitter} from 'node:events';
import {WebSocketServer, WebSocket} from 'ws';

export type NostrRelayConfig = {
  purgeIntervalSec?: number;
  debug?: boolean;
  info?: boolean;
  port?: number; // 0 = random
};

type Subscription = {
  client: WebSocket;
  subId: string;
  filters: any[];
};

type NostrEvent = {
  id?: string;
  pubkey?: string;
  created_at?: number;
  kind?: number;
  tags?: Array<[string, ...string[]]>;
  content?: string;
  sig?: string;
  [key: string]: any;
};

function isPrefixMatch(value: string, prefixes: string[]): boolean {
  const v = value ?? '';
  return prefixes.some(p => v.startsWith(p));
}

function hasTag(event: NostrEvent, tag: string, values: string[]): boolean {
  const tags = Array.isArray(event.tags) ? event.tags : [];
  for (const [t, ...rest] of tags) {
    if (t !== tag) continue;
    if (rest.length === 0) continue;
    if (values.some(val => rest[0]!.startsWith(val))) return true;
  }
  return false;
}

function matchesFilter(event: NostrEvent, filter: any): boolean {
  if (!filter || typeof filter !== 'object') return true;

  // ids, authors
  if (Array.isArray(filter.ids) && filter.ids.length > 0) {
    if (!event.id || !isPrefixMatch(event.id, filter.ids)) return false;
  }
  if (Array.isArray(filter.authors) && filter.authors.length > 0) {
    if (!event.pubkey || !isPrefixMatch(event.pubkey, filter.authors)) return false;
  }

  // kinds
  if (Array.isArray(filter.kinds) && filter.kinds.length > 0) {
    if (typeof event.kind !== 'number' || !filter.kinds.includes(event.kind)) return false;
  }

  // since/until
  if (typeof filter.since === 'number') {
    if (typeof event.created_at !== 'number' || event.created_at < filter.since) return false;
  }
  if (typeof filter.until === 'number') {
    if (typeof event.created_at !== 'number' || event.created_at > filter.until) return false;
  }

  // tag filters (#e, #p, etc)
  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith('#') && Array.isArray(value)) {
      const tag = key.slice(1);
      if (!hasTag(event, tag, value as string[])) return false;
    }
  }

  return true;
}

export class NostrRelay extends EventEmitter {
  private readonly subs: Map<string, Subscription> = new Map();
  private readonly cache: NostrEvent[] = [];
  private readonly config: Required<NostrRelayConfig>;
  private wss?: WebSocketServer;
  private _url?: string;

  constructor(options: NostrRelayConfig = {}) {
    super();
    this.config = {
      purgeIntervalSec: options.purgeIntervalSec ?? 30,
      debug: options.debug ?? false,
      info: options.info ?? true,
      port: options.port ?? 0
    };
  }

  get url(): string | undefined {
    return this._url;
  }

  get events(): readonly NostrEvent[] {
    return this.cache;
  }

  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({port: this.config.port});
        this.wss.on('listening', () => {
          const addr = this.wss!.address();
          const port = typeof addr === 'object' && addr ? addr.port : this.config.port;
          this._url = `ws://127.0.0.1:${port}`;
          if (this.config.info) console.log('[relay] listening at', this._url);
          resolve(this._url);
        });
        this.wss.on('connection', (ws: WebSocket) => this.handleConnection(ws));
        this.wss.on('error', (err) => {
          if (this.config.info) console.error('[relay] error', err);
        });
        setInterval(() => {
          this.cache.length = 0;
        }, this.config.purgeIntervalSec * 1000).unref?.();
      } catch (err) {
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this.wss) return resolve();
      this.wss.close(() => resolve());
    });
    this.subs.clear();
    this.cache.length = 0;
  }

  private handleConnection(ws: WebSocket) {
    const sid = Math.random().toString().slice(2, 8);
    const debug = (...args: any[]) => this.config.debug && console.log(`[client ${sid}]`, ...args);
    debug('connected');

    ws.on('message', (buf: Buffer) => {
      const raw = buf.toString();
      let msg: any[] | null = null;
      try {
        msg = JSON.parse(raw);
      } catch {
        ws.send(JSON.stringify(['NOTICE', '', 'Unable to parse message']));
        return;
      }
      const [verb, ...rest] = Array.isArray(msg) ? msg : [];
      if (verb === 'REQ') {
        const [subId, ...filters] = rest;
        this.subs.set(`${sid}/${subId}`, {client: ws, subId, filters});
        // send cached matches then EOSE
        for (const filter of filters) {
          let limit = typeof filter?.limit === 'number' ? filter.limit : undefined;
          for (const ev of this.cache) {
            if (limit !== undefined && limit <= 0) break;
            if (matchesFilter(ev, filter)) {
              ws.send(JSON.stringify(['EVENT', subId, ev]));
              if (limit !== undefined) limit -= 1;
            }
          }
        }
        ws.send(JSON.stringify(['EOSE', subId]));
        return;
      }

      if (verb === 'CLOSE') {
        const [subId] = rest;
        this.subs.delete(`${sid}/${subId}`);
        return;
      }

      if (verb === 'EVENT') {
        const [event] = rest as [NostrEvent];
        // naive acceptance; do not validate signature in tests
        this.cache.push(event);
        // ack
        if (event?.id) {
          ws.send(JSON.stringify(['OK', event.id, true, '']));
        }
        // fan out to subscribers
        for (const {client, subId, filters} of this.subs.values()) {
          for (const f of filters) {
            if (matchesFilter(event, f)) {
              client.send(JSON.stringify(['EVENT', subId, event]));
            }
          }
        }
        return;
      }

      ws.send(JSON.stringify(['NOTICE', '', 'Unhandled message type']));
    });

    ws.on('close', () => {
      // cleanup all subs for this client
      for (const key of Array.from(this.subs.keys())) {
        if (key.startsWith(`${sid}/`)) this.subs.delete(key);
      }
      debug('disconnected');
    });
  }
}

export async function startEphemeralRelay(options: NostrRelayConfig = {}) {
  const relay = new NostrRelay(options);
  const url = await relay.start();
  return {relay, url};
}

