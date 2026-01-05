import {Router} from 'express'
import { ConsentimientoConsultaController } from '../controllers/ConsentimientosConsulta.Controller.js'
import { validarJWT } from '../middleware/ValidarJWT.js'
const router = Router()

router.use(validarJWT)
router.post('/', validarJWT, ConsentimientoConsultaController.crearConsentimiento)
router.get('/:id', validarJWT, ConsentimientoConsultaController.consultarConsentimiento)
router.patch('/revocar', validarJWT, ConsentimientoConsultaController.revocarConsentimiento)
router.post('/verificar', validarJWT, ConsentimientoConsultaController.verificarConsentimiento)

export default router