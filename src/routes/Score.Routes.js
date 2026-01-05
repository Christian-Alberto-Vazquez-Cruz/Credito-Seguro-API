import { Router } from 'express'
import { ScoringController } from '../controllers/Scoring.Controller.js'
import { validarJWT } from '../middleware/ValidarJWT.js'

const router = Router()

router.use(validarJWT)

router.post('/calcular', ScoringController.calcularScoring)
router.get('/historial/:rfc', ScoringController.obtenerHistorialScoring)
router.get('/ultimo/:rfc', ScoringController.obtenerUltimoScoring)
router.get('/comparar/:rfc', ScoringController.compararScoring)

export default router