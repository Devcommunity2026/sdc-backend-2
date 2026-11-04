import { customAlphabet } from 'nanoid';

// URL-safe alphanumeric alphabet (10 characters length)
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 10);

export const generateCertificateId = () => {
  return nanoid();
};
