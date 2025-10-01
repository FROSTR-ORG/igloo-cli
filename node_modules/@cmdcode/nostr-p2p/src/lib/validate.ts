import Schema from '@/schema/index.js'

/**
 * Validates an array of relay URLs.
 * @param relays   Value to validate as relay URL array
 * @throws {Error} If the relay array is invalid
 */
export function verify_relays (relays : unknown) : asserts relays is string[] {
  const schema = Schema.base.url.array()
  const parsed = schema.safeParse(relays)
  if (!parsed.success) {
    throw new Error('invalid relay set: ' + relays)
  }
}

/**
 * Validates a hex-encoded 32-byte secret key.
 * @param seckey   Value to validate as secret key
 * @throws {Error} If the secret key is invalid or malformed
 */
export function verify_seckey (seckey : unknown) : asserts seckey is string {
  const schema = Schema.base.hex32
  const parsed = schema.safeParse(seckey)
  if (!parsed.success) {
    throw new Error('invalid secret key: ' + seckey)
  } else {
    
  }
}
