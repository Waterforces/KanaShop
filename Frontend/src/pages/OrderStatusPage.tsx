import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ArrowClockwise,
  Warning,
  QrCode,
  MapPin,
  UploadSimple,
  Bank,
} from '@phosphor-icons/react';
import { useAuthStore } from '../stores/authStore.js';
import { useCartStore } from '../stores/cartStore.js';
import { useGuestModalStore } from '../stores/guestModalStore.js';
import { Order, OrderStatus, Product, PromptPayQRResult } from '../types/index.js';
import { io } from 'socket.io-client';

export const OrderStatusPage: React.FC = () => {
  const { user } = useAuthStore();
  const { addItem, openDrawer } = useCartStore();
  const { openLoginModal } = useGuestModalStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Reject dialog state
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Pay PromptPay modal state for pending orders
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [payingPromptPayQR, setPayingPromptPayQR] = useState<PromptPayQRResult | null>(null);
  const [payingQrDisplayMode, setPayingQrDisplayMode] = useState<'dynamic' | 'storeImage'>('dynamic');
  const [payModalLoading, setPayModalLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);

  // Cancel with Refund modal state
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [refundOption, setRefundOption] = useState<'image' | 'bank' | 'promptpay'>('promptpay');
  const [refundBankName, setRefundBankName] = useState('Kasikorn Bank (KBANK)');
  const [refundAccountNumber, setRefundAccountNumber] = useState('');
  const [refundAccountName, setRefundAccountName] = useState('');
  const [refundPromptPay, setRefundPromptPay] = useState('');
  const [refundImage, setRefundImage] = useState<File | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [adminCancelToast, setAdminCancelToast] = useState<{ orderId: string; reason?: string } | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders/mine');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyAgain = (order: Order) => {
    for (const item of order.items) {
      const mockProduct: Product = {
        id: item.productId,
        title: item.title,
        price: item.unitPrice,
        images: [item.image || ''],
        category: item.category || 'plain',
        subcategory: item.subcategory || 'stainless_steel',
        capacityOz: 20,
        stock: 99,
        salesVolume: 0,
        active: true,
        description: '',
        createdAt: '',
        updatedAt: '',
      };
      addItem(mockProduct, item.qty, false);
    }
    openDrawer();
  };

  useEffect(() => {
    if (!user) {
      setOrders([]);
      openLoginModal('order_history', 'Please log in to track your order progression.');
      setLoading(false);
      return;
    }
    fetchOrders();

    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('order:status_changed', () => {
      fetchOrders();
    });

    socket.on('order:cancelled_by_admin', (data: { orderId: string; reason?: string }) => {
      fetchOrders();
      setAdminCancelToast(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleBuyerConfirm = async (orderId: string, action: 'accept' | 'reject') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? rejectReason : undefined,
        }),
      });

      if (res.ok) {
        setRejectingOrderId(null);
        setRejectReason('');
        await fetchOrders();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to submit response');
      }
    } catch {
      alert('Error updating order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPayPromptPay = async (order: Order) => {
    setPayingOrder(order);
    setSlipFile(null);
    setPayModalLoading(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/promptpay`);
      if (res.ok) {
        const qr = await res.json();
        setPayingPromptPayQR(qr);
        if (qr.qrImageUrl) {
          setPayingQrDisplayMode('storeImage');
        } else {
          setPayingQrDisplayMode('dynamic');
        }
      } else {
        setPayError('Failed to load PromptPay QR code.');
      }
    } catch {
      setPayError('Network error loading QR code.');
    } finally {
      setPayModalLoading(false);
    }
  };

  const handleUploadSlip = async (orderId: string, file: File) => {
    setUploadingSlip(true);
    try {
      const formData = new FormData();
      formData.append('slip', file);
      const res = await fetch(`/api/orders/${orderId}/slip`, {
        method: 'POST',
        body: formData,
      });
      const d = await res.json();
      if (res.ok) {
        setPayingOrder(null);
        setPayingPromptPayQR(null);
        setSlipFile(null);
        await fetchOrders();
      } else {
        alert(d.error || 'Failed to upload transfer slip.');
      }
    } catch {
      alert('Error uploading transfer slip.');
    } finally {
      setUploadingSlip(false);
    }
  };

  const handleConfirmPay = async () => {
    if (!payingOrder) return;
    if (slipFile) {
      await handleUploadSlip(payingOrder.id, slipFile);
      return;
    }
    setPayModalLoading(true);
    try {
      const res = await fetch(`/api/orders/${payingOrder.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setPayingOrder(null);
        setPayingPromptPayQR(null);
        setSlipFile(null);
        await fetchOrders();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to confirm payment.');
      }
    } catch {
      alert('Error confirming payment.');
    } finally {
      setPayModalLoading(false);
    }
  };

  const handleCancelClick = (order: Order) => {
    if (order.status === 'PENDING_PAYMENT') {
      if (!confirm('Are you sure you want to cancel this pending order?')) return;
      handleCancelPending(order.id);
    } else {
      setCancellingOrder(order);
      setRefundOption('promptpay');
      setRefundBankName('Kasikorn Bank (KBANK)');
      setRefundAccountNumber('');
      setRefundAccountName(user?.fullName || '');
      setRefundPromptPay(user?.phone || '');
      setRefundImage(null);
      setCancelReason('');
    }
  };

  const handleCancelPending = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by customer before payment' }),
      });
      if (res.ok) {
        await fetchOrders();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to cancel order.');
      }
    } catch {
      alert('Error cancelling order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancelWithRefund = async () => {
    if (!cancellingOrder) return;

    if (refundOption === 'bank') {
      if (!refundAccountNumber.trim()) {
        alert('Please enter your bank account number.');
        return;
      }
      if (!refundAccountName.trim()) {
        alert('Please enter your account holder name.');
        return;
      }
    } else if (refundOption === 'promptpay') {
      if (!refundPromptPay.trim()) {
        alert('Please enter your PromptPay phone or ID number.');
        return;
      }
    } else if (refundOption === 'image') {
      if (!refundImage) {
        alert('Please select a QR code or bank passbook image.');
        return;
      }
    }

    setSubmittingCancel(true);
    try {
      const formData = new FormData();
      formData.append('refundOption', refundOption);
      if (cancelReason.trim()) formData.append('reason', cancelReason.trim());

      if (refundOption === 'bank') {
        formData.append('bankName', refundBankName);
        formData.append('accountNumber', refundAccountNumber.trim());
        formData.append('accountName', refundAccountName.trim());
      } else if (refundOption === 'promptpay') {
        formData.append('promptPayNumber', refundPromptPay.trim());
        if (refundAccountName.trim()) formData.append('accountName', refundAccountName.trim());
      } else if (refundOption === 'image' && refundImage) {
        formData.append('refundImage', refundImage);
      }

      const res = await fetch(`/api/orders/${cancellingOrder.id}/cancel`, {
        method: 'POST',
        body: formData,
      });

      const d = await res.json();
      if (res.ok) {
        setCancellingOrder(null);
        await fetchOrders();
      } else {
        alert(d.error || 'Failed to cancel order.');
      }
    } catch {
      alert('Error cancelling order.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const activeOrders = orders.filter((o) =>
    ['PENDING_PAYMENT', 'WAITING_VERIFICATION', 'PAID', 'PACKING', 'PROGRESS', 'DELIVERED'].includes(o.status)
  );

  const historyOrders = orders.filter((o) =>
    ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(o.status)
  );

  const displayOrders = activeTab === 'active' ? activeOrders : historyOrders;

  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/15 text-warning border border-warning/30">
            <Clock size={13} weight="bold" />
            <span>Pending Payment</span>
          </span>
        );
      case 'WAITING_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <Clock size={13} weight="bold" />
            <span>Verifying Payment (รอตรวจสลิป)</span>
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <CheckCircle size={13} weight="bold" />
            <span>Payment Confirmed</span>
          </span>
        );
      case 'PACKING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Package size={13} weight="bold" />
            <span>Packing in Warehouse</span>
          </span>
        );
      case 'PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            <Truck size={13} weight="bold" />
            <span>In Transit (Progress)</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
            <MapPin size={13} weight="bold" />
            <span>Delivered / Awaiting Confirmation</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/15 text-success border border-success/30">
            <CheckCircle size={13} weight="bold" />
            <span>Completed</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-danger/15 text-danger border border-danger/30">
            <XCircle size={13} weight="bold" />
            <span>Rejected / Returned</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-500/15 text-gray-600 dark:text-gray-400 border border-gray-500/30">
            <XCircle size={13} weight="bold" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return <span className="text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-fg">
            Order Tracking & History
          </h1>
          <p className="text-xs text-fg-muted mt-1">
            Track real-time tumbler packing and delivery status from our warehouse.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          type="button"
          className="p-2 self-start rounded-xl border border-border hover:bg-surface-muted text-fg-muted hover:text-fg transition-colors cursor-pointer flex items-center gap-2 text-xs font-medium"
        >
          <ArrowClockwise size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Store Cancelled Order Notice Toast */}
      {adminCancelToast && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Warning size={20} weight="bold" className="shrink-0" />
            <div>
              <p className="font-bold">
                Order #{adminCancelToast.orderId} was cancelled by the store.
              </p>
              {adminCancelToast.reason && (
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Reason: "{adminCancelToast.reason}"
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setAdminCancelToast(null)}
            type="button"
            className="p-1 rounded-lg hover:bg-danger/20 text-danger cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('active')}
          type="button"
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 cursor-pointer ${
            activeTab === 'active'
              ? 'border-accent-token text-accent-token'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          Active Orders ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          type="button"
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-accent-token text-accent-token'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          Completed & Past History ({historyOrders.length})
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-52 rounded-2xl bg-surface border border-border animate-pulse"></div>
          ))}
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="py-16 text-center bg-surface border border-dashed border-border rounded-2xl p-8">
          <Package size={44} className="mx-auto text-fg-muted mb-2 opacity-50" />
          <p className="text-sm font-semibold text-fg">No {activeTab} orders found</p>
          <p className="text-xs text-fg-muted mt-1">
            {activeTab === 'active'
              ? "You don't have any ongoing tumbler shipments right now."
              : 'Your past completed orders will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayOrders.map((order) => {
            const isDelivered = order.status === 'DELIVERED';
            return (
              <div
                key={order.id}
                className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden"
              >
                {/* Order Top Bar */}
                <div className="p-4 sm:p-5 border-b border-border bg-surface-muted/40 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-fg-muted block">Order Number</span>
                    <span className="font-mono font-bold text-sm text-fg">#{order.id}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-fg-muted block">Date Placed</span>
                    <span className="text-xs font-medium text-fg">
                      {new Date(order.createdAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-fg-muted block">Total</span>
                    <span className="text-sm font-bold text-accent-token">
                      ฿{order.total.toLocaleString()}
                    </span>
                  </div>

                  <div>{renderStatusBadge(order.status)}</div>
                </div>

                {/* Progress Stepper Timeline */}
                <div className="p-5 border-b border-border bg-surface">
                  {(() => {
                    const statusWeights: Record<string, number> = {
                      PENDING_PAYMENT: 0,
                      WAITING_VERIFICATION: 0.5,
                      PAID: 1,
                      PACKING: 2,
                      PROGRESS: 3,
                      DELIVERED: 4,
                      COMPLETED: 5,
                      REJECTED: 4,
                    };
                    const currentWeight = statusWeights[order.status] || 0;
                    const fillPercent =
                      currentWeight <= 1
                        ? 0
                        : Math.min(100, Math.max(0, ((currentWeight - 1) / 4) * 100));

                    const steps = [
                      { key: 'PAID', label: 'Paid', icon: CheckCircle },
                      { key: 'PACKING', label: 'Packing', icon: Package },
                      { key: 'PROGRESS', label: 'Progress', icon: Truck },
                      { key: 'DELIVERED', label: 'Deliverd', icon: MapPin },
                      { key: 'COMPLETED', label: 'Complete', icon: CheckCircle },
                    ];

                    return (
                      <div className="max-w-2xl mx-auto relative">
                        {/* Connecting Track Background & Fill */}
                        <div className="absolute top-[18px] left-5 right-5 h-0.5 bg-border pointer-events-none -z-0">
                          <div
                            className="h-full bg-header-active transition-all duration-500"
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>

                        {/* Stepper Steps */}
                        <div className="flex items-center justify-between relative z-10">
                          {steps.map((step, idx) => {
                            const stepWeight = idx + 1;
                            const isReached = currentWeight >= stepWeight;
                            const Icon = step.icon;

                            return (
                              <div key={step.key} className="flex flex-col items-center">
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    isReached
                                      ? 'bg-header-active text-header ring-4 ring-header/20'
                                      : 'bg-surface-muted text-fg-muted border border-border'
                                  }`}
                                >
                                  <Icon size={18} weight={isReached ? 'bold' : 'regular'} />
                                </div>
                                <span
                                  className={`mt-2 text-xs font-medium text-center ${
                                    isReached ? 'text-fg font-semibold' : 'text-fg-muted'
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Items in this order */}
                <div className="p-5 space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80'}
                          alt={item.title}
                          className="w-12 h-12 rounded-lg object-cover bg-surface-muted border border-border"
                        />
                        <div>
                          <p className="font-semibold text-fg">{item.title}</p>
                          <span className="text-[11px] text-fg-muted">
                            Qty: {item.qty} · ฿{item.unitPrice.toLocaleString()} each
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-fg">
                        ฿{(item.unitPrice * item.qty).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Rejection / Note banner if any */}
                {order.rejectionReason && (
                  <div className="m-5 mt-0 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
                    <Warning size={18} weight="bold" className="shrink-0" />
                    <span>Buyer rejection reason: {order.rejectionReason}</span>
                  </div>
                )}

                {/* PENDING PAYMENT ACTION BANNER */}
                {order.status === 'PENDING_PAYMENT' && (
                  <div className="p-4 sm:p-5 bg-warning/10 border-t border-warning/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-warning/20 text-warning shrink-0">
                        <Clock size={20} weight="bold" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-fg">
                          Payment Pending — ฿{order.total.toLocaleString()}
                        </h4>
                        <p className="text-xs text-fg-muted mt-0.5">
                          Scan PromptPay QR code to complete your payment and begin warehouse packing.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleCancelClick(order)}
                        disabled={actionLoading}
                        type="button"
                        className="py-2.5 px-4 rounded-xl border border-border text-fg-muted hover:text-danger hover:border-danger/30 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel Order
                      </button>

                      <button
                        onClick={() => handleOpenPayPromptPay(order)}
                        disabled={actionLoading}
                        type="button"
                        className="py-2.5 px-5 rounded-xl bg-accent-token text-on-accent font-bold text-xs hover:opacity-95 transition-opacity shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <QrCode size={16} weight="bold" />
                        <span>Pay with PromptPay</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* WAITING VERIFICATION BANNER */}
                {order.status === 'WAITING_VERIFICATION' && (
                  <div className="p-4 sm:p-5 bg-purple-500/10 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
                        <Clock size={20} weight="bold" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-fg">
                          Payment Verification in Progress (รอตรวจสอบการชำระเงิน)
                        </h4>
                        <p className="text-xs text-fg-muted mt-0.5">
                          {order.payment?.slipUrl
                            ? 'Transfer slip received! Our team is verifying your payment. Warehouse packing will begin once confirmed.'
                            : 'Payment reported. Please upload your transfer slip to speed up verification.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleCancelClick(order)}
                        disabled={actionLoading}
                        type="button"
                        className="py-2.5 px-3.5 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel & Refund
                      </button>
                      {order.payment?.slipUrl && (
                        <a
                          href={order.payment.slipUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2 px-3 rounded-xl border border-border text-xs font-semibold text-fg hover:bg-surface-muted transition-colors"
                        >
                          View Slip
                        </a>
                      )}
                      <label className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs">
                        <UploadSimple size={14} weight="bold" />
                        <span>{order.payment?.slipUrl ? 'Change Slip' : 'Upload Transfer Slip'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          disabled={uploadingSlip}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadSlip(order.id, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* PAID (PAYMENT CONFIRMED) BANNER */}
                {order.status === 'PAID' && (
                  <div className="p-4 sm:p-5 bg-blue-500/10 border-t border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                        <CheckCircle size={20} weight="bold" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-fg">Payment Confirmed (ยืนยันการชำระเงินแล้ว)</h4>
                        <p className="text-xs text-fg-muted mt-0.5">
                          Your payment has been received! The order is queued for packing. You can still cancel before courier dispatch.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleCancelClick(order)}
                        disabled={actionLoading}
                        type="button"
                        className="py-2.5 px-3.5 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel & Refund
                      </button>
                    </div>
                  </div>
                )}

                {/* WAREHOUSE PACKING BANNER */}
                {order.status === 'PACKING' && (
                  <div className="p-4 sm:p-5 bg-amber-500/10 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                        <Package size={20} weight="bold" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-fg">Warehouse Packing in Progress (กำลังแพ็คสินค้า)</h4>
                        <p className="text-xs text-fg-muted mt-0.5">
                          Our warehouse team is boxing and preparing your tumbler. You can still cancel before courier dispatch.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleCancelClick(order)}
                        disabled={actionLoading}
                        type="button"
                        className="py-2.5 px-3.5 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel & Refund
                      </button>
                    </div>
                  </div>
                )}

                {/* IN TRANSIT (PROGRESS) BANNER */}
                {order.status === 'PROGRESS' && (
                  <div className="p-4 sm:p-5 bg-sky-500/10 border-t border-sky-500/20 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0">
                      <Truck size={20} weight="bold" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-fg">Tumbler In Transit (Progress)</h4>
                      <p className="text-xs text-fg-muted mt-0.5">
                        Courier has picked up your parcel and is delivering it to your address. Once delivered, you can inspect and confirm receipt.
                      </p>
                    </div>
                  </div>
                )}

                {/* BUYER ACCEPT / REJECT GATE WHEN DELIVERED */}
                {isDelivered && (
                  <div className="p-5 bg-header/15 border-t border-header flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <h4 className="text-sm font-bold text-fg">
                        Did you receive your tumbler in good condition?
                      </h4>
                      <p className="text-xs text-fg-muted mt-0.5">
                        Please inspect your package. Confirm delivery to finalize this order, or reject if damaged.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => setRejectingOrderId(order.id)}
                        disabled={actionLoading}
                        type="button"
                        className="py-2.5 px-4 rounded-xl border border-danger text-danger hover:bg-danger/10 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Reject / Issue
                      </button>

                      <button
                        onClick={() => handleBuyerConfirm(order.id, 'accept')}
                        disabled={actionLoading}
                        type="button"
                        className="py-2.5 px-5 rounded-xl bg-accent-token text-on-accent font-bold text-xs hover:opacity-95 transition-opacity shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle size={16} weight="bold" />
                        <span>Accept & Complete</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Cancel Reason Banner */}
                {order.status === 'CANCELLED' && order.cancelReason && (
                  <div className="m-5 mt-0 p-4 rounded-xl bg-danger/10 border border-danger/20 text-xs space-y-1.5 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-danger">
                      <XCircle size={16} weight="bold" />
                      <span>
                        {order.cancelledBy === 'admin'
                          ? 'Order Cancelled by Shop (ทางร้านยกเลิกคำสั่งซื้อ)'
                          : 'Order Cancelled by Customer (คุณยกเลิกคำสั่งซื้อแล้ว)'}
                      </span>
                    </div>
                    <p className="text-fg">
                      <strong>Cancellation Reason (สาเหตุ):</strong> {order.cancelReason}
                    </p>
                    <p className="text-[11px] text-fg-muted">
                      All reserved tumbler stock and applied coupon discount have been restored to your account.
                    </p>
                  </div>
                )}

                {/* Cancelled Order with Refund details banner */}
                {order.status === 'CANCELLED' && order.refundInfo && (
                  <div className="m-5 mt-0 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                      <Warning size={16} weight="bold" />
                      <span>Refund Request Submitted (ยื่นขอรับเงินคืนแล้ว)</span>
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20">
                        {order.refundInfo.option}
                      </span>
                    </div>
                    <p className="text-fg-muted">
                      Admin will refund <strong>฿{order.total.toLocaleString()}</strong> via your provided channel.
                    </p>
                    {order.refundInfo.option === 'bank' && (
                      <p className="text-fg-muted">
                        Bank: <strong className="text-fg">{order.refundInfo.bankName}</strong> | Acc: <strong className="text-fg font-mono">{order.refundInfo.accountNumber}</strong> ({order.refundInfo.accountName})
                      </p>
                    )}
                    {order.refundInfo.option === 'promptpay' && (
                      <p className="text-fg-muted">
                        PromptPay: <strong className="text-fg font-mono">{order.refundInfo.promptPayNumber}</strong> {order.refundInfo.accountName ? `(${order.refundInfo.accountName})` : ''}
                      </p>
                    )}
                    {order.refundInfo.option === 'image' && order.refundInfo.imageUrl && (
                      <div className="pt-1 flex items-center gap-2">
                        <span className="text-fg-muted">Attached QR/Bookbank:</span>
                        <a
                          href={order.refundInfo.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent-token underline font-medium hover:opacity-80"
                        >
                          View Uploaded Image ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Buy Again Button for Finished/Past Orders */}
                {['COMPLETED', 'DELIVERED', 'REJECTED', 'CANCELLED'].includes(order.status) && (
                  <div className="pt-3 border-t border-border flex justify-end">
                    <button
                      onClick={() => handleBuyAgain(order)}
                      type="button"
                      className="py-2 px-4 rounded-xl border border-border hover:border-header text-fg hover:text-header text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer bg-surface hover:bg-surface-muted shadow-2xs"
                    >
                      <ArrowClockwise size={14} weight="bold" />
                      <span>Buy Again (สั่งซื้ออีกครั้ง)</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingOrderId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold font-heading text-fg">
              Reject Package Delivery
            </h3>
            <p className="text-xs text-fg-muted">
              Please specify the reason (e.g., dented tumbler, broken lid, missing item). Our admin team will investigate and process a replacement or refund.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., The package arrived crushed and the stainless tumbler is visibly dented."
              className="w-full p-3 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-danger"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingOrderId(null)}
                type="button"
                className="py-2 px-4 rounded-xl border border-border text-xs text-fg-muted hover:text-fg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBuyerConfirm(rejectingOrderId, 'reject')}
                disabled={!rejectReason.trim() || actionLoading}
                type="button"
                className="py-2 px-5 rounded-xl bg-danger text-white font-bold text-xs hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Order PromptPay Pay Modal */}
      {payingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-header-active border border-header flex items-center justify-center text-header mx-auto">
              <QrCode size={30} weight="bold" />
            </div>

            <div>
              <h3 className="text-xl font-bold font-heading text-fg">Scan to Pay with PromptPay</h3>
              <p className="text-xs text-fg-muted mt-1">
                Order ID: <span className="font-mono font-bold text-fg">#{payingOrder.id}</span>
              </p>
            </div>

            {payModalLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-accent-token border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-fg-muted">Generating PromptPay QR...</span>
              </div>
            ) : payError ? (
              <div className="p-4 rounded-xl bg-danger/10 text-danger text-xs">{payError}</div>
            ) : payingPromptPayQR ? (
              <div className="space-y-4">
                <div className="mx-auto w-72 p-4 rounded-2xl bg-white border-2 border-header shadow-md flex flex-col items-center">
                  <div className="flex items-center justify-between w-full text-xs font-black text-[#14532D] mb-2 uppercase tracking-wide px-1">
                    <span>PromptPay</span>
                    {payingPromptPayQR.bankName && (
                      <span className="text-[10px] font-semibold text-gray-500 normal-case">
                        {payingPromptPayQR.bankName}
                      </span>
                    )}
                  </div>

                  {/* Mode switch if store QR image exists */}
                  {payingPromptPayQR.qrImageUrl && (
                    <div className="flex p-0.5 bg-gray-100 rounded-lg mb-2 text-[10px] font-semibold w-full">
                      <button
                        type="button"
                        onClick={() => setPayingQrDisplayMode('storeImage')}
                        className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                          payingQrDisplayMode === 'storeImage'
                            ? 'bg-white text-header shadow-xs font-bold'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Official Store QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayingQrDisplayMode('dynamic')}
                        className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                          payingQrDisplayMode === 'dynamic'
                            ? 'bg-white text-header shadow-xs font-bold'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Dynamic QR (Auto Amount)
                      </button>
                    </div>
                  )}

                  <img
                    src={
                      payingQrDisplayMode === 'storeImage' && payingPromptPayQR.qrImageUrl
                        ? payingPromptPayQR.qrImageUrl
                        : payingPromptPayQR.qrDataUrl
                    }
                    alt="PromptPay QR Code"
                    className="w-52 h-52 object-contain rounded-lg"
                  />

                  <div className="mt-2 text-center">
                    <p className="text-sm font-bold text-[#14532D]">
                      ฿{payingOrder.total.toLocaleString()}
                    </p>
                    {payingPromptPayQR.accountName && (
                      <p className="text-[11px] font-semibold text-gray-700 mt-0.5">
                        Account: {payingPromptPayQR.accountName}
                      </p>
                    )}
                    {payingPromptPayQR.promptPayId && (
                      <p className="text-[10px] font-mono text-gray-500">
                        ID: {payingPromptPayQR.promptPayId}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left bg-surface-muted/60 p-3 rounded-xl border border-border space-y-1.5">
                  <label className="text-xs font-semibold text-fg flex items-center gap-1.5">
                    <UploadSimple size={14} weight="bold" />
                    <span>Attach Transfer Slip (แนบสลิปการโอน):</span>
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-fg-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-header-active file:text-header hover:file:opacity-90 cursor-pointer"
                  />
                  {slipFile && (
                    <p className="text-[11px] text-success font-medium">
                      Selected: {slipFile.name} ({(slipFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <p className="text-xs text-fg-muted">
              Scan with your mobile banking app, optionally attach your slip, then click below to submit for verification.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setPayingOrder(null);
                  setPayingPromptPayQR(null);
                  setSlipFile(null);
                }}
                type="button"
                className="py-2.5 px-4 rounded-xl border border-border text-xs font-semibold text-fg-muted hover:text-fg cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleConfirmPay}
                disabled={payModalLoading || uploadingSlip}
                type="button"
                className="py-2.5 px-5 rounded-xl bg-accent-token text-on-accent font-bold text-xs hover:opacity-95 transition-opacity shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle size={16} weight="bold" />
                <span>{uploadingSlip ? 'Uploading Slip...' : 'Submit Payment for Verification'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order with Refund Modal */}
      {cancellingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-border p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold font-heading text-fg flex items-center gap-2">
                  <span className="text-danger">Cancel Order</span> & Request Refund
                </h3>
                <p className="text-xs text-fg-muted mt-1">
                  Order <span className="font-mono font-bold text-fg">#{cancellingOrder.id}</span> · Refund Amount:{' '}
                  <span className="font-bold text-fg">฿{cancellingOrder.total.toLocaleString()}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="text-fg-muted hover:text-fg text-sm p-1 rounded-lg hover:bg-surface-muted transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-fg mb-1.5">
                  Select Refund Destination (ช่องทางรับเงินคืน):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundOption('promptpay')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all ${
                      refundOption === 'promptpay'
                        ? 'border-accent-token bg-accent-token/10 text-accent-token font-bold shadow-xs'
                        : 'border-border bg-surface-muted/40 text-fg-muted hover:border-fg/20'
                    }`}
                  >
                    <QrCode size={20} weight={refundOption === 'promptpay' ? 'bold' : 'regular'} />
                    <span className="text-[11px] leading-tight">PromptPay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundOption('bank')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all ${
                      refundOption === 'bank'
                        ? 'border-accent-token bg-accent-token/10 text-accent-token font-bold shadow-xs'
                        : 'border-border bg-surface-muted/40 text-fg-muted hover:border-fg/20'
                    }`}
                  >
                    <Bank size={20} weight={refundOption === 'bank' ? 'bold' : 'regular'} />
                    <span className="text-[11px] leading-tight">Bank Transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundOption('image')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all ${
                      refundOption === 'image'
                        ? 'border-accent-token bg-accent-token/10 text-accent-token font-bold shadow-xs'
                        : 'border-border bg-surface-muted/40 text-fg-muted hover:border-fg/20'
                    }`}
                  >
                    <UploadSimple size={20} weight={refundOption === 'image' ? 'bold' : 'regular'} />
                    <span className="text-[11px] leading-tight">Upload Passbook / QR</span>
                  </button>
                </div>
              </div>

              {/* Channel 1: PromptPay */}
              {refundOption === 'promptpay' && (
                <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border space-y-3 animate-in fade-in">
                  <div>
                    <label className="block font-medium text-fg mb-1">
                      PromptPay Number (เบอร์โทร หรือ เลขบัตรประชาชน) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0812345678 or 1100123456789"
                      value={refundPromptPay}
                      onChange={(e) => setRefundPromptPay(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-fg text-xs focus:outline-hidden focus:border-accent-token"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-fg mb-1">
                      Account Name (ชื่อเจ้าของบัญชี)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Somchai Jaidee"
                      value={refundAccountName}
                      onChange={(e) => setRefundAccountName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-fg text-xs focus:outline-hidden focus:border-accent-token"
                    />
                  </div>
                </div>
              )}

              {/* Channel 2: Bank Account */}
              {refundOption === 'bank' && (
                <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border space-y-3 animate-in fade-in">
                  <div>
                    <label className="block font-medium text-fg mb-1">
                      Bank (ธนาคาร) <span className="text-danger">*</span>
                    </label>
                    <select
                      value={refundBankName}
                      onChange={(e) => setRefundBankName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-fg text-xs focus:outline-hidden focus:border-accent-token"
                    >
                      <option value="Kasikorn Bank (KBANK)">Kasikorn Bank (KBANK / กสิกรไทย)</option>
                      <option value="Siam Commercial Bank (SCB)">Siam Commercial Bank (SCB / ไทยพาณิชย์)</option>
                      <option value="Bangkok Bank (BBL)">Bangkok Bank (BBL / กรุงเทพ)</option>
                      <option value="Krungthai Bank (KTB)">Krungthai Bank (KTB / กรุงไทย)</option>
                      <option value="TMBThanachart Bank (TTB)">TMBThanachart Bank (TTB / ทีทีบี)</option>
                      <option value="Bank of Ayudhya (BAY / Krungsri)">Bank of Ayudhya (Krungsri / กรุงศรี)</option>
                      <option value="Government Savings Bank (GSB)">Government Savings Bank (GSB / ออมสิน)</option>
                      <option value="Kiatnakin Phatra Bank (KKP)">Kiatnakin Phatra Bank (KKP / เกียรตินาคินภัทร)</option>
                      <option value="Other">Other Bank (ธนาคารอื่น ๆ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-fg mb-1">
                      Account Number (เลขที่บัญชี) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123-4-56789-0"
                      value={refundAccountNumber}
                      onChange={(e) => setRefundAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-fg text-xs focus:outline-hidden focus:border-accent-token"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-fg mb-1">
                      Account Holder Name (ชื่อเจ้าของบัญชี) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Somchai Jaidee"
                      value={refundAccountName}
                      onChange={(e) => setRefundAccountName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-fg text-xs focus:outline-hidden focus:border-accent-token"
                    />
                  </div>
                </div>
              )}

              {/* Channel 3: Image Upload */}
              {refundOption === 'image' && (
                <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border space-y-3 animate-in fade-in">
                  <label className="block font-medium text-fg mb-1">
                    Upload Bank Passbook or QR Code Image (รูปสมุดบัญชี หรือ QR รับเงิน) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setRefundImage(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-fg-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-header-active file:text-header hover:file:opacity-90 cursor-pointer"
                  />
                  {refundImage && (
                    <div className="flex items-center gap-2 text-[11px] text-success font-medium">
                      <span>✓ Selected: {refundImage.name} ({(refundImage.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                  <p className="text-[11px] text-fg-muted">
                    Supports PNG, JPG, or WEBP up to 5MB.
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block font-medium text-fg mb-1">
                  Cancellation Reason (เหตุผลในการยกเลิก) <span className="text-fg-muted font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Changed my mind, ordered wrong item, etc."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-fg text-xs focus:outline-hidden focus:border-accent-token resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                disabled={submittingCancel}
                className="py-2 px-4 rounded-xl border border-border text-xs font-semibold text-fg-muted hover:text-fg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelWithRefund}
                disabled={submittingCancel}
                className="py-2 px-4 rounded-xl bg-danger text-white text-xs font-bold hover:bg-danger/90 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle size={16} weight="bold" />
                <span>{submittingCancel ? 'Submitting Cancel...' : 'Confirm Order Cancellation & Refund'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
