import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CurrencyBtc,
  Package,
  ShoppingBag,
  Users,
  TrendUp,
  ArrowRight,
  QrCode,
} from '@phosphor-icons/react';
import { Order, Product, UserAccount } from '../../types/index.js';
import { PaymentQrModal } from '../../components/admin/PaymentQrModal.js';

export const AdminDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/orders/admin/all').then((r) => r.json()),
      fetch('/api/products?category=all&subcategory=all').then((r) => r.json()),
      fetch('/api/users/admin/all').then((r) => r.json()),
    ])
      .then(([ordersData, productsData, usersData]) => {
        if (Array.isArray(ordersData)) setOrders(ordersData);
        if (Array.isArray(productsData)) setProducts(productsData);
        if (Array.isArray(usersData)) setUsers(usersData);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = orders
    .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REJECTED')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingPacking = orders.filter((o) => o.status === 'PAID' || o.status === 'PACKING').length;

  return (
    <div className="space-y-8">
      {/* Title with Quick QR Settings Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-fg">Operations Dashboard</h1>
          <p className="text-xs text-fg-muted mt-1">
            High-level overview of KanaShop sales, inventory levels, and order fulfillments.
          </p>
        </div>
        <button
          onClick={() => setQrModalOpen(true)}
          type="button"
          className="py-2 px-3.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs text-fg self-start sm:self-auto"
        >
          <QrCode size={18} weight="bold" className="text-accent-token" />
          <span>Payment QR Settings (ตั้งค่า QR Code)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>Total Gross Sales</span>
            <div className="p-2 rounded-lg bg-header-active text-header">
              <TrendUp size={16} weight="bold" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-accent-token">
            ฿{totalRevenue.toLocaleString()}
          </p>
          <span className="text-[10px] text-success block">From verified paid orders</span>
        </div>

        {/* Orders to Pack */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>Orders to Pack & Ship</span>
            <div className="p-2 rounded-lg bg-warning/15 text-warning">
              <ShoppingBag size={16} weight="bold" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-fg">{pendingPacking}</p>
          <Link
            to="/admin/orders"
            className="text-[10px] font-semibold text-accent-token hover:underline flex items-center gap-1"
          >
            <span>Manage orders</span>
            <ArrowRight size={10} />
          </Link>
        </div>

        {/* Catalog Items */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>Active Products</span>
            <div className="p-2 rounded-lg bg-blue-500/15 text-blue-500">
              <Package size={16} weight="bold" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-fg">{products.length}</p>
          <Link
            to="/admin/products"
            className="text-[10px] font-semibold text-accent-token hover:underline flex items-center gap-1"
          >
            <span>View catalog</span>
            <ArrowRight size={10} />
          </Link>
        </div>

        {/* Customers */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>Registered Accounts</span>
            <div className="p-2 rounded-lg bg-purple-500/15 text-purple-500">
              <Users size={16} weight="bold" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-fg">{users.length}</p>
          <span className="text-[10px] text-fg-muted block">Stored in Data_account</span>
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-heading text-fg">Recent Customer Orders</h2>
            <p className="text-xs text-fg-muted">Latest purchases placed through the user portal.</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-accent-token hover:underline flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted/60 text-fg-muted border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-fg">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-surface-muted/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-fg">#{order.id}</td>
                  <td className="py-3 px-4">{order.address?.recipient || 'N/A'}</td>
                  <td className="py-3 px-4 font-bold text-accent-token">
                    ฿{order.total.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 uppercase text-[10px] font-semibold">
                    {order.payment.method}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-header-active text-header">
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-fg-muted text-[11px]">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-fg-muted">
                    No orders placed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};
