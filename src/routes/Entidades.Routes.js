import { Router } from 'express'
import { EntidadesController } from '../controllers/Entidades.Controller.js'
import { validarJWT } from '../middleware/ValidarJWT.js'
import { validarAdmin } from '../middleware/ValidarAdmin.js'

const router = Router()

router.use(validarJWT, validarAdmin)

router.post("/", EntidadesController.crearEntidad)
router.get("/", EntidadesController.listarEntidades)
router.get("/buscar", EntidadesController.buscarEntidades)
router.get("/:id", EntidadesController.consultarEntidad)
router.patch("/desactivar", EntidadesController.desactivarEntidad)
router.patch("/reactivar", EntidadesController.reactivarEntidad)

export default router
