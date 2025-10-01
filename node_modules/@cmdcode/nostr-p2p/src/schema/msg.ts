import { z } from 'zod'
import base  from './base.js'

const mid     = base.hex16
const payload = base.str
const topic   = base.str.min(3).max(256)

const envelope = z.tuple([ topic, mid, payload ])

export default { envelope }
