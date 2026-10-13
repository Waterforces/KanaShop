import crypto from 'crypto';

interface PasscodeEntry {
  email: string;
  code: string;
  expiresAt: number; // 10 minutes
  lastSentAt: number; // for 5-minute cooldown
  attempts: number;
  resetToken?: string;
  resetTokenExpiresAt?: number;
}

export class PasscodeStore {
  // STRICTLY IN-MEMORY ONLY - No password_resets.json created on disk
  private static store = new Map<string, PasscodeEntry>();

  /**
   * Check cooldown and generate a 6-digit passcode
   */
  static generatePasscode(email: string): {
    success: boolean;
    cooldownRemainingSeconds?: number;
    code?: string;
  } {
    const key = email.toLowerCase().trim();
    const existing = this.store.get(key);
    const now = Date.now();

    const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown
    const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes expiry

    if (existing && now - existing.lastSentAt < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return { success: false, cooldownRemainingSeconds: remainingSeconds };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    this.store.set(key, {
      email: key,
      code,
      expiresAt: now + EXPIRY_MS,
      lastSentAt: now,
      attempts: 0,
    });

    return { success: true, code };
  }

  /**
   * Verify the 6-digit passcode
   */
  static verifyPasscode(
    email: string,
    code: string
  ): { success: boolean; error?: string; resetToken?: string } {
    const key = email.toLowerCase().trim();
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry) {
      return { success: false, error: 'No active verification code found for this email' };
    }

    if (now > entry.expiresAt) {
      this.store.delete(key);
      return { success: false, error: 'Passcode has expired. Please request a new one.' };
    }

    if (entry.attempts >= 5) {
      this.store.delete(key);
      return { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
    }

    if (entry.code !== code.trim()) {
      entry.attempts += 1;
      return { success: false, error: 'Invalid passcode. Please check and try again.' };
    }

    // Success! Generate short-lived reset token (15 mins)
    const resetToken = crypto.randomBytes(32).toString('hex');
    entry.resetToken = resetToken;
    entry.resetTokenExpiresAt = now + 15 * 60 * 1000;

    return { success: true, resetToken };
  }

  /**
   * Validate reset token before resetting password
   */
  static validateResetToken(email: string, token: string): boolean {
    const key = email.toLowerCase().trim();
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry || !entry.resetToken || !entry.resetTokenExpiresAt) {
      return false;
    }

    if (now > entry.resetTokenExpiresAt) {
      this.store.delete(key);
      return false;
    }

    return entry.resetToken === token;
  }

  /**
   * Clear passcode session after successful password overwrite
   */
  static clear(email: string): void {
    const key = email.toLowerCase().trim();
    this.store.delete(key);
  }
}
