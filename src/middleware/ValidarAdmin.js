import { responderConError } from '../utilities/Manejadores.js'

export const validarAdmin = (req, res, next) => {
  if (!req.usuario) {
    return responderConError(res, 401, 'Usuario no autenticado')
  }

  if (req.usuario.rol !== 'ADMINISTRADOR') {
    return responderConError(res, 403, 'Acceso restringido a administradores')
  }

  next()
}
