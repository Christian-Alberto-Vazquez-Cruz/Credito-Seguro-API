import { Router } from 'express'
import { HistorialCrediticioController } from '../controllers/HistorialCrediticio.Controller.js'
import { validarJWT } from '../middleware/ValidarJWT.js'

const router = Router()

router.use(validarJWT)
router.get('/:rfc/completo', HistorialCrediticioController.obtenerHistorialCompleto)
router.get('/:rfc', HistorialCrediticioController.obtenerHistorialPorRFC)
router.get('/:rfc/obligaciones', HistorialCrediticioController.obtenerObligacionesPorRFC)
// Query param opcional: ?obligacionId=123
router.get('/:rfc/pagos', HistorialCrediticioController.obtenerPagosPorRFC)

export default router