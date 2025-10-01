import EventEmitter from './emitter.js'

import { Buff }           from '@cmdcode/buff'
import { SimplePool }     from 'nostr-tools'
import { SubCloser }      from 'nostr-tools/abstract-pool'
import { get_pubkey }     from '@/lib/crypto.js'
import { create_event }   from '@/lib/event.js'
import { gen_message_id } from '@/lib/util.js'

import {
  finalize_message,
  create_payload,
  decrypt_payload,
  parse_envelope
} from '@/lib/message.js'

import {
  verify_relays,
  verify_seckey
} from '@/lib/validate.js'

import type {
  EventFilter,
  MessageData,
  NodeConfig,
  NodeEventMap,
  SignedEvent,
  SubConfig,
  SubResponse,
  NodeMessageMap,
  MessageTemplate,
  SubFilter,
  ResolveReason,
  PubResponse,
  SignedMessage,
  BroadcastResponse,
  MessageIdResponse,
  MulticastResponse,
  EventConfig,
  NodeOptions,
  DeliveryOptions
} from '@/types/index.js'

import * as Util from '@/util/index.js'

/**
 * Default configuration settings for a Nostr node.
 */
const NODE_CONFIG : () => NodeConfig = () => {
  return {
    envelope: {
      kind : 20004,
      tags : [] as string[][]
    },
    filter: {
      kinds : [ 20004 ],  // Filter for specific Nostr event type
      since : Util.now()  // Only get events from current time onwards
    },
    req_timeout  : 5000,
    since_offset : 5,
    start_delay  : 2000
  }
}

/**
 * NostrNode provides a complete implementation of a Nostr client node.
 * Handles message routing, relay connections, and event processing.
 */
export default class NostrNode extends EventEmitter <NodeEventMap> {
  // Core node components
  private readonly _config   : NodeConfig
  private readonly _pool     : SimplePool    // Manages relay connections
  private readonly _pubkey   : string
  private readonly _relays   : string[]
  private readonly _seckey   : Buff          // Private key for signing messages

  // Message routing system
  private readonly _inbox : NodeMessageMap = {
    event : new EventEmitter(),  // General event handling
    id    : new EventEmitter(),  // Route by message ID
    peer  : new EventEmitter(),  // Route by peer pubkey
    tag   : new EventEmitter()   // Route by message tag
  }
  
  private _filter : EventFilter
  private _sub    : SubCloser | null = null  // Active relay subscription

  /**
   * Creates a new NostrNode instance.
   * @param relays   Array of relay URLs to connect to.
   * @param seckey   Secret key in hex format
   * @param options  Optional configuration parameters
   * @throws {Error} If relays array is invalid or secret key is malformed
   */
  constructor (
    relays  : string[],
    seckey  : string,
    options : Partial<NodeConfig> = {}
  ) {
    super()
    
    // Validate inputs before initialization
    verify_relays(relays)
    verify_seckey(seckey)

    this._seckey = new Buff(seckey)
    this._pubkey = get_pubkey(this._seckey.hex)
  
    this._config = get_node_config(options)
    this._filter = get_filter_config(this, options.filter)
    this._pool   = new SimplePool()
    this._relays = relays

    this.emit('info', [ 'filter:', JSON.stringify(this.filter, null, 2) ])
  }

  /**
   * Processes incoming Nostr events.
   * @param event    Signed Nostr event to process
   * @emits message  When event is successfully processed
   * @emits bounced  When event processing fails
   */
  private _handler = (event : SignedEvent) => {
    try {
      // Decrypt and parse the incoming message
      const payload = decrypt_payload(event, this._seckey.hex)
      const msg     = parse_envelope(payload, event)

      // Route message to all relevant subscribers
      this.emit('message', msg)
      this.inbox.id.emit(msg.id, msg)
      this.inbox.peer.emit(msg.env.pubkey, msg)
      this.inbox.tag.emit(msg.tag, msg)
    } catch (err) {
      this.emit('bounced', [ event.id, Util.parse_error(err) ])
    }
  }

  /**
   * Internal method to publish messages to the Nostr network.
   * @param message  Message data to publish
   * @param peer_pk  Target peer's public key
   * @param options  Optional configuration options
   * @returns        Publication status and message ID
   */
  private _publish = async (
    message  : MessageData,
    peer_pk  : string,
    options? : DeliveryOptions
  ) : Promise<PubResponse & MessageIdResponse> => {  
    // Create and sign the message envelope
    const cache    = options?.cache ?? new Map<string, PubResponse>()
    const config   = get_event_config(this, options)
    const payload  = create_payload(message.tag, message.data, message.id)
    const event    = create_event(config, payload, peer_pk, this._seckey.hex)
    const signed   = { ...message, env : event }

    // Publish to all connected relays
    const receipts = this._pool.publish(this.relays, event)
    this._inbox.event.emit('published', signed)

    return Promise.all(receipts).then(acks => {
      // Track successful and failed relay deliveries
      const fails  = this.relays.filter(r => !acks.includes(r))
      const msg_id = message.id
      const ok     = acks.length > 0
      const res    = { acks, fails, ok, peer_pk, data : signed }

      cache.set(peer_pk, res)
      this._inbox.event.emit('settled', { ...res, msg_id })
      return { ...res, ok, msg_id }
    })
  }

  /**
   * Subscribes to the filter.
   * @param filter  The filter to subscribe to.
   * @param timeout The timeout for the subscription.
   * @param sub_id  The ID for the subscription.
   * @returns       Returns the reason for failure, or null if successful.
   */
  private _subscribe (
    filter  : EventFilter,
    timeout : number = this.config.req_timeout,
    sub_id  : string = gen_message_id()
  ) : Promise<string | null> {
    this._filter = get_filter_config(this,filter)
    // Add our pubkey to the filter to receive direct messages
    this.filter['#p'] = [ ...this.filter['#p'] ?? [], this.pubkey ]
    // Subscribe to the filter.
    this._sub = this._pool.subscribeMany(this.relays, [ this._filter ], {
      id      : sub_id,
      oneose  : () => this.emit('subscribed', [ sub_id, this.filter ]),
      onevent : this._handler
    })
    return new Promise(resolve => {
      const timer    = setTimeout(()  => resolve('timeout'), timeout)
      const resolver = (reason : string | null) => { clearTimeout(timer); resolve(reason) }
      this.within('subscribed', ([ id ]) => {
        if (id === sub_id) resolver(null)
      }, timeout)
    })
  }

  get config() : NodeConfig {
    return this._config
  }

  get filter() : EventFilter {
    return this._filter
  }

  get inbox() : NodeMessageMap {
    return this._inbox
  }

  get pubkey() : string {
    return this._pubkey
  }

  get relays() : string[] {
    return this._relays
  }

  /**
   * Broadcasts a message to multiple peers simultaneously.
   * @param message  Message template to broadcast
   * @param peers    Array of peer pubkeys to send to
   * @param options  Optional configuration options
   * @returns        Broadcast status including acks and failures
   */
  async broadcast (
    message  : MessageTemplate,
    peers    : string[],
    options? : DeliveryOptions
  ) : Promise<BroadcastResponse> {
    const cache  = new Map<string, PubResponse>()
    const msg    = finalize_message(message)
    // Send to all peers in parallel
    const outbox = peers.map(pk => this._publish(msg, pk, options))

    return Promise.all(outbox).then(settled => {
      // Collect success/failure stats
      const ok  = settled.every(r => r.ok)
      const res = { ok, cache, msg_id : msg.id, peers }

      settled.forEach(r => cache.set(r.peer_pk, r))
      this.emit('broadcast', res)
      return { ...res }
    })
  }

  /**
   * Establishes connections to configured relays.
   * @param timeout  The timeout for the connection.
   * @returns        This node instance
   * @emits ready    When connections are established
   */
  async connect (
    timeout : number = this.config.req_timeout
  ) : Promise<this> {
    // Start listening for events on all relays.
    const res = await this._subscribe(this._filter, timeout)
    if (res !== null) throw new Error(res)
    this.emit('ready', this)
    return this
  }

  /**
   * Gracefully closes all relay connections.
   * 
   * @emits close  When all connections are terminated
   */
  async close () : Promise<void> {
    if (this._sub !== null) {
      this._sub.close()
    }
    if (this._pool.close !== undefined) {
      this._pool.close(this.relays)
    }
    this.emit('close', this)
  }

  /**
   * Sends a request to a single peer and awaits response.
   * @param message  Message template to send
   * @param peer_pk  Target peer's public key
   * @param options  Optional configuration options
   * @returns        Subscription response
   */
  async request (
    message : MessageTemplate,
    peer_pk : string,
    options : DeliveryOptions
  ) : Promise<SubResponse> {
    // Finalize message.
    const msg = finalize_message(message)
    // Set up listener before sending message
    const receipt = this.subscribe({ id : msg.id, peers : [ peer_pk ] }, options)
    // Send message.
    this.publish(msg, peer_pk, options)
    // Return receipt.
    return receipt
  }

  /**
   * Sends a message and collects responses from multiple peers.
   * @param message  Message template to send
   * @param peers    Array of peer pubkeys to request from
   * @param options  Optional configuration options
   * @returns        Combined broadcast and subscription status
   */
  async multicast (
    message : MessageTemplate,
    peers   : string[],
    options : Partial<DeliveryOptions> = {}
  ) : Promise<MulticastResponse> {
    const msg = finalize_message(message)
    const sub = this.subscribe({ id : msg.id, peers }, options)
    const pub = this.broadcast(msg, peers, options)
    return Promise.all([ sub, pub ]).then(([ sub, pub ]) => {
      return { sub, pub }
    })
  }

  /**
   * Publishes a single message to a specific peer.
   * @param message  Message template to send
   * @param pubkey   Recipient's public key
   * @param options  Optional configuration options
   * @returns        Publication status
   */
  async publish (
    message  : MessageTemplate,
    pubkey   : string,
    options? : Partial<EventConfig>
  ) : Promise<PubResponse> {
    const msg = finalize_message(message)
    return this._publish(msg, pubkey, options)
  }

  /**
   * Creates a subscription for incoming messages.
   * @param filter   Criteria for filtering messages
   * @param options  Subscription configuration
   * @returns        Collected messages and status
   */
  async subscribe (
    filter   : SubFilter,
    options? : Partial<SubConfig>
  ) : Promise<SubResponse> {
    const config = get_sub_config(this, options)
    return new Promise(resolve => {
      const { timeout, threshold }  = config
      const { id, peers = [], tag } = filter

      const authors : Set<string>        = new Set()
      const inbox   : Set<SignedMessage> = new Set()
      const timer   = setTimeout(() => resolver(false, 'timeout'), timeout)

      const resolver = (ok : boolean, reason : ResolveReason) => {
        clearTimeout(timer)
        const res = {
          ok,
          authors : Array.from(authors),
          inbox   : Array.from(inbox),
          peers,
          reason 
        }
        this.emit('resolved', res)
        resolve({ ...res })
      }

      const is_bounce = (msg : SignedMessage) => (
        (typeof id  === 'string' && id  !== msg.id)  ||
        (typeof tag === 'string' && tag !== msg.tag) ||
        (peers.length > 0 && !peers.includes(msg.env.pubkey))
      )

      this.within('message', (msg) => {
        if (!is_bounce(msg)) {
          authors.add(msg.env.pubkey)
          inbox.add(msg)
        }
        if (typeof threshold === 'number' && authors.size >= threshold) {
          resolver(true, 'threshold')
        }
        if (Array.isArray(peers) && peers.every(e => authors.has(e))) {
          resolver(true, 'complete')
        }
      }, timeout)
    })
  }

  /**
   * Updates the filter and subscribes to the new filter.
   * @param filter The new filter to subscribe to.
   */
  async update (filter : EventFilter) {
    if (this._sub !== null) this._sub.close()
    return this._subscribe(filter)
  }
}

/**
 * Merges provided options with default node configuration.
 * @param opt      Custom configuration options
 * @returns        Complete node configuration
 */
function get_node_config (
  opt : NodeOptions = {}
) : NodeConfig {
  const config = NODE_CONFIG()
  const envelope  = { ...config.envelope,  ...opt.envelope  }
  const filter = { ...config.filter, ...opt.filter }
  return { ...config, envelope, filter }
}

/**
 * Combines provided event configuration with defaults.
 * @param node  Nostr node instance
 * @param opt   Custom event configuration
 * @returns     Complete event configuration
 */
function get_event_config (
  node : NostrNode,
  opt  : Partial<EventConfig> = {}
) : EventConfig {
  let { created_at = Util.now(), tags = [], ...rest } = opt
  const envelope = node.config.envelope
  tags = [ ...envelope.tags ?? [], ...opt.tags ?? [] ]
  return { ...envelope, ...rest, created_at, tags }
}

/**
 * Combines custom filter settings with defaults.
 * @param node     Nostr node instance
 * @param filter   Custom filter settings
 * @returns        Complete filter configuration
 */
function get_filter_config (
  node   : NostrNode,
  filter : Partial<EventFilter> = {}
) : EventFilter {
  return { ...node.config.filter, ...filter }
}

/**
 * Merges subscription options with defaults.
 * @param node  Nostr node instance
 * @param opt   Custom subscription options
 * @returns     Complete subscription configuration
 */
function get_sub_config (
  node : NostrNode, 
  opt  : Partial<SubConfig> = {}
) : SubConfig {
  const timeout = opt.timeout ?? node.config.req_timeout
  return { ...opt, timeout }   
}
