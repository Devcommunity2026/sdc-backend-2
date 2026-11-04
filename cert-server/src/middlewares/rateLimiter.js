import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for public certificate verification endpoint:
 * 100 requests per 15-minute window per IP
 */
export const verifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification requests from this IP. Please try again after 15 minutes.',
    data: null,
  },
});

/**
 * Rate limiter for login endpoint to prevent brute-force attacks:
 * 10 attempts per 15-minute window per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    data: null,
  },
});
