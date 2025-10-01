import NostrNode    from '@/class/client.js'
import EventEmitter from '@/class/emitter.js'

import type { SignedMessage } from './msg.js'

import type { EventConfig, EventFilter } from './event.js'

import type {
  MessageIdResponse,
  BroadcastResponse,
  PubResponse
} from './res.js'

export interface NodeOptions {
  envelope     ?: Partial<EventConfig>
  filter       ?: Partial<EventFilter>
  req_timeout  ?: number
  since_offset ?: number
  start_delay  ?: number
}

export interface NodeConfig {
  envelope     : EventConfig
  filter       : EventFilter
  req_timeout  : number
  since_offset : number
  start_delay  : number
}

export interface DeliveryOptions extends Partial<EventConfig> {
  cache?   : Map<string, PubResponse>
  timeout? : number
}

export interface NodeMessageMap {
  event : EventEmitter<NodeMessageEventMap>,
  id    : EventEmitter<Record<string, SignedMessage>>,
  peer  : EventEmitter<Record<string, SignedMessage>>,
  tag   : EventEmitter<Record<string, SignedMessage>>
}

export interface NodeMessageEventMap {
  'broadcast' : BroadcastResponse & MessageIdResponse
  'published' : SignedMessage
  'settled'   : PubResponse & MessageIdResponse
}

export interface NodeEventMap extends Record<string, any> {
  'bounced'    : [ event_id : string, error : string ]
  'closed'     : NostrNode
  'debug'      : unknown
  'error'      : unknown
  'info'       : unknown
  'message'    : SignedMessage
  'ready'      : NostrNode
  'subscribed' : [ sub_id : string, filter : EventFilter ]
}

export interface SubFilter {
  id    ?: string
  peers ?: string[]
  tag   ?: string
}

export interface SubConfig {
  threshold ?: number
  timeout    : number
}
