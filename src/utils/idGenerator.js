import crypto from "crypto";

/**
 * Generate a URL-safe random alphanumeric string
 * @param {number} length
 * @returns {string}
 */
export const generateRandomCode = (length = 6) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
};

/**
 * Generates an official formatted certificate ID
 * e.g., SDC-INT-2026-X8K9B2
 * @param {string} type - 'internship' | 'participation' | 'merit' | 'appreciation' | 'custom'
 * @returns {string}
 */
export const generateCertificateId = (type = "internship") => {
  const prefixMap = {
    internship: "SDC-INT",
    participation: "SDC-PART",
    merit: "SDC-MERIT",
    appreciation: "SDC-APPR",
    custom: "SDC-CERT",
  };
  const prefix = prefixMap[type?.toLowerCase()] || "SDC-CERT";
  const year = new Date().getFullYear();
  const randomSuffix = generateRandomCode(6);
  return `${prefix}-${year}-${randomSuffix}`;
};

export default generateCertificateId;
