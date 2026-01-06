import { z } from '../lib/zod.js'
import { idNumberSchema, idParamSchema, fechaVencimientoSchema } from './Primitivas.Schema.js'

export const crearConsentimientoConsultaSchema = z.object({
    idEntidadConsultante: idNumberSchema,    
    fechaVencimiento: fechaVencimientoSchema
})

export const consultarConsentimientoConsultaSchema = z.object({
    id: idParamSchema
})

export const revocarConsentimientoConsultaSchema = z.object({
    id: idNumberSchema
})

export const verificarConsentimientoConsultaSchema = z.object({
    idEntidadTitular: idNumberSchema,

    tipoConsulta: z.string()
    .min(1, "El tipo de consulta es requerido")
    .max(50, "El tipo de consulta es demasiado largo")
})