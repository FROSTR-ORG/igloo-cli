import type { SignedMessage } from './msg.js'

export type ResolveReason = 'complete' | 'timeout' | 'threshold'

export interface MessageIdResponse {
  msg_id : string
}

export interface BroadcastResponse {
  cache  : Map<string, PubResponse>
  ok     : boolean
  peers  : string[]
}

export interface MulticastResponse {
  pub : BroadcastResponse
  sub : SubResponse
}

export interface PubResponse {
  acks    : string[]
  fails   : string[]
  ok      : boolean
  data    : SignedMessage
  peer_pk : string
}

export interface ReqResponse {
  pub : PubResponse
  sub : SubResponse
}

export interface SubResponse {
  authors : string[]
  inbox   : SignedMessage[]
  ok      : boolean
  peers   : string[]
  reason  : ResolveReason
}
