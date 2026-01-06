import {prisma} from '../lib/db.js'
import { obtenerInicioMesActual } from '../utilities/Fechas.js'

export class ConsumoService {
    /**
     * Verifica si la entidad puede realizar más consultas este mes
     * @param {number} idEntidad 
     * @param {number} maxConsultasMensuales 
     * @returns {Promise<{permitido: boolean, consultasRealizadas: number, consultasDisponibles: number}>}
     */
    static async verificarLimiteConsultas(idEntidad, maxConsultasMensuales) {
        const periodoInicio = obtenerInicioMesActual()

        const consumo = await prisma.consumoEntidad.findUnique({
            where: {
                idEntidad_periodoInicio: {
                    idEntidad: idEntidad,
                    periodoInicio: periodoInicio
                }
            }
        })

        const consultasRealizadas = consumo?.consultasRealizadas || 0
        const consultasDisponibles = maxConsultasMensuales - consultasRealizadas

        return {
            permitido: consultasRealizadas < maxConsultasMensuales,
            consultasRealizadas,
            consultasDisponibles
        }
    }

    /**
     * Registra una nueva consulta en el periodo actual
     * @param {number} idEntidad 
     */
    static async registrarConsulta(idEntidad) {
        const ahora = new Date()
        const periodoInicio = obtenerInicioMesActual()

        const consumo = await prisma.consumoEntidad.findUnique({
            where: {
                idEntidad_periodoInicio: {
                    idEntidad,
                    periodoInicio
                }
            }
        })

        if (consumo) {
            console.log("Consumo existente:", consumo)
        } else {
            console.log("No se ha encontrado el consumo")
        }

        await prisma.consumoEntidad.upsert({
            where: {
                idEntidad_periodoInicio: {
                    idEntidad: idEntidad,
                    periodoInicio: periodoInicio
                }
            },
            create: {
                idEntidad: idEntidad,
                periodoInicio: periodoInicio,
                consultasRealizadas: 1,
                ultimaActualizacion: ahora
            },
            update: {
                consultasRealizadas: { increment: 1 },
                ultimaActualizacion: ahora
            }
        })
    }
}
