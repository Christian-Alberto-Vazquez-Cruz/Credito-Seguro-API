import {Router} from 'express'
import { AuthController } from '../controllers/Auth.Controller.js'

const router = Router()
router.get("/login", AuthController.login)

export default router