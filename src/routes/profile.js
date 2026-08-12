import express from 'express'
const router = express.Router()
import authCheck from '../middlewares/authMiddleware.js'
import { shareProfile } from '../controllers/profileController.js'
import { editProfile } from '../controllers/profileController.js'

// this is Route is major about the updation and fetching the user value 

router.use(authCheck)

router.get('/me', shareProfile);

router.post('/edit', editProfile);

export default router