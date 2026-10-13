import path from 'path';
import { ENV } from '../config/env.js';
import { JsonStore } from '../storage/jsonStore.js';
import { Coupon } from '../types/index.js';

interface CouponsFileSchema {
  coupons: Coupon[];
}

export class CouponRepo {
  private static getFilePath(): string {
    return path.join(ENV.DATA_DIR, 'coupons.json');
  }

  private static fallback: CouponsFileSchema = {
    coupons: [],
  };

  static async getAll(includeInactive = false): Promise<Coupon[]> {
    const data = await JsonStore.read<CouponsFileSchema>(this.getFilePath(), this.fallback);
    if (includeInactive) return data.coupons;
    return data.coupons.filter((c) => c.active);
  }

  static async findById(id: string): Promise<Coupon | null> {
    const coupons = await this.getAll(true);
    return coupons.find((c) => c.id === id) || null;
  }

  static async findByCode(code: string): Promise<Coupon | null> {
    const clean = code.toUpperCase().trim();
    const coupons = await this.getAll(false);
    return coupons.find((c) => c.code.toUpperCase() === clean) || null;
  }

  static async validate(
    code: string,
    subtotal: number,
    userId?: string,
    collectedCoupons?: string[]
  ): Promise<{ valid: boolean; discount: number; reason?: string; coupon?: Coupon }> {
    const coupon = await this.findByCode(code);
    if (!coupon) {
      return { valid: false, discount: 0, reason: 'Coupon code not found' };
    }

    const cleanCode = coupon.code.toUpperCase().trim();

    // Check if user has collected this coupon
    if (collectedCoupons && !collectedCoupons.includes(cleanCode)) {
      return {
        valid: false,
        discount: 0,
        reason: 'You must collect this coupon in the Coupons page before using it.',
      };
    }

    // Check per-user usage
    if (userId && coupon.usedBy && coupon.usedBy.includes(userId)) {
      return {
        valid: false,
        discount: 0,
        reason: 'You have already used this coupon.',
      };
    }

    const now = new Date().toISOString();
    if (coupon.startsAt && now < coupon.startsAt) {
      return { valid: false, discount: 0, reason: 'Coupon is not active yet' };
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      return { valid: false, discount: 0, reason: 'Coupon has expired' };
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, discount: 0, reason: 'Coupon usage limit reached' };
    }
    if (subtotal < coupon.minSpend) {
      return {
        valid: false,
        discount: 0,
        reason: `Minimum spend of ฿${coupon.minSpend.toLocaleString()} required`,
      };
    }

    let discount = 0;
    if (coupon.type === 'percent') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount && coupon.maxDiscount > 0) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = Math.min(coupon.value, subtotal);
    }

    return { valid: true, discount: Math.round(discount), coupon };
  }

  static async incrementUsed(code: string, userId?: string): Promise<void> {
    const clean = code.toUpperCase().trim();
    await JsonStore.update<CouponsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const coupon = current.coupons.find((c) => c.code.toUpperCase() === clean);
        if (coupon) {
          coupon.usedCount += 1;
          if (userId) {
            if (!coupon.usedBy) coupon.usedBy = [];
            if (!coupon.usedBy.includes(userId)) coupon.usedBy.push(userId);
          }
        }
        return current;
      }
    );
  }

  static async rollbackUsed(code: string, userId?: string): Promise<void> {
    const clean = code.toUpperCase().trim();
    await JsonStore.update<CouponsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const coupon = current.coupons.find((c) => c.code.toUpperCase() === clean);
        if (coupon) {
          coupon.usedCount = Math.max(0, coupon.usedCount - 1);
          if (userId && coupon.usedBy) {
            coupon.usedBy = coupon.usedBy.filter((id) => id !== userId);
          }
        }
        return current;
      }
    );
  }

  static async create(coupon: Coupon): Promise<Coupon> {
    await JsonStore.update<CouponsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        current.coupons.push(coupon);
        return current;
      }
    );
    return coupon;
  }

  static async update(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    let updatedCoupon: Coupon | null = null;
    await JsonStore.update<CouponsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const index = current.coupons.findIndex((c) => c.id === id);
        if (index !== -1) {
          current.coupons[index] = { ...current.coupons[index], ...updates };
          updatedCoupon = current.coupons[index];
        }
        return current;
      }
    );
    return updatedCoupon;
  }

  static async delete(id: string): Promise<boolean> {
    let deleted = false;
    await JsonStore.update<CouponsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const initial = current.coupons.length;
        current.coupons = current.coupons.filter((c) => c.id !== id);
        deleted = current.coupons.length < initial;
        return current;
      }
    );
    return deleted;
  }
}
