import { Buff, Bytes } from '@cmdcode/buff'

export namespace Assert {
  export function ok (value : unknown, message ?: string) : asserts value {
    if (value === false) throw new Error(message ?? 'Assertion failed!')
  }

  export function exists <T> (
    input   ?: T | null,
    err_msg ?: string
  ) : asserts input is NonNullable<T> {
    if (typeof input === 'undefined') {
      throw new TypeError(err_msg ?? 'Input is undefined!')
    }
    if (input === null) {
      throw new TypeError(err_msg ?? 'Input is null!')
    }
  }

  export function size (
    input    : Bytes,
    size     : number,
    err_msg ?: string
  ) : boolean {
    const bytes = Buff.bytes(input)
    if (bytes.length !== size) {
      throw new Error(err_msg ?? `Invalid byte size: ${bytes.hex} !== ${size}`)
    }
    return true
  }
}
