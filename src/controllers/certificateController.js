import ExcelJS from "exceljs";
import cloudinary from "../config/cloudConfig.js";
import Certificate from "../models/certificateSchema.js";
import { generateCertificateId } from "../utils/idGenerator.js";
import { generateQrDataUrl, generateQrPngBuffer } from "../utils/qrGenerator.js";
import { generateCertificatePdf } from "../utils/pdfGenerator.js";
import logger from "../config/logger.js";
import errorClass from "../utils/errorClass.js";

/**
 * Uploads a buffer directly to Cloudinary using upload_stream
 */
const uploadBufferToCloudinary = (buffer, certificateId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "certificates",
        public_id: `${certificateId}.pdf`,
        resource_type: "raw",
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
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    logger.info(`[Cloudinary Rollback] Purged asset: ${publicId}`);
  } catch (error) {
    logger.error(`[Cloudinary Rollback Failed] Could not delete ${publicId}:`, error);
  }
};

/**
 * POST /api/certificates/generate-single
 * Generates a single official PDF certificate with embedded QR code,
 * uploads to Cloudinary, and saves to MongoDB.
 */
export const generateSingleCertificate = async (req, res, next) => {
  let uploadedCloudinaryPublicId = null;

  try {
    const { holderName, courseOrTitle, issueDate, startDate, endDate } = req.body;
    let { certificateType, certificateId } = req.body;

    if (!holderName || !holderName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full Name is required",
      });
    }

    if (!courseOrTitle || !courseOrTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: "Position is required",
      });
    }

    const validTypes = ["internship", "participation", "merit", "appreciation"];
    certificateType = validTypes.includes(certificateType?.toLowerCase())
      ? certificateType.toLowerCase()
      : "internship";

    if (certificateId && certificateId.trim()) {
      certificateId = certificateId.trim();
    } else {
      certificateId = generateCertificateId(certificateType);
    }

    const existingCert = await Certificate.findOne({ certificateId }).lean();
    if (existingCert) {
      return res.status(409).json({
        success: false,
        message: `Certificate ID "${certificateId}" already exists. Please provide or use a unique ID.`,
      });
    }

    const clientBaseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
    const verifyUrl = `${clientBaseUrl}/certificates/${encodeURIComponent(certificateId)}`;

    const parsedStartDate = startDate ? new Date(startDate) : (issueDate ? new Date(issueDate) : new Date());
    const parsedEndDate = endDate ? new Date(endDate) : null;
    const parsedIssueDate = parsedStartDate;

    // 1. Generate PDF with embedded QR code
    const pdfBuffer = await generateCertificatePdf({
      certificateId,
      holderName: holderName.trim(),
      courseOrTitle: courseOrTitle.trim(),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      issueDate: parsedIssueDate,
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
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        issueDate: parsedIssueDate,
        fileUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        status: "valid",
      });

      savedCertificate = await certDoc.save();
    } catch (dbError) {
      if (uploadedCloudinaryPublicId) {
        await deleteCloudinaryAsset(uploadedCloudinaryPublicId);
      }
      throw dbError;
    }

    const qrCodeDataUrl = await generateQrDataUrl(verifyUrl);

    logger.info(`[Certificate] Single certificate generated: ${certificateId} for ${holderName}`);

    return res.status(201).json({
      success: true,
      message: "Certificate generated, uploaded to Cloudinary, and registered successfully.",
      data: {
        certificate: {
          certificateId: savedCertificate.certificateId,
          holderName: savedCertificate.holderName,
          courseOrTitle: savedCertificate.courseOrTitle,
          certificateType: savedCertificate.certificateType,
          startDate: savedCertificate.startDate,
          endDate: savedCertificate.endDate,
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
    const err = new errorClass(false, 500, "Unable to generate certificate", "Single cert generation failed", error);
    next(err);
  }
};

/**
 * POST /api/certificates/generate-bulk
 * Parses an Excel (.xlsx) spreadsheet, generates individual PDF certificates
 * with embedded verification QR codes for each row, uploads them to Cloudinary,
 * and inserts records into MongoDB.
 */
export const generateBulkCertificates = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Spreadsheet file is required (.xlsx).",
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: "The uploaded Excel file has no worksheets.",
      });
    }

    const headers = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    });

    const findCol = (aliases) => {
      for (const alias of aliases) {
        const idx = headers.findIndex((h) => h && h.includes(alias));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const nameCol = findCol(["fullname", "name", "holder", "recipient", "participant", "student"]);
    const titleCol = findCol(["position", "title", "course", "event", "domain"]);
    const startDateCol = findCol(["startdate", "start", "from", "date", "issue"]);
    const endDateCol = findCol(["enddate", "end", "to"]);
    const typeCol = findCol(["type", "category"]);
    const idCol = findCol(["id", "certid", "code"]);

    if (nameCol === -1 || titleCol === -1) {
      return res.status(400).json({
        success: false,
        message:
          'Spreadsheet must have columns for Full Name (e.g. "Full Name") and Position (e.g. "Position").',
      });
    }

    const rowsToProcess = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const getVal = (colIdx) => {
        if (colIdx === -1) return "";
        const val = row.getCell(colIdx).value;
        if (val === null || val === undefined) return "";
        if (typeof val === "object" && val.text) return String(val.text).trim();
        if (val instanceof Date) return val.toISOString().split("T")[0];
        return String(val).trim();
      };

      const holderName = getVal(nameCol);
      const courseOrTitle = getVal(titleCol);
      const rawType = getVal(typeCol);
      const rawStartDate = getVal(startDateCol);
      const rawEndDate = getVal(endDateCol);
      const rawId = getVal(idCol);

      if (holderName && courseOrTitle) {
        rowsToProcess.push({
          rowNumber,
          holderName,
          courseOrTitle,
          rawType,
          rawStartDate,
          rawEndDate,
          rawId,
        });
      }
    });

    if (rowsToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid data rows found in the spreadsheet.",
      });
    }

    if (rowsToProcess.length > 300) {
      return res.status(400).json({
        success: false,
        message: "Maximum limit of 300 certificates per bulk batch exceeded.",
      });
    }

    const clientBaseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
    const results = [];
    const errors = [];

    for (const item of rowsToProcess) {
      let uploadedCloudinaryPublicId = null;

      try {
        let certType = "internship";
        const typeLower = (item.rawType || "").toLowerCase();
        if (typeLower.includes("merit") || typeLower.includes("excel")) {
          certType = "merit";
        } else if (typeLower.includes("apprec") || typeLower.includes("mentor") || typeLower.includes("lead")) {
          certType = "appreciation";
        } else if (typeLower.includes("part")) {
          certType = "participation";
        } else if (typeLower.includes("intern")) {
          certType = "internship";
        }

        let certId = item.rawId;
        if (certId && certId.trim()) {
          certId = certId.trim();
        } else {
          certId = generateCertificateId(certType);
        }

        const existing = await Certificate.findOne({ certificateId: certId }).lean();
        if (existing) {
          if (!item.rawId) {
            certId = generateCertificateId(certType);
          } else {
            errors.push({
              rowNumber: item.rowNumber,
              holderName: item.holderName,
              error: `Certificate ID "${certId}" already exists.`,
            });
            continue;
          }
        }

        const verifyUrl = `${clientBaseUrl}/certificates/${encodeURIComponent(certId)}`;
        const parsedStartDate = item.rawStartDate ? new Date(item.rawStartDate) : new Date();
        const parsedEndDate = item.rawEndDate ? new Date(item.rawEndDate) : null;
        const issueDate = parsedStartDate;

        const pdfBuffer = await generateCertificatePdf({
          certificateId: certId,
          holderName: item.holderName,
          courseOrTitle: item.courseOrTitle,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          issueDate,
          certificateType: certType,
          verificationUrl: verifyUrl,
        });

        const cloudRes = await uploadBufferToCloudinary(pdfBuffer, certId);
        uploadedCloudinaryPublicId = cloudRes.public_id;

        const certificateDoc = new Certificate({
          certificateId: certId,
          holderName: item.holderName,
          courseOrTitle: item.courseOrTitle,
          certificateType: certType,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          issueDate,
          fileUrl: cloudRes.secure_url,
          cloudinaryPublicId: cloudRes.public_id,
          status: "valid",
        });

        const saved = await certificateDoc.save();

        results.push({
          rowNumber: item.rowNumber,
          certificateId: saved.certificateId,
          holderName: saved.holderName,
          courseOrTitle: saved.courseOrTitle,
          certificateType: saved.certificateType,
          fileUrl: saved.fileUrl,
        });
      } catch (rowErr) {
        if (uploadedCloudinaryPublicId) {
          await deleteCloudinaryAsset(uploadedCloudinaryPublicId);
        }
        errors.push({
          rowNumber: item.rowNumber,
          holderName: item.holderName,
          error: rowErr.message || "Failed to process row.",
        });
      }
    }

    logger.info(
      `[Certificate Bulk] Batch completed: ${results.length} succeeded, ${errors.length} failed out of ${rowsToProcess.length} rows.`
    );

    return res.status(200).json({
      success: true,
      message: `Bulk processing completed: ${results.length} issued, ${errors.length} failed.`,
      data: {
        totalRows: rowsToProcess.length,
        successCount: results.length,
        errorCount: errors.length,
        certificates: results,
        errors,
      },
    });
  } catch (error) {
    const err = new errorClass(false, 500, "Unable to process bulk certificates", "Bulk cert generation failed", error);
    next(err);
  }
};

/**
 * GET /api/certificates/template/excel
 * Generates and downloads a clean Excel template with headers and sample rows.
 */
export const downloadExcelTemplate = async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Software Developers' Community";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Certificates_Import");

    worksheet.columns = [
      { header: "Full Name", key: "holderName", width: 28 },
      { header: "Position", key: "courseOrTitle", width: 36 },
      { header: "Start Date", key: "startDate", width: 22 },
      { header: "End Date", key: "endDate", width: 22 },
      { header: "Certificate Type", key: "certificateType", width: 26 },
      { header: "Certificate ID", key: "certificateId", width: 28 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E40AF" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 24;

    worksheet.addRow({
      holderName: "Aarav Sharma",
      courseOrTitle: "Full Stack Developer Intern",
      startDate: "2026-06-01",
      endDate: "2026-08-31",
      certificateType: "internship",
      certificateId: "SDC-INT-SAMPLE-01",
    });

    worksheet.addRow({
      holderName: "Priya Verma",
      courseOrTitle: "DevOps & Cloud Intern",
      startDate: "2026-07-01",
      endDate: "2026-09-30",
      certificateType: "internship",
      certificateId: "SDC-INT-SAMPLE-02",
    });

    worksheet.addRow({
      holderName: "Rohan Joshi",
      courseOrTitle: "Annual Hackathon 2026 - 1st Place",
      startDate: "2026-11-04",
      endDate: "",
      certificateType: "merit",
      certificateId: "SDC-MERIT-SAMPLE-03",
    });

    worksheet.addRow({
      holderName: "Ananya Gupta",
      courseOrTitle: "Keynote Speaker & Technical Mentor",
      startDate: "2026-11-04",
      endDate: "",
      certificateType: "appreciation",
      certificateId: "SDC-APPR-SAMPLE-04",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="sdc_certificate_bulk_template.xlsx"'
    );
    res.setHeader("Cache-Control", "no-cache");

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    const err = new errorClass(false, 500, "Unable to generate template", "Excel template export failed", error);
    next(err);
  }
};

/**
 * POST /api/certificates
 * Admin upload of a custom pre-made PDF certificate
 */
export const createCertificate = async (req, res, next) => {
  let uploadedCloudinaryPublicId = null;

  try {
    const { holderName, courseOrTitle, issueDate, startDate, endDate } = req.body;
    let { certificateId, certificateType } = req.body;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "PDF certificate file is required.",
      });
    }

    certificateType = certificateType || "custom";

    if (certificateId && certificateId.trim()) {
      certificateId = certificateId.trim();
    } else {
      certificateId = generateCertificateId(certificateType);
    }

    const existingCert = await Certificate.findOne({ certificateId }).lean();
    if (existingCert) {
      return res.status(409).json({
        success: false,
        message: `Certificate ID "${certificateId}" already exists.`,
      });
    }

    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, certificateId);
    uploadedCloudinaryPublicId = cloudinaryResult.public_id;

    let savedCertificate;
    try {
      const certDoc = new Certificate({
        certificateId,
        holderName: holderName.trim(),
        courseOrTitle: courseOrTitle.trim(),
        certificateType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        fileUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        status: "valid",
      });

      savedCertificate = await certDoc.save();
    } catch (dbError) {
      if (uploadedCloudinaryPublicId) {
        await deleteCloudinaryAsset(uploadedCloudinaryPublicId);
      }
      throw dbError;
    }

    const clientBaseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
    const verifyUrl = `${clientBaseUrl}/certificates/${certificateId}`;
    const qrCodeDataUrl = await generateQrDataUrl(verifyUrl);

    return res.status(201).json({
      success: true,
      message: "Certificate uploaded and registered successfully.",
      data: {
        certificate: savedCertificate,
        verifyUrl,
        qrCodeDataUrl,
      },
    });
  } catch (error) {
    const err = new errorClass(false, 500, "Unable to upload certificate", "Upload cert failed", error);
    next(err);
  }
};

/**
 * GET /api/certificates/:id
 * Public verification endpoint
 */
export const getCertificateById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Certificate ID parameter is required.",
      });
    }

    const certificate = await Certificate.findOne({ certificateId: id.trim() })
      .select("certificateId holderName courseOrTitle certificateType startDate endDate issueDate fileUrl status createdAt -_id")
      .lean();

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found; it may be invalid or the ID might be incorrect.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Certificate verified successfully.",
      data: certificate,
    });
  } catch (error) {
    const err = new errorClass(false, 500, "Unable to verify certificate", "Cert verify failed", error);
    next(err);
  }
};

/**
 * GET /api/certificates/:id/qr
 * Stream downloadable QR code PNG
 */
export const getCertificateQr = async (req, res, next) => {
  try {
    const { id } = req.params;

    const certificate = await Certificate.findOne({ certificateId: id.trim() })
      .select("certificateId")
      .lean();

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found.",
      });
    }

    const clientBaseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
    const verifyUrl = `${clientBaseUrl}/certificates/${certificate.certificateId}`;
    const pngBuffer = await generateQrPngBuffer(verifyUrl);

    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="qr-${certificate.certificateId}.png"`
    );
    res.setHeader("Content-Length", pngBuffer.length);
    res.setHeader("Cache-Control", "no-store");

    return res.end(pngBuffer);
  } catch (error) {
    const err = new errorClass(false, 500, "Unable to generate QR code", "Cert QR failed", error);
    next(err);
  }
};

/**
 * GET /api/certificates
 * Admin list with search and pagination
 */
export const listCertificates = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const search = req.query.search ? req.query.search.trim() : "";
    const type = req.query.type;

    const query = {};
    if (type && type !== "All") {
      query.certificateType = type.toLowerCase();
    }
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { holderName: regex },
        { courseOrTitle: regex },
        { certificateId: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [certificates, total] = await Promise.all([
      Certificate.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Certificate.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      data: certificates,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        limit,
      },
    });
  } catch (error) {
    const err = new errorClass(false, 500, "Unable to fetch certificates", "List certs failed", error);
    next(err);
  }
};
