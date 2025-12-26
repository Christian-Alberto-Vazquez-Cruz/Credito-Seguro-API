import jwt from 'jsonwebtoken'
import { responderConError } from '../utilities/Manejadores.js'
import { MENSAJE_ERROR_GENERICO } from '../utilities/constants/Constantes.js'

export const validarJWT = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return responderConError(res, 401, 'Token no proporcionado')
    }

    const token = authHeader.split(' ')[1]

    const payload = jwt.verify(token, process.env.SECRETO_JWT)

    if (!payload.idUsuario) {
      return responderConError(res, 401, 'Token inválido')
    }

    if (!payload.activoUsuario || !payload.activoEntidad) {
      return responderConError(res, 403, 'Cuenta inactiva')
    }

    req.usuario = {
      id: payload.idUsuario,
      rol: payload.nombreRol,
      correo: payload.correoUsuario,
      nombre: payload.nombreUsuario,
      entidad: {
        id: payload.idEntidad,
        tipo: payload.tipoEntidad,
        nombre: payload.nombreEntidad,
        plan: payload.tipoPlan,
        maxConsultasMensuales: payload.maxConsultasMensuales
      }
    }

    next()
  } catch (error) {
    console.error('Error al validar JWT:', error)
    return responderConError(res, 401, 'Token inválido o expirado')
  }
}
