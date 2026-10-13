import { create } from 'zustand';
import { Product } from '../types/index.js';

export interface CartItem {
  product: Product;
  qty: number;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  isCartBumping: boolean;
  selectedCouponCode: string | null;
  couponDiscount: number;
  currentUserId: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  triggerCartBump: () => void;
  addItem: (product: Product, qty?: number, openCart?: boolean) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  setCoupon: (code: string | null, discount?: number) => void;
  clearCart: () => void;
  syncUserCart: (userId: string | null) => void;
  resetOnLogout: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
}

const getCartKey = (userId?: string | null) => {
  return userId ? `kanashop_cart_${userId}` : 'kanashop_cart_guest';
};

const loadSavedCart = (userId?: string | null): CartItem[] => {
  try {
    const key = getCartKey(userId);
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    // Legacy fallback
    const legacy = localStorage.getItem('kanashop_cart');
    if (legacy && !userId) return JSON.parse(legacy);
    return [];
  } catch {
    return [];
  }
};

const saveCart = (items: CartItem[], userId: string | null) => {
  try {
    const key = getCartKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error(e);
  }
};

export const useCartStore = create<CartState>((set, get) => ({
  items: loadSavedCart(null),
  isDrawerOpen: false,
  isCartBumping: false,
  selectedCouponCode: null,
  couponDiscount: 0,
  currentUserId: null,

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  triggerCartBump: () => {
    set({ isCartBumping: true });
    setTimeout(() => {
      set({ isCartBumping: false });
    }, 450);
  },

  syncUserCart: (userId: string | null) => {
    const userCart = loadSavedCart(userId);
    const guestItems = loadSavedCart(null);
    let finalItems = userCart;
    if (userId && guestItems.length > 0 && userCart.length === 0) {
      finalItems = guestItems;
      saveCart(finalItems, userId);
      try {
        localStorage.removeItem('kanashop_cart_guest');
      } catch {}
    }
    set({
      currentUserId: userId,
      items: finalItems,
      selectedCouponCode: null,
      couponDiscount: 0,
    });
  },

  resetOnLogout: () => {
    try {
      localStorage.removeItem('kanashop_cart');
      localStorage.removeItem('kanashop_cart_guest');
    } catch {}
    set({
      items: [],
      isDrawerOpen: false,
      selectedCouponCode: null,
      couponDiscount: 0,
      currentUserId: null,
    });
  },

  addItem: (product: Product, qty = 1, openCart = false) => {
    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.product.id === product.id);
      let newItems: CartItem[];

      if (existingIndex > -1) {
        newItems = [...state.items];
        const newQty = Math.min(
          product.stock,
          newItems[existingIndex].qty + qty
        );
        newItems[existingIndex] = { ...newItems[existingIndex], qty: newQty };
      } else {
        newItems = [...state.items, { product, qty: Math.min(product.stock, qty) }];
      }

      saveCart(newItems, state.currentUserId);
      return {
        items: newItems,
        ...(openCart ? { isDrawerOpen: true } : {}),
      };
    });
  },

  updateQty: (productId: string, qty: number) => {
    set((state) => {
      let newItems: CartItem[];
      if (qty <= 0) {
        newItems = state.items.filter((i) => i.product.id !== productId);
      } else {
        newItems = state.items.map((i) => {
          if (i.product.id === productId) {
            return { ...i, qty: Math.min(i.product.stock, qty) };
          }
          return i;
        });
      }
      saveCart(newItems, state.currentUserId);
      return { items: newItems };
    });
  },

  removeItem: (productId: string) => {
    set((state) => {
      const newItems = state.items.filter((i) => i.product.id !== productId);
      saveCart(newItems, state.currentUserId);
      return { items: newItems };
    });
  },

  setCoupon: (code: string | null, discount = 0) => {
    set({ selectedCouponCode: code, couponDiscount: discount });
  },

  clearCart: () => {
    const key = getCartKey(get().currentUserId);
    try {
      localStorage.removeItem(key);
      localStorage.removeItem('kanashop_cart');
    } catch {}
    set({ items: [], selectedCouponCode: null, couponDiscount: 0 });
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    return Math.max(0, subtotal - get().couponDiscount);
  },
}));
