import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import fs from 'fs';

import path from 'path';

export interface DecodedQRInfo {
  rawPayload: string;
  isPromptPay: boolean;
  promptPayType?: 'phone' | 'nationalId' | 'wallet' | 'biller' | 'unknown';
  promptPayId?: string;
  croppedFilePath?: string;
  croppedFileUrl?: string;
}

export class QRDecoderService {
  /**
   * Decodes a QR code from a file on disk and automatically crops ONLY the QR code
   */
  static async decodeFromFile(filePath: string): Promise<DecodedQRInfo | null> {
    try {
      if (!fs.existsSync(filePath)) return null;
      const image = await Jimp.read(filePath);

      // Attempt 1: Native resolution
      let code = this.attemptJsQr(image);
      let scaleRatio = 1;

      // Attempt 2: If failed and image is large (> 800px), resize down to find code
      if (!code && (image.bitmap.width > 800 || image.bitmap.height > 800)) {
        try {
          const resized = image.clone();
          const targetW = 600;
          scaleRatio = image.bitmap.width / targetW;
          resized.resize({ w: targetW });
          code = this.attemptJsQr(resized);
        } catch {}
      }

      // Attempt 3: If still failed and image is very large, try 400px
      if (!code && (image.bitmap.width > 1200 || image.bitmap.height > 1200)) {
        try {
          const resizedSmall = image.clone();
          const targetW = 400;
          scaleRatio = image.bitmap.width / targetW;
          resizedSmall.resize({ w: targetW });
          code = this.attemptJsQr(resizedSmall);
        } catch {}
      }

      let croppedFilePath: string | undefined;
      let croppedFileUrl: string | undefined;

      // If QR location is detected, crop ONLY the QR code with a clean margin
      if (code && code.location) {
        try {
          const loc = code.location;
          const xs = [
            loc.topLeftCorner.x * scaleRatio,
            loc.topRightCorner.x * scaleRatio,
            loc.bottomLeftCorner.x * scaleRatio,
            loc.bottomRightCorner.x * scaleRatio,
          ];
          const ys = [
            loc.topLeftCorner.y * scaleRatio,
            loc.topRightCorner.y * scaleRatio,
            loc.bottomLeftCorner.y * scaleRatio,
            loc.bottomRightCorner.y * scaleRatio,
          ];

          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          // Add a neat quiet zone margin
          const margin = 20;
          const cropX = Math.max(0, Math.floor(minX - margin));
          const cropY = Math.max(0, Math.floor(minY - margin));
          const cropW = Math.min(image.bitmap.width - cropX, Math.ceil(maxX - minX + margin * 2));
          const cropH = Math.min(image.bitmap.height - cropY, Math.ceil(maxY - minY + margin * 2));

          const cropped = image.clone();
          cropped.crop({ x: cropX, y: cropY, w: cropW, h: cropH });

          const dir = path.dirname(filePath);
          const ext = path.extname(filePath);
          const base = path.basename(filePath, ext);
          const croppedFileName = `cropped-${base}.png`;
          croppedFilePath = path.join(dir, croppedFileName);
          await (cropped as any).write(croppedFilePath);
          croppedFileUrl = `/uploads/settings/${croppedFileName}`;
        } catch (cropErr) {
          console.error('[QRDecoderService] Crop failed:', cropErr);
        }
      }

      if (!code || !code.data) {
        return null;
      }

      const raw = code.data;
      const promptPayInfo = this.extractPromptPayInfo(raw);

      return {
        rawPayload: raw,
        isPromptPay: Boolean(promptPayInfo),
        promptPayType: promptPayInfo?.type || 'unknown',
        promptPayId: promptPayInfo?.id,
        croppedFilePath,
        croppedFileUrl,
      };
    } catch (err) {
      console.error('[QRDecoderService] Error reading file:', err);
      return null;
    }
  }

  private static attemptJsQr(img: any) {
    try {
      const width = img.bitmap.width;
      const height = img.bitmap.height;
      const data = new Uint8ClampedArray(img.bitmap.data);
      return jsQR(data, width, height, {
        inversionAttempts: 'attemptBoth',
      });
    } catch {
      return null;
    }
  }

  /**
   * Parse PromptPay EMVCo Tag 29 / 30 / 31 structure or alternate promptpay QR formats
   */
  private static extractPromptPayInfo(
    raw: string
  ): { type: 'phone' | 'nationalId' | 'wallet' | 'biller'; id: string } | null {
    // 1. Mobile phone EMVCo: Subtag 01, length 13, starts with 0066
    const phoneMatch = raw.match(/01130066(\d{9})/);
    if (phoneMatch) {
      return { type: 'phone', id: '0' + phoneMatch[1] };
    }

    // 2. National ID / Tax ID EMVCo: Subtag 02, length 13
    const idMatch = raw.match(/0213(\d{13})/);
    if (idMatch) {
      return { type: 'nationalId', id: idMatch[1] };
    }

    // 3. E-Wallet ID EMVCo: Subtag 03, length 15
    const walletMatch = raw.match(/0315(\d{15})/);
    if (walletMatch) {
      return { type: 'wallet', id: walletMatch[1] };
    }

    // 4. Biller ID (Tag 30 / 31 with Aid A000000677010112)
    const billerMatch = raw.match(/A000000677010112(?:01|02)(\d{2})(\d+)/);
    if (billerMatch) {
      return { type: 'biller', id: billerMatch[2] };
    }

    // 5. promptpay.io URL or promptpay:// format: e.g. https://promptpay.io/0812345678/100
    const urlMatch = raw.match(/promptpay(?:\.io|\:\/\/)\/?(0\d{9}|\d{13})/i);
    if (urlMatch) {
      const val = urlMatch[1];
      if (val.length === 10) return { type: 'phone', id: val };
      if (val.length === 13) return { type: 'nationalId', id: val };
    }

    // 6. Direct phone number or Thai ID embedded in QR
    const directPhone = raw.trim().match(/^(0[689]\d{8})$/);
    if (directPhone) {
      return { type: 'phone', id: directPhone[1] };
    }

    const directId = raw.trim().match(/^(\d{13})$/);
    if (directId) {
      return { type: 'nationalId', id: directId[1] };
    }

    return null;
  }
}
