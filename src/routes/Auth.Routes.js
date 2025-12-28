import {Router} from 'express'
import { AuthController } from '../controllers/Auth.Controller.js'

const router = Router()
router.post("/login", AuthController.login)
router.post("/refresh", AuthController.refreshAccessToken)
router.post("/logout", AuthController.logout)

export default router