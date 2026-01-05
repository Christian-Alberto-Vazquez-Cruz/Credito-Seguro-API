import { z } from '../lib/zod.js'
import { rfcGenerico } from './Primitivas.Schema.js'

export const consultarScoringSchema = z.object({
    rfc: rfcGenerico
})

