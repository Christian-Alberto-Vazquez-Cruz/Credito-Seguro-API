export const validarSoloPropietario = (req, res, next) => {
  if (!req.usuario) {
    return responderConError(res, 401, 'Usuario no autenticado')
  }

  const idParams = req.params.id ? parseInt(req.params.id) : null
  const idBody = req.body.id ? parseInt(req.body.id) : null

  let idRecurso = null

  if (idParams !== null && idBody !== null) {
    if (idParams !== idBody) {
      return responderConError(res, 400, 'El ID del parámetro no coincide con el ID del body')
    }
    idRecurso = idParams
  } else if (idParams !== null) {
    idRecurso = idParams
  } else if (idBody !== null) {
    idRecurso = idBody
  } else {
    return responderConError(res, 400, 'ID de usuario no proporcionado')
  }

  if (isNaN(idRecurso) || idRecurso <= 0) {
    return responderConError(res, 400, 'ID de usuario inválido')
  }

  if (req.usuario.id !== idRecurso) {
    return responderConError(res, 403, 'Solo puede modificar su propia información')
  }

  next()
}