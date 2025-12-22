import {z} from '../lib/zod.js'

export const loginSchema = z.object({
    correo: z.string()
    .trim()
    .toLowerCase()
    // email está deprecado pero es seguro, permite transformaciones
    .email("Debe ingresar un correo válido")
    .min(5, "El correo es demasiado corto")
    .max(100, "El correo es demasiado largo"),

    contraseña: z.string()
    .min(8, "La contraseña es obligatoria")
    .max(128, "La contraseña es demasiado larga")
})