import {prisma} from '../lib/db.js'

export class LogService {
    /**
     * Registra una consulta en los logs
     * @param {Object} params 
     */
    static async registrarLog(params) {
        const {
            idConsentimiento,
            idEntidadTitular,
            idEntidadConsultante,
            idUsuarioOperador,
            entidadConsultante,
            tipoConsulta,
            resultadoConsulta,
            ipOrigen
        } = params

        await prisma.logConsultaTerceros.create({
            data: {
                idConsentimiento: idConsentimiento || 0,
                idEntidadTitular,
                idEntidadConsultante,
                idUsuarioOperador,
                entidadConsultante,
                tipoConsulta,
                resultadoConsulta,
                ipOrigen
            }
        })

        if (idConsentimiento && resultadoConsulta === 'EXITOSO') {
            await prisma.consentimientoConsulta.update({
                where: { id: idConsentimiento },
                data: {
                    numeroConsultasRealizadas: { increment: 1 },
                    fechaUltimaConsulta: new Date()
                }
            })
        }
    }
}