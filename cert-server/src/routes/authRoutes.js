import { Router } from 'express';
import { body } from 'express-validator';
import { login } from '../controllers/authController.js';
import { loginRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post(
  '/login',
  loginRateLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email address is required')
      .isEmail()
      .withMessage('Please enter a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  login
);

export default router;
