import { create } from 'zustand';
import { UserAccount } from '../types/index.js';
import { useCartStore } from './cartStore.js';

interface AuthState {
  user: UserAccount | null;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  setUser: (user: UserAccount | null) => void;
  logout: (onSuccess?: () => void) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const user = await res.json();
        set({ user, isLoading: false });
        useCartStore.getState().syncUserCart(user?.id || null);
      } else {
        set({ user: null, isLoading: false });
        useCartStore.getState().syncUserCart(null);
      }
    } catch {
      set({ user: null, isLoading: false });
      useCartStore.getState().syncUserCart(null);
    }
  },

  setUser: (user) => {
    set({ user });
    useCartStore.getState().syncUserCart(user?.id || null);
  },

  logout: async (onSuccess?: () => void) => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    set({ user: null });
    // Reset and clear My Order (cart) immediately upon logout
    useCartStore.getState().resetOnLogout();

    if (onSuccess) {
      onSuccess();
    } else if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.assign('/');
    }
  },
}));
