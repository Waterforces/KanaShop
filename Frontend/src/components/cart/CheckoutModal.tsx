import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  QrCode,
  CreditCard,
  CheckCircle,
  Clock,
  WarningCircle,
  ShieldCheck,
  UploadSimple,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import { useCartStore } from '../../stores/cartStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { Order, PromptPayQRResult } from '../../types/index.js';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { items, selectedCouponCode, getSubtotal, getTotal, couponDiscount, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [address, setAddress] = useState({
    recipient: user?.fullName || '',
    phone: user?.phone || '',
    line1: '',
    district: '',
    province: 'Bangkok',
    postalCode: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'card'>('promptpay');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    holderName: user?.fullName || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state with created order & PromptPay QR
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [promptPayQR, setPromptPayQR] = useState<PromptPayQRResult | null>(null);
  const [qrDisplayMode, setQrDisplayMode] = useState<'dynamic' | 'storeImage'>('dynamic');
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);

  // Transfer slip upload state
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);

  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const isInitializedRef = useRef(false);

  // Clean reset & load saved address ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen) {
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        setCreatedOrder(null);
        setPromptPayQR(null);
        setSlipFile(null);
        setSlipPreview(null);
        setError(null);
        setLoading(false);
        setTimerSeconds(15 * 60);

        try {
          const savedRaw = localStorage.getItem(`kanashop_address_${user?.id || 'guest'}`);
          if (savedRaw) {
            const parsed = JSON.parse(savedRaw);
            setAddress({
              recipient: parsed.recipient || user?.fullName || '',
              phone: parsed.phone || user?.phone || '',
              line1: parsed.line1 || '',
              district: parsed.district || '',
              province: parsed.province || 'Bangkok',
              postalCode: parsed.postalCode || '',
            });
            return;
          }
        } catch {}

        setAddress((prev) => ({
          ...prev,
          recipient: prev.recipient || user?.fullName || '',
          phone: prev.phone || user?.phone || '',
        }));
      }
    } else {
      isInitializedRef.current = false;
    }
  }, [isOpen]);

  // 15-minute countdown for PromptPay QR
  useEffect(() => {
    if (!promptPayQR || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [promptPayQR, timerSeconds]);

  const handleClose = () => {
    const hadOrder = Boolean(createdOrder);
    setCreatedOrder(null);
    setPromptPayQR(null);
    setSlipFile(null);
    setSlipPreview(null);
    setError(null);
    setLoading(false);
    onClose();
    if (hadOrder) {
      navigate('/status');
    }
  };

  if (!isOpen) return null;

  const subtotal = getSubtotal();
  const total = getTotal();

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.product.id,
          title: i.product.title,
          qty: i.qty,
        })),
        couponCode: selectedCouponCode,
        address,
        paymentMethod,
        cardDetails: paymentMethod === 'card' ? cardDetails : undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order.');
      }

      if (saveAddressForFuture) {
        localStorage.setItem(`kanashop_address_${user?.id || 'guest'}`, JSON.stringify(address));
      }

      // 1. Immediately record created order and PromptPay QR
      setCreatedOrder(data.order);
      if (paymentMethod === 'promptpay' && data.promptPayQR) {
        setPromptPayQR(data.promptPayQR);
        if (data.promptPayQR.qrImageUrl) {
          setQrDisplayMode('storeImage');
        } else {
          setQrDisplayMode('dynamic');
        }
      } else if (paymentMethod === 'card') {
        // Card payment succeeded immediately
        setTimeout(() => {
          handleClose();
          navigate('/status');
        }, 2000);
      }

      // 2. Clear items from cart
      clearCart();
    } catch (err: any) {
      setError(err.message || 'An error occurred during checkout.');
    } finally {
      setLoading(false);
    }
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleUploadSlipAndConfirm = async () => {
    if (!createdOrder) return;

    if (slipFile) {
      setUploadingSlip(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append('slip', slipFile);
        const res = await fetch(`/api/orders/${createdOrder.id}/slip`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to upload transfer slip.');
        }
        setCreatedOrder(null);
        setPromptPayQR(null);
        setSlipFile(null);
        setSlipPreview(null);
        onClose();
        navigate('/status');
      } catch (err: any) {
        setError(err.message || 'Error uploading transfer slip.');
      } finally {
        setUploadingSlip(false);
      }
    } else {
      await handleConfirmPromptPayPaid();
    }
  };

  const handleConfirmPromptPayPaid = async () => {
    if (!createdOrder) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${createdOrder.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setCreatedOrder(null);
        setPromptPayQR(null);
        setSlipFile(null);
        setSlipPreview(null);
        onClose();
        navigate('/status');
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to confirm payment.');
      }
    } catch (e: any) {
      console.error(e);
      setError('Network error confirming payment.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* If Order is already created & awaiting PromptPay QR Scan */}
        {createdOrder ? (
          paymentMethod === 'promptpay' ? (
            <div className="text-center py-4 space-y-5 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-header-active border border-header flex items-center justify-center text-header mx-auto">
                <QrCode size={30} weight="bold" />
              </div>

              <div>
                <h3 className="text-xl font-bold font-heading text-fg">Scan to Pay with PromptPay</h3>
                <p className="text-xs text-fg-muted mt-1">
                  Order ID: <span className="font-mono font-bold text-fg">{createdOrder.id}</span>
                </p>
              </div>

              {promptPayQR ? (
                /* QR Code Canvas/Image */
                <div className="mx-auto w-72 p-4 rounded-2xl bg-white border-2 border-header shadow-md flex flex-col items-center">
                  <div className="flex items-center justify-between w-full text-xs font-black text-[#14532D] mb-2 uppercase tracking-wide px-1">
                    <span>PromptPay</span>
                    {promptPayQR.bankName && (
                      <span className="text-[10px] font-semibold text-gray-500 normal-case">
                        {promptPayQR.bankName}
                      </span>
                    )}
                  </div>

                  {/* Mode switch if store QR image exists */}
                  {promptPayQR.qrImageUrl && (
                    <div className="flex p-0.5 bg-gray-100 rounded-lg mb-2 text-[10px] font-semibold w-full">
                      <button
                        type="button"
                        onClick={() => setQrDisplayMode('storeImage')}
                        className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                          qrDisplayMode === 'storeImage'
                            ? 'bg-white text-header shadow-xs font-bold'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Official Store QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrDisplayMode('dynamic')}
                        className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                          qrDisplayMode === 'dynamic'
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
                      qrDisplayMode === 'storeImage' && promptPayQR.qrImageUrl
                        ? promptPayQR.qrImageUrl
                        : promptPayQR.qrImageUrl || promptPayQR.qrDataUrl
                    }
                    alt="PromptPay QR Code"
                    className="w-52 h-52 object-contain rounded-lg"
                  />

                  <div className="mt-2 text-center">
                    <p className="text-sm font-bold text-[#14532D]">
                      ฿{createdOrder.total.toLocaleString()}
                    </p>
                    {promptPayQR.accountName && (
                      <p className="text-[11px] font-semibold text-gray-700 mt-0.5">
                        Account: {promptPayQR.accountName}
                      </p>
                    )}
                    {promptPayQR.promptPayId && (
                      <p className="text-[10px] font-mono text-gray-500">
                        ID: {promptPayQR.promptPayId}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-accent-token border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-fg-muted">Loading PromptPay QR Code...</span>
                </div>
              )}

              {/* Timer */}
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-warning">
                <Clock size={16} />
                <span>QR expires in {formatTimer(timerSeconds)}</span>
              </div>

              <p className="text-xs text-fg-muted max-w-md mx-auto">
                Open your Thai Mobile Banking app (K PLUS, SCB EASY, Krungthai NEXT, etc.) and scan the QR code above.
              </p>

              {/* Slip Upload & Validation Notice */}
              <div className="max-w-md mx-auto w-full p-4 rounded-xl border border-dashed border-header bg-surface-muted/60 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-fg flex items-center gap-1.5">
                    <UploadSimple size={16} weight="bold" className="text-header" />
                    <span>Attach Payment Slip (แนบสลิปการโอนเงิน)</span>
                  </label>
                  <span className="text-[10px] text-fg-muted font-medium">JPEG, PNG, WebP</span>
                </div>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleSlipChange}
                  className="block w-full text-xs text-fg file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-header-active file:text-header hover:file:opacity-90 cursor-pointer"
                />

                {slipPreview && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-surface border border-border">
                    <img src={slipPreview} alt="Slip Preview" className="w-12 h-12 object-cover rounded-md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-fg truncate">{slipFile?.name}</p>
                      <p className="text-[10px] text-fg-muted">
                        {(slipFile ? slipFile.size / 1024 : 0).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSlipFile(null);
                        setSlipPreview(null);
                      }}
                      className="text-[11px] text-danger font-semibold hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-fg-muted leading-relaxed">
                  Uploading your slip automatically queues your order for store verification (WAITING_VERIFICATION) and fast dispatch.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="max-w-md mx-auto p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2"
                >
                  <WarningCircle size={18} weight="bold" className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Confirmation Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={handleUploadSlipAndConfirm}
                  disabled={loading || uploadingSlip}
                  className="py-3 px-6 rounded-xl bg-accent-token text-on-accent font-semibold text-sm hover:opacity-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploadingSlip ? (
                    <div className="w-4 h-4 border-2 border-on-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle size={18} weight="bold" />
                  )}
                  <span>
                    {uploadingSlip
                      ? 'Uploading Slip...'
                      : slipFile
                      ? 'Upload Slip & Submit (ยืนยันสลิป)'
                      : "I've Completed Payment"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    handleClose();
                    navigate('/status');
                  }}
                  className="py-3 px-6 rounded-xl border border-border text-fg hover:bg-surface-muted font-semibold text-sm transition-colors cursor-pointer"
                >
                  Upload Later in Order Status
                </button>
              </div>
            </div>
          ) : (
            /* Card Payment Success */
            <div className="text-center py-8 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-success/10 text-success border border-success/30 flex items-center justify-center mx-auto">
                <CheckCircle size={36} weight="bold" />
              </div>
              <h3 className="text-2xl font-bold font-heading text-fg">Payment Successful!</h3>
              <p className="text-xs text-fg-muted max-w-sm mx-auto">
                Thank you for shopping at KanaShop. Your order <span className="font-mono font-bold text-fg">#{createdOrder.id}</span> is now being prepared.
              </p>
              <div className="p-3 bg-surface-muted rounded-xl text-xs text-fg-muted">
                Redirecting you to Order Status tracker...
              </div>
            </div>
          )
        ) : (
          /* Normal Checkout Form */
          <div>
            <div className="mb-6">
              <h3 id="checkout-modal-title" className="text-xl font-bold font-heading text-fg">
                Checkout & Delivery Details
              </h3>
              <p className="text-xs text-fg-muted mt-1">
                Complete your shipping address and choose your payment method.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2"
              >
                <WarningCircle size={18} weight="bold" className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-sm font-semibold text-fg">Your cart is empty</p>
                <p className="text-xs text-fg-muted">Please add products to your cart before proceeding to checkout.</p>
                <button
                  onClick={handleClose}
                  type="button"
                  className="mt-2 px-4 py-2 rounded-xl bg-header-active text-header font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Return to Shop
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-6">
              {/* 1. Delivery Address Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted border-b border-border pb-1.5">
                  1. Delivery Address
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      value={address.recipient}
                      onChange={(e) => setAddress({ ...address, recipient: e.target.value })}
                      required
                      placeholder="Somchai Jaidee"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      required
                      placeholder="081-234-5678"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fg mb-1">
                    Street Address / Building / House No. *
                  </label>
                  <input
                    type="text"
                    value={address.line1}
                    onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                    required
                    placeholder="88/12 Sukhumvit Soi 55"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1">
                      District / Sub-district *
                    </label>
                    <input
                      type="text"
                      value={address.district}
                      onChange={(e) => setAddress({ ...address, district: e.target.value })}
                      required
                      placeholder="Khlong Toei"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1">Province *</label>
                    <input
                      type="text"
                      value={address.province}
                      onChange={(e) => setAddress({ ...address, province: e.target.value })}
                      required
                      placeholder="Bangkok"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={address.postalCode}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                      required
                      placeholder="10110"
                      maxLength={5}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveAddressCheckbox"
                    checked={saveAddressForFuture}
                    onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent-token focus:ring-accent-token cursor-pointer"
                  />
                  <label htmlFor="saveAddressCheckbox" className="text-xs text-fg-muted select-none cursor-pointer">
                    Save this shipping address for next time (บันทึกที่อยู่นี้สำหรับการสั่งซื้อครั้งต่อไป)
                  </label>
                </div>
              </div>

              {/* 2. Payment Gateways: PromptPay QR & Credit Card */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted border-b border-border pb-1.5">
                  2. Payment Gateway
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PromptPay Option */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'promptpay'
                        ? 'border-header bg-header/20 ring-2 ring-header'
                        : 'border-border bg-surface hover:bg-surface-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="promptpay"
                      checked={paymentMethod === 'promptpay'}
                      onChange={() => setPaymentMethod('promptpay')}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-fg">
                        <QrCode size={18} className="text-[#14532D]" weight="bold" />
                        <span>PromptPay QR Code</span>
                      </div>
                      <p className="text-[11px] text-fg-muted mt-0.5">
                        Scan and pay instantly using any Thai banking application.
                      </p>
                    </div>
                  </label>

                  {/* Credit/Debit Card Option (Disabled / Maintenance) */}
                  <div
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-surface-muted/50 opacity-60 cursor-not-allowed select-none"
                    title="Credit/Debit card payment gateway is currently under maintenance."
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      disabled
                      checked={false}
                      className="mt-1 cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-fg">
                        <CreditCard size={18} className="text-fg-muted" weight="bold" />
                        <span>Credit / Debit Card</span>
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning border border-warning/30">
                          ปิดปรับปรุง
                        </span>
                      </div>
                      <p className="text-[11px] text-fg-muted mt-0.5">
                        Payment gateway under maintenance. Please use PromptPay QR.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Fields (Dynamic Reveal) */}
                {paymentMethod === 'card' && (
                  <div className="p-4 rounded-xl border border-border bg-surface-muted/60 space-y-3 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={cardDetails.cardNumber}
                        onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                        required={paymentMethod === 'card'}
                        placeholder="4242 •••• •••• 4242"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-fg mb-1">
                          Expiry (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={cardDetails.expiry}
                          onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                          required={paymentMethod === 'card'}
                          placeholder="12/28"
                          maxLength={5}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-fg mb-1">CVC / CVV</label>
                        <input
                          type="password"
                          value={cardDetails.cvc}
                          onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                          required={paymentMethod === 'card'}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-fg-muted pt-1">
                      <ShieldCheck size={14} className="text-success" />
                      <span>Zero-store guarantee: We never store your full card PAN or CVV.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Order Summary Details */}
              <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-2 text-xs">
                <div className="flex justify-between text-fg-muted">
                  <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} tumblers)</span>
                  <span className="font-semibold text-fg">฿{subtotal.toLocaleString()}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-success font-medium">
                    <span>Coupon ({selectedCouponCode})</span>
                    <span>-฿{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-fg pt-2 border-t border-border">
                  <span>Amount to Pay</span>
                  <span className="text-accent-token text-lg">฿{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleClose}
                  type="button"
                  className="py-2.5 px-4 rounded-xl border border-border text-xs font-semibold text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-3 px-6 rounded-xl bg-accent-token text-on-accent font-semibold text-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-on-accent border-t-transparent rounded-full animate-spin"></div>
                  ) : paymentMethod === 'promptpay' ? (
                    'Generate PromptPay QR'
                  ) : (
                    `Pay ฿${total.toLocaleString()}`
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
