import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';
import { ENV } from '../config/env.js';
import { SettingsRepo } from '../repositories/settingsRepo.js';

export interface PromptPayQRResult {
  payload: string;
  qrDataUrl: string;
  qrImageUrl?: string;
  promptPayId: string;
  accountName: string;
  bankName: string;
}

export class PromptPayService {
  /**
   * Generates a dynamic PromptPay payload and DataURL QR code using configured store settings
   */
  static async generateQR(
    amount: number,
    customPromptPayId?: string
  ): Promise<PromptPayQRResult> {
    const settings = await SettingsRepo.getPaymentSettings();
    const targetId = customPromptPayId || settings.promptPayId || ENV.PROMPTPAY_ID;

    const payload = generatePayload(targetId, { amount });
    const qrDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#14532D', // Matching dark forest green brand tone!
        light: '#FFFFFF',
      },
    });

    return {
      payload,
      qrDataUrl,
      qrImageUrl: settings.qrImageUrl,
      promptPayId: targetId,
      accountName: settings.accountName,
      bankName: settings.bankName,
    };
  }
}
