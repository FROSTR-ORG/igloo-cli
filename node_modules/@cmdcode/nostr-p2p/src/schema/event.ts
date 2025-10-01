import { z } from 'zod'
import base  from './base.js'

const tags = base.str.array()

const template = z.object({
  content    : base.str,
  created_at : base.stamp,
  kind       : base.num,
  pubkey     : base.hex32,
  tags       : tags.array()
})

const unsigned = template.extend({
  id : base.hex32
})

const signed = unsigned.extend({
  sig : base.hex64,
})

export default { signed, tags, template, unsigned }
