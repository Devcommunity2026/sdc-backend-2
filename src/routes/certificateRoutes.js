import express from "express";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import {
  generateSingleCertificate,
  generateBulkCertificates,
  downloadExcelTemplate,
  createCertificate,
  getCertificateById,
  getCertificateQr,
  listCertificates,
} from "../controllers/certificateController.js";
import {
  uploadSingleExcel,
  validateExcelFile,
  uploadCertificatePdf,
} from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ================= PUBLIC ROUTES =================
// Download sample Excel template for bulk import
router.get("/template/excel", downloadExcelTemplate);

// Public certificate lookup by ID
router.get("/:id", getCertificateById);

// Public QR code download
router.get("/:id/qr", getCertificateQr);

// ================= PROTECTED ADMIN & MODERATOR ROUTES =================
router.use(roleMiddleware(["admin", "moderator"]));

// List certificates with pagination & search
router.get("/", listCertificates);

// Generate single certificate with embedded QR and Cloudinary upload
router.post("/generate-single", generateSingleCertificate);

// Bulk generate certificates from Excel file
router.post("/generate-bulk", uploadSingleExcel, validateExcelFile, generateBulkCertificates);

// Upload custom pre-made PDF certificate
router.post("/", uploadCertificatePdf, createCertificate);

export default router;
