import {prisma} from '../lib/db.js'
import { crearUsuarioSchema } from '../schemas/Usuarios.Schema.js'
import { ENTRADA_INVALIDA, MENSAJE_ERROR_GENERICO, RFC_YA_REGISTRADO,
   CORREO_YA_REGISTRADO, ENTIDAD_NO_ENCONTRADA, ROL_NO_ENCONTRADO, 
   PLAN_NO_ENCONTRADO
 } from '../utilities/Constantes.js'

export class UsuariosController {
    static async crearUsuario(req, res) {
        try {
            const [rolUsuario, planRegular] = await Promise.all([
               prisma.rol.findUnique({ where: { nombreRol: 'USUARIO' } }),
               prisma.planSuscripcion.findUnique({ where: { tipoPlan: 'REGULAR' } })
            ])

            if (!rolUsuario) {
            return responderConError(res, 500, 'Rol USUARIO no configurado')
            }

            if (!planRegular) {
            return responderConError(res, 500, 'Plan REGULAR no configurado')
            }

            const resultadoValidacion = crearUsuarioSchema.safeParse(req.body)
            
            if (!resultadoValidacion.success) {
                return responderConError(res, 400, ENTRADA_INVALIDA, {
                    errores: resultadoValidacion.error.errors.map(err => ({
                        campo: err.path.join('.'),
                        mensaje: err.message
                    }))
                })
            }
            
            const datos = resultadoValidacion.data
            
            const correoExistente = await prisma.usuario.findUnique({
                where: { correo: datos.correo }
            })
            
            if (correoExistente) {
                return responderConError(res, 409, CORREO_YA_REGISTRADO)
            }
                        
            // PERSONA FÍSICA: Crear nueva entidad
            if (datos.tipoEntidad === 'FISICA') {
                const rfcExistente = await prisma.entidad.findUnique({
                    where: { rfc: datos.rfc }
                })
                
                if (rfcExistente) {
                    return responderConError(res, 409, RFC_YA_REGISTRADO)
                }
                
                const resultado = await prisma.$transaction(async (tx) => {
                    const nuevaEntidad = await tx.entidad.create({
                        data: {
                            idPlan: planRegular.id,
                            tipoEntidad: datos.tipoEntidad,
                            nombreLegal: datos.nombreLegal,
                            rfc: datos.rfc
                        }
                    })
                    
                    const contraseniaHash = await hashearContraseñaBCrypt(datos.contraseña)
                    
                    const nuevoUsuario = await tx.usuario.create({
                        data: {
                            idEntidad: nuevaEntidad.id,
                            idRol: rolUsuario.id,
                            nombre: datos.nombre,
                            correo: datos.correo,
                            contraseniaHash: contraseniaHash
                        },
                        include: {
                            Entidad: {
                                include: {
                                    PlanSuscripcion: true
                                }
                            },
                            Rol: true
                        }
                    })
                    
                    return { usuario: nuevoUsuario, entidad: nuevaEntidad }
                })
                
                return responderConExito(res, 201, 'Usuario y entidad creados exitosamente', {
                    usuario: {
                        id: resultado.usuario.id,
                        nombre: resultado.usuario.nombre,
                        correo: resultado.usuario.correo,
                        rol: resultado.usuario.Rol.nombreRol,
                        entidad: {
                            id: resultado.entidad.id,
                            nombreLegal: resultado.entidad.nombreLegal,
                            rfc: resultado.entidad.rfc,
                            tipoEntidad: resultado.entidad.tipoEntidad,
                            plan: resultado.usuario.Entidad.PlanSuscripcion.tipoPlan
                        }
                    }
                })
            }
            
            // PERSONA MORAL: Usar entidad existente
            if (datos.tipoEntidad === 'MORAL') {
                const entidadExistente = await prisma.entidad.findUnique({
                    where: { id: datos.idEntidad },
                    include: {
                        PlanSuscripcion: true
                    }
                })
                
                if (!entidadExistente) {
                    return responderConError(res, 404, ENTIDAD_NO_ENCONTRADA)
                }
                
                if (entidadExistente.tipoEntidad !== 'MORAL') {
                    return responderConError(res, 400, 'La entidad especificada no es de tipo MORAL')
                }
                
                if (!entidadExistente.activo) {
                    return responderConError(res, 400, 'La entidad especificada está inactiva')
                }
                
                const contraseniaHash = await hashearContraseñaBCrypt(datos.contraseña)
                
                const nuevoUsuario = await prisma.usuario.create({
                    data: {
                        idEntidad: datos.idEntidad,
                        idRol: rolUsuario.id,
                        nombre: datos.nombre,
                        correo: datos.correo,
                        contraseniaHash: contraseniaHash
                    },
                    include: {
                        Entidad: {
                            include: {
                                PlanSuscripcion: true
                            }
                        },
                        Rol: true
                    }
                })
                
                return responderConExito(res, 201, 'Usuario creado exitosamente', {
                    usuario: {
                        id: nuevoUsuario.id,
                        nombre: nuevoUsuario.nombre,
                        correo: nuevoUsuario.correo,
                        rol: nuevoUsuario.Rol.nombreRol,
                        entidad: {
                            id: nuevoUsuario.Entidad.id,
                            nombreLegal: nuevoUsuario.Entidad.nombreLegal,
                            rfc: nuevoUsuario.Entidad.rfc,
                            tipoEntidad: nuevoUsuario.Entidad.tipoEntidad,
                            plan: nuevoUsuario.Entidad.PlanSuscripcion.tipoPlan
                        }
                    }
                })
            }
            
        } catch (error) {
            console.error('Error al crear usuario:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    static async actualizarUsuario(req, res) {
        try {
            const { id } = req.params
            const idUsuario = parseInt(id)
            
            if (isNaN(idUsuario)) {
                return responderConError(res, 400, 'ID de usuario inválido')
            }
            
            const resultadoValidacion = actualizarUsuarioSchema.safeParse(req.body)
            
            if (!resultadoValidacion.success) {
                return responderConError(res, 400, ENTRADA_INVALIDA, {
                    errores: resultadoValidacion.error.errors.map(err => ({
                        campo: err.path.join('.'),
                        mensaje: err.message
                    }))
                })
            }
            
            const datos = resultadoValidacion.data
            
            const usuarioExistente = await prisma.usuario.findUnique({
                where: { id: idUsuario }
            })
            
            if (!usuarioExistente) {
                return responderConError(res, 404, USUARIO_NO_ENCONTRADO)
            }
            
            if (datos.correo && datos.correo !== usuarioExistente.correo) {
                const correoExistente = await prisma.usuario.findUnique({
                    where: { correo: datos.correo }
                })
                
                if (correoExistente) {
                    return responderConError(res, 409, CORREO_YA_REGISTRADO)
                }
            }
            
            const datosActualizar = { ...datos }
            
            if (datos.contraseña) {
                datosActualizar.contraseniaHash = await hashearContraseñaBCrypt(datos.contraseña)
                delete datosActualizar.contraseña
            }
            
            const usuarioActualizado = await prisma.usuario.update({
                where: { id: idUsuario },
                data: datosActualizar,
                include: {
                    Entidad: {
                        include: {
                            PlanSuscripcion: true
                        }
                    },
                    Rol: true
                }
            })
            
            return responderConExito(res, 200, 'Usuario actualizado exitosamente', {
                usuario: {
                    id: usuarioActualizado.id,
                    nombre: usuarioActualizado.nombre,
                    correo: usuarioActualizado.correo,
                    activo: usuarioActualizado.activo,
                    notificacionesActivas: usuarioActualizado.notificacionesActivas,
                    entidad: {
                        id: usuarioActualizado.Entidad.id,
                        nombreLegal: usuarioActualizado.Entidad.nombreLegal,
                        tipoEntidad: usuarioActualizado.Entidad.tipoEntidad
                    }
                }
            })
            
        } catch (error) {
            console.error('Error al actualizar usuario:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

static async eliminarUsuario(req, res) {
        try {
            const { id } = req.body
            const idUsuario = parseInt(id)
            
            if (isNaN(idUsuario) || !idUsuario) {
                return responderConError(res, 400, 'ID de usuario inválido')
            }
            
            const usuarioExistente = await prisma.usuario.findUnique({
                where: { id: idUsuario }
            })
            
            if (!usuarioExistente) {
                return responderConError(res, 404, USUARIO_NO_ENCONTRADO)
            }
            
            await prisma.usuario.update({
                where: { id: idUsuario },
                data: { activo: false }
            })
            
            return responderConExito(res, 200, 'Usuario eliminado exitosamente', {
                id: idUsuario
            })
            
        } catch (error) {
            console.error('Error al eliminar usuario:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    static async configurarNotificaciones(req, res) {
        try {
            const { id } = req.params
            const idUsuario = parseInt(id)
            
            if (isNaN(idUsuario)) {
                return responderConError(res, 400, 'ID de usuario inválido')
            }
            
            const resultadoValidacion = configurarNotificacionesSchema.safeParse(req.body)
            
            if (!resultadoValidacion.success) {
                return responderConError(res, 400, ENTRADA_INVALIDA, {
                    errores: resultadoValidacion.error.errors.map(err => ({
                        campo: err.path.join('.'),
                        mensaje: err.message
                    }))
                })
            }
            
            const { notificacionesActivas } = resultadoValidacion.data
            
            const usuarioExistente = await prisma.usuario.findUnique({
                where: { id: idUsuario }
            })
            
            if (!usuarioExistente) {
                return responderConError(res, 404, USUARIO_NO_ENCONTRADO)
            }
            
            await prisma.usuario.update({
                where: { id: idUsuario },
                data: { notificacionesActivas }
            })
            
            return responderConExito(res, 200, 'Configuración de notificaciones actualizada', {
                notificacionesActivas
            })
            
        } catch (error) {
            console.error('Error al configurar notificaciones:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

}