import path from 'path';
import { ENV } from '../config/env.js';
import { JsonStore } from '../storage/jsonStore.js';
import { UserAccount, UserStatus } from '../types/index.js';

interface AccountFileSchema {
  version: number;
  accounts: UserAccount[];
}

export class AccountRepo {
  private static getFilePath(): string {
    return path.join(ENV.DATA_DIR, 'Data_account.json');
  }

  private static fallback: AccountFileSchema = {
    version: 1,
    accounts: [],
  };

  static async getAll(): Promise<UserAccount[]> {
    const data = await JsonStore.read<AccountFileSchema>(this.getFilePath(), this.fallback);
    return data.accounts;
  }

  static async findById(id: string): Promise<UserAccount | null> {
    const accounts = await this.getAll();
    return accounts.find((a) => a.id === id) || null;
  }

  static async findByEmail(email: string): Promise<UserAccount | null> {
    const accounts = await this.getAll();
    const clean = email.toLowerCase().trim();
    return accounts.find((a) => a.email.toLowerCase().trim() === clean) || null;
  }

  static async findByUsername(username: string): Promise<UserAccount | null> {
    const accounts = await this.getAll();
    const clean = username.toLowerCase().trim();
    return accounts.find((a) => a.username.toLowerCase().trim() === clean) || null;
  }

  static async findByIdentifier(identifier: string): Promise<UserAccount | null> {
    const clean = identifier.toLowerCase().trim();
    const accounts = await this.getAll();
    return (
      accounts.find(
        (a) =>
          a.email.toLowerCase().trim() === clean ||
          a.username.toLowerCase().trim() === clean
      ) || null
    );
  }

  static async create(account: UserAccount): Promise<UserAccount> {
    await JsonStore.update<AccountFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        current.accounts.push(account);
        return current;
      }
    );
    return account;
  }

  /**
   * Directly overwrites passwordHash in Data_account.json
   */
  static async updatePassword(userId: string, newPasswordHash: string): Promise<boolean> {
    let updated = false;
    await JsonStore.update<AccountFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const index = current.accounts.findIndex((a) => a.id === userId);
        if (index !== -1) {
          current.accounts[index].passwordHash = newPasswordHash;
          current.accounts[index].passwordChangedAt = new Date().toISOString();
          current.accounts[index].updatedAt = new Date().toISOString();
          updated = true;
        }
        return current;
      }
    );
    return updated;
  }

  /**
   * Directly overwrites passwordHash by email (for forgot-password flow)
   */
  static async updatePasswordByEmail(email: string, newPasswordHash: string): Promise<boolean> {
    let updated = false;
    const clean = email.toLowerCase().trim();
    await JsonStore.update<AccountFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const index = current.accounts.findIndex(
          (a) => a.email.toLowerCase().trim() === clean
        );
        if (index !== -1) {
          current.accounts[index].passwordHash = newPasswordHash;
          current.accounts[index].passwordChangedAt = new Date().toISOString();
          current.accounts[index].updatedAt = new Date().toISOString();
          updated = true;
        }
        return current;
      }
    );
    return updated;
  }

  static async updateProfile(
    userId: string,
    updates: Partial<Pick<UserAccount, 'fullName' | 'username' | 'photoUrl' | 'preferences'>>
  ): Promise<UserAccount | null> {
    let modifiedAccount: UserAccount | null = null;
    await JsonStore.update<AccountFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const index = current.accounts.findIndex((a) => a.id === userId);
        if (index !== -1) {
          current.accounts[index] = {
            ...current.accounts[index],
            ...updates,
            preferences: {
              ...current.accounts[index].preferences,
              ...(updates.preferences || {}),
            },
            updatedAt: new Date().toISOString(),
          };
          modifiedAccount = current.accounts[index];
        }
        return current;
      }
    );
    return modifiedAccount;
  }

  static async updateStatus(
    userId: string,
    status: UserStatus,
    banReason?: string | null,
    suspendedUntil?: string | null
  ): Promise<UserAccount | null> {
    let modifiedAccount: UserAccount | null = null;
    await JsonStore.update<AccountFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const index = current.accounts.findIndex((a) => a.id === userId);
        if (index !== -1) {
          current.accounts[index].status = status;
          current.accounts[index].banReason = banReason || null;
          current.accounts[index].suspendedUntil = suspendedUntil || null;
          current.accounts[index].updatedAt = new Date().toISOString();
          modifiedAccount = current.accounts[index];
        }
        return current;
      }
    );
    return modifiedAccount;
  }

  static async delete(userId: string): Promise<boolean> {
    let deleted = false;
    await JsonStore.update<AccountFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const initialLen = current.accounts.length;
        current.accounts = current.accounts.filter((a) => a.id !== userId);
        deleted = current.accounts.length < initialLen;
        return current;
      }
    );
    return deleted;
  }

  static async addCollectedCoupon(userId: string, couponId: string): Promise<boolean> {
    let added = false;
    const cleanCode = couponId.toUpperCase().trim();
    await JsonStore.update<AccountFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const account = current.accounts.find((a) => a.id === userId);
        if (account) {
          if (!account.collectedCoupons) account.collectedCoupons = [];
          if (!account.collectedCoupons.some((c) => c.toUpperCase().trim() === cleanCode)) {
            account.collectedCoupons.push(cleanCode);
            account.updatedAt = new Date().toISOString();
            added = true;
          }
        }
        return current;
      }
    );
    return added;
  }

  static async removeCollectedCoupon(userId: string, couponCode: string): Promise<boolean> {
    let removed = false;
    const cleanCode = couponCode.toUpperCase().trim();
    await JsonStore.update<AccountFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const account = current.accounts.find((a) => a.id === userId);
        if (account && account.collectedCoupons) {
          const initLen = account.collectedCoupons.length;
          account.collectedCoupons = account.collectedCoupons.filter(
            (c) => c.toUpperCase().trim() !== cleanCode
          );
          if (account.collectedCoupons.length < initLen) {
            account.updatedAt = new Date().toISOString();
            removed = true;
          }
        }
        return current;
      }
    );
    return removed;
  }
}
