import { Router } from 'express';
import { body } from 'express-validator';
import {
  generateSingleCertificate,
  generateBulkCertificates,
  downloadExcelTemplate,
  createCertificate,
  getCertificateById,
  getCertificateQr,
} from '../controllers/certificateController.js';
import { authenticateAdmin } from '../middlewares/authMiddleware.js';
import {
  uploadSinglePdf,
  validatePdfBytes,
  uploadSingleExcel,
  validateExcelFile,
} from '../middlewares/uploadMiddleware.js';
import { verifyRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

/**
 * Public route: Verify certificate by ID
 * Rate-limited to prevent enumeration attacks
 */
router.get('/:id', verifyRateLimiter, getCertificateById);

/**
 * Admin route: Download certificate QR code as PNG
 */
router.get('/:id/qr', authenticateAdmin, getCertificateQr);

/**
 * Admin route: Download sample Excel template for bulk issuance
 */
router.get('/template/excel', authenticateAdmin, downloadExcelTemplate);

/**
 * Admin route: Generate single certificate with QR code and Cloudinary upload
 */
router.post(
  '/generate-single',
  authenticateAdmin,
  [
    body('holderName')
      .trim()
      .notEmpty()
      .withMessage('Recipient / Holder name is required')
      .isLength({ min: 2, max: 120 })
      .withMessage('Holder name must be between 2 and 120 characters'),
    body('courseOrTitle')
      .trim()
      .notEmpty()
      .withMessage('Course or title is required')
      .isLength({ min: 2, max: 150 })
      .withMessage('Course or title must be between 2 and 150 characters'),
    body('certificateType')
      .optional()
      .trim()
      .isIn(['participation', 'merit', 'appreciation'])
      .withMessage('Certificate type must be one of: participation, merit, appreciation'),
    body('issueDate')
      .optional()
      .isISO8601()
      .withMessage('Issue date must be a valid ISO 8601 date string (e.g., YYYY-MM-DD)'),
    body('certificateId')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Custom Certificate ID can only contain letters, numbers, hyphens, and underscores')
      .isLength({ min: 3, max: 40 })
      .withMessage('Custom Certificate ID must be between 3 and 40 characters'),
  ],
  generateSingleCertificate
);

/**
 * Admin route: Generate bulk certificates from uploaded Excel spreadsheet
 */
router.post(
  '/generate-bulk',
  authenticateAdmin,
  uploadSingleExcel,
  validateExcelFile,
  generateBulkCertificates
);

/**
 * Admin route: Upload pre-existing custom PDF certificate
 */
router.post(
  '/',
  authenticateAdmin,
  uploadSinglePdf,
  validatePdfBytes,
  [
    body('holderName')
      .trim()
      .notEmpty()
      .withMessage('Holder name is required')
      .isLength({ min: 2, max: 120 })
      .withMessage('Holder name must be between 2 and 120 characters'),
    body('courseOrTitle')
      .trim()
      .notEmpty()
      .withMessage('Course or title is required')
      .isLength({ min: 2, max: 150 })
      .withMessage('Course or title must be between 2 and 150 characters'),
    body('issueDate')
      .notEmpty()
      .withMessage('Issue date is required')
      .isISO8601()
      .withMessage('Issue date must be a valid ISO 8601 date string (e.g., YYYY-MM-DD)'),
    body('certificateId')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Custom Certificate ID can only contain letters, numbers, hyphens, and underscores')
      .isLength({ min: 3, max: 40 })
      .withMessage('Custom Certificate ID must be between 3 and 40 characters'),
  ],
  createCertificate
);

export default router;
