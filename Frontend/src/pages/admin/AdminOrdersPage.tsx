import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Eye,
  Warning,
  X,
  QrCode,
  UploadSimple,
} from '@phosphor-icons/react';
import { Order, OrderStatus, PaymentSettings } from '../../types/index.js';
import { io } from 'socket.io-client';
import { PaymentQrModal } from '../../components/admin/PaymentQrModal.js';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelAlert, setCancelAlert] = useState<{ orderId: string; reason?: string; refundInfo?: any } | null>(null);

  // Admin cancel dialog state
  const [cancellingOrderTarget, setCancellingOrderTarget] = useState<Order | null>(null);
  const [adminCancelReason, setAdminCancelReason] = useState('');
  const [cancellingLoading, setCancellingLoading] = useState(false);

  // Store QR & Payment Settings state
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders/admin/all', { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/settings/payment', { credentials: 'include' });
      if (res.ok) {
        const data: PaymentSettings = await res.json();
        setPaymentSettings(data);
      }
    } catch (e) {
      console.error('Failed to fetch payment settings:', e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPaymentSettings();

    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('order:status_changed', () => {
      fetchOrders();
    });

    socket.on('order:cancelled_by_buyer', (payload: any) => {
      fetchOrders();
      setCancelAlert(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);


  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus, note?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/admin/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, note }),
      });

      if (res.ok) {
        await fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          const updated = await (await fetch(`/api/orders/admin/all`)).json();
          setSelectedOrder(updated.find((o: Order) => o.id === orderId) || null);
        }
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update order status');
      }
    } catch {
      alert('Error updating order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminConfirmCancel = async () => {
    if (!cancellingOrderTarget) return;
    if (!adminCancelReason.trim()) {
      alert('Please enter a cancellation reason. This reason will be sent to the customer.');
      return;
    }

    setCancellingLoading(true);
    try {
      const res = await fetch(`/api/orders/admin/${cancellingOrderTarget.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          reason: adminCancelReason.trim(),
        }),
      });

      if (res.ok) {
        setCancellingOrderTarget(null);
        setAdminCancelReason('');
        await fetchOrders();
        if (selectedOrder && selectedOrder.id === cancellingOrderTarget.id) {
          const updated = await (await fetch(`/api/orders/admin/all`)).json();
          setSelectedOrder(updated.find((o: Order) => o.id === cancellingOrderTarget.id) || null);
        }
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to cancel order.');
      }
    } catch {
      alert('Error cancelling order.');
    } finally {
      setCancellingLoading(false);
    }
  };

  const filteredOrders =
    filterStatus === 'all'
      ? orders
      : orders.filter((o) => o.status === filterStatus);

  const countByStatus = (st: string) => orders.filter((o) => o.status === st).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-fg">Order Management & Fulfillment</h1>
          <p className="text-xs text-fg-muted mt-1">
            Transition shipments through Packing → Delivered → Completed, with buyer accept/reject gate tracking.
          </p>
        </div>

        <button
          onClick={() => {
            fetchPaymentSettings();
            setSettingsModalOpen(true);
          }}
          type="button"
          className="self-start sm:self-auto py-2.5 px-4 rounded-xl bg-header-active border border-header text-header text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <QrCode size={18} weight="bold" />
          <span>Payment QR Settings (ตั้งค่า QR Code)</span>
        </button>
      </div>

      {/* Realtime Cancelled Order Alert Banner */}
      {cancelAlert && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Warning size={20} weight="bold" className="shrink-0" />
            <div>
              <p className="font-bold">
                Order #{cancelAlert.orderId} was cancelled by buyer!
              </p>
              <p className="text-[11px] text-fg-muted mt-0.5">
                {cancelAlert.refundInfo
                  ? `Refund destination: ${cancelAlert.refundInfo.option.toUpperCase()} — Please inspect details.`
                  : 'Order cancelled before payment.'}
                {cancelAlert.reason ? ` Reason: "${cancelAlert.reason}"` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const ord = orders.find((o) => o.id === cancelAlert.orderId);
                if (ord) setSelectedOrder(ord);
                setCancelAlert(null);
              }}
              type="button"
              className="px-3 py-1.5 rounded-lg bg-danger text-white font-bold text-[11px] hover:opacity-90 cursor-pointer transition-opacity"
            >
              View Refund Details
            </button>
            <button
              onClick={() => setCancelAlert(null)}
              type="button"
              className="p-1 rounded-lg hover:bg-danger/20 text-danger cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
        {[
          { key: 'all', label: 'All Orders', count: orders.length },
          { key: 'WAITING_VERIFICATION', label: 'Verifying Slip (รอตรวจสลิป)', count: countByStatus('WAITING_VERIFICATION') },
          { key: 'PAID', label: 'Paid (To Pack)', count: countByStatus('PAID') },
          { key: 'PACKING', label: 'Packing', count: countByStatus('PACKING') },
          { key: 'PROGRESS', label: 'In Transit (Progress)', count: countByStatus('PROGRESS') },
          { key: 'DELIVERED', label: 'Delivered (Awaiting Buyer)', count: countByStatus('DELIVERED') },
          { key: 'COMPLETED', label: 'Completed', count: countByStatus('COMPLETED') },
          { key: 'REJECTED', label: 'Rejected by Buyer', count: countByStatus('REJECTED') },
          { key: 'CANCELLED', label: 'Cancelled / Refund', count: countByStatus('CANCELLED') },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterStatus(tab.key)}
            className={`pb-2.5 px-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
              filterStatus === tab.key
                ? 'border-accent-token text-accent-token'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <span>{tab.label}</span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-surface-muted">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted/60 text-fg-muted border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">State Transition</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-fg">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold">#{order.id}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold">{order.address?.recipient || 'N/A'}</p>
                    <p className="text-[10px] text-fg-muted">{order.address?.phone}</p>
                  </td>
                  <td className="py-3 px-4">
                    {order.items.map((i) => `${i.title} (×${i.qty})`).join(', ')}
                  </td>
                  <td className="py-3 px-4 font-bold text-accent-token">
                    ฿{order.total.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 uppercase text-[10px] font-semibold">
                    {order.payment.method} · {order.payment.status}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      order.status === 'WAITING_VERIFICATION'
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                        : order.status === 'CANCELLED'
                        ? 'bg-danger/15 text-danger border border-danger/30'
                        : 'bg-header-active text-header'
                    }`}>
                      {order.status === 'WAITING_VERIFICATION' ? 'VERIFYING SLIP' : order.status}
                    </span>
                    {order.payment?.slipUrl && (
                      <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                        Slip attached
                      </span>
                    )}
                    {order.refundInfo && (
                      <span className="block text-[10px] text-danger font-bold mt-0.5">
                        Refund: {order.refundInfo.option.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Action button according to state machine */}
                      {order.status === 'PENDING_PAYMENT' && (
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          Awaiting Payment
                        </span>
                      )}
                      {order.status === 'WAITING_VERIFICATION' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'PAID', 'Admin verified transfer slip')}
                          disabled={actionLoading}
                          type="button"
                          className="py-1 px-3 rounded-lg bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-700 transition-colors cursor-pointer shadow-xs"
                        >
                          Approve (PAID)
                        </button>
                      )}
                      {order.status === 'PAID' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'PACKING', 'Admin started packing order')}
                          disabled={actionLoading}
                          type="button"
                          className="py-1 px-3 rounded-lg bg-amber-500 text-white font-bold text-[11px] hover:bg-amber-600 transition-colors cursor-pointer shadow-xs"
                        >
                          Start Packing
                        </button>
                      )}
                      {order.status === 'PACKING' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'PROGRESS', 'Admin dispatched order to courier')}
                          disabled={actionLoading}
                          type="button"
                          className="py-1 px-3 rounded-lg bg-sky-500 text-white font-bold text-[11px] hover:bg-sky-600 transition-colors cursor-pointer shadow-xs"
                        >
                          Dispatch (Progress)
                        </button>
                      )}
                      {order.status === 'PROGRESS' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'DELIVERED', 'Delivered by courier')}
                          disabled={actionLoading}
                          type="button"
                          className="py-1 px-3 rounded-lg bg-indigo-500 text-white font-bold text-[11px] hover:bg-indigo-600 transition-colors cursor-pointer shadow-xs"
                        >
                          Mark Delivered
                        </button>
                      )}
                      {order.status === 'DELIVERED' && (
                        <span className="text-[10px] font-semibold text-fg-muted italic">
                          Awaiting buyer acceptance gate
                        </span>
                      )}
                      {order.status === 'COMPLETED' && (
                        <span className="text-[10px] font-semibold text-success flex items-center gap-1">
                          <CheckCircle size={13} weight="bold" />
                          <span>Finished</span>
                        </span>
                      )}
                      {order.status === 'REJECTED' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'PACKING', 'Admin re-packing replacement')}
                          disabled={actionLoading}
                          type="button"
                          className="py-1 px-3 rounded-lg bg-danger text-white font-bold text-[11px] hover:opacity-90 cursor-pointer shadow-xs"
                        >
                          Re-Ship Item
                        </button>
                      )}

                      {/* Admin Cancel button for active orders */}
                      {!['COMPLETED', 'REJECTED', 'CANCELLED'].includes(order.status) && (
                        <button
                          onClick={() => {
                            setCancellingOrderTarget(order);
                            setAdminCancelReason('');
                          }}
                          disabled={actionLoading}
                          type="button"
                          className="py-1 px-2.5 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Cancel order and provide reason"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Display for already cancelled orders */}
                      {order.status === 'CANCELLED' && (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-bold text-danger flex items-center gap-1">
                            <XCircle size={13} weight="bold" />
                            <span>Cancelled {order.cancelledBy === 'admin' ? '(By Admin)' : '(By Buyer)'}</span>
                          </div>
                          {order.cancelReason && (
                            <p className="text-[10px] text-fg-muted truncate max-w-[170px]" title={order.cancelReason}>
                              Reason: {order.cancelReason}
                            </p>
                          )}
                          {order.refundInfo && (
                            <button
                              onClick={() => setSelectedOrder(order)}
                              type="button"
                              className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                            >
                              <Warning size={12} weight="bold" />
                              Refund Pending
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      type="button"
                      className="p-1.5 rounded-lg border border-border hover:bg-surface-muted text-fg transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-fg-muted">
                    No orders found for this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
        >
          <div className="w-full max-w-xl rounded-2xl bg-surface border border-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold font-heading text-fg">
                  Order Details #{selectedOrder.id}
                </h3>
                <span className="text-xs text-fg-muted">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                type="button"
                className="p-1 rounded-full text-fg-muted hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Delivery address */}
            <div className="p-4 rounded-xl bg-surface-muted text-xs space-y-1">
              <p className="font-bold text-fg">Shipping Address:</p>
              <p className="text-fg">{selectedOrder.address.recipient} ({selectedOrder.address.phone})</p>
              <p className="text-fg-muted">
                {selectedOrder.address.line1}, {selectedOrder.address.district}, {selectedOrder.address.province} {selectedOrder.address.postalCode}
              </p>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-fg">Purchased Tumblers:</p>
              {selectedOrder.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1 border-b border-border/50">
                  <span>
                    {i.title} (×{i.qty})
                  </span>
                  <span className="font-bold">฿{(i.unitPrice * i.qty).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1">
                <span>Subtotal:</span>
                <span>฿{selectedOrder.subtotal.toLocaleString()}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-xs text-success">
                  <span>Coupon Discount ({selectedOrder.couponCode}):</span>
                  <span>-฿{selectedOrder.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-accent-token pt-1 border-t border-border">
                <span>Total Amount:</span>
                <span>฿{selectedOrder.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment & Transfer Slip */}
            <div className="p-4 rounded-xl bg-surface-muted text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fg">Payment Information:</span>
                <span className="uppercase font-semibold text-fg-muted">
                  {selectedOrder.payment.method} · {selectedOrder.payment.status}
                </span>
              </div>
              {selectedOrder.payment?.slipUrl ? (
                <div className="pt-2 border-t border-border space-y-1.5">
                  <span className="font-bold text-fg block">Attached Transfer Slip:</span>
                  <a
                    href={selectedOrder.payment.slipUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-xl overflow-hidden border border-border group bg-black/5"
                  >
                    <img
                      src={selectedOrder.payment.slipUrl}
                      alt="Transfer Slip"
                      className="max-h-60 max-w-full object-contain rounded-lg group-hover:opacity-90 transition-opacity"
                    />
                    <div className="text-[10px] text-fg-muted text-center py-1 bg-surface-muted/80">
                      Open full slip image in new tab ↗
                    </div>
                  </a>
                </div>
              ) : selectedOrder.status === 'WAITING_VERIFICATION' ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium italic pt-1 border-t border-border">
                  Customer confirmed payment without uploading slip. Please verify transaction in merchant bank account before approving.
                </p>
              ) : null}
            </div>

            {/* Rejection Note */}
            {selectedOrder.rejectionReason && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <Warning size={18} weight="bold" className="shrink-0" />
                <span>Buyer Rejection Note: {selectedOrder.rejectionReason}</span>
              </div>
            )}

            {/* Buyer Refund Details if Cancelled with Refund Request */}
            {selectedOrder.refundInfo && (
              <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-danger flex items-center gap-1.5">
                    <Warning size={16} weight="bold" />
                    Buyer Refund Request Details ({selectedOrder.refundInfo.option.toUpperCase()}):
                  </span>
                  <span className="text-[10px] text-fg-muted font-mono">
                    {selectedOrder.refundInfo.submittedAt ? new Date(selectedOrder.refundInfo.submittedAt).toLocaleString() : ''}
                  </span>
                </div>

                {selectedOrder.refundInfo.option === 'promptpay' && (
                  <div className="bg-surface p-3 rounded-lg border border-border space-y-1">
                    <p className="text-fg">
                      <strong>PromptPay Number:</strong>{' '}
                      <span className="font-mono font-bold text-accent-token">
                        {selectedOrder.refundInfo.promptPayNumber}
                      </span>
                    </p>
                    {selectedOrder.refundInfo.accountName && (
                      <p className="text-fg-muted">
                        <strong>Account Name:</strong> {selectedOrder.refundInfo.accountName}
                      </p>
                    )}
                  </div>
                )}

                {selectedOrder.refundInfo.option === 'bank' && (
                  <div className="bg-surface p-3 rounded-lg border border-border space-y-1">
                    <p className="text-fg">
                      <strong>Bank:</strong> {selectedOrder.refundInfo.bankName}
                    </p>
                    <p className="text-fg">
                      <strong>Account Number:</strong>{' '}
                      <span className="font-mono font-bold text-accent-token">
                        {selectedOrder.refundInfo.accountNumber}
                      </span>
                    </p>
                    <p className="text-fg-muted">
                      <strong>Account Holder Name:</strong> {selectedOrder.refundInfo.accountName}
                    </p>
                  </div>
                )}

                {selectedOrder.refundInfo.option === 'image' && selectedOrder.refundInfo.imageUrl && (
                  <div className="bg-surface p-3 rounded-lg border border-border space-y-2">
                    <p className="font-bold text-fg">Attached Refund QR / Passbook Image:</p>
                    <a
                      href={selectedOrder.refundInfo.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-xl overflow-hidden border border-border group bg-black/5"
                    >
                      <img
                        src={selectedOrder.refundInfo.imageUrl}
                        alt="Refund Account Target"
                        className="max-h-60 max-w-full object-contain rounded-lg group-hover:opacity-90 transition-opacity"
                      />
                      <div className="text-[10px] text-fg-muted text-center py-1 bg-surface-muted/80">
                        Open full refund image in new tab ↗
                      </div>
                    </a>
                  </div>
                )}

                {selectedOrder.refundInfo.reason && (
                  <p className="text-fg-muted text-[11px] italic">
                    <strong>Cancel Reason / Note:</strong> {selectedOrder.refundInfo.reason}
                  </p>
                )}
              </div>
            )}

            {/* Cancelled Order Notice Banner in Modal */}
            {selectedOrder.status === 'CANCELLED' && (
              <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-danger">
                  <XCircle size={18} weight="bold" />
                  <span>
                    Order Cancelled {selectedOrder.cancelledBy === 'admin' ? 'by Store Admin' : 'by Buyer'}
                  </span>
                </div>
                {selectedOrder.cancelReason && (
                  <p className="text-fg">
                    <strong>Cancellation Reason:</strong> {selectedOrder.cancelReason}
                  </p>
                )}
              </div>
            )}

            {/* Transition Action inside Modal */}
            <div className="pt-3 border-t border-border flex justify-between items-center">
              <span className="text-xs text-fg-muted">
                Current Status: <strong>{selectedOrder.status}</strong>
              </span>

              <div className="flex items-center gap-2">
                {!['COMPLETED', 'REJECTED', 'CANCELLED'].includes(selectedOrder.status) && (
                  <button
                    onClick={() => {
                      setCancellingOrderTarget(selectedOrder);
                      setAdminCancelReason('');
                    }}
                    disabled={actionLoading}
                    type="button"
                    className="py-2 px-3.5 rounded-xl border border-danger/40 text-danger hover:bg-danger/10 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
                {selectedOrder.status === 'WAITING_VERIFICATION' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'PAID', 'Admin verified transfer slip')}
                    disabled={actionLoading}
                    className="py-2 px-4 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 cursor-pointer shadow-xs"
                  >
                    Approve Payment (PAID)
                  </button>
                )}
                {selectedOrder.status === 'PAID' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'PACKING', 'Admin started packing')}
                    className="py-2 px-4 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 cursor-pointer"
                  >
                    Start Packing
                  </button>
                )}
                {selectedOrder.status === 'PACKING' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'PROGRESS', 'Admin handed package to courier')}
                    className="py-2 px-4 rounded-xl bg-sky-500 text-white font-bold text-xs hover:bg-sky-600 cursor-pointer"
                  >
                    Dispatch (Progress)
                  </button>
                )}
                {selectedOrder.status === 'PROGRESS' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED', 'Delivered to customer')}
                    className="py-2 px-4 rounded-xl bg-indigo-500 text-white font-bold text-xs hover:bg-indigo-600 cursor-pointer"
                  >
                    Mark Delivered
                  </button>
                )}
                {selectedOrder.status === 'DELIVERED' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED', 'Admin manual override complete')}
                    className="py-2 px-4 rounded-xl bg-success text-white font-bold text-xs hover:opacity-90 cursor-pointer"
                  >
                    Mark as Completed
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="py-2 px-4 rounded-xl border border-border text-xs text-fg-muted hover:text-fg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Cancel Order Modal Dialog */}
      {cancellingOrderTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold font-heading text-fg flex items-center gap-2">
                  <span className="text-danger">Cancel Order</span> #{cancellingOrderTarget.id}
                </h3>
                <p className="text-xs text-fg-muted mt-0.5">
                  Customer: <strong className="text-fg">{cancellingOrderTarget.address?.recipient}</strong> · Total: ฿{cancellingOrderTarget.total.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setCancellingOrderTarget(null)}
                type="button"
                className="text-fg-muted hover:text-fg text-sm p-1 rounded-lg hover:bg-surface-muted cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-fg mb-1">
                  Reason for Cancellation (เหตุผลในการยกเลิก) <span className="text-danger">*</span>
                </label>
                <p className="text-[11px] text-fg-muted mb-2">
                  This reason will be recorded on the order and sent directly to the customer.
                </p>

                {/* Quick preset suggestions */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    'สินค้าหมดสต็อก (Out of stock)',
                    'สินค้าชำรุดเสียหาย (Damaged item)',
                    'ลูกค้าแจ้งขอยกเลิก (Customer request)',
                    'หลักฐานการชำระเงินไม่ถูกต้อง (Payment invalid)',
                    'ไม่สามารถจัดส่งไปยังที่อยู่ปลายทางได้ (Undeliverable address)',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdminCancelReason(preset)}
                      className="px-2 py-1 rounded-lg text-[10px] border border-border bg-surface-muted hover:bg-accent-token/10 hover:border-accent-token hover:text-accent-token transition-colors cursor-pointer text-fg-muted"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  placeholder="Type reason for customer (e.g. Out of stock, payment mismatch)..."
                  value={adminCancelReason}
                  onChange={(e) => setAdminCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-fg text-xs focus:outline-hidden focus:border-danger resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-[11px] flex items-start gap-2">
                <Warning size={16} weight="bold" className="shrink-0 mt-0.5" />
                <span>
                  Cancelling this order will release reserved stock back into inventory and restore any redeemed customer coupons.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <button
                onClick={() => setCancellingOrderTarget(null)}
                disabled={cancellingLoading}
                type="button"
                className="py-2 px-4 rounded-xl border border-border text-xs text-fg-muted hover:text-fg font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleAdminConfirmCancel}
                disabled={cancellingLoading || !adminCancelReason.trim()}
                type="button"
                className="py-2 px-4 rounded-xl bg-danger text-white text-xs font-bold hover:bg-danger/90 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle size={16} weight="bold" />
                <span>{cancellingLoading ? 'Cancelling...' : 'Confirm Cancel & Send Reason'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store QR & Payment Settings Modal */}
      <PaymentQrModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSaved={(settings) => setPaymentSettings(settings)}
      />
    </div>
  );
};
