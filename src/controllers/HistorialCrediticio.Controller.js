import { ENTIDAD_NO_ENCONTRADA } from '../utilities/constants/Usuarios.js'
import {prisma} from "../lib/db.js"
import {LogService} from "../services/Log.Service.js"
import { ConsumoService } from '../services/Consumo.Service.js'
import { CirculoCreditoService } from '../services/CirculoCredito.Service.js'
import { ConsentimientoService } from '../services/Consentimiento.Service.js'
import { HISTORIAL_OBTENIDO, LIMITE_ALCANZADO, RESUMEN_CREDITICIO_OBTENIDO } from '../utilities/constants/Consultas.js'
import { responderConError, responderConExito, manejarErrorZod } from '../utilities/Manejadores.js'
import { consultarHistorialCrediticioSchema } from '../schemas/HistorialCreditio.Schema.js'
import { MENSAJE_ERROR_GENERICO } from '../utilities/constants/Constantes.js'

export class HistorialCrediticioController {

    /**
     * Obtiene el historial crediticio completo de una persona
     * GET /api/historial-crediticio/:rfc/completo
     */
    static async obtenerHistorialCompleto(req, res) {
        try {
            const resultadoValidacion = consultarHistorialCrediticioSchema.safeParse(req.params)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion)
            }

            const { rfc } = resultadoValidacion.data
            const idEntidadConsultante = req.usuario.entidad.id

            const entidadTitular = await prisma.entidad.findUnique({
                where: { rfc }
            })

            if (!entidadTitular) {
                return responderConError(res, 404, ENTIDAD_NO_ENCONTRADA)
            }

            const permisoConsulta = await ConsentimientoService.verificarPermisoConsulta(
                idEntidadConsultante,
                entidadTitular.id
            )

            if (!permisoConsulta.permitido) {
                await LogService.registrarLog({
                    idConsentimiento: 0,
                    idEntidadTitular: entidadTitular.id,
                    idEntidadConsultante,
                    idUsuarioOperador: req.usuario.id,
                    entidadConsultante: req.usuario.entidad.nombre,
                    tipoConsulta: 'HISTORIAL_COMPLETO',
                    resultadoConsulta: 'DENEGADO_SIN_CONSENTIMIENTO',
                    ipOrigen: req.ip || req.connection?.remoteAddress
                })

                return responderConError(res, 403, permisoConsulta.motivo || SIN_AUTORIZACION)
            }

            const limiteConsultas = await ConsumoService.verificarLimiteConsultas(
                idEntidadConsultante,
                req.usuario.entidad.maxConsultasMensuales
            )

            if (!limiteConsultas.permitido) {
                return responderConError(
                    res, 429, LIMITE_ALCANZADO(limiteConsultas.consultasRealizadas, 
                        req.usuario.entidad.maxConsultasMensuales)
                )
            }

            const [resumenCrediticio, obligaciones, pagos] = await Promise.all([
                CirculoCreditoService.obtenerResumenCrediticio(rfc).catch(() => null),
                CirculoCreditoService.obtenerDetallesObligaciones(rfc).catch(() => []),
                CirculoCreditoService.obtenerPagos(rfc).catch(() => [])
            ])

            await Promise.all([
                LogService.registrarLog({
                    idConsentimiento: permisoConsulta.consentimientoId || 0,
                    idEntidadTitular: entidadTitular.id,
                    idEntidadConsultante,
                    idUsuarioOperador: req.usuario.id,
                    entidadConsultante: req.usuario.entidad.nombre,
                    tipoConsulta: 'HISTORIAL_COMPLETO',
                    resultadoConsulta: 'EXITOSO',
                    ipOrigen: req.ip || req.connection?.remoteAddress
                }),
                ConsumoService.registrarConsulta(idEntidadConsultante)
            ])

            return responderConExito(res, 200, HISTORIAL_OBTENIDO, {
                entidad: {
                    id: entidadTitular.id,
                    nombreLegal: entidadTitular.nombreLegal,
                    rfc: entidadTitular.rfc,
                    tipoEntidad: entidadTitular.tipoEntidad
                },
                resumenCrediticio,
                obligaciones,
                pagos: pagos.slice(0, 50), // Limitado a últimos 50 pagos
                consultasRestantes: limiteConsultas.consultasDisponibles - 1
            })

        } catch (error) {
            console.error('Error al obtener historial completo:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Obtiene el resumen del historial crediticio de una persona
     * GET /api/historial-crediticio/:rfc
     */
    static async obtenerHistorialPorRFC(req, res) {
        try {
            const resultadoValidacion = consultarHistorialCrediticioSchema.safeParse(req.params)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion)
            }

            const { rfc } = resultadoValidacion.data
            const idEntidadConsultante = req.usuario.entidad.id

            const entidadTitular = await prisma.entidad.findUnique({
                where: { rfc }
            })

            if (!entidadTitular) {
                return responderConError(res, 404, ENTIDAD_NO_ENCONTRADA)
            }

            const permisoConsulta = await ConsentimientoService.verificarPermisoConsulta(
                idEntidadConsultante,
                entidadTitular.id
            )

            if (!permisoConsulta.permitido) {
                await LogService.registrarLog({
                    idConsentimiento: 0,
                    idEntidadTitular: entidadTitular.id,
                    idEntidadConsultante,
                    idUsuarioOperador: req.usuario.id,
                    entidadConsultante: req.usuario.entidad.nombre,
                    tipoConsulta: 'RESUMEN_CREDITICIO',
                    resultadoConsulta: 'DENEGADO_SIN_CONSENTIMIENTO',
                    ipOrigen: req.ip || req.connection?.remoteAddress
                })

                return responderConError(res, 403, permisoConsulta.motivo || SIN_AUTORIZACION)
            }

            const limiteConsultas = await ConsumoService.verificarLimiteConsultas(
                idEntidadConsultante,
                req.usuario.entidad.maxConsultasMensuales
            )

            if (!limiteConsultas.permitido) {
                return responderConError(
                    res, 429, 
                    LIMITE_ALCANZADO(limitesConsultas.consultasRealizadas, 
                        req.usuario.entidad.maxConsultasMensuales)
                )
            }

            await ConsumoService.registrarConsulta(idEntidadConsultante)

            const resumenCrediticio = await CirculoCreditoService.obtenerResumenCrediticio(rfc)

            await LogService.registrarLog({
                idConsentimiento: permisoConsulta.consentimientoId || 0,
                idEntidadTitular: entidadTitular.id,
                idEntidadConsultante,
                idUsuarioOperador: req.usuario.id,
                entidadConsultante: req.usuario.entidad.nombre,
                tipoConsulta: 'RESUMEN_CREDITICIO',
                resultadoConsulta: 'EXITOSO',
                ipOrigen: req.ip || req.connection?.remoteAddress
            })

            return responderConExito(res, 200, RESUMEN_CREDITICIO_OBTENIDO, {
                entidad: {
                    id: entidadTitular.id,
                    nombreLegal: entidadTitular.nombreLegal,
                    rfc: entidadTitular.rfc,
                    tipoEntidad: entidadTitular.tipoEntidad
                },
                resumenCrediticio,
                consultasRestantes: limiteConsultas.consultasDisponibles - 1
            })

        } catch (error) {
            console.error('Error al obtener resumen crediticio:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Obtiene las obligaciones crediticias de una persona
     * GET /api/historial-crediticio/:rfc/obligaciones
     */
    static async obtenerObligacionesPorRFC(req, res) {
        try {
            const resultadoValidacion = consultarHistorialCrediticioSchema.safeParse(req.params)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion)
            }

            const { rfc } = resultadoValidacion.data
            const idEntidadConsultante = req.usuario.entidad.id

            const entidadTitular = await prisma.entidad.findUnique({
                where: { rfc }
            })

            if (!entidadTitular) {
                return responderConError(res, 404, ENTIDAD_NO_ENCONTRADA)
            }

            // Verificar permisos de consulta
            const permisoConsulta = await ConsentimientoService.verificarPermisoConsulta(
                idEntidadConsultante,
                entidadTitular.id
            )

            if (!permisoConsulta.permitido) {
                await LogService.registrarLog({
                    idConsentimiento: 0,
                    idEntidadTitular: entidadTitular.id,
                    idEntidadConsultante,
                    idUsuarioOperador: req.usuario.id,
                    entidadConsultante: req.usuario.entidad.nombre,
                    tipoConsulta: 'OBLIGACIONES_CREDITICIAS',
                    resultadoConsulta: 'DENEGADO_SIN_CONSENTIMIENTO',
                    ipOrigen: req.ip || req.connection?.remoteAddress
                })

                return responderConError(res, 403, permisoConsulta.motivo || SIN_AUTORIZACION)
            }

            const limiteConsultas = await ConsumoService.verificarLimiteConsultas(
                idEntidadConsultante,
                req.usuario.entidad.maxConsultasMensuales
            )

            if (!limiteConsultas.permitido) {
                return responderConError(
                    res, 429, 
                    LIMITE_ALCANZADO(limiteConsultas.consultasRealizadas, 
                        req.usuario.entidad.maxConsultasMensuales)
                )
            }

            const obligaciones = await CirculoCreditoService.obtenerDetallesObligaciones(rfc)

            await Promise.all([
                LogService.registrarLog({
                    idConsentimiento: permisoConsulta.consentimientoId || 0,
                    idEntidadTitular: entidadTitular.id,
                    idEntidadConsultante,
                    idUsuarioOperador: req.usuario.id,
                    entidadConsultante: req.usuario.entidad.nombre,
                    tipoConsulta: 'OBLIGACIONES_CREDITICIAS',
                    resultadoConsulta: 'EXITOSO',
                    ipOrigen: req.ip || req.connection?.remoteAddress
                }),
                ConsumoService.registrarConsulta(idEntidadConsultante)
            ])

            return responderConExito(res, 200, 'Obligaciones crediticias obtenidas exitosamente', {
                entidad: {
                    id: entidadTitular.id,
                    nombreLegal: entidadTitular.nombreLegal,
                    rfc: entidadTitular.rfc,
                    tipoEntidad: entidadTitular.tipoEntidad
                },
                obligaciones,
                totalObligaciones: obligaciones.length,
                consultasRestantes: limiteConsultas.consultasDisponibles - 1
            })

        } catch (error) {
            console.error('Error al obtener obligaciones crediticias:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Obtiene el historial de pagos de una persona
     * GET /api/historial-crediticio/:rfc/pagos?obligacionId=123
     */
    static async obtenerPagosPorRFC(req, res) {
        try {
            const resultadoValidacion = consultarHistorialCrediticioSchema.safeParse(req.params)

            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion)
            }

            const { rfc } = resultadoValidacion.data
            const obligacionId = req.query.obligacionId ? parseInt(req.query.obligacionId) : null
            const idEntidadConsultante = req.usuario.entidad.id

            const entidadTitular = await prisma.entidad.findUnique({
                where: { rfc }
            })

            if (!entidadTitular) {
                return responderConError(res, 404, ENTIDAD_NO_ENCONTRADA)
            }

            const permisoConsulta = await ConsentimientoService.verificarPermisoConsulta(
                idEntidadConsultante,
                entidadTitular.id
            )

            if (!permisoConsulta.permitido) {
                await LogService.registrarLog({
                    idConsentimiento: 0,
                    idEntidadTitular: entidadTitular.id,
                    idEntidadConsultante,
                    idUsuarioOperador: req.usuario.id,
                    entidadConsultante: req.usuario.entidad.nombre,
                    tipoConsulta: 'HISTORIAL_PAGOS',
                    resultadoConsulta: 'DENEGADO_SIN_CONSENTIMIENTO',
                    ipOrigen: req.ip || req.connection?.remoteAddress
                })

                return responderConError(res, 403, permisoConsulta.motivo || SIN_AUTORIZACION)
            }

            const limiteConsultas = await ConsumoService.verificarLimiteConsultas(
                idEntidadConsultante,
                req.usuario.entidad.maxConsultasMensuales
            )

            if (!limiteConsultas.permitido) {
                return responderConError(
                    res, 429, 
                    LIMITE_ALCANZADO(limiteConsultas.consultasRealizadas, 
                        req.usuario.entidad.maxConsultasMensuales)
                )
            }

            const pagos = await CirculoCreditoService.obtenerPagos(rfc, obligacionId)

            await Promise.all([
                LogService.registrarLog({
                    idConsentimiento: permisoConsulta.consentimientoId || 0,
                    idEntidadTitular: entidadTitular.id,
                    idEntidadConsultante,
                    idUsuarioOperador: req.usuario.id,
                    entidadConsultante: req.usuario.entidad.nombre,
                    tipoConsulta: 'HISTORIAL_PAGOS',
                    resultadoConsulta: 'EXITOSO',
                    ipOrigen: req.ip || req.connection?.remoteAddress
                }),
                ConsumoService.registrarConsulta(idEntidadConsultante)
            ])

            return responderConExito(res, 200, 'Historial de pagos obtenido exitosamente', {
                entidad: {
                    id: entidadTitular.id,
                    nombreLegal: entidadTitular.nombreLegal,
                    rfc: entidadTitular.rfc,
                    tipoEntidad: entidadTitular.tipoEntidad
                },
                obligacionId: obligacionId || 'todas',
                pagos,
                totalPagos: pagos.length,
                consultasRestantes: limiteConsultas.consultasDisponibles - 1
            })

        } catch (error) {
            console.error('Error al obtener historial de pagos:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }
}