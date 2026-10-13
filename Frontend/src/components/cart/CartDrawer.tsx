import React, { useEffect, useState } from 'react';
import {
  X,
  Trash,
  ShoppingBag,
  Ticket,
  ArrowRight,
  Plus,
  Minus,
} from '@phosphor-icons/react';
import { useCartStore } from '../../stores/cartStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useGuestModalStore } from '../../stores/guestModalStore.js';
import { Coupon } from '../../types/index.js';

interface CartDrawerProps {
  onOpenCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOpenCheckout }) => {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    updateQty,
    removeItem,
    getSubtotal,
    getTotal,
    selectedCouponCode,
    setCoupon,
    couponDiscount,
  } = useCartStore();

  const { user } = useAuthStore();
  const { openLoginModal } = useGuestModalStore();

  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const subtotal = getSubtotal();
  const total = getTotal();

  // Load available coupons
  useEffect(() => {
    if (isDrawerOpen) {
      fetch('/api/coupons')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const filtered = data.filter((c: Coupon) => {
              // Remove if user already used this coupon
              if (user?.id && c.usedBy && c.usedBy.includes(user.id)) return false;
              // Remove if overall usage limit reached
              if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) return false;
              // Remove if expired
              if (c.expiresAt && new Date().toISOString() > c.expiresAt) return false;
              // If user is logged in, must be in user's collectedCoupons
              if (user && user.collectedCoupons) {
                const collectedNormalized = user.collectedCoupons.map((code: string) => code.toUpperCase().trim());
                if (!collectedNormalized.includes(c.code.toUpperCase().trim())) {
                  return false;
                }
              }
              return true;
            });
            setAvailableCoupons(filtered);

            // If selected coupon was used/removed, deselect it immediately
            if (selectedCouponCode && !filtered.some((c) => c.code.toUpperCase() === selectedCouponCode.toUpperCase())) {
              setCoupon(null, 0);
            }
          }
        })
        .catch(() => {});
    }
  }, [isDrawerOpen, user, selectedCouponCode]);

  // Recalculate coupon discount whenever subtotal or coupon changes
  useEffect(() => {
    if (!selectedCouponCode || subtotal === 0) {
      setCoupon(null, 0);
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: selectedCouponCode, subtotal }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.valid) {
          setCoupon(selectedCouponCode, res.discount);
          setCouponError(null);
        } else {
          setCoupon(null, 0);
          setCouponError(res.error || 'Coupon does not apply to this subtotal');
        }
      })
      .catch(() => {
        setCoupon(null, 0);
      })
      .finally(() => setCouponLoading(false));
  }, [subtotal, selectedCouponCode]);

  if (!isDrawerOpen) return null;

  const handleCouponSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    if (!code) {
      setCoupon(null, 0);
      setCouponError(null);
    } else {
      setCoupon(code, 0);
    }
  };

  const handleCheckoutClick = () => {
    if (items.length === 0) return;

    if (!user) {
      // Guest restriction: trigger login modal!
      openLoginModal('checkout', 'Please log in to proceed to checkout and place your order.', () => {
        closeDrawer();
        onOpenCheckout();
      });
      return;
    }

    closeDrawer();
    onOpenCheckout();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between bg-surface-muted/50">
            <div className="flex items-center gap-2.5">
              <ShoppingBag size={22} className="text-header-muted" />
              <h3 id="cart-drawer-title" className="text-lg font-bold font-heading text-fg">
                My Order ({items.reduce((s, i) => s + i.qty, 0)})
              </h3>
            </div>
            <button
              onClick={closeDrawer}
              type="button"
              className="p-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer"
              aria-label="Close cart drawer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-fg-muted">
                <ShoppingBag size={48} weight="thin" className="mb-3 opacity-40" />
                <p className="text-base font-medium text-fg">Your cart is empty</p>
                <p className="text-xs text-fg-muted mt-1 max-w-xs">
                  Discover our premium insulated tumblers and add your favorites.
                </p>
              </div>
            ) : (
              items.map(({ product, qty }) => (
                <div
                  key={product.id}
                  className="flex gap-3.5 p-3 rounded-xl border border-border bg-surface hover:shadow-xs transition-shadow"
                >
                  <img
                    src={product.images[0] || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80'}
                    alt={product.title}
                    className="w-20 h-20 rounded-lg object-cover bg-surface-muted border border-border shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-fg line-clamp-1">
                          {product.title}
                        </h4>
                        <button
                          onClick={() => removeItem(product.id)}
                          type="button"
                          className="text-fg-muted hover:text-danger p-0.5 transition-colors cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-surface-muted text-fg-muted uppercase">
                        {product.category} · {product.subcategory.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-accent-token">
                        ฿{(product.price * qty).toLocaleString()}
                      </span>

                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-border rounded-lg bg-surface-muted">
                        <button
                          onClick={() => updateQty(product.id, qty - 1)}
                          type="button"
                          className="p-1 hover:bg-surface rounded-l-lg text-fg-muted hover:text-fg transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-fg">
                          {qty}
                        </span>
                        <button
                          onClick={() => updateQty(product.id, qty + 1)}
                          disabled={qty >= product.stock}
                          type="button"
                          className="p-1 hover:bg-surface rounded-r-lg text-fg-muted hover:text-fg transition-colors disabled:opacity-40 cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: Coupon Selector, Totals & Checkout Button */}
          {items.length > 0 && (
            <div className="p-5 border-t border-border bg-surface space-y-4">
              {/* Single-coupon selector */}
              <div>
                <label className="block text-xs font-semibold text-fg mb-1.5 flex items-center gap-1.5">
                  <Ticket size={16} className="text-accent-token" />
                  <span>Apply Discount Coupon</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedCouponCode || ''}
                    onChange={handleCouponSelect}
                    disabled={couponLoading}
                    className="w-full py-2.5 px-3 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token cursor-pointer"
                  >
                    <option value="">No coupon selected</option>
                    {availableCoupons.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code} — {c.type === 'percent' ? `${c.value}% OFF` : `฿${c.value} OFF`} (Min. ฿{c.minSpend.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                {couponError && (
                  <p className="mt-1 text-[11px] text-danger">{couponError}</p>
                )}
                {selectedCouponCode && couponDiscount > 0 && (
                  <p className="mt-1 text-[11px] text-success font-medium">
                    ✓ Applied {selectedCouponCode}: Saved ฿{couponDiscount.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Dynamic Totals */}
              <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
                <div className="flex justify-between text-fg-muted">
                  <span>Subtotal</span>
                  <span className="font-semibold text-fg">฿{subtotal.toLocaleString()}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-success font-medium">
                    <span>Coupon Discount</span>
                    <span>-฿{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-fg pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-accent-token text-lg">฿{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckoutClick}
                type="button"
                className="w-full py-3.5 px-4 rounded-xl bg-accent-token text-on-accent font-semibold text-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
