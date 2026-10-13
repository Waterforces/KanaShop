import path from 'path';
import { ENV } from '../config/env.js';
import { JsonStore } from '../storage/jsonStore.js';

export interface PaymentSettings {
  promptPayId: string;
  accountName: string;
  bankName: string;
  qrImageUrl?: string;
  rawPayload?: string;
  updatedAt: string;
}

interface SettingsFileSchema {
  payment: PaymentSettings;
}

export class SettingsRepo {
  private static getFilePath(): string {
    return path.join(ENV.DATA_DIR, 'settings.json');
  }

  private static fallback: SettingsFileSchema = {
    payment: {
      promptPayId: ENV.PROMPTPAY_ID || '0812345678',
      accountName: 'KanaShop Official',
      bankName: 'PromptPay / Kasikorn Bank',
      updatedAt: new Date().toISOString(),
    },
  };

  /**
   * Get current store payment settings
   */
  static async getPaymentSettings(): Promise<PaymentSettings> {
    const data = await JsonStore.read<SettingsFileSchema>(this.getFilePath(), this.fallback);
    return data.payment || this.fallback.payment;
  }

  /**
   * Update payment settings
   */
  static async updatePaymentSettings(
    update: Partial<PaymentSettings>
  ): Promise<PaymentSettings> {
    let result: PaymentSettings = this.fallback.payment;

    await JsonStore.update<SettingsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const nextPayment: any = {
          ...current.payment,
          ...update,
          updatedAt: new Date().toISOString(),
        };

        if (update.qrImageUrl === null || update.qrImageUrl === '') {
          delete nextPayment.qrImageUrl;
          delete nextPayment.rawPayload;
        }

        current.payment = nextPayment;
        result = current.payment;
        return current;
      }
    );

    return result;
  }
}
