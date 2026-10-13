import crypto from 'crypto';
import { ENV } from '../config/env.js';

export class CryptoService {
  /**
   * Validate Thai National ID 13-digit checksum
   */
  static validateThaiId(id: string): boolean {
    const cleanId = id.replace(/[^0-9]/g, '');
    if (cleanId.length !== 13) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanId.charAt(i), 10) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(cleanId.charAt(12), 10);
  }

  /**
   * Deterministic blind index hash using HMAC-SHA256 for O(1) deduplication
   * without decrypting all database records in memory.
   */
  static hashThaiId(cleanId: string): string {
    return crypto
      .createHmac('sha256', ENV.ENCRYPTION_KEY)
      .update(cleanId)
      .digest('hex');
  }

  /**
   * Mask Thai ID for display: X-XXXX-XXXXX-XX-X -> 1-2345-XXXXX-89-0
   */
  static maskThaiId(id: string): string {
    const digits = id.replace(/[^0-9]/g, '');
    if (digits.length !== 13) return id;
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-xxxxx-${digits.slice(10, 12)}-${digits.slice(12)}`;
  }

  /**
   * Format Thai ID as X-XXXX-XXXXX-XX-X
   */
  static formatThaiId(id: string): string {
    const digits = id.replace(/[^0-9]/g, '');
    if (digits.length !== 13) return digits;
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
  }

  /**
   * Encrypt using AES-256-GCM
   */
  static encrypt(text: string): string {
    const key = crypto.createHash('sha256').update(ENV.ENCRYPTION_KEY).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('base64'),
      data: encrypted,
      tag: authTag.toString('base64'),
    });
  }

  /**
   * Decrypt using AES-256-GCM
   */
  static decrypt(cipherJson: string): string {
    try {
      const { iv, data, tag } = JSON.parse(cipherJson);
      const key = crypto.createHash('sha256').update(ENV.ENCRYPTION_KEY).digest();
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      let decrypted = decipher.update(data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '';
    }
  }
}
