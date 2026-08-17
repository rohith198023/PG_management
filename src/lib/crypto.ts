import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Secret key from environment or deterministic secure fallback for dev
const ENCRYPTION_KEY = process.env.PAYMENT_SECRET_KEY || process.env.NEXTAUTH_SECRET || 'pg_sas_production_encryption_key_32b!';
const KEY_BYTES = crypto.scryptSync(ENCRYPTION_KEY, 'salt_pg_sas_finance_v4', 32);

/**
 * Encrypts sensitive credentials (API keys, secret keys, webhook secrets) using AES-256-GCM.
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BYTES, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted secrets.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText) return '';
  // If plain text (fallback for unencrypted legacy), return as is
  if (!cipherText.includes(':')) return cipherText;

  try {
    const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) return cipherText;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BYTES, iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '***DECRYPTION_FAILED***';
  }
}

/**
 * Masks credentials for safe API responses and UI displays (e.g. rzp_live_************).
 */
export function maskSecret(secret: string, prefixLen = 8, suffixLen = 4): string {
  if (!secret) return '********';
  if (secret.length <= prefixLen + suffixLen) {
    return secret.substring(0, 2) + '*'.repeat(Math.max(4, secret.length - 2));
  }
  const prefix = secret.substring(0, prefixLen);
  const suffix = secret.substring(secret.length - suffixLen);
  const maskedMiddle = '*'.repeat(12);
  return `${prefix}${maskedMiddle}${suffix}`;
}
