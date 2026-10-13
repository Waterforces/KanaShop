import path from 'path';
import { ENV } from '../config/env.js';
import { JsonStore } from '../storage/jsonStore.js';
import { Order, OrderStatus, RefundInfo } from '../types/index.js';

interface OrdersFileSchema {
  orders: Order[];
}

export class OrderRepo {
  private static getFilePath(): string {
    return path.join(ENV.DATA_DIR, 'orders.json');
  }

  private static fallback: OrdersFileSchema = {
    orders: [],
  };

  static async getAll(): Promise<Order[]> {
    const data = await JsonStore.read<OrdersFileSchema>(this.getFilePath(), this.fallback);
    return data.orders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static async findById(id: string): Promise<Order | null> {
    const orders = await this.getAll();
    return orders.find((o) => o.id === id) || null;
  }

  static async getByUserId(userId: string): Promise<Order[]> {
    const orders = await this.getAll();
    return orders.filter((o) => o.userId === userId);
  }

  static async create(order: Order): Promise<Order> {
    await JsonStore.update<OrdersFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        current.orders.unshift(order);
        return current;
      }
    );
    return order;
  }

  /**
   * Transition order status with history tracking
   */
  static async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    by: string,
    note?: string,
    refundInfo?: RefundInfo
  ): Promise<Order | null> {
    let updatedOrder: Order | null = null;
    await JsonStore.update<OrdersFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const order = current.orders.find((o) => o.id === orderId);
        if (order) {
          order.status = newStatus;
          order.updatedAt = new Date().toISOString();
          if (refundInfo) {
            order.refundInfo = refundInfo;
          }
          if (newStatus === 'CANCELLED') {
            if (note) order.cancelReason = note;
            order.cancelledBy = by === 'admin' || by.toLowerCase().includes('admin') ? 'admin' : 'buyer';
          }
          order.history.push({
            status: newStatus,
            at: new Date().toISOString(),
            by,
            note,
          });
          if (newStatus === 'PAID') {
            order.payment.status = 'paid';
            order.payment.paidAt = new Date().toISOString();
          }
          updatedOrder = order;
        }
        return current;
      }
    );
    return updatedOrder;
  }

  /**
   * Update order payment details (e.g. slipUrl, payment status)
   */
  static async updatePayment(orderId: string, payment: Partial<Order['payment']>): Promise<Order | null> {
    let updatedOrder: Order | null = null;
    await JsonStore.update<OrdersFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const order = current.orders.find((o) => o.id === orderId);
        if (order) {
          order.payment = { ...order.payment, ...payment };
          order.updatedAt = new Date().toISOString();
          updatedOrder = order;
        }
        return current;
      }
    );
    return updatedOrder;
  }

  /**
   * Buyer accept/reject confirmation gate
   */
  static async buyerConfirm(
    orderId: string,
    userId: string,
    action: 'accept' | 'reject',
    rejectionReason?: string
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    let resultOrder: Order | null = null;
    let errorMessage: string | undefined;

    await JsonStore.update<OrdersFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const order = current.orders.find((o) => o.id === orderId);
        if (!order) {
          errorMessage = 'Order not found';
          return current;
        }
        if (order.userId !== userId) {
          errorMessage = 'Unauthorized for this order';
          return current;
        }
        if (order.status !== 'DELIVERED') {
          errorMessage = `Only orders in DELIVERED state can be accepted/rejected (current: ${order.status})`;
          return current;
        }

        const now = new Date().toISOString();
        if (action === 'accept') {
          order.status = 'COMPLETED';
          order.updatedAt = now;
          order.history.push({
            status: 'COMPLETED',
            at: now,
            by: 'buyer',
            note: 'Buyer accepted delivery in good condition',
          });
        } else {
          order.status = 'REJECTED';
          order.rejectionReason = rejectionReason || 'Buyer rejected package upon inspection';
          order.updatedAt = now;
          order.history.push({
            status: 'REJECTED',
            at: now,
            by: 'buyer',
            note: order.rejectionReason,
          });
        }
        resultOrder = order;
        return current;
      }
    );

    if (errorMessage) {
      return { success: false, error: errorMessage };
    }
    return { success: true, order: resultOrder! };
  }

  /**
   * Delete all orders associated with a user ID (cascade delete on account deletion)
   */
  static async deleteByUserId(userId: string): Promise<number> {
    let count = 0;
    await JsonStore.update<OrdersFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const initial = current.orders.length;
        current.orders = current.orders.filter((o) => o.userId !== userId);
        count = initial - current.orders.length;
        return current;
      }
    );
    return count;
  }
}
