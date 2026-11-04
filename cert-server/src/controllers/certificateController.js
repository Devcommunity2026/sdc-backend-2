import ExcelJS from 'exceljs';
import { validationResult } from 'express-validator';
import cloudinary from '../config/cloudinary.js';
import { Certificate } from '../models/Certificate.js';
import { generateCertificateId } from '../utils/idGenerator.js';
import { generateQrDataUrl, generateQrPngBuffer } from '../utils/qrGenerator.js';
import { generateCertificatePdf } from '../utils/pdfGenerator.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Uploads a buffer directly to Cloudinary using upload_stream
 * Uses resource_type: "raw", folder: "certificates", and appends ".pdf" to public_id
 */
const uploadBufferToCloudinary = (buffer, certificateId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'certificates',
        public_id: `${certificateId}.pdf`,
        resource_type: 'raw',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Rollback helper: Deletes raw file from Cloudinary if database persistence fails
 */
const deleteCloudinaryAsset = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });
    console.log(`[Cloudinary Rollback] Successfully purged asset: ${publicId}`, result);
  } catch (error) {
    console.error(`[Cloudinary Rollback Failed] Could not delete ${publicId}:`, error.message);
  }
};

/**
 * Helper to generate an organized certificate ID
 */
const createFormattedCertId = (type = 'participation') => {
  const prefixMap = {
    participation: 'SDC-PART',
    merit: 'SDC-MERIT',
    appreciation: 'SDC-APPR',
  };
  const prefix = prefixMap[type] || 'SDC-CERT';
  const year = new Date().getFullYear();
  const randomSuffix = generateCertificateId().slice(0, 6).toUpperCase();
  return `${prefix}-${year}-${randomSuffix}`;
};

/**
 * POST /api/certificates/generate-single
 * Generates a single official PDF certificate with embedded QR code,
 * uploads to Cloudinary, and saves to MongoDB.
 */
export const generateSingleCertificate = async (req, res, next) => {
  let uploadedCloudinaryPublicId = null;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
        data: null,
      });
    }

    const { holderName, courseOrTitle, issueDate } = req.body;
    let { certificateType, certificateId } = req.body;

    const validTypes = ['participation', 'merit', 'appreciation'];
    certificateType = validTypes.includes(certificateType?.toLowerCase())
      ? certificateType.toLowerCase()
      : 'participation';

    if (certificateId && certificateId.trim()) {
      certificateId = certificateId.trim();
    } else {
      certificateId = createFormattedCertId(certificateType);
    }

    // Check for duplicate certificateId
    const existingCert = await Certificate.findOne({ certificateId }).lean();
    if (existingCert) {
      return res.status(409).json({
        success: false,
        message: `Certificate ID "${certificateId}" already exists. Please provide or use a unique ID.`,
        data: null,
      });
    }

    const clientBaseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const verifyUrl = `${clientBaseUrl}/verify/${encodeURIComponent(certificateId)}`;

    // 1. Generate PDF with embedded QR code
    const pdfBuffer = await generateCertificatePdf({
      certificateId,
      holderName: holderName.trim(),
      courseOrTitle: courseOrTitle.trim(),
      issueDate: issueDate || new Date(),
      certificateType,
      verificationUrl: verifyUrl,
    });

    // 2. Upload PDF to Cloudinary
    const cloudinaryResult = await uploadBufferToCloudinary(pdfBuffer, certificateId);
    uploadedCloudinaryPublicId = cloudinaryResult.public_id;

    // 3. Save to MongoDB
    let savedCertificate;
    try {
      const certDoc = new Certificate({
        certificateId,
        holderName: holderName.trim(),
        courseOrTitle: courseOrTitle.trim(),
        certificateType,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        fileUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        status: 'valid',
      });

      savedCertificate = await certDoc.save();
    } catch (dbError) {
      if (uploadedCloudinaryPublicId) {
        await deleteCloudinaryAsset(uploadedCloudinaryPublicId);
      }
      throw dbError;
    }

    const qrCodeDataUrl = await generateQrDataUrl(verifyUrl);

    return res.status(201).json({
      success: true,
      message: 'Certificate generated, uploaded to Cloudinary, and registered successfully.',
      data: {
        certificate: {
          certificateId: savedCertificate.certificateId,
          holderName: savedCertificate.holderName,
          courseOrTitle: savedCertificate.courseOrTitle,
          certificateType: savedCertificate.certificateType,
          issueDate: savedCertificate.issueDate,
          fileUrl: savedCertificate.fileUrl,
          status: savedCertificate.status,
          createdAt: savedCertificate.createdAt,
        },
        verifyUrl,
        qrCodeDataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/certificates/generate-bulk
 * Parses an Excel (.xlsx/.csv) spreadsheet, generates individual PDF certificates
 * with embedded verification QR codes for each row, uploads them to Cloudinary,
 * and inserts records into MongoDB.
 */
export const generateBulkCertificates = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet file is required (.xlsx or .csv).',
        data: null,
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded Excel file has no worksheets.',
        data: null,
      });
    }

    // Read headers from row 1
    const headers = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    });

    const findCol = (aliases) => {
      for (const alias of aliases) {
        const idx = headers.findIndex((h) => h && h.includes(alias));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const nameCol = findCol(['name', 'holder', 'recipient', 'participant', 'student']);
    const titleCol = findCol(['title', 'course', 'event', 'domain']);
    const typeCol = findCol(['type', 'category']);
    const dateCol = findCol(['date', 'issue']);
    const idCol = findCol(['id', 'certid', 'code']);

    if (nameCol === -1 || titleCol === -1) {
      return res.status(400).json({
        success: false,
        message:
          'Spreadsheet must have columns for Recipient Name (e.g. "Holder Name") and Event Title (e.g. "Course / Event Title").',
        data: null,
      });
    }

    const rowsToProcess = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const getVal = (colIdx) => {
        if (colIdx === -1) return '';
        const val = row.getCell(colIdx).value;
        if (val === null || val === undefined) return '';
        if (typeof val === 'object' && val.text) return String(val.text).trim();
        if (val instanceof Date) return val.toISOString().split('T')[0];
        return String(val).trim();
      };

      const holderName = getVal(nameCol);
      const courseOrTitle = getVal(titleCol);
      const rawType = getVal(typeCol);
      const rawDate = getVal(dateCol);
      const rawId = getVal(idCol);

      if (holderName && courseOrTitle) {
        rowsToProcess.push({
          rowNumber,
          holderName,
          courseOrTitle,
          rawType,
          rawDate,
          rawId,
        });
      }
    });

    if (rowsToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data rows found in the spreadsheet.',
        data: null,
      });
    }

    if (rowsToProcess.length > 300) {
      return res.status(400).json({
        success: false,
        message: 'Maximum limit of 300 certificates per bulk batch exceeded.',
        data: null,
      });
    }

    const clientBaseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const results = [];
    const errors = [];

    // Process certificates sequentially or in small chunks
    for (const item of rowsToProcess) {
      let uploadedCloudinaryPublicId = null;

      try {
        let certType = 'participation';
        const typeLower = item.rawType.toLowerCase();
        if (typeLower.includes('merit') || typeLower.includes('excel')) {
          certType = 'merit';
        } else if (typeLower.includes('apprec') || typeLower.includes('mentor') || typeLower.includes('lead')) {
          certType = 'appreciation';
        }

        let certId = item.rawId;
        if (certId && certId.trim()) {
          certId = certId.trim();
        } else {
          certId = createFormattedCertId(certType);
        }

        // Check if certificateId already exists in DB
        const existing = await Certificate.findOne({ certificateId: certId }).lean();
        if (existing) {
          if (!item.rawId) {
            certId = createFormattedCertId(certType);
          } else {
            errors.push({
              rowNumber: item.rowNumber,
              holderName: item.holderName,
              error: `Certificate ID "${certId}" already exists.`,
            });
            continue;
          }
        }

        const verifyUrl = `${clientBaseUrl}/verify/${encodeURIComponent(certId)}`;
        const issueDate = item.rawDate ? new Date(item.rawDate) : new Date();

        // Generate PDF with embedded QR code
        const pdfBuffer = await generateCertificatePdf({
          certificateId: certId,
          holderName: item.holderName,
          courseOrTitle: item.courseOrTitle,
          issueDate,
          certificateType: certType,
          verificationUrl: verifyUrl,
        });

        // Upload PDF to Cloudinary
        const cloudRes = await uploadBufferToCloudinary(pdfBuffer, certId);
        uploadedCloudinaryPublicId = cloudRes.public_id;

        // Save to MongoDB
        const certificateDoc = new Certificate({
          certificateId: certId,
          holderName: item.holderName,
          courseOrTitle: item.courseOrTitle,
          certificateType: certType,
          issueDate,
          fileUrl: cloudRes.secure_url,
          cloudinaryPublicId: cloudRes.public_id,
          status: 'valid',
        });

        const saved = await certificateDoc.save();

        results.push({
          rowNumber: item.rowNumber,
          certificateId: saved.certificateId,
          holderName: saved.holderName,
          courseOrTitle: saved.courseOrTitle,
          certificateType: saved.certificateType,
          fileUrl: saved.fileUrl,
          verifyUrl,
        });
      } catch (rowErr) {
        console.error(`[Bulk Error] Row ${item.rowNumber} failed:`, rowErr.message);
        if (uploadedCloudinaryPublicId) {
          await deleteCloudinaryAsset(uploadedCloudinaryPublicId);
        }
        errors.push({
          rowNumber: item.rowNumber,
          holderName: item.holderName,
          error: rowErr.message || 'Generation or persistence failed',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk processing complete. ${results.length} issued successfully, ${errors.length} failed.`,
      data: {
        totalRows: rowsToProcess.length,
        successCount: results.length,
        errorCount: errors.length,
        certificates: results,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/template/excel
 * Generates and downloads a clean Excel template pre-formatted with column headers
 * and sample rows.
 */
export const downloadExcelTemplate = async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Software Developers' Community";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Certificates_Import');

    worksheet.columns = [
      { header: 'Full Name', key: 'holderName', width: 28 },
      { header: 'Position', key: 'courseOrTitle', width: 36 },
      { header: 'Start Date', key: 'startDate', width: 22 },
      { header: 'End Date', key: 'endDate', width: 22 },
      { header: 'Certificate Type', key: 'certificateType', width: 26 },
      { header: 'Certificate ID', key: 'certificateId', width: 28 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Dark Blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    worksheet.addRow({
      holderName: 'Aarav Sharma',
      courseOrTitle: 'Full Stack Developer Intern',
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      certificateType: 'internship',
      certificateId: 'SDC-INT-SAMPLE-01',
    });

    worksheet.addRow({
      holderName: 'Priya Verma',
      courseOrTitle: 'DevOps & Cloud Intern',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      certificateType: 'internship',
      certificateId: 'SDC-INT-SAMPLE-02',
    });

    worksheet.addRow({
      holderName: 'Rohan Joshi',
      courseOrTitle: 'Annual Hackathon 2026 - 1st Place',
      startDate: '2026-11-04',
      endDate: '',
      certificateType: 'merit',
      certificateId: 'SDC-MERIT-SAMPLE-03',
    });

    worksheet.addRow({
      holderName: 'Ananya Gupta',
      courseOrTitle: 'Keynote Speaker & Technical Mentor',
      startDate: '2026-11-04',
      endDate: '',
      certificateType: 'appreciation',
      certificateId: 'SDC-APPR-SAMPLE-04',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="sdc_certificate_bulk_template.xlsx"'
    );
    res.setHeader('Cache-Control', 'no-cache');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/certificates
 * Admin only. Creates certificate from pre-existing uploaded PDF.
 */
export const createCertificate = async (req, res, next) => {
  let uploadedCloudinaryPublicId = null;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
        data: null,
      });
    }

    const { holderName, courseOrTitle, issueDate } = req.body;
    let { certificateId, certificateType } = req.body;

    certificateType = certificateType || 'custom';

    if (certificateId && certificateId.trim()) {
      certificateId = certificateId.trim();
    } else {
      certificateId = generateCertificateId();
    }

    const existingCert = await Certificate.findOne({ certificateId }).lean();
    if (existingCert) {
      return res.status(409).json({
        success: false,
        message: `Certificate ID "${certificateId}" already exists. Please provide a unique ID.`,
        data: null,
      });
    }

    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, certificateId);
    uploadedCloudinaryPublicId = cloudinaryResult.public_id;

    let savedCertificate;
    try {
      const certificateDoc = new Certificate({
        certificateId,
        holderName: holderName.trim(),
        courseOrTitle: courseOrTitle.trim(),
        certificateType,
        issueDate: new Date(issueDate),
        fileUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        status: 'valid',
      });

      savedCertificate = await certificateDoc.save();
    } catch (dbError) {
      if (uploadedCloudinaryPublicId) {
        await deleteCloudinaryAsset(uploadedCloudinaryPublicId);
      }
      throw dbError;
    }

    const clientBaseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const verifyUrl = `${clientBaseUrl}/verify/${certificateId}`;
    const qrCodeDataUrl = await generateQrDataUrl(verifyUrl);

    return res.status(201).json({
      success: true,
      message: 'Certificate registered successfully.',
      data: {
        certificate: {
          certificateId: savedCertificate.certificateId,
          holderName: savedCertificate.holderName,
          courseOrTitle: savedCertificate.courseOrTitle,
          certificateType: savedCertificate.certificateType,
          issueDate: savedCertificate.issueDate,
          fileUrl: savedCertificate.fileUrl,
          status: savedCertificate.status,
          createdAt: savedCertificate.createdAt,
        },
        verifyUrl,
        qrCodeDataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/:id
 * Public, rate-limited. Returns strictly public certificate details.
 */
export const getCertificateById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A certificate ID parameter is required.',
        data: null,
      });
    }

    const certificate = await Certificate.findOne({ certificateId: id.trim() })
      .select('certificateId holderName courseOrTitle certificateType issueDate fileUrl status -_id')
      .lean();

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found; it may be invalid or the ID might be incorrect.',
        data: null,
      });
    }

    return sendSuccess(res, 200, 'Certificate verified successfully.', certificate);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/:id/qr
 * Admin only. Generates and streams the 600px QR code as a downloadable PNG.
 */
export const getCertificateQr = async (req, res, next) => {
  try {
    const { id } = req.params;

    const certificate = await Certificate.findOne({ certificateId: id.trim() })
      .select('certificateId')
      .lean();

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found.',
        data: null,
      });
    }

    const clientBaseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const verifyUrl = `${clientBaseUrl}/verify/${certificate.certificateId}`;
    const pngBuffer = await generateQrPngBuffer(verifyUrl);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="qr-${certificate.certificateId}.png"`
    );
    res.setHeader('Content-Length', pngBuffer.length);
    res.setHeader('Cache-Control', 'no-store');

    return res.end(pngBuffer);
  } catch (error) {
    next(error);
  }
};
