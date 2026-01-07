import { prisma } from '../lib/db.js'
import { crearEntidadSchema, consultarEntidadSchema, 
    gestionarEstadoEntidadSchema } from '../schemas/Entidad.Schema.js'
import {  MENSAJE_ERROR_GENERICO} from '../utilities/constants/Constantes.js'
import { ENTIDAD_NO_ENCONTRADA, RFC_YA_REGISTRADO, ENTIDAD_YA_ACTIVA,
    ENTIDAD_YA_INACTIVA
} from '../utilities/constants/Usuarios.js'

import { manejarErrorZod, responderConError, responderConExito } from '../utilities/Manejadores.js'

export class EntidadesController {
    

   static async crearEntidad(req, res) {
        try {
            const resultadoValidacion = crearEntidadSchema.safeParse(req.body)
            
            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion);
            }
            
            const datos = resultadoValidacion.data
            
            const rfcExistente = await prisma.entidad.findUnique({
                where: { rfc: datos.rfc }
            })
            
            if (rfcExistente) {
                return responderConError(res, 409, RFC_YA_REGISTRADO)
            }
            
            const planRegular = await prisma.planSuscripcion.findUnique({
                where: { tipoPlan: 'REGULAR' }
            })
            
            if (!planRegular) {
                return responderConError(res, 500, 'Plan REGULAR no configurado en el sistema')
            }
            
            const nuevaEntidad = await prisma.entidad.create({
                data: {
                    idPlan: planRegular.id,
                    tipoEntidad: datos.tipoEntidad,
                    nombreLegal: datos.nombreLegal,
                    rfc: datos.rfc
                }
            })
            
            return responderConExito(res, 201, 'Entidad creada exitosamente', {
                entidad: {
                    id: nuevaEntidad.id,
                    nombreLegal: nuevaEntidad.nombreLegal,
                    rfc: nuevaEntidad.rfc,
                    tipoEntidad: nuevaEntidad.tipoEntidad,
                    activo: nuevaEntidad.activo,
                    fechaAlta: nuevaEntidad.fechaAlta
                }
            })
            
        } catch (error) {
            console.error('Error al crear entidad:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }
    
    static async consultarEntidad(req, res) {
        try {
            const resultadoValidacion = consultarEntidadSchema.safeParse(req.params)
            
            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion);
            }
            
            const { id: idEntidad } = resultadoValidacion.data
            
            const entidad = await prisma.entidad.findUnique({
                where: { id: idEntidad }
            })
            
            if (!entidad) {
                return responderConError(res, 404, ENTIDAD_NO_ENCONTRADA)
            }
            
            return responderConExito(res, 200, 'Entidad encontrada', {
                entidad: {
                    id: entidad.id,
                    nombreLegal: entidad.nombreLegal,
                    rfc: entidad.rfc,
                    tipoEntidad: entidad.tipoEntidad,
                    activo: entidad.activo,
                    fechaAlta: entidad.fechaAlta
                }
            })
            
        } catch (error) {
            console.error('Error al consultar entidad:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }
    

    static async desactivarEntidad(req, res) {
        try {
            const resultadoValidacion = gestionarEstadoEntidadSchema.safeParse(req.body)
            
            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion);
            }
            
            const { id: idEntidad } = resultadoValidacion.data
            
            const entidadExistente = await prisma.entidad.findUnique({
                where: { id: idEntidad },
                include: {
                    Usuario: {
                        where: { activo: true }
                    }
                }
            })
            
            if (!entidadExistente) {
                return responderConError(res, 404, ENTIDAD_NO_ENCONTRADA)
            }
            
            if (!entidadExistente.activo) {
                return responderConError(res, 400, ENTIDAD_YA_INACTIVA)
            }
            
            await prisma.entidad.update({
                where: { id: idEntidad },
                data: { activo: false }
            })
            
            return responderConExito(res, 200, 'Entidad desactivada exitosamente', {
                id: idEntidad,
                nombreLegal: entidadExistente.nombreLegal,
                usuariosAfectados: entidadExistente.Usuario.length,
                mensaje: entidadExistente.Usuario.length > 0 
                    ? `Los ${entidadExistente.Usuario.length} usuario(s) activo(s) no podrán iniciar sesión hasta que se reactive la entidad`
                    : 'No hay usuarios activos asociados a esta entidad'
            })
            
        } catch (error) {
            console.error('Error al desactivar entidad:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }
    

    static async reactivarEntidad(req, res) {
        try {
            const resultadoValidacion = gestionarEstadoEntidadSchema.safeParse(req.body)
            
            if (!resultadoValidacion.success) {
                return manejarErrorZod(res, resultadoValidacion);
            }
            
            const { id: idEntidad } = resultadoValidacion.data
            
            const entidadExistente = await prisma.entidad.findUnique({
                where: { id: idEntidad },
                include: {
                    Usuario: {
                        where: { activo: true }
                    }
                }
            })
            
            if (!entidadExistente) {
                return responderConError(res, 404, ENTIDAD_NO_ENCONTRADA)
            }
            
            if (entidadExistente.activo) {
                return responderConError(res, 400, ENTIDAD_YA_ACTIVA)
            }
            
            await prisma.entidad.update({
                where: { id: idEntidad },
                data: { activo: true }
            })
            
            return responderConExito(res, 200, 'Entidad reactivada exitosamente', {
                id: idEntidad,
                nombreLegal: entidadExistente.nombreLegal,
                usuariosActivos: entidadExistente.Usuario.length,
                mensaje: entidadExistente.Usuario.length > 0
                    ? `Los ${entidadExistente.Usuario.length} usuario(s) activo(s) podrán iniciar sesión nuevamente`
                    : 'Entidad reactivada. Puede agregar usuarios a esta entidad'
            })
            
        } catch (error) {
            console.error('Error al reactivar entidad:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

        static async listarEntidades(req, res) {
    try {
        const { activo, tipoEntidad } = req.query

        const where = {}
        if (activo === 'true') where.activo = true
        if (activo === 'false') where.activo = false
        if (tipoEntidad) where.tipoEntidad = tipoEntidad

        const entidades = await prisma.entidad.findMany({
        where,
        orderBy: { fechaAlta: 'desc' },
        select: {
            id: true,
            nombreLegal: true,
            rfc: true,
            tipoEntidad: true,
            activo: true,
            fechaAlta: true,
            PlanSuscripcion: {
            select: {
                tipoPlan: true,
                maxConsultasMensuales: true
            }
            },
            _count: {
            select: { Usuario: true }
            }
        }
        })

        return responderConExito(res, 200, 'Entidades obtenidas', {
        total: entidades.length,
        entidades: entidades.map(e => ({
            id: e.id,
            nombreLegal: e.nombreLegal,
            rfc: e.rfc,
            tipoEntidad: e.tipoEntidad,
            activo: e.activo,
            fechaAlta: e.fechaAlta,
            plan: e.PlanSuscripcion?.tipoPlan,
            maxConsultasMensuales: e.PlanSuscripcion?.maxConsultasMensuales,
            totalUsuarios: e._count.Usuario
        }))
        })
        } catch (error) {
            console.error('Error al listar entidades:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

        static async buscarEntidades(req, res) {
    try {
        const { q } = req.query

        if (!q) {
        return responderConError(res, 400, 'Parámetro q requerido')
        }

        const entidades = await prisma.entidad.findMany({
        where: {
            OR: [
            { nombreLegal: { contains: q, mode: 'insensitive' } },
            { rfc: { contains: q, mode: 'insensitive' } }
            ]
        },
        orderBy: { nombreLegal: 'asc' },
        select: {
            id: true,
            nombreLegal: true,
            rfc: true,
            tipoEntidad: true,
            activo: true,
            fechaAlta: true
        }
        })

        return responderConExito(res, 200, 'Resultados de búsqueda', {
        total: entidades.length,
        entidades
        })
    } catch (error) {
        console.error('Error al buscar entidades:', error)
        return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
    }
    }


}