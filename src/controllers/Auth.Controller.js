import {prisma} from '../lib/db.js'
import { loginSchema } from '../schemas/Auth.Schema.js'
import { ENTRADA_INVALIDA, CREDENCIALES_INCORRECTAS, CUENTA_INACTIVA, MENSAJE_ERROR_GENERICO } from '../utilities/Constantes.js'
import { responderConError, responderConExito, manejarResultado } from '../utilities/Manejadores.js'
import { compararContraseñaBCrypt, hashearASHA256 } from '../utilities/Hashing.js'
import { generarJWT, generarRefreshToken } from '../utilities/GeneradorJWT.js'

export class AuthController {
    static async login(req, res) {
        try {
            const resultadoValidacion = loginSchema.safeParse(req.body)

            if (!resultadoValidacion.success){
                return responderConError(res, 400, ENTRADA_INVALIDA)
            }

            const datos = resultadoValidacion.data

            const usuario = await prisma.usuario.findUnique({
                where: { correo: datos.correo },
                include: {
                    Entidad: {
                        include: {
                            PlanSuscripcion: true
                        }
                    },
                    Rol: true
                }
            })

            if (!usuario){
                return responderConError(res, 404, CREDENCIALES_INCORRECTAS)
            }

            const contraseñaValida = await compararContraseñaBCrypt(datos.contraseña, 
                usuario.contraseniaHash)

            if (!contraseñaValida) {
                return responderConError(res, 401, CREDENCIALES_INCORRECTAS)
            }

            if (!usuario.activo || !usuario.Entidad.activo){
                return responderConError(res, 403, CUENTA_INACTIVA)
            }


           const payloadJWT = AuthController.crearPayload(
                usuario, 
                usuario.Entidad, 
                usuario.Entidad.PlanSuscripcion, 
                usuario.Rol
            )

            const token = await generarJWT(payloadJWT)
            const refreshToken = await generarRefreshToken({idUsuario: usuario.id})
            const tokenHash = hashearASHA256(refreshToken)
            const ipOrigen = req.ip || req.connection.remoteAddress 

            await prisma.refreshToken.create({
                data: {
                    idUsuario: usuario.id,
                    tokenHash: tokenHash,
                    //30 días
                    horaExpiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
                    ipOrigen: ipOrigen
                }
            })

            return responderConExito(res, 200, 'Login exitoso', {
                token,
                refreshToken,
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    rol: usuario.Rol.nombreRol,
                    entidad: {
                        id: usuario.Entidad.id,
                        nombreLegal: usuario.Entidad.nombreLegal,
                        tipoEntidad: usuario.Entidad.tipoEntidad
                    }
                }
            })
        } catch (error){
            console.error('Error en login:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    static crearPayload(usuario, entidad, plan, rol){
        return {
            idUsuario: usuario.id,
            nombreRol: rol.nombreRol,
            activoUsuario: usuario.activo,
            nombreUsuario: usuario.nombre,
            correoUsuario: usuario.correo,
            tipoEntidad: entidad.tipoEntidad,
            idEntidad: entidad.id,
            nombreEntidad: entidad.nombreLegal,
            activoEntidad: entidad.activo,
            tipoPlan: plan.tipoPlan,
            maxConsultasMensuales: plan.maxConsultasMensuales
        }
    }


    //OTROS
    static async refreshAccessToken(req, res) {
        try {
            const { refreshToken } = req.body

            if (!refreshToken) {
                return responderConError(res, 400, 'Refresh token requerido')
            }

            // Verificar que el refresh token existe en BD
            const tokenEnBD = await prisma.refreshToken.findFirst({
                where: { 
                    token: refreshToken,
                    expiraEn: { gt: new Date() }
                },
                include: {
                    usuario: {
                        include: {
                            entidad: {
                                include: { plan: true }
                            },
                            rol: true
                        }
                    }
                }
            })

            if (!tokenEnBD) {
                return responderConError(res, 401, 'Refresh token inválido o expirado')
            }

            // Generar nuevo access token
            const payloadJWT = AuthController.crearPayload(
                tokenEnBD.usuario,
                tokenEnBD.usuario.entidad,
                tokenEnBD.usuario.entidad.plan,
                tokenEnBD.usuario.rol
            )
            
            const nuevoToken = await generarJWT(payloadJWT)

            return responderConExito(res, 200, 'Token renovado', {
                token: nuevoToken
            })

        } catch (error) {
            console.error('Error al renovar token:', error)
            return responderConError(res, 500, 'Error interno del servidor')
        }
    }

    static async logout(req, res) {
        try {
            const { refreshToken } = req.body

            if (refreshToken) {
                // Eliminar refresh token de la base de datos
                await prisma.refreshToken.deleteMany({
                    where: { token: refreshToken }
                })
            }

            return responderConExito(res, 200, 'Logout exitoso', null)

        } catch (error) {
            console.error('Error en logout:', error)
            return responderConError(res, 500, 'Error interno del servidor')
        }
    }
}

