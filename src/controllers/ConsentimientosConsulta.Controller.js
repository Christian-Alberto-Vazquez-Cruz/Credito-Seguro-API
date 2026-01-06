import { prisma } from '../lib/db.js'
import {
    crearConsentimientoConsultaSchema,
    consultarConsentimientoConsultaSchema,
    revocarConsentimientoConsultaSchema,
    verificarConsentimientoConsultaSchema
} from '../schemas/ConsentimientosConsulta.Schema.js'

import { MENSAJE_ERROR_GENERICO, SIN_AUTORIZACION} from '../utilities/constants/Constantes.js'
import { ENTIDAD_NO_ENCONTRADA } from '../utilities/constants/Usuarios.js'
import { CONSENTIMIENTO_NO_ENCONTRADO, CONSENTIMIENTO_YA_REVOCADO, FECHA_NO_VALIDA} from '../utilities/constants/Consentimientos.js'
import { manejarErrorZod, responderConError, responderConExito } from '../utilities/Manejadores.js'
import { CONSENTIMIENTO_CONSULTA_CREADO, CONSENTIMIENTO_CONSULTA_ENCONTRADO, CONSENTIMIENTO_CONSULTA_NO_ENCONTRADO, CONSENTIMIENTO_CONSULTA_REVOCADO, NO_CONSENTIMIENTO_PROPIO } from '../utilities/constants/ConsentimientosConsulta.js'

export class ConsentimientoConsultaController {

    /**
     * Crea un nuevo consentimiento de consulta (autorización a terceros)
     * POST /api/consentimientos-consulta
     * Requiere: Autenticación
     * Body: { idEntidadConsultante, fechaVencimiento }
     */
    static async crearConsentimiento(req, res) {
        try {
            const resultadoValidacion = crearConsentimientoConsultaSchema.safeParse(req.body)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion)
            }

            const datos = resultadoValidacion.data
            const idEntidadTitular = req.usuario.entidad.id

            const ahora = new Date()
            const fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 
                 ahora.getDate(), 0, 0, 0,0)

            const fechaVencimiento = datos.fechaVencimiento

            if (fechaVencimiento <= fechaInicio) {
                return responderConError(res, 400, FECHA_NO_VALIDA)
            }

            const entidadConsultante = await prisma.entidad.findUnique({
                where: { id: datos.idEntidadConsultante }
            })

            if (!entidadConsultante) {
                return responderConError(res, 404, ENTIDAD_NO_ENCONTRADA)
            }

            if (!entidadConsultante.activo) {
                return responderConError(res, 400, 'La entidad consultante está inactiva')
            }

            if (idEntidadTitular === datos.idEntidadConsultante) {
                return responderConError(res, 400, NO_CONSENTIMIENTO_PROPIO)
            }

            const nuevoConsentimiento = await prisma.consentimientoConsulta.create({
                data: {
                    idEntidadTitular: idEntidadTitular,
                    idEntidadConsultante: datos.idEntidadConsultante,
                    fechaInicio: fechaInicio,
                    fechaVencimiento: datos.fechaVencimiento,
                    ipOrigen: req.ip || req.connection.remoteAddress
                },
                include: {
                    Entidad_ConsentimientoConsulta_idEntidadConsultanteToEntidad: {
                        select: {
                            id: true,
                            nombreLegal: true,
                            rfc: true,
                            tipoEntidad: true
                        }
                    }
                }
            })

            return responderConExito(res, 201, CONSENTIMIENTO_CONSULTA_CREADO, {
                consentimiento: {
                    id: nuevoConsentimiento.id,
                    entidadConsultante: {
                        id: nuevoConsentimiento.Entidad_ConsentimientoConsulta_idEntidadConsultanteToEntidad.id,
                        nombreLegal: nuevoConsentimiento.Entidad_ConsentimientoConsulta_idEntidadConsultanteToEntidad.nombreLegal,
                        rfc: nuevoConsentimiento.Entidad_ConsentimientoConsulta_idEntidadConsultanteToEntidad.rfc
                    },
                    fechaInicio: nuevoConsentimiento.fechaInicio,
                    fechaVencimiento: nuevoConsentimiento.fechaVencimiento,
                    fechaConsentimiento: nuevoConsentimiento.fechaConsentimiento
                }
            })

        } catch (error) {
            console.error('Error al crear consentimiento de consulta:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Consulta un consentimiento de consulta específico por ID
     * GET /api/consentimientos-consulta/:id
     * Requiere: Autenticación
     */
    static async consultarConsentimiento(req, res) {
        try {
            const resultadoValidacion = consultarConsentimientoConsultaSchema.safeParse(req.params)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion)
            }

            const { id } = resultadoValidacion.data
            const idEntidadTitular = req.usuario.entidad.id

            const consentimiento = await prisma.consentimientoConsulta.findUnique({
                where: { id },
                include: {
                    Entidad_ConsentimientoConsulta_idEntidadConsultanteToEntidad: {
                        select: {
                            id: true,
                            nombreLegal: true,
                            rfc: true,
                            tipoEntidad: true
                        }
                    },
                    LogConsultaTerceros: {
                        select: {
                            id: true,
                            tipoConsulta: true,
                            fechaConsulta: true,
                            resultadoConsulta: true,
                            Usuario: {
                                select: {
                                    nombre: true,
                                    correo: true
                                }
                            }
                        },
                        orderBy: {
                            fechaConsulta: 'desc'
                        },
                        take: 10
                    }
                }
            })

            if (!consentimiento) {
                return responderConError(res, 404, CONSENTIMIENTO_NO_ENCONTRADO)
            }

            if (consentimiento.idEntidadTitular !== idEntidadTitular) {
                return responderConError(res, 403, SIN_AUTORIZACION)
            }

            const ahora = new Date()
            const estado = consentimiento.revocado 
                ? 'REVOCADO' 
                : consentimiento.fechaVencimiento < ahora 
                    ? 'EXPIRADO' 
                    : 'ACTIVO'

            return responderConExito(res, 200, 'Consentimiento de consulta encontrado', {
                consentimiento: {
                    id: consentimiento.id,
                    entidadConsultante: {
                        id: consentimiento.Entidad_ConsentimientoConsulta_idEntidadConsultanteToEntidad.id,
                        nombreLegal: consentimiento.Entidad_ConsentimientoConsulta_idEntidadConsultanteToEntidad.nombreLegal,
                        rfc: consentimiento.Entidad_ConsentimientoConsulta_idEntidadConsultanteToEntidad.rfc
                    },
                    fechaInicio: consentimiento.fechaInicio,
                    fechaVencimiento: consentimiento.fechaVencimiento,
                    revocado: consentimiento.revocado,
                    fechaRevocacion: consentimiento.fechaRevocacion,
                    numeroConsultasRealizadas: consentimiento.numeroConsultasRealizadas,
                    fechaUltimaConsulta: consentimiento.fechaUltimaConsulta,
                    fechaConsentimiento: consentimiento.fechaConsentimiento,
                    ipOrigen: consentimiento.ipOrigen,
                    estado: estado,
                    historialConsultas: consentimiento.LogConsultaTerceros.map(log => ({
                        id: log.id,
                        tipoConsulta: log.tipoConsulta,
                        fechaConsulta: log.fechaConsulta,
                        resultadoConsulta: log.resultadoConsulta,
                        usuarioOperador: {
                            nombre: log.Usuario.nombre,
                            correo: log.Usuario.correo
                        }
                    }))
                }
            })

        } catch (error) {
            console.error('Error al consultar consentimiento de consulta:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Revoca un consentimiento de consulta
     * PATCH /api/consentimientos-consulta/revocar
     * Requiere: Autenticación
     * Body: { id }
     */
    static async revocarConsentimiento(req, res) {
        try {
            const resultadoValidacion = revocarConsentimientoConsultaSchema.safeParse(req.body)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion)
            }

            const { id } = resultadoValidacion.data
            const idEntidadTitular = req.usuario.entidad.id

            const consentimiento = await prisma.consentimientoConsulta.findUnique({
                where: { id }
            })

            if (!consentimiento) {
                return responderConError(res, 404, CONSENTIMIENTO_NO_ENCONTRADO)
            }

            if (consentimiento.idEntidadTitular !== idEntidadTitular) {
                return responderConError(res, 403, SIN_AUTORIZACION)
            }

            if (consentimiento.revocado) {
                return responderConError(res, 400, CONSENTIMIENTO_YA_REVOCADO)
            }

            await prisma.consentimientoConsulta.update({
                where: { id },
                data: {
                    revocado: true,
                    fechaRevocacion: new Date()
                }
            })

            return responderConExito(res, 200, CONSENTIMIENTO_CONSULTA_REVOCADO, {
                id,
                fechaRevocacion: new Date()
            })

        } catch (error) {
            console.error('Error al revocar consentimiento de consulta:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Verifica si existe consentimiento válido (usado por terceros para consultar)
     * POST /api/consentimientos-consulta/verificar
     * Requiere: Autenticación
     * Body: { idEntidadTitular, tipoConsulta }
     */
    static async verificarConsentimiento(req, res) {
        try {
            const resultadoValidacion = verificarConsentimientoConsultaSchema.safeParse(req.body)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion)
            }

            const { idEntidadTitular, tipoConsulta } = resultadoValidacion.data
            const idEntidadConsultante = req.usuario.entidad.id

            const consentimiento = await prisma.consentimientoConsulta.findFirst({
                where: {
                    idEntidadTitular: idEntidadTitular,
                    idEntidadConsultante: idEntidadConsultante,
                    revocado: false,
                    fechaInicio: {
                        lte: new Date()
                    },
                    fechaVencimiento: {
                        gte: new Date()
                    }
                },
                include: {
                    Entidad_ConsentimientoConsulta_idEntidadTitularToEntidad: {
                        select: {
                            nombreLegal: true,
                            rfc: true
                        }
                    }
                }
            })

            if (!consentimiento) {
                // Registrar intento sin consentimiento
                try {
                    await prisma.logConsultaTerceros.create({
                        data: {
                            idConsentimiento: null,
                            idEntidadTitular: idEntidadTitular,
                            idEntidadConsultante: idEntidadConsultante,
                            idUsuarioOperador: req.usuario.id,
                            entidadConsultante: req.usuario.entidad.nombre,
                            tipoConsulta: tipoConsulta,
                            resultadoConsulta: 'DENEGADO_SIN_CONSENTIMIENTO',
                            ipOrigen: req.ip || req.connection.remoteAddress
                        }
                    })
                } catch (err) {
                    console.error('Error al registrar log:', err)
                }

                return responderConError(res, 403, CONSENTIMIENTO_CONSULTA_NO_ENCONTRADO)
            }

            // Registrar consulta exitosa
            await prisma.$transaction([
                prisma.logConsultaTerceros.create({
                    data: {
                        idConsentimiento: consentimiento.id,
                        idEntidadTitular: idEntidadTitular,
                        idEntidadConsultante: idEntidadConsultante,
                        idUsuarioOperador: req.usuario.id,
                        entidadConsultante: req.usuario.entidad.nombre,
                        tipoConsulta: tipoConsulta,
                        resultadoConsulta: 'EXITOSO',
                        ipOrigen: req.ip || req.connection.remoteAddress
                    }
                }),

                prisma.consentimientoConsulta.update({
                    where: { id: consentimiento.id },
                    data: {
                        numeroConsultasRealizadas: {
                            increment: 1
                        },
                        fechaUltimaConsulta: new Date()
                    }
                })
            ])

            return responderConExito(res, 200, CONSENTIMIENTO_CONSULTA_ENCONTRADO, {
                consentimiento: {
                    id: consentimiento.id,
                    entidadTitular: {
                        nombreLegal: consentimiento.Entidad_ConsentimientoConsulta_idEntidadTitularToEntidad.nombreLegal,
                        rfc: consentimiento.Entidad_ConsentimientoConsulta_idEntidadTitularToEntidad.rfc
                    },
                    fechaVencimiento: consentimiento.fechaVencimiento
                }
            })

        } catch (error) {
            console.error('Error al verificar consentimiento de consulta:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }
}