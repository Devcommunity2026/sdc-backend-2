import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { generateQrPngBuffer } from './qrGenerator.js';

/**
 * Palette configuration for the 3 certificate types
 */
const CERT_THEMES = {
  participation: {
    primary: rgb(0.08, 0.28, 0.65),     // Deep Royal Blue
    secondary: rgb(0.12, 0.58, 0.95),   // Cyan / Sky Accent
    badgeBg: rgb(0.92, 0.96, 1.0),      // Soft Blue
    title: 'CERTIFICATE OF PARTICIPATION',
    subtitle: 'THIS IS PROUDLY PRESENTED TO',
    statement: 'for actively participating in and successfully completing',
  },
  merit: {
    primary: rgb(0.11, 0.17, 0.32),     // Deep Navy
    secondary: rgb(0.85, 0.65, 0.13),   // Burnished Gold
    badgeBg: rgb(0.99, 0.97, 0.88),     // Warm Gold Cream
    title: 'CERTIFICATE OF EXCELLENCE',
    subtitle: 'IN RECOGNITION OF OUTSTANDING PERFORMANCE PRESENTED TO',
    statement: 'for demonstrating exceptional proficiency and securing top honors in',
  },
  appreciation: {
    primary: rgb(0.06, 0.35, 0.27),     // Deep Emerald Forest
    secondary: rgb(0.18, 0.68, 0.48),   // Jade Accent
    badgeBg: rgb(0.92, 0.98, 0.95),     // Mint White
    title: 'CERTIFICATE OF APPRECIATION',
    subtitle: 'WITH SINCERE GRATITUDE PROUDLY PRESENTED TO',
    statement: 'in sincere appreciation for valuable contributions, dedication, and leadership during',
  },
};

/**
 * Format a Date object into human-readable date: "03 November 2026"
 */
const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Generates an official Certificate PDF with embedded verification QR code
 *
 * @param {Object} options
 * @param {string} options.certificateId - Unique credential identifier
 * @param {string} options.holderName - Recipient full name
 * @param {string} options.courseOrTitle - Course, event, or credential title
 * @param {Date|string} options.issueDate - Date of issuance
 * @param {('participation'|'merit'|'appreciation')} [options.certificateType='participation'] - One of the 3 supported types
 * @param {string} [options.verificationUrl] - Verification URL to encode in QR
 * @returns {Promise<Buffer>} Generated PDF as binary buffer
 */
export const generateCertificatePdf = async ({
  certificateId,
  holderName,
  courseOrTitle,
  issueDate,
  certificateType = 'participation',
  verificationUrl,
}) => {
  const normalizedType = CERT_THEMES[certificateType] ? certificateType : 'participation';
  const theme = CERT_THEMES[normalizedType];

  // Standard A4 Landscape: width 841.89 pt, height 595.28 pt
  const width = 841.89;
  const height = 595.28;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([width, height]);

  // Embed standard typography fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontTimesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Helper for centering text horizontally
  const drawCenteredText = (text, y, font, size, color) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = (width - textWidth) / 2;
    page.drawText(text, { x, y, size, font, color });
  };

  // ================= 1. BORDERS & BACKGROUND ACCENTS =================
  // Crisp off-white / ivory canvas background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.99, 0.99, 1.0),
  });

  // Outer primary decorative border (12pt from edges)
  page.drawRectangle({
    x: 16,
    y: 16,
    width: width - 32,
    height: height - 32,
    borderColor: theme.primary,
    borderWidth: 3.5,
  });

  // Inner secondary accent border (22pt from edges)
  page.drawRectangle({
    x: 23,
    y: 23,
    width: width - 46,
    height: height - 46,
    borderColor: theme.secondary,
    borderWidth: 1.2,
  });

  // Top header color accent bar
  page.drawRectangle({
    x: 25,
    y: height - 33,
    width: width - 50,
    height: 6,
    color: theme.primary,
  });

  // Bottom footer color accent bar
  page.drawRectangle({
    x: 25,
    y: 25,
    width: width - 50,
    height: 6,
    color: theme.primary,
  });

  // Corner decorative squares
  const cornerSize = 14;
  const corners = [
    { x: 23, y: 23 },
    { x: width - 23 - cornerSize, y: 23 },
    { x: 23, y: height - 23 - cornerSize },
    { x: width - 23 - cornerSize, y: height - 23 - cornerSize },
  ];
  for (const c of corners) {
    page.drawRectangle({
      x: c.x,
      y: c.y,
      width: cornerSize,
      height: cornerSize,
      color: theme.secondary,
    });
  }

  // ================= 2. ORGANIZATION BRANDING =================
  // Organization Tagline & Header
  drawCenteredText(
    "SOFTWARE DEVELOPERS' COMMUNITY",
    height - 75,
    fontHelveticaBold,
    17,
    theme.primary
  );

  drawCenteredText(
    'MEDI-CAPS UNIVERSITY • INDORE • BREAK • BUILD • MERGE',
    height - 94,
    fontHelvetica,
    9.5,
    rgb(0.35, 0.42, 0.52)
  );

  // Decorative divider below organization header
  const dividerWidth = 240;
  page.drawLine({
    start: { x: (width - dividerWidth) / 2, y: height - 106 },
    end: { x: (width + dividerWidth) / 2, y: height - 106 },
    thickness: 1.2,
    color: theme.secondary,
  });

  // ================= 3. CERTIFICATE TITLE =================
  drawCenteredText(
    theme.title,
    height - 150,
    fontHelveticaBold,
    28,
    theme.primary
  );

  // Subtitle / Presenting statement
  drawCenteredText(
    theme.subtitle,
    height - 180,
    fontHelveticaBold,
    10.5,
    rgb(0.4, 0.48, 0.58)
  );

  // ================= 4. RECIPIENT NAME =================
  const sanitizedHolderName = (holderName || 'Distinguished Participant').trim();
  drawCenteredText(
    sanitizedHolderName,
    height - 232,
    fontTimesRomanBold,
    33,
    rgb(0.08, 0.12, 0.2)
  );

  // Recipient Underline
  const nameWidth = fontTimesRomanBold.widthOfTextAtSize(sanitizedHolderName, 33);
  const underlineWidth = Math.max(nameWidth + 60, 320);
  page.drawLine({
    start: { x: (width - underlineWidth) / 2, y: height - 242 },
    end: { x: (width + underlineWidth) / 2, y: height - 242 },
    thickness: 1.5,
    color: theme.secondary,
  });

  // ================= 5. AWARD STATEMENT & COURSE / EVENT =================
  drawCenteredText(
    theme.statement,
    height - 272,
    fontTimesRomanItalic,
    13.5,
    rgb(0.28, 0.35, 0.45)
  );

  const sanitizedCourse = (courseOrTitle || 'Official Technical Program').trim();
  drawCenteredText(
    sanitizedCourse,
    height - 304,
    fontHelveticaBold,
    20,
    theme.primary
  );

  drawCenteredText(
    'conducted by Software Developers\' Community to recognize excellence, commitment, and practical skills.',
    height - 330,
    fontHelvetica,
    11,
    rgb(0.35, 0.42, 0.52)
  );

  // ================= 6. METADATA (DATE & CREDENTIAL ID) =================
  const formattedDate = formatDate(issueDate);
  const metadataY = height - 378;

  // Issue Date (Centered pill or text)
  drawCenteredText(
    `Date of Issuance: ${formattedDate}   •   Verification ID: ${certificateId}`,
    metadataY,
    fontHelveticaBold,
    10,
    rgb(0.25, 0.32, 0.42)
  );

  // ================= 7. SIGNATURES & AUTHORITY =================
  const sigY = 100;
  const sigLineWidth = 160;

  // Left Signature: Faculty Coordinator
  const leftSigX = 100;
  page.drawLine({
    start: { x: leftSigX, y: sigY },
    end: { x: leftSigX + sigLineWidth, y: sigY },
    thickness: 1,
    color: rgb(0.4, 0.45, 0.55),
  });
  page.drawText('Faculty Coordinator', {
    x: leftSigX + 18,
    y: sigY - 16,
    size: 10,
    font: fontHelveticaBold,
    color: theme.primary,
  });
  page.drawText('Medi-Caps University', {
    x: leftSigX + 22,
    y: sigY - 28,
    size: 8.5,
    font: fontHelvetica,
    color: rgb(0.45, 0.52, 0.62),
  });

  // Right Signature: Community Lead / President
  const rightSigX = width - 100 - sigLineWidth;
  page.drawLine({
    start: { x: rightSigX, y: sigY },
    end: { x: rightSigX + sigLineWidth, y: sigY },
    thickness: 1,
    color: rgb(0.4, 0.45, 0.55),
  });
  page.drawText('Community Lead / President', {
    x: rightSigX + 5,
    y: sigY - 16,
    size: 10,
    font: fontHelveticaBold,
    color: theme.primary,
  });
  page.drawText('Software Developers\' Community', {
    x: rightSigX + 10,
    y: sigY - 28,
    size: 8.5,
    font: fontHelvetica,
    color: rgb(0.45, 0.52, 0.62),
  });

  // ================= 8. VERIFICATION QR CODE EMBEDDING =================
  const fallbackVerifyUrl = `https://sdc.medicaps.ac.in/verify/${encodeURIComponent(certificateId)}`;
  const qrUrlToEncode = verificationUrl || fallbackVerifyUrl;

  try {
    const qrPngBuffer = await generateQrPngBuffer(qrUrlToEncode);
    const qrImage = await pdfDoc.embedPng(qrPngBuffer);

    const qrSize = 72;
    const qrX = (width - qrSize) / 2;
    const qrY = 56;

    // QR Code border wrapper
    page.drawRectangle({
      x: qrX - 4,
      y: qrY - 4,
      width: qrSize + 8,
      height: qrSize + 8,
      color: rgb(1, 1, 1),
      borderColor: theme.secondary,
      borderWidth: 1,
    });

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Verification caption below QR
    drawCenteredText('Scan to Verify Credential', qrY - 12, fontHelveticaBold, 7.5, theme.primary);
  } catch (qrErr) {
    console.error('[PDF Generator] QR code embed error:', qrErr);
  }

  // Finalize PDF bytes
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

export default generateCertificatePdf;
