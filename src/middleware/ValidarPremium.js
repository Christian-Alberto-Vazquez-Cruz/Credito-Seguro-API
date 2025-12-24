import { responderConError } from '../utilities/Manejadores.js'

export const validarPremium = (req, res, next) => {
  if (!req.usuario) {
    return responderConError(res, 401, 'Usuario no autenticado')
  }

  if (req.usuario.entidad.plan !== 'PREMIUM') {
    return responderConError(res, 403, 'Plan PREMIUM requerido')
  }

  next()
}
