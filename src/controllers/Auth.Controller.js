import {prisma} from '../lib/db.js'
import { loginSchema } from '../schemas/Auth.Schema.js'
import { ENTRADA_INVALIDA, CREDENCIALES_INCORRECTAS, CUENTA_INACTIVA, MENSAJE_ERROR_GENERICO } from '../utilities/Constantes.js'
import { responderConError, responderConExito, manejarResultado } from '../utilities/Manejadores.js'
import { compararContraseñaBCrypt, hashearASHA256 } from '../utilities/Hashing.js'
import { generarJWT, generarRefreshToken, verificarRefreshToken } from '../utilities/GeneradorJWT.js'

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

    static async refreshAccessToken(req, res) {
        try {
            const { refreshToken } = req.body

            if (!refreshToken) {
                return responderConError(res, 400, REFRESH_TOKEN_REQUERIDO)
            }

            let decoded
            try {
                decoded = await verificarRefreshToken(refreshToken)
            } catch (error) {
                console.error('Error verificando refresh token:', error)
                return responderConError(res, 401, REFRESH_TOKEN_INVALIDO)
            }

            const tokenHash = hashearASHA256(refreshToken)

            const tokenEnBD = await prisma.refreshToken.findUnique({
                where: { tokenHash: tokenHash },
                include: {
                    Usuario: {
                        include: {
                            Entidad: {
                                include: {
                                    PlanSuscripcion: true
                                }
                            },
                            Rol: true
                        }
                    }
                }
            })

            if (!tokenEnBD) {
                return responderConError(res, 401, REFRESH_TOKEN_INVALIDO)
            }

            if (tokenEnBD.revocado) {
                return responderConError(res, 401, REFRESH_TOKEN_REVOCADO)
            }

            if (new Date() > tokenEnBD.horaExpiracion) {
                await prisma.refreshToken.update({
                    where: { id: tokenEnBD.id },
                    data: { revocado: true }
                })
                return responderConError(res, 401, REFRESH_TOKEN_EXPIRADO)
            }

            if (!tokenEnBD.Usuario.activo || !tokenEnBD.Usuario.Entidad.activo) {
                await prisma.refreshToken.update({
                    where: { id: tokenEnBD.id },
                    data: { revocado: true }
                })
                return responderConError(res, 403, CUENTA_INACTIVA)
            }

            if (decoded.idUsuario !== tokenEnBD.Usuario.id) {
                return responderConError(res, 401, REFRESH_TOKEN_INVALIDO)
            }

            const payloadJWT = AuthController.crearPayload(
                tokenEnBD.Usuario,
                tokenEnBD.Usuario.Entidad,
                tokenEnBD.Usuario.Entidad.PlanSuscripcion,
                tokenEnBD.Usuario.Rol
            )
            
            const nuevoToken = await generarJWT(payloadJWT)

            return responderConExito(res, 200, 'Token renovado exitosamente', {
                token: nuevoToken,
                usuario: {
                    id: tokenEnBD.Usuario.id,
                    nombre: tokenEnBD.Usuario.nombre,
                    correo: tokenEnBD.Usuario.correo,
                    rol: tokenEnBD.Usuario.Rol.nombreRol
                }
            })

        } catch (error) {
            console.error('Error al renovar token:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }


    static async logout(req, res) {
        try {
            const { refreshToken } = req.body

            if (refreshToken) {
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

