import {Router} from 'express'
import { EntidadesController } from '../controllers/Entidades.Controller.js'

const router = Router()
router.post("/", EntidadesController.crearEntidad)    
router.get("/:id", EntidadesController.consultarEntidad)
router.patch("/desactivar", EntidadesController.desactivarEntidad)
router.patch("/reactivar", EntidadesController.reactivarEntidad)

export default router