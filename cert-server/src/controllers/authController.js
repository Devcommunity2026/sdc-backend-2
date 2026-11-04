import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Admin Login Controller
 * Authenticates against ADMIN_EMAIL and ADMIN_PASSWORD_HASH
 */
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((err) => err.msg).join(', '),
        data: null,
      });
    }

    const { email, password } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      console.error('[Auth Error] ADMIN_EMAIL or ADMIN_PASSWORD_HASH is not configured.');
      return sendError(res, 500, 'Authentication service misconfigured on server.');
    }

    // Email check (case-insensitive)
    if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
        data: null,
      });
    }

    // Password check using bcrypt
    const isPasswordValid = await bcrypt.compare(password, adminPasswordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
        data: null,
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        email: adminEmail,
        role: 'admin',
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '24h',
      }
    );

    return sendSuccess(res, 200, 'Admin authenticated successfully', {
      token,
      admin: {
        email: adminEmail,
      },
    });
  } catch (error) {
    next(error);
  }
};
