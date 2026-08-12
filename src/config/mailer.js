import nodemailer from 'nodemailer';
import logger from './logger.js';

// Create transporter with connection pooling for faster email delivery
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT, 10) || 465,
  secure: process.env.EMAIL_SECURE !== "false", // defaults to true (SSL) for port 465
  requireTLS: true, // Force TLS upgrade for ports 587/2525 and prevent downgrades
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true, // Use connection pool
  maxConnections: 5,
  maxMessages: 100,
});

// Verify SMTP connection on startup
transporter.verify()
  .then(() => {
    logger.info('[Mailer] SMTP connection verified successfully');
  })
  .catch((err) => {
    logger.error('[Mailer] SMTP connection verification FAILED', {
      message: err.message,
      code: err.code,
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
    });
  });

export default transporter;