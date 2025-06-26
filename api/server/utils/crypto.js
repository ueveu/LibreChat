const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Ensure ENCRYPTION_KEY is always a valid 32-byte Buffer
let ENCRYPTION_KEY;
if (process.env.CRYPTO_KEY) {
  // If CRYPTO_KEY exists, convert to Buffer (handle both hex and base64)
  try {
    if (process.env.CRYPTO_KEY.length === 64) {
      // Assume hex encoding
      ENCRYPTION_KEY = Buffer.from(process.env.CRYPTO_KEY, 'hex');
    } else {
      // Assume base64 encoding
      ENCRYPTION_KEY = Buffer.from(process.env.CRYPTO_KEY, 'base64');
    }
    // Validate key length
    if (ENCRYPTION_KEY.length !== 32) {
      throw new Error('Invalid key length');
    }
  } catch (error) {
    console.warn('Invalid CRYPTO_KEY format, generating new key:', error.message);
    ENCRYPTION_KEY = crypto.randomBytes(32);
  }
} else {
  // Generate a random key and warn about persistence
  ENCRYPTION_KEY = crypto.randomBytes(32);
  console.warn('CRYPTO_KEY not set in environment. Generated random key. Data encrypted with this key will be lost on container restart.');
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @returns {Object} - Encrypted data with IV and auth tag
 */
function encryptV2(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipherGCM(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param {Object} encryptedData - Object with encrypted, iv, and authTag
 * @returns {string} - Decrypted text
 */
function decryptV2(encryptedData) {
  if (!encryptedData || !encryptedData.encrypted) return null;
  
  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipherGCM(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

module.exports = {
  encryptV2,
  decryptV2,
};