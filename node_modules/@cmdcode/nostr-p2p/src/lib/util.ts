import { Buff } from '@cmdcode/buff'

import type {
  EventTemplate,
  SignedEvent
} from '@/types/index.js'

/**
 * Generates a random 16-byte message identifier in hexadecimal format.
 * @returns A random hexadecimal string
 */
export function gen_message_id () {
  return Buff.random(16).hex
}

/**
 * Calculates a unique event ID based on the event template properties.
 * Creates a hash of the stringified array containing event details.
 * @param template  Nostr event template containing event properties
 * @returns        Hexadecimal hash string representing the event ID
 */
export function get_event_id (
  template : EventTemplate
) {
  const preimg = JSON.stringify([
    0,
    template.pubkey,
    template.created_at,
    template.kind,
    template.tags,
    template.content,
  ])
  return Buff.str(preimg).digest.hex
}

/**
 * Filters and returns all tags of a specific type from an event.
 * @param event  Event template to search for tags
 * @param tag    Tag identifier to filter by (e.g., 'p' for pubkey tags)
 * @returns      Array of matching tag entries
 */
export function get_tags (
  event : EventTemplate,
  tag   : string
) {
  return event.tags.filter(e => e.at(0) === tag)
}

/**
 * Checks if a specific pubkey is a recipient of an event.
 * Verifies if the pubkey exists in the event's 'p' tags.
 * @param event   Signed event to check
 * @param pubkey  Public key to look for
 * @returns       True if pubkey is a recipient, false otherwise
 */
export function is_recipient (
  event  : SignedEvent,
  pubkey : string
) {
  // verify event is directed at you.
  const peers = get_tags(event, 'p')
  // check if pubkey exists
  return peers.some(e => e[1] === pubkey)
}

/**
 * Extracts unique items from a 2D array of strings.
 * @param arr  2D array of strings to process
 * @returns    Array of unique strings
 */
export function get_unique_items(arr : string[][]) : string[] {
  const ret : Set<string> = new Set()
  for (const row of arr) {
    for (const item of row) {
      ret.add(item)
    }
  }
  return [ ...ret ]
}
