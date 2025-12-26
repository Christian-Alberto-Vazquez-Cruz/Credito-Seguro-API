import { z } from '../lib/zod.js'
import { validarRFC, addIssue } from '../utilities/SchemaFunctions.js'
import { idNumberSchema, rfcFisicaSchema } from './Primitivas.Schema.js'

export const crearUsuarioSchema = z.object({
    nombre: z.string()
        .trim()
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(100, "El nombre es demasiado largo"),
    
    correo: z.string()
        .trim()
        .toLowerCase()
        .email("Debe ingresar un correo válido")
        .min(5, "El correo es demasiado corto")
        .max(255, "El correo es demasiado largo"),
    
    contraseña: z.string()
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .max(128, "La contraseña es demasiado larga")
        .regex(/[A-Z]/, "La contraseña debe contener al menos una mayúscula")
        .regex(/[a-z]/, "La contraseña debe contener al menos una minúscula")
        .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
    
    tipoEntidad: z.enum(['FISICA', 'MORAL'], {
        errorMap: () => ({ message: "El tipo de entidad debe ser FISICA o MORAL" })
    }),
    
    nombreLegal: z.string()
        .trim()
        .min(3, "El nombre legal debe tener al menos 3 caracteres")
        .max(200, "El nombre legal es demasiado largo")
        .optional(),
    
    rfc: z.string()
        .trim()
        .toUpperCase()
        .optional(),
    
    idEntidad: z.number()
        .int("La entidad debe ser un número entero")
        .positive("La entidad debe ser un número positivo")
        .optional()

}).superRefine((data, ctx) => {
    // Si es persona física, debe crear nueva entidad
    if (data.tipoEntidad === 'FISICA') {
        if (!data.nombreLegal) {
            addIssue(ctx, 'nombreLegal', 'El nombre legal es requerido para persona física')
        }
        if (!data.rfc) {
            addIssue(ctx, 'rfc', 'El RFC es requerido para persona física')
        } else {
            validarRFC(rfcFisicaSchema, data.rfc, ctx)
        }
        if (data.idEntidad) {
           addIssue(ctx, 'idEntidad', 'No debe especificar idEntidad para persona física')
        }
    }
    
    // Si es persona moral, debe usar entidad existente
    if (data.tipoEntidad === 'MORAL') {
        if (!data.idEntidad) {
            addIssue(ctx, 'idEntidad', "El idEntidad es requerido para persona moral")
        }
        if (data.nombreLegal || data.rfc || data.idPlan) {
            addIssue(ctx, 'tipoEntidad', 'No debe especificar nombreLegal, rfc o idPlan para persona moral')
        }
    }
})

export const actualizarUsuarioSchema = z.object({
    nombre: z.string()
        .trim()
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(100, "El nombre es demasiado largo")
        .optional(),
    
    correo: z.string()
        .trim()
        .toLowerCase()
        .email("Debe ingresar un correo válido")
        .min(5, "El correo es demasiado corto")
        .max(255, "El correo es demasiado largo")
        .optional(),
    
    contraseña: z.string()
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .max(128, "La contraseña es demasiado larga")
        .regex(/[A-Z]/, "La contraseña debe contener al menos una mayúscula")
        .regex(/[a-z]/, "La contraseña debe contener al menos una minúscula")
        .regex(/[0-9]/, "La contraseña debe contener al menos un número")
        .optional(),
    
    notificacionesActivas: z.boolean()
        .optional()
}).refine(data => Object.keys(data).length > 0, {
    message: "Debe proporcionar al menos un campo para actualizar"
})

export const configurarNotificacionesSchema = z.object({
    notificacionesActivas: z.boolean({
        required_error: "El estado de notificaciones es requerido",
        invalid_type_error: "El estado debe ser true o false"
    })
})

export const eliminarUsuarioSchema = z.object({
    id: idNumberSchema
})