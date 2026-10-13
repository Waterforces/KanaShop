import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const DEFAULT_JWT_SECRET = 'kanashop-secret-key-development-2026-safe-random';
const DEFAULT_ENCRYPTION_KEY = '12345678901234567890123456789012';

if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    throw new Error('[SECURITY FATAL] JWT_SECRET must be explicitly configured with a strong secret in production.');
  }
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === DEFAULT_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
    throw new Error('[SECURITY FATAL] ENCRYPTION_KEY must be a secure 32-character key in production.');
  }
} else if (!process.env.JWT_SECRET || !process.env.ENCRYPTION_KEY) {
  console.warn('[SECURITY NOTICE] Running in development mode with fallback cryptographic keys. Do NOT use these in production!');
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  JWT_SECRET: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || DEFAULT_ENCRYPTION_KEY, // 32 bytes for AES-256
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  PROMPTPAY_ID: process.env.PROMPTPAY_ID || '0812345678', // sample PromptPay merchant mobile/tax id
  DATA_DIR: path.resolve(process.cwd(), 'data'),
  UPLOADS_DIR: path.resolve(process.cwd(), 'uploads'),
};
