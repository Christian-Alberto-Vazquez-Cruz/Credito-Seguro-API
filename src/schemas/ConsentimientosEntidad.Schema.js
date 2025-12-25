import { z } from '../lib/zod.js'

// Schema para crear consentimiento de consulta
export const crearConsentimientoSchema = z.object({
    idEntidadConsultante: z.number()
        .int("La entidad consultante debe ser un número entero")
        .positive("La entidad consultante debe ser un número positivo"),
    
    tipoInformacion: z.enum([
        'SCORE_COMPLETO',
        'SCORE_BASICO',
        'HISTORIAL_RESUMIDO',
        'HISTORIAL_COMPLETO'
    ], {
        errorMap: () => ({ 
            message: "El tipo de información debe ser SCORE_COMPLETO, SCORE_BASICO, HISTORIAL_RESUMIDO o HISTORIAL_COMPLETO" 
        })
    }),
    
    fechaVencimiento: z.iso.datetime("La fecha de vencimiento debe ser una fecha válida en formato ISO")
        .transform(str => new Date(str))
})

// Schema para consultar consentimiento por ID
export const consultarConsentimientoSchema = z.object({
    id: z.string()
        .regex(/^\d+$/, "El ID debe ser un número")
        .transform(val => parseInt(val))
        .refine(val => val > 0, "El ID debe ser positivo")
})

// Schema para listar consentimientos con filtros
export const listarConsentimientosSchema = z.object({
    pagina: z.string()
        .optional()
        .default('1')
        .transform(val => parseInt(val)),
    
    limite: z.string()
        .optional()
        .default('10')
        .transform(val => parseInt(val)),
    
    estado: z.enum(['ACTIVO', 'EXPIRADO', 'REVOCADO', 'PAUSADO'])
        .optional(),
    
    tipoInformacion: z.enum([
        'SCORE_COMPLETO',
        'SCORE_BASICO',
        'HISTORIAL_RESUMIDO',
        'HISTORIAL_COMPLETO'
    ]).optional()
})

// Schema para revocar consentimiento
export const revocarConsentimientoSchema = z.object({
    id: z.number()
        .int("El ID debe ser un número entero")
        .positive("El ID debe ser un número positivo")
})

// Schema para verificar consentimiento (para consultas de terceros)
export const verificarConsentimientoSchema = z.object({
    idEntidadTitular: z.number()
        .int("La entidad titular debe ser un número entero")
        .positive("La entidad titular debe ser un número positivo"),
    
    tipoConsulta: z.string()
        .min(1, "El tipo de consulta es requerido")
        .max(50, "El tipo de consulta es demasiado largo")
})