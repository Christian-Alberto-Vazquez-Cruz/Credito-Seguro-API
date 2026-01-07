import { prisma } from '../lib/db.js'
import { CirculoCreditoService } from './CirculoCredito.Service.js'

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

    static async calcularScoring(rfc) {
        try {
            const [resumenBuro, detallesObligaciones, pagosPendientes] = await Promise.all([
                CirculoCreditoService.obtenerResumenBuro(rfc),
                CirculoCreditoService.obtenerDetallesObligaciones(rfc),
                CirculoCreditoService.obtenerPagosPendientes(rfc)
            ])

            if (!resumenBuro) {
                throw new Error('No se encontró información crediticia para el RFC proporcionado')
            }

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
                    totalObligaciones: resumenBuro.total_obligaciones || 0,
                    saldoTotal: Number(resumenBuro.saldo_total_actual) || 0,
                    mesesHistorial: resumenBuro.meses_historial_crediticio || 0
                }
            }

        } catch (error) {
            if (error.response?.status === 404 || error.message?.includes('404')) {
                return {
                    scoreTotal: 0,
                    nivelRiesgo: {
                        nivel: "SIN_HISTORIAL",
                        descripcion: "Sin historial crediticio registrado",
                        color: "#6B7280",
                        rango: "0"
                    },
                    componentes: {
                        historialPagos: { puntos: 0, porcentaje: "0.0", positivos: [], negativos: ["Sin historial de pagos"] },
                        nivelEndeudamiento: { puntos: 0, porcentaje: "0.0", positivos: [], negativos: ["Sin datos de endeudamiento"] },
                        antiguedadCrediticia: { puntos: 0, porcentaje: "0.0", positivos: [], negativos: ["Sin antigüedad crediticia"] },
                        mixCrediticio: { puntos: 0, porcentaje: "0.0", tiposCredito: [], positivos: [], negativos: ["Sin diversificación"] },
                        comportamientoReciente: { puntos: 0, porcentaje: "0.0", positivos: [], negativos: ["Sin comportamiento reciente"] }
                    },
                    factoresPositivos: ["Sin obligaciones pendientes"],
                    factoresNegativos: ["Sin historial crediticio registrado"],
                    recomendaciones: [{
                        prioridad: "ALTA",
                        categoria: "CONSTRUCCION",
                        titulo: "Construir historial crediticio",
                        descripcion: "Considere solicitar un producto crediticio para comenzar a construir su historial",
                        impacto: "Fundamental para futuras solicitudes"
                    }],
                    fechaCalculo: new Date(),
                    datosBase: { totalObligaciones: 0, saldoTotal: 0, mesesHistorial: 0 },
                    sinHistorial: true
                };
            }
            throw new Error(`No se pudo calcular el scoring crediticio: ${error.message}`)
        }
    }

    static _calcularHistorialPagos(resumen) {
        const maxPuntos = 350
        let puntos = maxPuntos
        const factores = { positivos: [], negativos: [] }

        const maxDiasAtraso = resumen.max_dias_atraso || 0
        const totalPagosAtrasados = resumen.total_pagos_atrasados || 0
        const obligacionesVencidas = resumen.obligaciones_vencidas || 0
        const obligacionesCarteraVencida = resumen.obligaciones_cartera_vencida || 0

        if (maxDiasAtraso === 0) {
            factores.positivos.push('Sin atrasos registrados')
        } else if (maxDiasAtraso <= 30) {
            puntos -= 50
            factores.negativos.push(`Atraso máximo de ${maxDiasAtraso} días`)
        } else if (maxDiasAtraso <= 60) {
            puntos -= 100
            factores.negativos.push(`Atraso significativo de ${maxDiasAtraso} días`)
        } else if (maxDiasAtraso <= 90) {
            puntos -= 150
            factores.negativos.push(`Atraso grave de ${maxDiasAtraso} días`)
        } else {
            puntos -= 250
            factores.negativos.push(`Atraso crítico de ${maxDiasAtraso} días`)
        }

        if (totalPagosAtrasados === 0) {
            factores.positivos.push('Todos los pagos al día')
        } else if (totalPagosAtrasados <= 2) {
            puntos -= 30
            factores.negativos.push(`${totalPagosAtrasados} pagos atrasados`)
        } else if (totalPagosAtrasados <= 5) {
            puntos -= 60
            factores.negativos.push(`${totalPagosAtrasados} pagos atrasados`)
        } else {
            puntos -= 100
            factores.negativos.push(`${totalPagosAtrasados} pagos atrasados (alto)`)
        }

        if (obligacionesVencidas > 0) {
            puntos -= obligacionesVencidas * 40
            factores.negativos.push(`${obligacionesVencidas} obligación(es) vencida(s)`)
        }

        if (obligacionesCarteraVencida > 0) {
            puntos -= obligacionesCarteraVencida * 50
            factores.negativos.push(`${obligacionesCarteraVencida} en cartera vencida`)
        }

        return {
            puntos: Math.max(0, puntos),
            porcentaje: ((Math.max(0, puntos) / maxPuntos) * 100).toFixed(1),
            ...factores
        }
    }

    static _calcularNivelEndeudamiento(resumen, detallesObligaciones) {
        const maxPuntos = 300
        let puntos = maxPuntos
        const factores = { positivos: [], negativos: [] }

        const obligaciones = Array.isArray(detallesObligaciones) ? detallesObligaciones : []

        const obligacionesConLimite = obligaciones.filter(o => 
            o.limite_credito !== null && Number(o.limite_credito) > 0
        )

        if (obligacionesConLimite.length > 0) {
            const utilizacionPromedio = obligacionesConLimite.reduce((sum, o) => {
                const saldo = Number(o.saldo_actual) || 0
                const limite = Number(o.limite_credito) || 1
                return sum + (saldo / limite)
            }, 0) / obligacionesConLimite.length

            const porcentaje = (utilizacionPromedio * 100).toFixed(0)

            if (utilizacionPromedio <= 0.30) {
                factores.positivos.push(`Utilización de crédito baja (${porcentaje}%)`)
            } else if (utilizacionPromedio <= 0.50) {
                puntos -= 50
                factores.negativos.push(`Utilización de crédito moderada (${porcentaje}%)`)
            } else if (utilizacionPromedio <= 0.75) {
                puntos -= 100
                factores.negativos.push(`Utilización de crédito alta (${porcentaje}%)`)
            } else {
                puntos -= 150
                factores.negativos.push(`Utilización de crédito muy alta (${porcentaje}%)`)
            }
        }

        const saldoTotal = Number(resumen.saldo_total_actual) || 0
        const montoVencido = Number(resumen.monto_total_vencido) || 0
        
        if (saldoTotal > 0) {
            const ratioVencido = montoVencido / saldoTotal
            
            if (ratioVencido === 0) {
                factores.positivos.push('Sin montos vencidos')
            } else if (ratioVencido <= 0.05) {
                puntos -= 30
                factores.negativos.push('Monto vencido bajo (<5% del saldo)')
            } else if (ratioVencido <= 0.15) {
                puntos -= 70
                factores.negativos.push('Monto vencido moderado (5-15% del saldo)')
            } else {
                puntos -= 120
                factores.negativos.push('Monto vencido alto (>15% del saldo)')
            }
        }

        if (saldoTotal > 1000000) {
            puntos -= 30
            factores.negativos.push(`Nivel de deuda alto (${(saldoTotal / 1000000).toFixed(2)}M)`)
        } else if (saldoTotal > 500000) {
            factores.positivos.push(`Nivel de deuda moderado (${(saldoTotal / 1000).toFixed(0)}K)`)
        } else if (saldoTotal > 0) {
            factores.positivos.push(`Nivel de deuda bajo (${(saldoTotal / 1000).toFixed(0)}K)`)
        }

        return {
            puntos: Math.max(0, puntos),
            porcentaje: ((Math.max(0, puntos) / maxPuntos) * 100).toFixed(1),
            ...factores
        }
    }

    static _calcularAntiguedadCrediticia(resumen) {
        const maxPuntos = 150
        let puntos = 0
        const factores = { positivos: [], negativos: [] }

        const mesesHistorial = resumen.meses_historial_crediticio || 0

        if (mesesHistorial >= 60) {
            puntos = 150
            factores.positivos.push('Historial crediticio extenso (>5 años)')
        } else if (mesesHistorial >= 36) {
            puntos = 120
            factores.positivos.push('Historial crediticio sólido (3-5 años)')
        } else if (mesesHistorial >= 24) {
            puntos = 90
            factores.positivos.push('Historial crediticio moderado (2-3 años)')
        } else if (mesesHistorial >= 12) {
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

    static _calcularMixCrediticio(detallesObligaciones) {
        const maxPuntos = 100
        let puntos = 0
        const factores = { positivos: [], negativos: [] }

        const obligaciones = Array.isArray(detallesObligaciones) ? detallesObligaciones : []

        const tiposCredito = new Set(obligaciones.map(o => o.tipo_credito))
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

        const obligacionesCerradas = obligaciones.filter(o => 
            o.estatus_credito === 'CERRADO'
        ).length

        if (obligacionesCerradas > 0) {
            const bonus = Math.min(25, obligacionesCerradas * 5)
            puntos = Math.min(maxPuntos, puntos + bonus)
            factores.positivos.push(`${obligacionesCerradas} crédito(s) cerrado(s) exitosamente`)
        }

        return {
            puntos,
            porcentaje: ((puntos / maxPuntos) * 100).toFixed(1),
            tiposCredito: Array.from(tiposCredito),
            ...factores
        }
    }

    static _calcularComportamientoReciente(resumen, pagosPendientes) {
        const maxPuntos = 100
        let puntos = maxPuntos
        const factores = { positivos: [], negativos: [] }

        const pagos = Array.isArray(pagosPendientes) ? pagosPendientes : []

        const pagosMuyAtrasados = pagos.filter(p => 
            (p.dias_atraso_calculado || 0) > 30
        )

        if (pagosMuyAtrasados.length === 0) {
            factores.positivos.push('Sin pagos pendientes atrasados')
        } else if (pagosMuyAtrasados.length <= 2) {
            puntos -= 30
            factores.negativos.push(`${pagosMuyAtrasados.length} pago(s) muy atrasado(s)`)
        } else {
            puntos -= 60
            factores.negativos.push(`${pagosMuyAtrasados.length} pagos muy atrasados (crítico)`)
        }

        const obligacionesReestructuradas = resumen.obligaciones_reestructuradas || 0
        if (obligacionesReestructuradas > 0) {
            puntos -= obligacionesReestructuradas * 20
            factores.negativos.push(`${obligacionesReestructuradas} obligación(es) reestructurada(s)`)
        }

        const obligacionesVigentes = resumen.obligaciones_vigentes || 0
        const totalObligaciones = resumen.total_obligaciones || 1
        const ratioVigentes = obligacionesVigentes / totalObligaciones

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