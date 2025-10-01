import { verify_event } from './event.js'
import { gen_message_id, is_recipient } from './util.js'

import {
  decrypt_content,
  get_pubkey,
  get_shared_secret
} from './crypto.js'

import type {
  MessageData,
  MessageTemplate,
  SignedEvent,
  SignedMessage
} from '@/types/index.js'

import * as CONST  from '@/const.js'
import Schema      from '@/schema/index.js'

/**
 * Decrypts and validates an incoming message envelope.
 * @param event    Signed Nostr event to decrypt
 * @param seckey   Recipient's secret key in hex format
 * @returns        Decrypted message content as string
 * @throws {Error} If event validation fails or recipient is not in peers list
 */
export function decrypt_payload (
  event  : SignedEvent,
  seckey : string
) : string {
  // Verify the event.
  const error = verify_event(event)
  // If there is an error with the event, throw the error.
  if (error !== null) {
    throw new Error(error)
  }
  // get pubkey
  const pubkey = get_pubkey(seckey)
  // Assert that pubkey is in peers list.
  if (!is_recipient(event, pubkey)) {
    throw new Error('pubkey not in peers list')
  }
  const secret  = get_shared_secret(seckey, event.pubkey)
  const content = decrypt_content(secret, event.content)
  const payload = JSON.parse(content)
  return payload
}

/**
 * Ensures a message template has a valid ID.
 * @param template  Message template to finalize
 * @returns         Completed message data
 */
export function finalize_message (
  template : MessageTemplate
) : MessageData {
  const id = template.id ?? gen_message_id()
  return { ...template, id }
}

/**
 * Creates a JSON string payload containing message metadata.
 * @param tag   Message type identifier
 * @param data  Message content
 * @param id    Unique message identifier
 * @returns     JSON stringified array of [tag, id, data]
 */
export function create_payload (
  tag  : string,
  data : string,
  id   : string
) : string {
  try {
    return JSON.stringify([ tag, id, data ])
  } catch (err) {
    throw new Error('failed to create message payload')
  }
}

/**
 * Validates and parses a message payload according to schema.
 * @param payload  JSON string to parse and validate
 * @param event    Original signed event containing the payload
 * @returns        Parsed and validated message object
 * @throws {Error} If payload fails schema validation
 */
export function parse_envelope (
  envelope : string,
  event    : SignedEvent
) : SignedMessage {
  const schema = Schema.msg.envelope
  const parsed = schema.safeParse(envelope)
  if (!parsed.success) {
    if (CONST.DEBUG) console.log(parsed.error)
    throw new Error('envelope failed schema validation')
  }
  const [ tag, id, data ] = parsed.data
  return { env: event, data, id, tag }
}
