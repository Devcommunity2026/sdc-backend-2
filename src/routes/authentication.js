import express from 'express'
import { registerUser, verifyUser, loginUser, changePassword, forgotPassword, verifyOTP, logOutUser, testEmailDelivery }
    from '../controllers/authController.js';

const router = express.Router()

// -----------/auth/register------------
router.post('/register', registerUser);

// -----------/auth/verify------------
router.post('/verify', verifyUser);

// -----------/auth/login------------
router.post('/login', loginUser);

// -----------/auth/forgotPassword------------
router.post('/forgotPassword', forgotPassword)

// -----------/auth/verifyOTP------------
router.post('/verifyOTP', verifyOTP)

// -----------/auth/changePassword------------
router.post('/changePassword', changePassword)

// -----------/auth/logout------------
router.post('/logout', logOutUser)

// -----------/auth/test-email------------
router.post('/test-email', testEmailDelivery)

export default router