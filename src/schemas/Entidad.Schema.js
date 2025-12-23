import { z } from '../lib/zod.js'

const rfcFisica = z.string()
    .length(13, "El RFC de persona física debe tener 13 caracteres")
    .regex(/^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/, "Formato de RFC inválido para persona física")

const rfcMoral = z.string()
    .length(12, "El RFC de persona moral debe tener 12 caracteres")
    .regex(/^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/, "Formato de RFC inválido para persona moral")

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
        const resultRFC = rfcFisica.safeParse(data.rfc)
        if (!resultRFC.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: resultRFC.error.errors[0].message,
                path: ['rfc']
            })
        }
    } else if (data.tipoEntidad === 'MORAL') {
        const resultRFC = rfcMoral.safeParse(data.rfc)
        if (!resultRFC.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: resultRFC.error.errors[0].message,
                path: ['rfc']
            })
        }
    }
})

export const consultarEntidadSchema = z.object({
    id: z.string()
        .regex(/^\d+$/, "El ID debe ser un número")
        .transform(val => parseInt(val))
        .refine(val => val > 0, "El ID debe ser positivo")
})

export const gestionarEstadoEntidadSchema = z.object({
    id: z.number()
        .int("El ID debe ser un número entero")
        .positive("El ID debe ser un número positivo")
})