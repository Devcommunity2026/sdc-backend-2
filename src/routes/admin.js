import express from 'express'
import roleMiddleware from '../middlewares/roleMiddleware.js'
import { getAccess, editRole, banEdit, deleteUser, getSortedUsers } from '../controllers/adminController.js'

const router = express.Router()

router.use(roleMiddleware(["admin", "moderator"]))

router.get('/sortedUsers', getSortedUsers)
router.use(roleMiddleware(["admin"]))
router.get('/getAccess', getAccess)
router.post('/editRole', editRole)
router.post('/banEdit', banEdit)
router.post('/deleteUser', deleteUser)

export default router