import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CouponRepo } from '../repositories/couponRepo.js';
import { AccountRepo } from '../repositories/accountRepo.js';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';

export const couponRouter = Router();

/**
 * Public: List active coupons for Coupon page
 */
couponRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await CouponRepo.getAll(false);
    res.json(coupons);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch coupons.' });
  }
});

/**
 * User: Collect coupon into user account
 */
couponRouter.post(
  '/:id/collect',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const coupon = await CouponRepo.findById(req.params.id);
      if (!coupon || !coupon.active) {
        res.status(404).json({ error: 'Coupon not found or inactive.' });
        return;
      }

      if (coupon.usedBy && coupon.usedBy.includes(user.id)) {
        res.status(400).json({ error: 'You have already used this coupon.' });
        return;
      }

      await AccountRepo.addCollectedCoupon(user.id, coupon.code);
      res.json({ success: true, message: `Coupon ${coupon.code} collected!` });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to collect coupon.' });
    }
  }
);

/**
 * Public / User: Validate single coupon on cart
 */
couponRouter.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Coupon code is required.' });
      return;
    }

    const result = await CouponRepo.validate(code, parseFloat(subtotal || '0'));
    if (!result.valid) {
      res.status(400).json({ valid: false, error: result.reason });
      return;
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to validate coupon.' });
  }
});

/**
 * Admin: List all coupons
 */
couponRouter.get('/admin/all', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await CouponRepo.getAll(true);
    res.json(coupons);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch all coupons.' });
  }
});

/**
 * Admin: Create coupon
 */
couponRouter.post('/admin', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, title, description, type, value, minSpend, maxDiscount, startsAt, expiresAt, usageLimit } = req.body;
    if (!code || !title || !type || value === undefined) {
      res.status(400).json({ error: 'Code, title, type, and value are required.' });
      return;
    }

    const newCoupon = await CouponRepo.create({
      id: `cpn_${uuidv4().slice(0, 8)}`,
      code: code.toUpperCase().trim(),
      title,
      description: description || '',
      type,
      value: parseFloat(value),
      minSpend: parseFloat(minSpend || '0'),
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
      startsAt: startsAt || new Date().toISOString(),
      expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: parseInt(usageLimit || '500', 10),
      usedCount: 0,
      active: true,
    });

    res.status(201).json(newCoupon);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create coupon.' });
  }
});

/**
 * Admin: Update coupon details and active state
 */
couponRouter.put('/admin/:id', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await CouponRepo.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }

    const { code, title, description, type, value, minSpend, maxDiscount, startsAt, expiresAt, usageLimit, active } = req.body;

    const updates: Partial<Coupon> = {};

    if (code !== undefined) {
      const cleanCode = code.toUpperCase().trim();
      const all = await CouponRepo.getAll(true);
      const collision = all.find((c) => c.id !== id && c.code.toUpperCase() === cleanCode);
      if (collision) {
        res.status(400).json({ error: `Coupon code "${cleanCode}" already exists.` });
        return;
      }
      updates.code = cleanCode;
    }

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (value !== undefined) updates.value = parseFloat(value);
    if (minSpend !== undefined) updates.minSpend = parseFloat(minSpend || '0');
    if (maxDiscount !== undefined) updates.maxDiscount = maxDiscount ? parseFloat(maxDiscount) : undefined;
    if (startsAt !== undefined) updates.startsAt = startsAt;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt;
    if (usageLimit !== undefined) updates.usageLimit = parseInt(usageLimit || '500', 10);
    if (active !== undefined) updates.active = Boolean(active);

    const updated = await CouponRepo.update(id, updates);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update coupon.' });
  }
});

/**
 * Admin: Toggle coupon activate/deactivate
 */
couponRouter.patch('/admin/:id/toggle', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await CouponRepo.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }

    const nextState = !existing.active;
    const updated = await CouponRepo.update(id, { active: nextState });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle coupon status.' });
  }
});

/**
 * Admin: Delete coupon
 */
couponRouter.delete('/admin/:id', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await CouponRepo.delete(id);
    if (!success) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }
    res.json({ success: true, message: 'Coupon deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete coupon.' });
  }
});
