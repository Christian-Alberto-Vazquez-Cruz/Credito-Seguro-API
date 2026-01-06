import { Router } from 'express';
import { 
    registrarReclamacion, 
    obtenerMisReclamaciones, 
    atenderReclamacion 
} from '../controllers/Reclamaciones.Controller.js';

import { validarJWT } from '../middleware/ValidarJWT.js';
import { validarAdmin } from '../middleware/ValidarAdmin.js';

const router = Router();

router.post('/', validarJWT, registrarReclamacion);
router.get('/mis-reclamaciones', validarJWT, obtenerMisReclamaciones);
router.patch('/:id/atender', [validarJWT, validarAdmin], atenderReclamacion);

export default router;