import { ConsentimientoService } from "../services/Consentimiento.Service.js"
import { ConsumoService } from "../services/Consumo.Service.js"
import { ScoringService } from "../services/scoring.service.js"
import { LogService } from "../services/Log.Service.js"
import { prisma } from '../lib/db.js'

import { responderConError, responderConExito, manejarErrorZod } from "../utilities/Manejadores.js"
import { LIMITE_ALCANZADO } from "../utilities/constants/Consultas.js"
import { consultarScoringSchema } from "../schemas/Scoring.Schema.js"
import { MENSAJE_ERROR_GENERICO, SIN_AUTORIZACION } from "../utilities/constants/Constantes.js"
import { ENTIDAD_NO_ENCONTRADA } from "../utilities/constants/Usuarios.js"

export class ScoringController {

  /**
   * Calcula el scoring crediticio de una entidad
   * POST /api/scoring/calcular
   */
  static async calcularScoring(req, res) {
    try {
      const resultadoValidacion = consultarScoringSchema.safeParse(req.params)

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

      // ✅ AUTOCONSULTA: permitir sin consentimiento si consultante == titular
      let permisoConsulta = { permitido: true, consentimientoId: 0 }

      if (idEntidadConsultante !== entidadTitular.id) {
        permisoConsulta = await ConsentimientoService.verificarPermisoConsulta(
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
            tipoConsulta: 'CALCULO_SCORING',
            resultadoConsulta: 'DENEGADO_SIN_CONSENTIMIENTO',
            ipOrigen: req.ip || req.connection?.remoteAddress
          })

          return responderConError(res, 403, permisoConsulta.motivo || SIN_AUTORIZACION)
        }
      }

      const limiteConsultas = await ConsumoService.verificarLimiteConsultas(
        idEntidadConsultante,
        req.usuario.entidad.maxConsultasMensuales
      )

      if (!limiteConsultas.permitido) {
        return responderConError(
          res,
          429,
          LIMITE_ALCANZADO(
            limiteConsultas.consultasRealizadas,
            req.usuario.entidad.maxConsultasMensuales
          ),
        )
      }

      const scoring = await ScoringService.calcularScoring(rfc)

      await ScoringService.guardarEnHistorial(entidadTitular.id, scoring)

      await Promise.all([
        LogService.registrarLog({
          idConsentimiento: permisoConsulta.consentimientoId || 0,
          idEntidadTitular: entidadTitular.id,
          idEntidadConsultante,
          idUsuarioOperador: req.usuario.id,
          entidadConsultante: req.usuario.entidad.nombre,
          tipoConsulta: 'CALCULO_SCORING',
          resultadoConsulta: 'EXITOSO',
          ipOrigen: req.ip || req.connection?.remoteAddress
        }),
        ConsumoService.registrarConsulta(idEntidadConsultante)
      ])

      return responderConExito(res, 200, 'Scoring calculado exitosamente', {
        entidad: {
          id: entidadTitular.id,
          nombreLegal: entidadTitular.nombreLegal,
          rfc: entidadTitular.rfc
        },
        scoring: {
          scoreTotal: scoring.scoreTotal,
          nivelRiesgo: scoring.nivelRiesgo,
          componentes: scoring.componentes,
          factoresPositivos: scoring.factoresPositivos,
          factoresNegativos: scoring.factoresNegativos,
          recomendaciones: scoring.recomendaciones,
          fechaCalculo: scoring.fechaCalculo
        },
        consultasRestantes: limiteConsultas.consultasDisponibles - 1
      })

    } catch (error) {
      console.error('Error al calcular scoring:', error)
      return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
    }
  }

  /**
   * Obtiene el historial de scoring de una entidad
   * GET /api/scoring/historial/:rfc
   */
  static async obtenerHistorialScoring(req, res) {
    try {
      const resultadoValidacion = consultarScoringSchema.safeParse(req.params)

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

      // ✅ AUTOCONSULTA
      if (idEntidadConsultante !== entidadTitular.id) {
        const permisoConsulta = await ConsentimientoService.verificarPermisoConsulta(
          idEntidadConsultante,
          entidadTitular.id
        )

        if (!permisoConsulta.permitido) {
          return responderConError(res, 403, permisoConsulta.motivo || SIN_AUTORIZACION)
        }
      }

      const historial = await prisma.historialScore.findMany({
        where: {
          idEntidad: entidadTitular.id
        },
        orderBy: {
          fechaCalculo: 'desc'
        },
        take: 12,
        select: {
          id: true,
          puntajeScore: true,
          nivelRiesgo: true,
          factoresPositivos: true,
          factoresNegativos: true,
          fechaCalculo: true
        }
      })

      const historialFormateado = historial.map(h => ({
        ...h,
        factoresPositivos: h.factoresPositivos ? JSON.parse(h.factoresPositivos) : [],
        factoresNegativos: h.factoresNegativos ? JSON.parse(h.factoresNegativos) : []
      }))

      return responderConExito(res, 200, 'Historial de scoring obtenido exitosamente', {
        entidad: {
          id: entidadTitular.id,
          nombreLegal: entidadTitular.nombreLegal,
          rfc: entidadTitular.rfc
        },
        historial: historialFormateado,
        totalRegistros: historial.length
      })

    } catch (error) {
      console.error('Error al obtener historial de scoring:', error)
      return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
    }
  }

  /**
   * Obtiene el scoring más reciente de una entidad
   * GET /api/scoring/ultimo/:rfc
   */
  static async obtenerUltimoScoring(req, res) {
    try {
      const resultadoValidacion = consultarScoringSchema.safeParse(req.params)

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

      // ✅ AUTOCONSULTA
      if (idEntidadConsultante !== entidadTitular.id) {
        const permisoConsulta = await ConsentimientoService.verificarPermisoConsulta(
          idEntidadConsultante,
          entidadTitular.id
        )

        if (!permisoConsulta.permitido) {
          return responderConError(res, 403, permisoConsulta.motivo || SIN_AUTORIZACION)
        }
      }

      const ultimoScoring = await prisma.historialScore.findFirst({
        where: {
          idEntidad: entidadTitular.id
        },
        orderBy: {
          fechaCalculo: 'desc'
        },
        select: {
          id: true,
          puntajeScore: true,
          nivelRiesgo: true,
          factoresPositivos: true,
          factoresNegativos: true,
          fechaCalculo: true
        }
      })

      if (!ultimoScoring) {
        return responderConError(res, 404, 'No hay scoring calculado para esta entidad')
      }

      return responderConExito(res, 200, 'Último scoring obtenido exitosamente', {
        entidad: {
          id: entidadTitular.id,
          nombreLegal: entidadTitular.nombreLegal,
          rfc: entidadTitular.rfc
        },
        scoring: {
          ...ultimoScoring,
          factoresPositivos: ultimoScoring.factoresPositivos ? JSON.parse(ultimoScoring.factoresPositivos) : [],
          factoresNegativos: ultimoScoring.factoresNegativos ? JSON.parse(ultimoScoring.factoresNegativos) : []
        }
      })

    } catch (error) {
      console.error('Error al obtener último scoring:', error)
      return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
    }
  }

  /**
   * Compara el scoring actual con el histórico
   * GET /api/scoring/comparar/:rfc
   */
  static async compararScoring(req, res) {
    try {
      const resultadoValidacion = consultarScoringSchema.safeParse(req.params)

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

      // ✅ AUTOCONSULTA
      if (idEntidadConsultante !== entidadTitular.id) {
        const permisoConsulta = await ConsentimientoService.verificarPermisoConsulta(
          idEntidadConsultante,
          entidadTitular.id
        )

        if (!permisoConsulta.permitido) {
          return responderConError(res, 403, permisoConsulta.motivo || SIN_AUTORIZACION)
        }
      }

      const ultimos = await prisma.historialScore.findMany({
        where: { idEntidad: entidadTitular.id },
        orderBy: { fechaCalculo: 'desc' },
        take: 2
      })

      if (ultimos.length === 0) {
        return responderConError(res, 404, 'No hay scoring calculado para comparar')
      }

      const actual = ultimos[0]
      const anterior = ultimos[1]

      const comparacion = {
        scoreActual: actual.puntajeScore,
        scoreAnterior: anterior?.puntajeScore || null,
        diferencia: anterior ? actual.puntajeScore - anterior.puntajeScore : null,
        porcentajeCambio: anterior
          ? (((actual.puntajeScore - anterior.puntajeScore) / anterior.puntajeScore) * 100).toFixed(2)
          : null,
        mejoro: anterior ? actual.puntajeScore > anterior.puntajeScore : null,
        fechaActual: actual.fechaCalculo,
        fechaAnterior: anterior?.fechaCalculo || null
      }

      return responderConExito(res, 200, 'Comparación de scoring realizada', {
        entidad: {
          id: entidadTitular.id,
          nombreLegal: entidadTitular.nombreLegal,
          rfc: entidadTitular.rfc
        },
        comparacion
      })

    } catch (error) {
      console.error('Error al comparar scoring:', error)
      return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
    }
  }
}
