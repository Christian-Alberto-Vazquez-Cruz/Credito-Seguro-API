import { z } from '../lib/zod.js'
import { idNumberSchema, idParamSchema, 
    rfcFisicaSchema, rfcMoralSchema} from './Primitivas.Schema.js'

export const crearEntidadSchema = z.object({
    tipoEntidad: z.enum(['FISICA', 'MORAL'], {
        errorMap: () => ({ message: "El tipo de entidad debe ser FISICA o MORAL" })
    }),
    
    nombreLegal: z.string()
        .trim()
        .min(3, "El nombre legal debe tener al menos 3 caracteres")
        .max(200, "El nombre legal es demasiado largo"),
    
    rfc: z.string()
        .trim()
        .toUpperCase()
}).superRefine((data, ctx) => {
    if (data.tipoEntidad === 'FISICA') {
        validarRFC(rfcFisicaSchema, data.rfc, ctx)
    } else if (data.tipoEntidad === 'MORAL') {
        validarRFC(rfcMoralSchema, data.rfc, ctx)
    }
})

export const consultarEntidadSchema = z.object({
    id: idParamSchema
})

export const gestionarEstadoEntidadSchema = z.object({
    id: idNumberSchema
})