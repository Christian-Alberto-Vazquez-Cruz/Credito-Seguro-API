import {Router} from 'express'
import { UsuariosController } from '../controllers/Usuarios.Controller.js'
import { validarJWT } from '../middleware/ValidarJWT.js'
import { validarPropietarioOAdmin } from '../middleware/ValidarPropietarioOAdmin.js'
import { validarSoloPropietario } from '../middleware/ValidarSoloPropietario.js'

const router = Router()
router.post("/", UsuariosController.crearUsuario)
router.put("/:id", validarJWT, validarPropietarioOAdmin, UsuariosController.actualizarUsuario)
router.delete("/:id", validarJWT, validarPropietarioOAdmin, UsuariosController.eliminarUsuario) //soft delete
router.patch("/:id/notificaciones", validarJWT, validarSoloPropietario,
     UsuariosController.configurarNotificaciones)

export default router