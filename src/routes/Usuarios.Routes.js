import {Router} from 'express'
import { UsuariosController } from '../controllers/Usuarios.Controller.js'

const router = Router()
router.post("/", UsuariosController.crearUsuario)
router.put("/:id",UsuariosController.actualizarUsuario)
router.delete("/", UsuariosController.eliminarUsuario)
router.patch("/:id/notificaciones", UsuariosController.configurarNotificaciones)

export default router