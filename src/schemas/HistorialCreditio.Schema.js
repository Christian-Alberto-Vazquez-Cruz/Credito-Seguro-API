import { z } from '../lib/zod.js'
import { idNumberSchema, rfcGenerico } from './Primitivas.Schema.js'

export const consultarHistorialCrediticioSchema = z.object({
    rfc: rfcGenerico
})

export const consultarDetallesObligacionesSchema = z.object({
    rfc: rfcGenerico
})

export const consultarPagosSchema = z.object({
    rfc: rfcGenerico,
    obligacionId: idNumberSchema
})