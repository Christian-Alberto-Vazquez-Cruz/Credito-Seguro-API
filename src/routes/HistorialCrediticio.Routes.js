import { Router } from 'express'
import { HistorialCrediticioController } from '../controllers/HistorialCrediticio.Controller.js'
import { validarJWT } from '../middleware/ValidarJWT.js'

const router = Router()

// Obtener historial crediticio completo (persona + obligaciones + resumen)
router.use(validarJWT)
router.get('/:rfc/completo', HistorialCrediticioController.obtenerHistorialCompleto)

// Obtener resumen del historial crediticio de una persona
router.get('/:rfc', HistorialCrediticioController.obtenerHistorialPorRFC)

// Obtener obligaciones crediticias de una persona
router.get('/:rfc/obligaciones', HistorialCrediticioController.obtenerObligacionesPorRFC)

// Obtener historial de pagos de una persona
// Query param opcional: ?obligacionId=123
router.get('/:rfc/pagos', HistorialCrediticioController.obtenerPagosPorRFC)

export default router