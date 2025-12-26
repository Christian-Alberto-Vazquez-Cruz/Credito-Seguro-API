import {prisma} from '../lib/db.js'
import { crearConsentimientoSchema, renovarConsentimientoSchema, revocarConsentimientoSchema } from '../schemas/Consentimientos.Schema.js'
import { FECHA_VENCIMIENTO_INVALIDA,
    CONSENTIMIENTO_ACTIVO_EXISTE, CONSENTIMIENTO_NO_ENCONTRADO,
    CONSENTIMIENTO_YA_REVOCADO, SIN_AUTORIZACION,
    CONSENTIMIENTO_REVOCADO_EXITOSAMENTE,
    CONSENTIMIENTO_ENCONTRADO,
    CONSENTIMIENTO_RENOVADO_EXITOSAMENTE
 } from '../utilities/constants/Consentimientos.js'

 import { MENSAJE_ERROR_GENERICO } from '../utilities/Constantes.js'
import { responderConError, responderConExito, manejarErrorZod } from '../utilities/Manejadores.js'

export class ConsentimientosController {

    /**
     * Crea un nuevo consentimiento de entidad (autorización al sistema)
     * Requiere: Autenticación
     * Body: { fechaVencimiento }
     */
    static async crearConsentimiento(req, res) {
        try {
            const resultadoValidacion = crearConsentimientoSchema.safeParse(req.body)

            if (!resultadoValidacion.success){
                return manejarErrorZod(res, resultadoValidacion);
            }

            const datos = resultadoValidacion.data
            const idEntidad = req.usuario.entidad.id

            const fechaInicio = new Date()

            if (datos.fechaVencimiento <= fechaInicio) {
                return responderConError(res, 400, FECHA_VENCIMIENTO_INVALIDA)
            }

            const consentimientoActivo = await prisma.consentimientoEntidad.findFirst({
                where: {
                    idEntidad: idEntidad,
                    revocado: false,
                    fechaVencimiento: {
                        gte: new Date()
                    }
                }
            })
            

            if (consentimientoActivo) {
                return responderConError(res, 409, CONSENTIMIENTO_ACTIVO_EXISTE)
            }

            const nuevoConsentimiento = await prisma.consentimientoEntidad.create({
                data: {
                    idEntidad: idEntidad,
                    fechaInicio: fechaInicio,
                    fechaVencimiento: datos.fechaVencimiento
                }
            })

            const consentimiento = {
                id: nuevoConsentimiento.id,
                fechaInicio: nuevoConsentimiento.fechaInicio,
                fechaVencimiento: nuevoConsentimiento.fechaVencimiento,
                revocado: nuevoConsentimiento.revocado

            }

            return responderConExito(res, 201, 
                'Consentimiento de entidad creado exitosamente', 
                consentimiento)

        } catch (error){
            console.error('Error al crear consentimiento de entidad:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Consulta un consentimiento de entidad específico por ID
     * GET /api/consentimientos-entidad/:id
     * Requiere: Autenticación
     */
    static async consultarConsentimiento(req, res) {
        try {
            const resultadoValidacion = consultarConsentimientoEntidadSchema.safeParse(req.params)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion);
            }

            const { id } = resultadoValidacion.data
            const idEntidad = req.usuario.entidad.id

            const consentimiento = await prisma.consentimientoEntidad.findUnique({
                where: { id }
            })

            if (!consentimiento) {
                return responderConError(res, 404, CONSENTIMIENTO_NO_ENCONTRADO)
            }

            if (consentimiento.idEntidad !== idEntidad) {
                return responderConError(res, 403, SIN_AUTORIZACION)
            }

            const ahora = new Date()
            const estado = consentimiento.revocado 
                ? 'REVOCADO' 
                : consentimiento.fechaVencimiento < ahora 
                    ? 'EXPIRADO' 
                    : 'ACTIVO'

            return responderConExito(res, 200, CONSENTIMIENTO_ENCONTRADO, {
                consentimiento: {
                    id: consentimiento.id,
                    fechaInicio: consentimiento.fechaInicio,
                    fechaVencimiento: consentimiento.fechaVencimiento,
                    revocado: consentimiento.revocado,
                    fechaRevocacion: consentimiento.fechaRevocacion,
                    estado: estado
                }
            })

        } catch (error) {
            console.error('Error al consultar consentimiento de entidad:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Revoca un consentimiento de entidad
     * PATCH /api/consentimientos-entidad/revocar
     * Requiere: Autenticación
     * Body: { id }
     */
    static async revocarConsentimiento(req, res) {
        try {
            const resultadoValidacion = revocarConsentimientoSchema.safeParse(req.body)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion);
            }

            const { id } = resultadoValidacion.data
            const idEntidad = req.usuario.entidad.id

            const consentimiento = await prisma.consentimientoEntidad.findUnique({
                where: { id }
            })

            if (!consentimiento) {
                return responderConError(res, 404, CONSENTIMIENTO_NO_ENCONTRADO)
            }

            if (consentimiento.idEntidad !== idEntidad) {
                return responderConError(res, 403, SIN_AUTORIZACION)
            }

            if (consentimiento.revocado) {
                return responderConError(res, 400, CONSENTIMIENTO_YA_REVOCADO)
            }

            await prisma.consentimientoEntidad.update({
                where: { id },
                data: {
                    revocado: true,
                    fechaRevocacion: new Date()
                }
            })

            return responderConExito(res, 200, CONSENTIMIENTO_REVOCADO_EXITOSAMENTE , {
                id,
                fechaRevocacion: new Date()
            })

        } catch (error) {
            console.error('Error al revocar consentimiento de entidad:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Renueva un consentimiento de entidad (extiende la fecha de vencimiento)
     * PATCH /api/consentimientos-entidad/renovar
     * Requiere: Autenticación
     * Body: { id, fechaVencimiento }
     */
    static async renovarConsentimiento(req, res) {
        try {
            const resultadoValidacion = renovarConsentimientoSchema.safeParse(req.body)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion);
            }

            const { id, fechaVencimiento } = resultadoValidacion.data
            const idEntidad = req.usuario.entidad.id

            if (fechaVencimiento <= new Date()) {
                return responderConError(res, 400, FECHA_VENCIMIENTO_INVALIDA)
            }

            const consentimiento = await prisma.consentimientoEntidad.findUnique({
                where: { id }
            })

            if (!consentimiento) {
                return responderConError(res, 404, CONSENTIMIENTO_NO_ENCONTRADO)
            }

            if (consentimiento.idEntidad !== idEntidad) {
                return responderConError(res, 403, SIN_AUTORIZACION)
            }

            if (consentimiento.revocado) {
                return responderConError(res, 400, CONSENTIMIENTO_YA_REVOCADO)
            }

            const consentimientoRenovado = await prisma.consentimientoEntidad.update({
                where: { id },
                data: {
                    fechaVencimiento: fechaVencimiento
                }
            })

            return responderConExito(res, 200, CONSENTIMIENTO_RENOVADO_EXITOSAMENTE, {
                consentimiento: {
                    id: consentimientoRenovado.id,
                    fechaInicio: consentimientoRenovado.fechaInicio,
                    fechaVencimiento: consentimientoRenovado.fechaVencimiento,
                    revocado: consentimientoRenovado.revocado
                }
            })

        } catch (error) {
            console.error('Error al renovar consentimiento de entidad:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Verifica si la entidad actual tiene consentimiento activo
     * GET /api/consentimientos-entidad/verificar
     * Requiere: Autenticación
     */
    static async verificarConsentimientoActivo(req, res) {
        try {
            const idEntidad = req.usuario.entidad.id

            const consentimientoActivo = await prisma.consentimientoEntidad.findFirst({
                where: {
                    idEntidad: idEntidad,
                    revocado: false,
                    fechaVencimiento: {
                        gte: new Date()
                    }
                },
                orderBy: {
                    fechaVencimiento: 'desc'
                }
            })

            if (!consentimientoActivo) {
                return responderConExito(res, 200, CONSENTIMIENTO_NO_ENCONTRADO, {
                    tieneConsentimiento: false,
                    consentimiento: null
                })
            }

            return responderConExito(res, 200, CONSENTIMIENTO_ENCONTRADO, {
                tieneConsentimiento: true,
                consentimiento: {
                    id: consentimientoActivo.id,
                    fechaInicio: consentimientoActivo.fechaInicio,
                    fechaVencimiento: consentimientoActivo.fechaVencimiento
                }
            })

        } catch (error) {
            console.error('Error al verificar consentimiento activo:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }
}