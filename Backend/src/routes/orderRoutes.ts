import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Server } from 'socket.io';
import { OrderRepo } from '../repositories/orderRepo.js';
import { ProductRepo } from '../repositories/productRepo.js';
import { CouponRepo } from '../repositories/couponRepo.js';
import { AccountRepo } from '../repositories/accountRepo.js';
import { PromptPayService } from '../services/promptpayService.js';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { uploadSlip, uploadRefund, verifyUploadMagicBytes } from '../middleware/upload.js';
import { Order, OrderItem, OrderStatus, RefundInfo } from '../types/index.js';

export const orderRouter = Router();

// Zod validation schema for creating orders
const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        qty: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
        title: z.string().optional(),
      })
    )
    .min(1, 'Cart is empty.'),
  couponCode: z.string().nullish(),
  address: z.object({
    recipient: z.string().min(1, 'Recipient name is required'),
    phone: z.string().min(8, 'Valid phone number is required'),
    line1: z.string().min(1, 'Address line is required'),
    district: z.string().optional().default(''),
    province: z.string().min(1, 'Province is required'),
    postalCode: z.string().min(4, 'Postal code is required'),
  }),
  paymentMethod: z.enum(['promptpay', 'card']),
  cardDetails: z
    .object({
      cardNumber: z.string().optional(),
      cardName: z.string().optional(),
      expiry: z.string().optional(),
      cvv: z.string().optional(),
    })
    .optional(),
});

// Allowed state transitions for Admin status updates
const ALLOWED_ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['WAITING_VERIFICATION', 'PAID', 'CANCELLED'],
  WAITING_VERIFICATION: ['PAID', 'CANCELLED'],
  PAID: ['PACKING', 'CANCELLED'],
  PACKING: ['PROGRESS', 'CANCELLED'],
  PROGRESS: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED', 'REJECTED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

function emitOrderSocket(
  req: AuthenticatedRequest,
  userId: string,
  orderId: string,
  status: OrderStatus,
  note?: string,
  cancelledBy?: 'admin' | 'buyer'
) {
  const io = req.app.get('io') as Server | undefined;
  if (io) {
    io.to(`user:${userId}`).emit('order:status_changed', { orderId, status, note, cancelledBy });
    io.to('admins').emit('order:status_changed', { orderId, status, note, cancelledBy });
    if (status === 'CANCELLED' && cancelledBy === 'admin') {
      io.to(`user:${userId}`).emit('order:cancelled_by_admin', { orderId, reason: note });
    }
  }
}

/**
 * Checkout / Create Order (Requires Auth)
 */
orderRouter.post(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;

      // 1. Validate payload with Zod (P0: Issue 1.2)
      const parseResult = createOrderSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.errors[0]?.message || 'Invalid order data.',
        });
        return;
      }

      const { items, couponCode, address, paymentMethod, cardDetails } = parseResult.data;

      // 2. Atomic stock check & reservation under lock (P1: Issue 2.1)
      const deductResult = await ProductRepo.checkAndDeductStock(
        items.map((i) => ({ productId: i.productId, qty: i.qty }))
      );

      if (!deductResult.success || !deductResult.updatedProducts) {
        res.status(400).json({ error: deductResult.error || 'Failed to reserve stock.' });
        return;
      }

      let subtotal = 0;
      const orderItems: OrderItem[] = [];

      for (const item of items) {
        const product = deductResult.updatedProducts.find((p) => p.id === item.productId);
        if (!product) continue;
        const lineTotal = product.price * item.qty;
        subtotal += lineTotal;

        orderItems.push({
          productId: product.id,
          title: product.title,
          unitPrice: product.price,
          qty: item.qty,
          category: product.category,
          subcategory: product.subcategory,
          image: product.images[0] || '',
        });
      }

      // 3. Validate and compute coupon discount with per-user check (P1: Issue 2.2)
      let discount = 0;
      let appliedCoupon: string | null = null;

      if (couponCode && couponCode.trim()) {
        const couponResult = await CouponRepo.validate(
          couponCode,
          subtotal,
          user.id,
          user.collectedCoupons
        );

        if (couponResult.valid) {
          discount = couponResult.discount;
          appliedCoupon = couponCode.toUpperCase().trim();
          await CouponRepo.incrementUsed(appliedCoupon, user.id);
          await AccountRepo.removeCollectedCoupon(user.id, appliedCoupon);
        } else {
          // If coupon invalid, we can rollback stock reservation and notify
          await ProductRepo.restoreStock(
            items.map((i) => ({ productId: i.productId, qty: i.qty }))
          );
          res.status(400).json({ error: couponResult.reason || 'Invalid coupon code.' });
          return;
        }
      }

      const total = Math.max(0, subtotal - discount);
      const now = new Date().toISOString();
      const orderId = `ord_${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}_${uuidv4().slice(0, 6)}`;

      let paymentRef = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
      let paymentStatus: 'pending' | 'paid' = 'pending';
      let cardLast4: string | undefined;
      let cardBrand: string | undefined;

      if (paymentMethod === 'card') {
        // Restore stock reserved before rejecting unintegrated card method
        await ProductRepo.restoreStock(
          items.map((i) => ({ productId: i.productId, qty: i.qty }))
        );
        res.status(400).json({
          error: 'Credit/Debit card payment gateway is currently under maintenance. Please select PromptPay QR.',
        });
        return;
      }

      const initialStatus: OrderStatus = 'PENDING_PAYMENT';

      const newOrder: Order = {
        id: orderId,
        userId: user.id,
        items: orderItems,
        couponCode: appliedCoupon,
        subtotal,
        discount,
        total,
        address,
        payment: {
          method: paymentMethod,
          status: paymentStatus,
          ref: paymentRef,
          paidAt: undefined,
          last4: cardLast4,
          cardBrand,
        },
        status: initialStatus,
        history: [
          {
            status: initialStatus,
            at: now,
            by: user.username,
            note: 'Awaiting PromptPay transfer and verification',
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      await OrderRepo.create(newOrder);

      // If PromptPay, generate QR code
      let promptPayQR: { payload: string; qrDataUrl: string } | null = null;
      if (paymentMethod === 'promptpay') {
        promptPayQR = await PromptPayService.generateQR(total);
      }

      emitOrderSocket(req, user.id, newOrder.id, initialStatus);

      res.status(201).json({
        success: true,
        order: newOrder,
        promptPayQR,
      });
    } catch (err: any) {
      console.error('Checkout error:', err);
      // In case of unexpected error after stock reservation, restore stock
      if (req.body?.items && Array.isArray(req.body.items)) {
        await ProductRepo.restoreStock(
          req.body.items
            .filter((i: any) => i.productId && typeof i.qty === 'number' && i.qty > 0)
            .map((i: any) => ({ productId: i.productId, qty: i.qty }))
        ).catch(() => {});
      }
      res.status(500).json({ error: 'Failed to create order.' });
    }
  }
);

/**
 * Get PromptPay QR for an existing pending order
 */
orderRouter.get(
  '/:id/promptpay',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const order = await OrderRepo.findById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }
      if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized.' });
        return;
      }

      const qr = await PromptPayService.generateQR(order.total);
      res.json(qr);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate PromptPay QR.' });
    }
  }
);

/**
 * User: Confirm payment ("I've paid")
 */
orderRouter.post(
  '/:id/mark-paid',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const order = await OrderRepo.findById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }
      if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized.' });
        return;
      }

      if (order.status !== 'PENDING_PAYMENT') {
        res.status(400).json({ error: `Order is already ${order.status}` });
        return;
      }

      const updated = await OrderRepo.updateStatus(
        order.id,
        'WAITING_VERIFICATION',
        req.user!.username,
        'PromptPay payment transfer submitted by buyer - awaiting confirmation'
      );

      if (updated) {
        emitOrderSocket(req, order.userId, order.id, 'WAITING_VERIFICATION', 'Payment submitted, awaiting verification');
      }

      res.json({
        success: true,
        order: updated,
        message: 'Payment confirmation submitted. Staff will verify your PromptPay transfer shortly.',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to confirm payment.' });
    }
  }
);

/**
 * User: Upload PromptPay transfer slip
 */
orderRouter.post(
  '/:id/slip',
  requireAuth,
  uploadSlip.single('slip'),
  verifyUploadMagicBytes,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Please select a transfer slip image to upload.' });
        return;
      }

      const order = await OrderRepo.findById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }
      if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized.' });
        return;
      }

      if (!['PENDING_PAYMENT', 'WAITING_VERIFICATION'].includes(order.status)) {
        res.status(400).json({ error: `Cannot upload slip for order with status ${order.status}` });
        return;
      }

      const slipUrl = `/uploads/slips/${req.file.filename}`;
      await OrderRepo.updatePayment(order.id, { slipUrl });

      const updated = await OrderRepo.updateStatus(
        order.id,
        'WAITING_VERIFICATION',
        req.user!.username,
        'Transfer slip uploaded by buyer'
      );

      if (updated) {
        emitOrderSocket(req, order.userId, order.id, 'WAITING_VERIFICATION', 'Transfer slip uploaded');
      }

      res.json({
        success: true,
        order: updated,
        slipUrl,
        message: 'Slip uploaded successfully. Awaiting verification.',
      });
    } catch (err: any) {
      console.error('Slip upload error:', err);
      res.status(500).json({ error: 'Failed to upload slip.' });
    }
  }
);

/**
 * User: Cancel order (Allowed for PENDING_PAYMENT, WAITING_VERIFICATION, PAID, PACKING)
 * Disallowed once order is in transit (PROGRESS / DELIVERED / COMPLETED)
 */
orderRouter.post(
  '/:id/cancel',
  requireAuth,
  uploadRefund.single('refundImage'),
  verifyUploadMagicBytes,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const order = await OrderRepo.findById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }
      if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized.' });
        return;
      }

      // Allowed cancellation statuses: before courier picks up (PROGRESS)
      const CANCELLABLE_STATUSES: OrderStatus[] = [
        'PENDING_PAYMENT',
        'WAITING_VERIFICATION',
        'PAID',
        'PACKING',
      ];

      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        res.status(400).json({
          error: `Orders cannot be cancelled once dispatched (In Transit / Delivered). Current status: ${order.status}`,
        });
        return;
      }

      const { refundOption, bankName, accountNumber, accountName, promptPayNumber, reason } = req.body;
      let refundInfo: RefundInfo | undefined;

      // If buyer had submitted or completed payment, capture refund destination
      if (['WAITING_VERIFICATION', 'PAID', 'PACKING'].includes(order.status)) {
        let imageUrl: string | undefined;
        if (req.file) {
          imageUrl = `/uploads/refunds/${req.file.filename}`;
        }
        refundInfo = {
          option: (refundOption as any) || (req.file ? 'image' : 'promptpay'),
          bankName: bankName?.trim() || undefined,
          accountNumber: accountNumber?.trim() || undefined,
          accountName: accountName?.trim() || undefined,
          promptPayNumber: promptPayNumber?.trim() || undefined,
          imageUrl,
          reason: reason?.trim() || undefined,
          submittedAt: new Date().toISOString(),
        };
      }

      const cancelNote = refundInfo
        ? `Cancelled by buyer during ${order.status}. Refund method: ${refundInfo.option}${reason ? ` (Reason: ${reason})` : ''}`
        : `Cancelled by buyer before payment${reason ? ` (Reason: ${reason})` : ''}`;

      const updated = await OrderRepo.updateStatus(
        order.id,
        'CANCELLED',
        req.user!.username,
        cancelNote,
        refundInfo
      );

      // Restore stock for cancelled items (P1: Issue 2.3)
      await ProductRepo.restoreStock(
        order.items.map((i) => ({ productId: i.productId, qty: i.qty }))
      );

      // Rollback coupon if applied (P1: Issue 2.2)
      if (order.couponCode) {
        await CouponRepo.rollbackUsed(order.couponCode, order.userId);
        await AccountRepo.addCollectedCoupon(order.userId, order.couponCode);
      }

      if (updated) {
        emitOrderSocket(req, order.userId, order.id, 'CANCELLED', cancelNote);

        // Realtime announcement to Admin room
        const io = req.app.get('io') as Server | undefined;
        if (io) {
          io.to('admins').emit('order:cancelled_by_buyer', {
            orderId: order.id,
            previousStatus: order.status,
            refundInfo,
            buyerUsername: req.user!.username,
            total: order.total,
            cancelledAt: new Date().toISOString(),
          });
          io.to('admins').emit('order:status_changed', {
            orderId: order.id,
            status: 'CANCELLED',
            note: cancelNote,
          });
        }
      }

      res.json({
        success: true,
        order: updated,
        message: refundInfo
          ? 'Order cancelled successfully. Admin has been notified to process your refund.'
          : 'Order cancelled successfully.',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to cancel order.' });
    }
  }
);

/**
 * User: Get own orders (Order Status view)
 */
orderRouter.get(
  '/mine',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orders = await OrderRepo.getByUserId(req.user!.id);
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch user orders.' });
    }
  }
);

/**
 * User: Buyer Accept/Reject Confirmation Gate (when order is DELIVERED)
 */
orderRouter.post(
  '/:id/confirm',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { action, reason } = req.body;
      if (!action || !['accept', 'reject'].includes(action)) {
        res.status(400).json({ error: 'Action must be "accept" or "reject".' });
        return;
      }

      const order = await OrderRepo.findById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      const result = await OrderRepo.buyerConfirm(
        req.params.id,
        req.user!.id,
        action,
        reason
      );

      if (!result.success || !result.order) {
        res.status(400).json({ error: result.error || 'Failed to update order confirmation.' });
        return;
      }

      // If rejected, restore stock & rollback coupon (P1: Issue 2.3)
      if (action === 'reject') {
        await ProductRepo.restoreStock(
          order.items.map((i) => ({ productId: i.productId, qty: i.qty }))
        );
        if (order.couponCode) {
          await CouponRepo.rollbackUsed(order.couponCode, order.userId);
        }
      }

      emitOrderSocket(
        req,
        order.userId,
        order.id,
        result.order.status,
        action === 'accept' ? 'Delivery accepted by buyer' : 'Delivery rejected by buyer'
      );

      res.json({ success: true, order: result.order });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to process confirmation gate.' });
    }
  }
);

/**
 * Admin: List all orders
 */
orderRouter.get(
  '/admin/all',
  requireAuth,
  requireAdmin,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orders = await OrderRepo.getAll();
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch orders.' });
    }
  }
);

/**
 * Admin: Explicit payment verification & approval
 */
orderRouter.post(
  '/admin/:id/verify-payment',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { note } = req.body;
      const order = await OrderRepo.findById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      if (order.status !== 'WAITING_VERIFICATION' && order.status !== 'PENDING_PAYMENT') {
        res.status(400).json({
          error: `Cannot verify payment for order with status "${order.status}". Must be WAITING_VERIFICATION or PENDING_PAYMENT.`,
        });
        return;
      }

      const updated = await OrderRepo.updateStatus(
        order.id,
        'PAID',
        req.user!.username,
        note || 'Admin verified payment transaction slip'
      );

      if (updated) {
        emitOrderSocket(req, order.userId, order.id, 'PAID', 'Payment verified by admin');
      }

      res.json({ success: true, order: updated, message: 'Payment successfully verified.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to verify payment.' });
    }
  }
);

/**
 * Admin: Transition order status with State Machine Guard (P1: Issue 2.3)
 */
orderRouter.patch(
  '/admin/:id/status',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { status, note, reason } = req.body;
      const cancelReason = (note || reason || '').trim();

      const validStatuses: OrderStatus[] = [
        'PENDING_PAYMENT',
        'WAITING_VERIFICATION',
        'PAID',
        'PACKING',
        'PROGRESS',
        'DELIVERED',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
      ];

      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Invalid order status: ${status}` });
        return;
      }

      if (status === 'CANCELLED' && !cancelReason) {
        res.status(400).json({ error: 'Cancellation reason is required when admin cancels an order.' });
        return;
      }

      const order = await OrderRepo.findById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      // Check terminal states
      if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(order.status)) {
        res.status(400).json({
          error: `Cannot modify order ${order.id} because it is already in terminal state "${order.status}".`,
        });
        return;
      }

      // Validate allowed transitions
      const allowedNext = ALLOWED_ADMIN_TRANSITIONS[order.status] || [];
      if (!allowedNext.includes(status)) {
        res.status(400).json({
          error: `Invalid transition from "${order.status}" to "${status}". Allowed transitions: ${allowedNext.join(', ') || 'None'}.`,
        });
        return;
      }

      const updated = await OrderRepo.updateStatus(
        req.params.id,
        status,
        req.user!.username,
        status === 'CANCELLED' ? cancelReason : note
      );

      if (!updated) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      // If transition to CANCELLED or REJECTED, restore inventory & coupon (P1: Issue 2.3)
      if (['CANCELLED', 'REJECTED'].includes(status) && !['CANCELLED', 'REJECTED'].includes(order.status)) {
        await ProductRepo.restoreStock(
          order.items.map((i) => ({ productId: i.productId, qty: i.qty }))
        );
        if (order.couponCode) {
          await CouponRepo.rollbackUsed(order.couponCode, order.userId);
          await AccountRepo.addCollectedCoupon(order.userId, order.couponCode);
        }
      }

      emitOrderSocket(
        req,
        order.userId,
        order.id,
        status,
        status === 'CANCELLED' ? cancelReason : note,
        status === 'CANCELLED' ? 'admin' : undefined
      );

      res.json({ success: true, order: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update order status.' });
    }
  }
);
