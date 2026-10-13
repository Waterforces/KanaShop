import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/jfif': '.jpg',
  'image/png': '.png',
  'image/x-png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.jfif', '.png', '.webp', '.gif']);

function createStorage(subfolder: string) {
  const targetDir = path.join(ENV.UPLOADS_DIR, subfolder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      const rawExt = path.extname(file.originalname).toLowerCase();
      const safeExt = ALLOWED_EXTENSIONS.has(rawExt)
        ? (rawExt === '.jpeg' || rawExt === '.jfif' ? '.jpg' : rawExt)
        : (MIME_TO_EXT[file.mimetype] || '.jpg');
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      cb(null, `${uniqueSuffix}${safeExt}`);
    },
  });
}

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeAllowed = Boolean(MIME_TO_EXT[file.mimetype]) || (typeof file.mimetype === 'string' && file.mimetype.startsWith('image/'));
  const isExtAllowed = ALLOWED_EXTENSIONS.has(ext);

  if (isMimeAllowed && isExtAllowed) {
    cb(null, true);
  } else if (isExtAllowed) {
    // If extension is an image extension but browser passed generic mime type (e.g. application/octet-stream)
    cb(null, true);
  } else {
    cb(new Error('Invalid image file. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
  }
};

/**
 * Inspect file header magic bytes to verify actual image signature
 */
export function verifyFileMagicBytes(filePath: string): boolean {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return false;

    if (ext === '.jpg' || ext === '.jpeg' || ext === '.jfif') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (ext === '.png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }
    if (ext === '.gif') {
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );
    }
    if (ext === '.webp') {
      return (
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Middleware that guarantees uploaded files are verified by magic bytes.
 * If signature does not match, file is unlinked immediately.
 */
export function verifyUploadMagicBytes(req: Request, res: Response, next: NextFunction): void {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((arr: any) => {
      if (Array.isArray(arr)) files.push(...arr);
    });
  }

  for (const f of files) {
    if (f.path) {
      const isValid = verifyFileMagicBytes(f.path);
      if (!isValid) {
        try {
          fs.unlinkSync(f.path);
        } catch {}
        res.status(400).json({
          error: 'Security check failed: Uploaded file content does not match a valid image signature (Magic bytes invalid).',
        });
        return;
      }
    }
  }

  next();
}

export const uploadAvatar = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

export const uploadProduct = multer({
  storage: createStorage('products'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

export const uploadChat = multer({
  storage: createStorage('chat'),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter,
});

export const uploadSlip = multer({
  storage: createStorage('slips'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

export const uploadRefund = multer({
  storage: createStorage('refunds'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

export const uploadQrSetting = multer({
  storage: createStorage('settings'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});
