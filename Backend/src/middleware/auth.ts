import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AccountRepo } from '../repositories/accountRepo.js';
import { UserAccount } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: UserAccount;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token =
    req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as {
      userId: string;
      iat: number;
    };

    const user = await AccountRepo.findById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User account not found' });
      return;
    }

    // Check ban / suspension status
    if (user.status === 'banned') {
      res.status(403).json({
        error: 'Your account has been banned.',
        reason: user.banReason || 'Administrative suspension',
      });
      return;
    }

    if (user.status === 'suspended' && user.suspendedUntil) {
      const now = new Date();
      const suspendedUntil = new Date(user.suspendedUntil);
      if (now < suspendedUntil) {
        res.status(403).json({
          error: `Your account is suspended until ${suspendedUntil.toLocaleDateString()}.`,
          reason: user.banReason || 'Policy violation',
        });
        return;
      } else {
        // Automatic unsuspend
        await AccountRepo.updateStatus(user.id, 'active');
        user.status = 'active';
      }
    }

    // Invalidate token if password was changed after token issuance
    if (user.passwordChangedAt) {
      const changedAtSec = Math.floor(
        new Date(user.passwordChangedAt).getTime() / 1000
      );
      if (payload.iat < changedAtSec) {
        res.status(401).json({ error: 'Password was changed. Please log in again.' });
        return;
      }
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
}
