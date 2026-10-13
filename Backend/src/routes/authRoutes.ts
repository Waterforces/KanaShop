import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env.js';
import { AccountRepo } from '../repositories/accountRepo.js';
import { CryptoService } from '../services/cryptoService.js';
import { PasscodeStore } from '../services/passcodeStore.js';
import { uploadAvatar, verifyUploadMagicBytes } from '../middleware/upload.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { UserAccount, ThaiIdData } from '../types/index.js';

export const authRouter = Router();

/**
 * Register
 */
authRouter.post(
  '/register',
  authRateLimiter,
  uploadAvatar.single('photo'),
  verifyUploadMagicBytes,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        fullName,
        email,
        phone,
        thaiId,
        username,
        password,
        confirmPassword,
        photoUrl: bodyPhotoUrl,
      } = req.body;

      if (!fullName || !email || !phone || !username || !password) {
        res.status(400).json({ error: 'Full name, email, phone, username, and password are required.' });
        return;
      }

      if (password !== confirmPassword) {
        res.status(400).json({ error: 'Passwords do not match.' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters.' });
        return;
      }

      // Check Thai ID if provided (optional)
      let thaiIdData: ThaiIdData = { masked: '', cipher: '' };
      if (thaiId && typeof thaiId === 'string' && thaiId.trim()) {
        const cleanThaiId = thaiId.replace(/[^0-9]/g, '');
        if (!CryptoService.validateThaiId(cleanThaiId)) {
          res.status(400).json({
            error: 'Invalid Thai National ID card number (failed checksum validation).',
          });
          return;
        }

        const idHash = CryptoService.hashThaiId(cleanThaiId);
        const allAccounts = await AccountRepo.getAll();
        const existingThaiId = allAccounts.find(
          (a) =>
            (a.thaiId?.hashIndex && a.thaiId.hashIndex === idHash) ||
            (a.thaiId?.cipher && CryptoService.decrypt(a.thaiId.cipher) === cleanThaiId)
        );
        if (existingThaiId) {
          res.status(400).json({ error: 'Thai National ID is already registered.' });
          return;
        }

        thaiIdData = {
          masked: CryptoService.maskThaiId(cleanThaiId),
          cipher: CryptoService.encrypt(cleanThaiId),
          hashIndex: idHash,
        };
      }

      // Uniqueness checks in Data_account.json
      const existingEmail = await AccountRepo.findByEmail(email);
      if (existingEmail) {
        res.status(400).json({ error: 'Email is already registered.' });
        return;
      }

      const existingUsername = await AccountRepo.findByUsername(username);
      if (existingUsername) {
        res.status(400).json({ error: 'Username is already taken.' });
        return;
      }

      const allAccounts = await AccountRepo.getAll();

      // Determine avatar photo URL
      let photoUrl = bodyPhotoUrl || '';
      if (req.file) {
        photoUrl = `/uploads/avatars/${req.file.filename}`;
      }
      if (!photoUrl) {
        photoUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user account
      const newAccount: UserAccount = {
        id: `usr_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
        role: allAccounts.length === 0 ? 'admin' : 'user', // first user is admin if empty
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        photoUrl,
        thaiId: thaiIdData,
        username: username.toLowerCase().trim(),
        passwordHash,
        status: 'active',
        suspendedUntil: null,
        banReason: null,
        preferences: { theme: 'light' },
        collectedCoupons: ['CPN-WELCOME10'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        passwordChangedAt: null,
        lastLoginAt: null,
      };

      await AccountRepo.create(newAccount);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully. Please log in.',
        userId: newAccount.id,
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Internal server error during registration.' });
    }
  }
);

/**
 * Login
 */
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: 'Please enter both username/email and password.' });
      return;
    }

    const account = await AccountRepo.findByIdentifier(identifier);
    if (!account) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }

    // Step 1: Validate password first to prevent account enumeration
    const passwordValid = await bcrypt.compare(password, account.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }

    // Step 2: Check account status only after valid password authentication
    if (account.status === 'banned') {
      res.status(403).json({
        error: 'Your account has been banned.',
        reason: account.banReason || 'Administrative suspension',
      });
      return;
    }

    if (account.status === 'suspended' && account.suspendedUntil) {
      const now = new Date();
      const suspendedUntil = new Date(account.suspendedUntil);
      if (now < suspendedUntil) {
        res.status(403).json({
          error: `Your account is suspended until ${suspendedUntil.toLocaleDateString()}.`,
          reason: account.banReason || 'Policy violation',
        });
        return;
      } else {
        await AccountRepo.updateStatus(account.id, 'active');
        account.status = 'active';
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: account.id, role: account.role },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const safeUser = {
      id: account.id,
      role: account.role,
      fullName: account.fullName,
      email: account.email,
      phone: account.phone,
      photoUrl: account.photoUrl,
      maskedThaiId: account.thaiId.masked,
      username: account.username,
      preferences: account.preferences,
      collectedCoupons: account.collectedCoupons,
      createdAt: account.createdAt,
    };

    res.json({
      success: true,
      message: 'Logged in successfully.',
      user: safeUser,
      token,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * Logout
 */
authRouter.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * Current Session
 */
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  res.json({
    id: user.id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    photoUrl: user.photoUrl,
    maskedThaiId: user.thaiId.masked,
    username: user.username,
    preferences: user.preferences,
    collectedCoupons: user.collectedCoupons,
    status: user.status,
    createdAt: user.createdAt,
  });
});

/**
 * Forgot Password - Step 1: Send Passcode (5-min cooldown)
 */
authRouter.post('/forgot/send', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const account = await AccountRepo.findByEmail(cleanEmail);

    // If account doesn't exist, we still simulate success to avoid email harvesting
    if (!account) {
      res.json({
        success: true,
        message: 'If the email exists, a 6-digit passcode has been sent.',
        cooldownSeconds: 300,
      });
      return;
    }

    const gen = PasscodeStore.generatePasscode(cleanEmail);
    if (!gen.success) {
      res.status(429).json({
        error: `Please wait ${gen.cooldownRemainingSeconds} seconds before requesting a new passcode.`,
        retryAfter: gen.cooldownRemainingSeconds,
      });
      return;
    }

    // Console output for immediate developer & user testing
    console.log('\n======================================================');
    console.log(`[PASSCODE] Forgot password verification code for ${cleanEmail}:`);
    console.log(`>>> ${gen.code} <<< (valid for 10 minutes)`);
    console.log('======================================================\n');

    res.json({
      success: true,
      message: 'A 6-digit passcode has been sent to your email. (In dev mode, check terminal console)',
      cooldownSeconds: 300,
    });
  } catch (err: any) {
    console.error('Forgot send error:', err);
    res.status(500).json({ error: 'Internal server error sending passcode.' });
  }
});

/**
 * Forgot Password - Step 2: Verify Passcode
 */
authRouter.post('/forgot/verify', authRateLimiter, (req: Request, res: Response): void => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: 'Email and passcode are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const result = PasscodeStore.verifyPasscode(cleanEmail, code);

    if (!result.success) {
      res.status(400).json({ error: result.error || 'Verification failed.' });
      return;
    }

    res.json({
      success: true,
      message: 'Passcode verified successfully.',
      resetToken: result.resetToken,
    });
  } catch (err: any) {
    console.error('Forgot verify error:', err);
    res.status(500).json({ error: 'Internal server error verifying passcode.' });
  }
});

/**
 * Forgot Password - Step 3: Reset Password
 * Directly overwrites passwordHash in Data_account.json!
 * NO password_resets.json file is ever created!
 */
authRouter.post('/forgot/reset', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      res.status(400).json({ error: 'Email, reset token, and new password are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const isValid = PasscodeStore.validateResetToken(cleanEmail, resetToken);
    if (!isValid) {
      res.status(400).json({ error: 'Invalid or expired reset token. Please restart.' });
      return;
    }

    // Overwrite password in Data_account.json
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    const updated = await AccountRepo.updatePasswordByEmail(cleanEmail, newPasswordHash);

    if (!updated) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    // Clear in-memory passcode entry
    PasscodeStore.clear(cleanEmail);

    console.log(`[PASSCODE] Successfully updated password in Data_account.json for ${cleanEmail}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (err: any) {
    console.error('Forgot reset error:', err);
    res.status(500).json({ error: 'Internal server error resetting password.' });
  }
});
