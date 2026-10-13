import React, { useState, useEffect } from 'react';
import { Ticket, CheckCircle, Clock, Sparkle, Tag } from '@phosphor-icons/react';
import { useAuthStore } from '../stores/authStore.js';
import { useGuestModalStore } from '../stores/guestModalStore.js';
import { Coupon } from '../types/index.js';

export const CouponPage: React.FC = () => {
  const { user, checkAuth } = useAuthStore();
  const { openLoginModal } = useGuestModalStore();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/coupons')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCoupons(data);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleCollect = async (coupon: Coupon) => {
    if (!user) {
      openLoginModal('coupon', `Please log in to collect the ${coupon.code} coupon.`, () => {
        handleCollect(coupon);
      });
      return;
    }

    setCollectingId(coupon.id);
    try {
      const res = await fetch(`/api/coupons/${coupon.id}/collect`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setToast(`Successfully collected coupon "${coupon.code}"!`);
        await checkAuth();
        setTimeout(() => setToast(null), 3000);
      } else {
        alert(data.error || 'Failed to collect coupon');
      }
    } catch {
      alert('Error collecting coupon');
    } finally {
      setCollectingId(null);
    }
  };

  const isCollected = (code: string) => {
    return user?.collectedCoupons?.includes(code) || false;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-header-active text-header border border-header shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-4">
          <CheckCircle size={18} weight="bold" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-header-active text-header text-xs font-bold uppercase tracking-wider mb-2">
          <Ticket size={16} />
          <span>Exclusive Savings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-fg">
          Discount Coupons & Vouchers
        </h1>
        <p className="text-xs text-fg-muted">
          Collect promo vouchers to your KanaShop account and apply them at checkout for instant savings.
        </p>
      </div>

      {/* Coupons List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-2xl bg-surface border border-border animate-pulse"></div>
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-dashed border-border rounded-2xl">
          <Tag size={40} className="mx-auto text-fg-muted mb-2 opacity-50" />
          <p className="text-sm font-semibold text-fg">No active coupons right now</p>
          <p className="text-xs text-fg-muted mt-1">Check back soon for new promotions!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => {
            const isUsed = Boolean(user?.id && coupon.usedBy?.includes(user.id));
            const collected = isCollected(coupon.code);
            return (
              <div
                key={coupon.id}
                className="relative rounded-2xl border border-border bg-surface overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* Top strip */}
                <div className="p-5 pb-4 border-b border-dashed border-border bg-header/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-header text-[#14532D]">
                      {coupon.type === 'percent' ? `${coupon.value}% OFF` : `฿${coupon.value} OFF`}
                    </span>
                    <span className="text-[11px] text-fg-muted font-mono flex items-center gap-1">
                      <Clock size={13} />
                      <span>Expires in {Math.max(1, Math.ceil((new Date(coupon.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-fg mb-1">{coupon.title}</h3>
                  <p className="text-xs text-fg-muted line-clamp-2">{coupon.description}</p>
                </div>

                {/* Bottom details & Collect action */}
                <div className="p-5 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-fg-muted">
                    <span>Min. Spend:</span>
                    <span className="font-semibold text-fg">฿{coupon.minSpend.toLocaleString()}</span>
                  </div>

                  {coupon.maxDiscount && (
                    <div className="flex items-center justify-between text-xs text-fg-muted">
                      <span>Max Discount:</span>
                      <span className="font-semibold text-fg">฿{coupon.maxDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    {isUsed ? (
                      <button
                        disabled
                        type="button"
                        className="w-full py-2.5 px-4 rounded-xl bg-surface-muted text-fg-muted border border-border font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80"
                      >
                        <CheckCircle size={16} />
                        <span>Already Used (ใช้แล้ว)</span>
                      </button>
                    ) : collected ? (
                      <button
                        disabled
                        type="button"
                        className="w-full py-2.5 px-4 rounded-xl bg-header-active text-header font-bold text-xs flex items-center justify-center gap-1.5 cursor-default"
                      >
                        <CheckCircle size={16} weight="bold" />
                        <span>Collected in Account</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCollect(coupon)}
                        disabled={collectingId === coupon.id}
                        type="button"
                        className="w-full py-2.5 px-4 rounded-xl bg-accent-token text-on-accent font-bold text-xs hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        {collectingId === coupon.id ? (
                          <div className="w-4 h-4 border-2 border-on-accent border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Sparkle size={15} weight="fill" />
                            <span>Collect Coupon</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
