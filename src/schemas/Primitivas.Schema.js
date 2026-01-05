import { z } from '../lib/zod.js'

export const idNumberSchema = z.number()
  .int("El ID debe ser un número entero")
  .positive("El ID debe ser un número positivo")

  export const idParamSchema = z.string()
  .regex(/^\d+$/, "El ID debe ser un número")
  .transform(Number)
  .refine(val => val > 0, "El ID debe ser positivo")

  export const isoDateSchema = z.iso
  .datetime("La fecha debe ser válida en formato ISO")
  .transform(str => new Date(str))

export const simpleDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD")
  .transform(str => {
    const [year, month, day] = str.split('-').map(Number)
    return new Date(year, month - 1, day, 0, 0, 0, 0)
  })
  .refine(fecha => !isNaN(fecha.getTime()), "Fecha inválida")

export const fechaVencimientoSchema = simpleDateSchema
  .refine(fecha => fecha > new Date(), "La fecha de vencimiento debe ser futura")

export const rfcFisicaSchema = z.string()
  .trim()
  .toUpperCase()
  .length(13, "El RFC de persona física debe tener 13 caracteres")
  .regex(/^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/, "Formato de RFC inválido para persona física")

export const rfcMoralSchema = z.string()
  .trim()
  .toUpperCase()
  .length(12, "El RFC de persona moral debe tener 12 caracteres")
  .regex(/^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/, "Formato de RFC inválido para persona moral")

export const rfcGenerico = z.string()
    .trim()
    .toUpperCase()
    .refine(
        (val) => val.length === 12 || val.length === 13,
        "El RFC debe tener 12 o 13 caracteres"
    )
    .refine(
        (val) => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(val),
        "Formato de RFC inválido"
    )