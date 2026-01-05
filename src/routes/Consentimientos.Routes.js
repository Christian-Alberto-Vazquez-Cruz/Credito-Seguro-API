import {Router} from 'express'
import { ConsentimientosController } from '../controllers/Consentimientos.Controller.js'
import { validarJWT } from '../middleware/ValidarJWT.js'

const router = Router()

router.use(validarJWT)
router.post('/', ConsentimientosController.crearConsentimiento)
router.get('/:id', ConsentimientosController.consultarConsentimiento)
router.patch('/revocar', ConsentimientosController.revocarConsentimiento)
//Solo se permite renovar por vencimiento (no revocado)
router.patch('/renovar', ConsentimientosController.renovarConsentimiento)

export default router