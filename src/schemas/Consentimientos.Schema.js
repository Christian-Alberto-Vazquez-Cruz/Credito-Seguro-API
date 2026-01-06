import { z } from '../lib/zod.js'
import { fechaVencimientoSchema, idNumberSchema, idParamSchema, isoDateSchema } from './Primitivas.Schema.js'


export const crearConsentimientoSchema = z.object({    
    fechaVencimiento: fechaVencimientoSchema
})

export const consultarConsentimientoSchema = z.object({
    id: idParamSchema
})

export const revocarConsentimientoSchema = z.object({
    id: idNumberSchema
})

export const renovarConsentimientoSchema = z.object({
    id: idNumberSchema,
    fechaVencimiento: fechaVencimientoSchema
})

