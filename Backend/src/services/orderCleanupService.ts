import { OrderRepo } from '../repositories/orderRepo.js';
import { ProductRepo } from '../repositories/productRepo.js';
import { CouponRepo } from '../repositories/couponRepo.js';
import { AccountRepo } from '../repositories/accountRepo.js';
import { Server } from 'socket.io';

const EXPIRATION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
let cleanupInterval: NodeJS.Timeout | null = null;

export function startOrderCleanupService(io?: Server) {
  if (cleanupInterval) return;

  const runCleanup = async () => {
    try {
      const orders = await OrderRepo.getAll();
      const now = Date.now();

      for (const order of orders) {
        if (order.status === 'PENDING_PAYMENT') {
          const createdAtMs = new Date(order.createdAt).getTime();
          if (now - createdAtMs > EXPIRATION_TIMEOUT_MS) {
            console.log(`[OrderCleanup] Order ${order.id} expired (> 15 mins). Auto-cancelling...`);

            const updated = await OrderRepo.updateStatus(
              order.id,
              'CANCELLED',
              'system',
              'Automatically cancelled: PromptPay payment session expired after 15 minutes.'
            );

            if (updated) {
              // Restore reserved stock
              await ProductRepo.restoreStock(
                order.items.map((i) => ({ productId: i.productId, qty: i.qty }))
              );

              // Roll back coupon if applied
              if (order.couponCode) {
                await CouponRepo.rollbackUsed(order.couponCode, order.userId);
                await AccountRepo.addCollectedCoupon(order.userId, order.couponCode);
              }

              // Notify connected sockets
              if (io) {
                io.to(`user:${order.userId}`).emit('order:status_changed', {
                  orderId: order.id,
                  status: 'CANCELLED',
                  note: 'PromptPay session expired',
                });
                io.to('admins').emit('order:status_changed', {
                  orderId: order.id,
                  status: 'CANCELLED',
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[OrderCleanup] Error during automated order expiration check:', err);
    }
  };

  // Run initial check and set periodic timer every 60 seconds
  runCleanup();
  cleanupInterval = setInterval(runCleanup, 60 * 1000);
}
