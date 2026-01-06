import { Router } from 'express';
import { 
    registrarReclamacion, 
    obtenerMisReclamaciones, 
    atenderReclamacion,
    obtenerTodasReclamaciones,
    verEvidencia
} from '../controllers/Reclamaciones.Controller.js';

import { validarJWT } from '../middleware/ValidarJWT.js';
import { validarAdmin } from '../middleware/ValidarAdmin.js';

const router = Router();

router.post('/', validarJWT, registrarReclamacion);
router.get('/mis-reclamaciones', validarJWT, obtenerMisReclamaciones);
router.get('/admin/todas', [validarJWT, validarAdmin], obtenerTodasReclamaciones);
router.get('/evidencia/:nombreArchivo', validarJWT, verEvidencia);
router.patch('/:id/atender', [validarJWT, validarAdmin], atenderReclamacion);

export default router;