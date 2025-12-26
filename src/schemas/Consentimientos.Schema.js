import { z } from '../lib/zod.js'
import { idNumberSchema, idParamSchema, isoDateSchema } from './Primitivas.Schema.js'


export const crearConsentimientoSchema = z.object({    
    fechaVencimiento: isoDateSchema
})

export const consultarConsentimientoSchema = z.object({
    id: idParamSchema
})

export const revocarConsentimientoSchema = z.object({
    id: idNumberSchema
})

export const renovarConsentimientoEntidadSchema = z.object({
    id: idNumberSchema,
    fechaVencimiento: isoDateSchema
})

