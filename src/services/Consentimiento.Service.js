import {prisma} from '../lib/db.js'

export class ConsentimientoService {
    /**
     * Verifica si una entidad puede consultar información de otra entidad
     * @param {number} idEntidadConsultante - ID de quien consulta
     * @param {number} idEntidadTitular - ID de quien es consultado
     * @returns {Promise<{permitido: boolean, motivo?: string, esConsultaPropia: boolean}>}
     */
    static async verificarPermisoConsulta(idEntidadConsultante, idEntidadTitular) {
        // Consulta propia (misma entidad)
        if (idEntidadConsultante === idEntidadTitular) {
            const consentimientoEntidad = await prisma.consentimientoEntidad.findFirst({
                where: {
                    idEntidad: idEntidadTitular,
                    revocado: false,
                    fechaInicio: { lte: new Date() },
                    fechaVencimiento: { gte: new Date() }
                }
            })

            if (!consentimientoEntidad) {
                return {
                    permitido: false,
                    motivo: 'La entidad no tiene consentimiento activo para consultar su propia información',
                    esConsultaPropia: true
                }
            }

            return {
                permitido: true,
                esConsultaPropia: true
            }
        }

        // Consulta a terceros
        const consentimientoEntidadTitular = await prisma.consentimientoEntidad.findFirst({
            where: {
                idEntidad: idEntidadTitular,
                revocado: false,
                fechaInicio: { lte: new Date() },
                fechaVencimiento: { gte: new Date() }
            }
        })

        if (!consentimientoEntidadTitular) {
            return {
                permitido: false,
                motivo: 'La entidad consultada no tiene consentimiento activo para compartir su información',
                esConsultaPropia: false
            }
        }

        const consentimientoConsulta = await prisma.consentimientoConsulta.findFirst({
            where: {
                idEntidadTitular: idEntidadTitular,
                idEntidadConsultante: idEntidadConsultante,
                revocado: false,
                fechaInicio: { lte: new Date() },
                fechaVencimiento: { gte: new Date() }
            }
        })

        if (!consentimientoConsulta) {
            return {
                permitido: false,
                motivo: 'No existe consentimiento de consulta entre las entidades o ha expirado',
                esConsultaPropia: false
            }
        }

        return {
            permitido: true,
            esConsultaPropia: false,
            consentimientoId: consentimientoConsulta.id
        }
    }
}
