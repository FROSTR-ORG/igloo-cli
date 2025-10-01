import { get_event_id } from './util.js'

import {
  encrypt_content,
  get_pubkey,
  get_shared_secret,
  sign_msg,
  verify_sig
} from './crypto.js'

import type {
  EventConfig,
  EventTemplate,
  SignedEvent
} from '../types/index.js'

import Schema    from '../schema/index.js'
import * as Util from '@/util/index.js'


/**
 * Creates a signed event envelope containing encrypted message content.
 * @param config   Event configuration
 * @param content  String content to encrypt and send
 * @param peer_pk  Recipient's public key
 * @param seckey   Sender's secret key in hex format
 * @returns        Signed Nostr event containing the encrypted message
 */
export function create_event (
  config  : EventConfig,
  payload : string,
  peer_pk : string,
  seckey  : string,
) : SignedEvent {
  // get created_at
  const created_at = config.created_at ?? Util.now()
  // get pubkey
  const pubkey  = get_pubkey(seckey)
  // get shared secret
  const secret  = get_shared_secret(seckey, peer_pk)
  // encrypt payload
  const content = encrypt_content(secret, payload)
  // Create an event template.
  const event   = { ...config, pubkey, content, created_at }
  // Add a tag for the peer's public key.
  event.tags.push([ 'p', peer_pk ])
  // Return the signed event.
  return sign_event(seckey, event)
}

/**
 * Signs a Nostr event with the provided secret key.
 * @param seckey    Secret key in hex format
 * @param template  Event template to sign
 * @returns         Signed event with ID and signature
 */
export function sign_event (
  seckey   : string,
  template : EventTemplate
) : SignedEvent {
  const id  = get_event_id(template)
  const sig = sign_msg(seckey, id)
  return { ...template, id, sig }
}

/**
 * Verifies a signed Nostr event's integrity and signature.
 * @param event    Signed event to verify
 * @returns        Error message if validation fails, null if valid
 */
export function verify_event (
  event : SignedEvent
) : string | null {
  const { id, sig, ...template } = event
  const schema = Schema.event.signed
  const parsed = schema.safeParse(event)
  const vid    = get_event_id(template)
  if (!parsed.success) {
    return 'event failed schema validation'
  } else if (id !== vid) {
    return 'event id mismatch'
  } else if (!verify_sig(id, event.pubkey, sig)) {
    return 'invalid event signature'
  } else {
    return null
  }
}
