import QRCode from 'qrcode';

/**
 * Generate QR code as Base64 Data URL (PNG, 600px, Error Correction Level M)
 * @param {string} text - The verification URL to encode
 * @returns {Promise<string>} Base64 Data URL
 */
export const generateQrDataUrl = async (text) => {
  return QRCode.toDataURL(text, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: 'M',
    type: 'image/png',
    color: {
      dark: '#0f172a', // Slate 900
      light: '#ffffff',
    },
  });
};

/**
 * Generate QR code as raw PNG binary buffer (for streaming / downloading)
 * @param {string} text - The verification URL to encode
 * @returns {Promise<Buffer>} Binary PNG Buffer
 */
export const generateQrPngBuffer = async (text) => {
  return QRCode.toBuffer(text, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: 'M',
    type: 'png',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
};
