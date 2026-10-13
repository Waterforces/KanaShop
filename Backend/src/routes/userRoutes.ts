import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AccountRepo } from '../repositories/accountRepo.js';
import { MessageRepo } from '../repositories/messageRepo.js';
import { OrderRepo } from '../repositories/orderRepo.js';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { uploadAvatar, verifyUploadMagicBytes } from '../middleware/upload.js';
import { UserStatus } from '../types/index.js';

export const userRouter = Router();

/**
 * User: Update Profile (Username, Photo URL/Upload, Preferences/Theme)
 * Directly persists/overwrites in Data_account.json
 */
userRouter.patch(
  '/me',
  requireAuth,
  uploadAvatar.single('photo'),
  verifyUploadMagicBytes,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { username, fullName, theme, photoUrl: bodyPhotoUrl } = req.body;

      const updates: any = {};
      if (fullName) updates.fullName = fullName.trim();

      if (username && username.trim().toLowerCase() !== user.username) {
        const cleanUsername = username.trim().toLowerCase();
        const existing = await AccountRepo.findByUsername(cleanUsername);
        if (existing && existing.id !== user.id) {
          res.status(400).json({ error: 'Username is already taken.' });
          return;
        }
        updates.username = cleanUsername;
      }

      if (req.file) {
        updates.photoUrl = `/uploads/avatars/${req.file.filename}`;
      } else if (bodyPhotoUrl) {
        updates.photoUrl = bodyPhotoUrl.trim();
      }

      if (theme && ['light', 'dark'].includes(theme)) {
        updates.preferences = { theme };
      }

      const updated = await AccountRepo.updateProfile(user.id, updates);
      res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: {
          id: updated!.id,
          role: updated!.role,
          fullName: updated!.fullName,
          email: updated!.email,
          phone: updated!.phone,
          photoUrl: updated!.photoUrl,
          maskedThaiId: updated!.thaiId.masked,
          username: updated!.username,
          preferences: updated!.preferences,
          collectedCoupons: updated!.collectedCoupons,
        },
      });
    } catch (err: any) {
      console.error('Update profile error:', err);
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  }
);

/**
 * User: Change Password (Settings)
 * Verifies current password, then directly overwrites passwordHash in Data_account.json
 */
userRouter.patch(
  '/me/password',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required.' });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({ error: 'New passwords do not match.' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ error: 'New password must be at least 8 characters.' });
        return;
      }

      const validCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validCurrent) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      await AccountRepo.updatePassword(user.id, newHash);

      console.log(`[PASSWORD] User ${user.username} successfully updated password in Data_account.json`);

      res.json({ success: true, message: 'Password updated successfully in Data_account.json.' });
    } catch (err: any) {
      console.error('Password change error:', err);
      res.status(500).json({ error: 'Failed to update password.' });
    }
  }
);

/**
 * User: Delete Account
 */
userRouter.delete(
  '/me',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { password, confirmText } = req.body;

      if (confirmText !== 'DELETE') {
        res.status(400).json({ error: 'Please type "DELETE" to confirm account deletion.' });
        return;
      }

      const valid = await bcrypt.compare(password || '', user.passwordHash);
      if (!valid) {
        res.status(400).json({ error: 'Incorrect password.' });
        return;
      }

      await AccountRepo.delete(user.id);
      await MessageRepo.deleteConversation(user.id);
      await OrderRepo.deleteByUserId(user.id);
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.json({ success: true, message: 'Account deleted successfully.' });
    } catch (err: any) {
      console.error('Delete account error:', err);
      res.status(500).json({ error: 'Failed to delete account.' });
    }
  }
);

/**
 * Admin: Permanently Delete User Account from Data_account.json
 */
userRouter.delete(
  '/admin/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const target = await AccountRepo.findById(id);

      if (!target) {
        res.status(404).json({ error: 'Account not found in Data_account.json.' });
        return;
      }

      // Prevent admin from deleting their own active session
      if (target.id === req.user!.id) {
        res.status(400).json({ error: 'You cannot delete your own currently logged-in administrator account.' });
        return;
      }

      // If deleting an admin, ensure at least one admin remains in the system
      if (target.role === 'admin') {
        const allAccounts = await AccountRepo.getAll();
        const adminCount = allAccounts.filter((a) => a.role === 'admin').length;
        if (adminCount <= 1) {
          res.status(400).json({ error: 'Cannot delete the only remaining administrator account.' });
          return;
        }
      }

      // Hard delete user from Data_account.json
      const deleted = await AccountRepo.delete(id);
      if (!deleted) {
        res.status(500).json({ error: 'Failed to delete account from Data_account.json.' });
        return;
      }

      // Purge chat history file and remove from _index.json
      await MessageRepo.deleteConversation(id);

      // Purge orders belonging to this user
      await OrderRepo.deleteByUserId(id);

      res.json({
        success: true,
        message: `Account @${target.username} has been permanently deleted from Data_account.json.`,
      });
    } catch (err: any) {
      console.error('Admin delete user error:', err);
      res.status(500).json({ error: 'Failed to delete user account.' });
    }
  }
);

/**
 * Admin: Directory of all accounts
 */
userRouter.get(
  '/admin/all',
  requireAuth,
  requireAdmin,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accounts = await AccountRepo.getAll();
      const safeList = accounts.map((a) => ({
        id: a.id,
        role: a.role,
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        photoUrl: a.photoUrl,
        maskedThaiId: a.thaiId.masked,
        username: a.username,
        status: a.status,
        banReason: a.banReason,
        suspendedUntil: a.suspendedUntil,
        createdAt: a.createdAt,
      }));
      res.json(safeList);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch user directory.' });
    }
  }
);

/**
 * Admin: Ban or Suspend or Reactivate Account
 */
userRouter.patch(
  '/admin/:id/status',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, banReason, suspendDays } = req.body;

      if (!['active', 'suspended', 'banned'].includes(status)) {
        res.status(400).json({ error: 'Status must be active, suspended, or banned.' });
        return;
      }

      let suspendedUntil: string | null = null;
      if (status === 'suspended') {
        const days = parseInt(suspendDays || '7', 10);
        suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const updated = await AccountRepo.updateStatus(
        id,
        status as UserStatus,
        banReason,
        suspendedUntil
      );

      if (!updated) {
        res.status(404).json({ error: 'Account not found.' });
        return;
      }

      res.json({ success: true, user: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update user status.' });
    }
  }
);
