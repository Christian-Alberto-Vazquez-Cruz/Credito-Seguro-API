import { Router } from 'express';
import { 
    registrarReclamacion, 
    obtenerMisReclamaciones, 
    atenderReclamacion 
} from '../controllers/Reclamaciones.Controller.js';

import { validarJWT } from '../middlewares/ValidarJWT.js';
import { validarAdmin } from '../middlewares/ValidarAdmin.js';

const router = Router();

router.post('/', validarJWT, registrarReclamacion);
router.get('/mis-reclamaciones', validarJWT, obtenerMisReclamaciones);
router.patch('/:id/atender', [validarJWT, validarAdmin], atenderReclamacion);

export default router;