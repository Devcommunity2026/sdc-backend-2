import multer from 'multer';

// Use memory storage - strictly do not write temporary files to disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Validate field name
  if (file.fieldname !== 'file') {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
  }

  // Validate reported MIME type
  if (file.mimetype !== 'application/pdf') {
    const error = new Error('Invalid file type. Only PDF documents (application/pdf) are permitted.');
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

export const uploadSinglePdf = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
    files: 1,
  },
  fileFilter,
}).single('file');

/**
 * Validates that the uploaded file exists and contains the valid PDF magic bytes (%PDF-)
 */
export const validatePdfBytes = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Certificate PDF file is required (field name: "file").',
      data: null,
    });
  }

  const { buffer, size } = req.file;

  if (!buffer || buffer.length < 5 || size === 0) {
    return res.status(400).json({
      success: false,
      message: 'Uploaded file is empty or corrupted.',
      data: null,
    });
  }

  // PDF files must start with ASCII '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D)
  const magicBytes = buffer.subarray(0, 5).toString('ascii');
  if (magicBytes !== '%PDF-') {
    return res.status(400).json({
      success: false,
      message: 'File integrity check failed: The uploaded file does not have a valid PDF header signature (%PDF-).',
      data: null,
    });
  }

  next();
};

/**
 * Multer handler for Excel files (.xlsx, .xls, .csv)
 */
export const uploadSingleExcel = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const isExcel =
      file.mimetype.includes('spreadsheetml') ||
      file.mimetype.includes('excel') ||
      file.mimetype.includes('csv') ||
      file.originalname.match(/\.(xlsx|xls|csv)$/i);
    if (isExcel) {
      cb(null, true);
    } else {
      const err = new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are permitted.');
      err.statusCode = 400;
      cb(err, false);
    }
  },
}).single('file');

/**
 * Validates that an Excel file was uploaded
 */
export const validateExcelFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Excel spreadsheet or CSV file is required (field name: "file").',
      data: null,
    });
  }

  if (!req.file.buffer || req.file.buffer.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Uploaded spreadsheet file is empty.',
      data: null,
    });
  }

  next();
};
