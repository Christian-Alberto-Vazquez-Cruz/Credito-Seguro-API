import { prisma } from '../lib/db.js'
import { CirculoCreditoService } from './CirculoCredito.Service.js'

//Basado en 5 componentes: Historial, Endeudamiento, Antigüedad, Mix Crediticio, Comportamiento

export class ScoringService {
    static PESOS = {
        HISTORIAL_PAGOS: 0.35,        
        NIVEL_ENDEUDAMIENTO: 0.30,    
        ANTIGUEDAD_CREDITICIA: 0.15,  
        MIX_CREDITICIO: 0.10,         
        COMPORTAMIENTO_RECIENTE: 0.10 
    }

    static NIVELES_RIESGO = {
        EXCELENTE: { min: 800, max: 1000, color: '#10B981' },
        MUY_BUENO: { min: 700, max: 799, color: '#3B82F6' },
        BUENO: { min: 600, max: 699, color: '#F59E0B' },
        REGULAR: { min: 500, max: 599, color: '#F97316' },
        MALO: { min: 400, max: 499, color: '#EF4444' },
        MUY_MALO: { min: 0, max: 399, color: '#DC2626' }
    }

    /**
     * Calcula el scoring crediticio completo de una entidad
     * @param {string} rfc - RFC de la entidad a evaluar
     * @returns {Promise<Object>} Score completo con desglose
     */
    static async calcularScoring(rfc) {
        try {
            const [resumenBuro, detallesObligaciones, pagosPendientes] = await Promise.all([
                CirculoCreditoService.obtenerResumenBuro(rfc),
                CirculoCreditoService.obtenerDetallesObligaciones(rfc),
                CirculoCreditoService.obtenerPagosPendientes(rfc)
            ])

            const historialPagos = this._calcularHistorialPagos(resumenBuro)
            const nivelEndeudamiento = this._calcularNivelEndeudamiento(resumenBuro, detallesObligaciones)
            const antiguedadCrediticia = this._calcularAntiguedadCrediticia(resumenBuro)
            const mixCrediticio = this._calcularMixCrediticio(detallesObligaciones)
            const comportamientoReciente = this._calcularComportamientoReciente(resumenBuro, pagosPendientes)

            const scoreTotal = Math.round(
                historialPagos.puntos +
                nivelEndeudamiento.puntos +
                antiguedadCrediticia.puntos +
                mixCrediticio.puntos +
                comportamientoReciente.puntos
            )

            const nivelRiesgo = this._determinarNivelRiesgo(scoreTotal)

            const recomendaciones = this._generarRecomendaciones({
                scoreTotal,
                historialPagos,
                nivelEndeudamiento,
                antiguedadCrediticia,
                mixCrediticio,
                comportamientoReciente
            })

            const factoresPositivos = this._consolidarFactoresPositivos({
                historialPagos,
                nivelEndeudamiento,
                antiguedadCrediticia,
                mixCrediticio,
                comportamientoReciente
            })

            const factoresNegativos = this._consolidarFactoresNegativos({
                historialPagos,
                nivelEndeudamiento,
                antiguedadCrediticia,
                mixCrediticio,
                comportamientoReciente
            })

            return {
                rfc,
                scoreTotal,
                nivelRiesgo,
                componentes: {
                    historialPagos,
                    nivelEndeudamiento,
                    antiguedadCrediticia,
                    mixCrediticio,
                    comportamientoReciente
                },
                factoresPositivos,
                factoresNegativos,
                recomendaciones,
                fechaCalculo: new Date(),
                datosBase: {
                    totalObligaciones: resumenBuro.total_obligaciones,
                    saldoTotal: resumenBuro.saldo_total_actual,
                    mesesHistorial: resumenBuro.meses_historial_crediticio
                }
            }

        } catch (error) {
            console.error('Error al calcular scoring:', error)
            throw new Error('No se pudo calcular el scoring crediticio')
        }
    }

     //Evalúa: Atrasos, pagos tardíos, consistencia 
    static _calcularHistorialPagos(resumen) {
        const maxPuntos = 350
        let puntos = maxPuntos
        const factores = { positivos: [], negativos: [] }

        if (resumen.max_dias_atraso === 0) {
            factores.positivos.push('Sin atrasos registrados')
        } else if (resumen.max_dias_atraso <= 30) {
            puntos -= 50
            factores.negativos.push(`Atraso máximo de ${resumen.max_dias_atraso} días`)
        } else if (resumen.max_dias_atraso <= 60) {
            puntos -= 100
            factores.negativos.push(`Atraso significativo de ${resumen.max_dias_atraso} días`)
        } else if (resumen.max_dias_atraso <= 90) {
            puntos -= 150
            factores.negativos.push(`Atraso grave de ${resumen.max_dias_atraso} días`)
        } else {
            puntos -= 250
            factores.negativos.push(`Atraso crítico de ${resumen.max_dias_atraso} días`)
        }

        if (resumen.total_pagos_atrasados === 0) {
            factores.positivos.push('Todos los pagos al día')
        } else if (resumen.total_pagos_atrasados <= 2) {
            puntos -= 30
            factores.negativos.push(`${resumen.total_pagos_atrasados} pagos atrasados`)
        } else if (resumen.total_pagos_atrasados <= 5) {
            puntos -= 60
            factores.negativos.push(`${resumen.total_pagos_atrasados} pagos atrasados`)
        } else {
            puntos -= 100
            factores.negativos.push(`${resumen.total_pagos_atrasados} pagos atrasados (alto)`)
        }

        if (resumen.obligaciones_vencidas > 0) {
            puntos -= resumen.obligaciones_vencidas * 40
            factores.negativos.push(`${resumen.obligaciones_vencidas} obligación(es) vencida(s)`)
        }

        if (resumen.obligaciones_cartera_vencida > 0) {
            puntos -= resumen.obligaciones_cartera_vencida * 50
            factores.negativos.push(`${resumen.obligaciones_cartera_vencida} en cartera vencida`)
        }

        return {
            puntos: Math.max(0, puntos),
            porcentaje: ((Math.max(0, puntos) / maxPuntos) * 100).toFixed(1),
            ...factores
        }
    }

    /**
     * Nivel de Endeudamiento
     * Evalúa: Utilización de crédito, saldo total, monto vencido
     */
    static _calcularNivelEndeudamiento(resumen, detallesObligaciones) {
        const maxPuntos = 300
        let puntos = maxPuntos
        const factores = { positivos: [], negativos: [] }

        const obligacionesConLimite = detallesObligaciones.filter(o => o.limite_credito > 0)
        if (obligacionesConLimite.length > 0) {
            const utilizacionPromedio = obligacionesConLimite.reduce((sum, o) => {
                return sum + (Number(o.saldo_actual) / Number(o.limite_credito))
            }, 0) / obligacionesConLimite.length

            if (utilizacionPromedio <= 0.30) {
                factores.positivos.push('Utilización de crédito baja (≤30%)')
            } else if (utilizacionPromedio <= 0.50) {
                puntos -= 50
                factores.negativos.push('Utilización de crédito moderada (30-50%)')
            } else if (utilizacionPromedio <= 0.75) {
                puntos -= 100
                factores.negativos.push('Utilización de crédito alta (50-75%)')
            } else {
                puntos -= 150
                factores.negativos.push('Utilización de crédito muy alta (>75%)')
            }
        }

        const ratioVencido = Number(resumen.monto_total_vencido) / Number(resumen.saldo_total_actual)
        if (ratioVencido === 0) {
            factores.positivos.push('Sin montos vencidos')
        } else if (ratioVencido <= 0.05) {
            puntos -= 30
        } else if (ratioVencido <= 0.15) {
            puntos -= 70
            factores.negativos.push('Monto vencido moderado (5-15% del saldo)')
        } else {
            puntos -= 120
            factores.negativos.push('Monto vencido alto (>15% del saldo)')
        }

        const saldoTotal = Number(resumen.saldo_total_actual)
        if (saldoTotal > 1000000) {
            puntos -= 30
            factores.negativos.push('Nivel de deuda alto (>$1,000,000)')
        } else if (saldoTotal > 500000) {
            factores.positivos.push('Nivel de deuda moderado')
        } else if (saldoTotal > 0) {
            factores.positivos.push('Nivel de deuda bajo')
        }

        return {
            puntos: Math.max(0, puntos),
            porcentaje: ((Math.max(0, puntos) / maxPuntos) * 100).toFixed(1),
            ...factores
        }
    }

    /**
     * Antigüedad Crediticia 
     * Evalúa: Meses de historial, crédito más antiguo
     */
    static _calcularAntiguedadCrediticia(resumen) {
        const maxPuntos = 150
        let puntos = 0
        const factores = { positivos: [], negativos: [] }

        const mesesHistorial = resumen.meses_historial_crediticio || 0

        if (mesesHistorial >= 60) { // 5+ años
            puntos = 150
            factores.positivos.push('Historial crediticio extenso (>5 años)')
        } else if (mesesHistorial >= 36) { // 3-5 años
            puntos = 120
            factores.positivos.push('Historial crediticio sólido (3-5 años)')
        } else if (mesesHistorial >= 24) { // 2-3 años
            puntos = 90
            factores.positivos.push('Historial crediticio moderado (2-3 años)')
        } else if (mesesHistorial >= 12) { // 1-2 años
            puntos = 60
            factores.negativos.push('Historial crediticio limitado (1-2 años)')
        } else if (mesesHistorial > 0) {
            puntos = 30
            factores.negativos.push('Historial crediticio muy reciente (<1 año)')
        } else {
            puntos = 0
            factores.negativos.push('Sin historial crediticio')
        }

        return {
            puntos,
            porcentaje: ((puntos / maxPuntos) * 100).toFixed(1),
            ...factores
        }
    }

    /**
     * Mix Crediticio
     * Evalúa: Diversificación de tipos de crédito
     */
    static _calcularMixCrediticio(detallesObligaciones) {
        const maxPuntos = 100
        let puntos = 0
        const factores = { positivos: [], negativos: [] }

        const tiposCredito = new Set(detallesObligaciones.map(o => o.tipo_credito))
        const numTipos = tiposCredito.size

        if (numTipos >= 4) {
            puntos = 100
            factores.positivos.push('Excelente diversificación de créditos')
        } else if (numTipos === 3) {
            puntos = 75
            factores.positivos.push('Buena diversificación de créditos')
        } else if (numTipos === 2) {
            puntos = 50
            factores.positivos.push('Diversificación moderada de créditos')
        } else if (numTipos === 1) {
            puntos = 25
            factores.negativos.push('Poca diversificación de créditos')
        } else {
            puntos = 0
            factores.negativos.push('Sin diversificación de créditos')
        }

        if (detallesObligaciones.obligaciones_cerradas > 0) {
            const bonus = Math.min(25, detallesObligaciones.obligaciones_cerradas * 5)
            puntos = Math.min(maxPuntos, puntos + bonus)
            factores.positivos.push(`${detallesObligaciones.obligaciones_cerradas} crédito(s) cerrado(s) exitosamente`)
        }

        return {
            puntos,
            porcentaje: ((puntos / maxPuntos) * 100).toFixed(1),
            tiposCredito: Array.from(tiposCredito),
            ...factores
        }
    }

    /**
     * Comportamiento Reciente
     * Evalúa: Obligaciones nuevas, pagos pendientes
     */
    static _calcularComportamientoReciente(resumen, pagosPendientes) {
        const maxPuntos = 100
        let puntos = maxPuntos
        const factores = { positivos: [], negativos: [] }

        const pagosMuyAtrasados = pagosPendientes.filter(p => p.dias_atraso_calculado > 30)
        if (pagosMuyAtrasados.length === 0) {
            factores.positivos.push('Sin pagos pendientes atrasados')
        } else if (pagosMuyAtrasados.length <= 2) {
            puntos -= 30
            factores.negativos.push(`${pagosMuyAtrasados.length} pago(s) muy atrasado(s)`)
        } else {
            puntos -= 60
            factores.negativos.push(`${pagosMuyAtrasados.length} pagos muy atrasados (crítico)`)
        }

        if (resumen.obligaciones_reestructuradas > 0) {
            puntos -= resumen.obligaciones_reestructuradas * 20
            factores.negativos.push(`${resumen.obligaciones_reestructuradas} obligación(es) reestructurada(s)`)
        }

        const ratioVigentes = resumen.obligaciones_vigentes / (resumen.total_obligaciones || 1)
        if (ratioVigentes >= 0.8) {
            factores.positivos.push('Mayoría de obligaciones vigentes y saludables')
        }

        return {
            puntos: Math.max(0, puntos),
            porcentaje: ((Math.max(0, puntos) / maxPuntos) * 100).toFixed(1),
            ...factores
        }
    }


    static _determinarNivelRiesgo(scoreTotal) {
        for (const [nivel, rango] of Object.entries(this.NIVELES_RIESGO)) {
            if (scoreTotal >= rango.min && scoreTotal <= rango.max) {
                return {
                    nivel,
                    descripcion: this._obtenerDescripcionNivel(nivel),
                    color: rango.color,
                    rango: `${rango.min}-${rango.max}`
                }
            }
        }
        return {
            nivel: 'MUY_MALO',
            descripcion: 'Alto riesgo crediticio',
            color: '#DC2626',
            rango: '0-399'
        }
    }


    static _obtenerDescripcionNivel(nivel) {
        const descripciones = {
            EXCELENTE: 'Riesgo crediticio mínimo - Excelente perfil',
            MUY_BUENO: 'Riesgo crediticio bajo - Muy buen perfil',
            BUENO: 'Riesgo crediticio moderado bajo - Buen perfil',
            REGULAR: 'Riesgo crediticio moderado - Perfil promedio',
            MALO: 'Riesgo crediticio alto - Perfil con problemas',
            MUY_MALO: 'Riesgo crediticio muy alto - Perfil crítico'
        }
        return descripciones[nivel] || 'Nivel de riesgo no determinado'
    }


    static _generarRecomendaciones(analisis) {
        const recomendaciones = []

        if (analisis.historialPagos.puntos < 250) {
            recomendaciones.push({
                prioridad: 'ALTA',
                categoria: 'HISTORIAL_PAGOS',
                titulo: 'Mejorar historial de pagos',
                descripcion: 'Realice todos los pagos a tiempo para recuperar su score',
                impacto: '+100 puntos'
            })
        }

        if (analisis.nivelEndeudamiento.puntos < 200) {
            recomendaciones.push({
                prioridad: 'ALTA',
                categoria: 'ENDEUDAMIENTO',
                titulo: 'Reducir nivel de endeudamiento',
                descripcion: 'Reduzca el saldo de sus tarjetas por debajo del 30% del límite',
                impacto: '+80 puntos'
            })
        }

        if (analisis.antiguedadCrediticia.puntos < 60) {
            recomendaciones.push({
                prioridad: 'MEDIA',
                categoria: 'ANTIGUEDAD',
                titulo: 'Construir historial crediticio',
                descripcion: 'Mantenga cuentas antiguas abiertas para aumentar su antigüedad',
                impacto: '+30 puntos'
            })
        }

        if (analisis.comportamientoReciente.puntos < 70) {
            recomendaciones.push({
                prioridad: 'ALTA',
                categoria: 'COMPORTAMIENTO',
                titulo: 'Atender pagos pendientes',
                descripcion: 'Ponga al día los pagos atrasados inmediatamente',
                impacto: '+50 puntos'
            })
        }

        if (analisis.scoreTotal >= 700) {
            recomendaciones.push({
                prioridad: 'BAJA',
                categoria: 'MANTENIMIENTO',
                titulo: 'Mantener buen comportamiento',
                descripcion: 'Continue con sus hábitos financieros saludables',
                impacto: 'Estabilidad'
            })
        }

        return recomendaciones
    }


    static _consolidarFactoresPositivos(componentes) {
        const factores = []
        Object.values(componentes).forEach(componente => {
            if (componente.positivos) {
                factores.push(...componente.positivos)
            }
        })
        return factores
    }

    static _consolidarFactoresNegativos(componentes) {
        const factores = []
        Object.values(componentes).forEach(componente => {
            if (componente.negativos) {
                factores.push(...componente.negativos)
            }
        })
        return factores
    }


    static async guardarEnHistorial(idEntidad, scoring) {
        return await prisma.historialScore.create({
            data: {
                idEntidad: idEntidad,
                puntajeScore: scoring.scoreTotal,
                nivelRiesgo: scoring.nivelRiesgo.nivel,
                factoresPositivos: JSON.stringify(scoring.factoresPositivos),
                factoresNegativos: JSON.stringify(scoring.factoresNegativos)
            }
        })
    }
}