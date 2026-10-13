import { create } from 'zustand';

type GuestActionReason = 'checkout' | 'chat' | 'coupon' | 'order_history';

interface GuestModalState {
  isOpen: boolean;
  reason: GuestActionReason | null;
  message: string;
  onSuccessCallback?: () => void;
  openLoginModal: (reason: GuestActionReason, customMessage?: string, onSuccess?: () => void) => void;
  closeLoginModal: () => void;
}

export const useGuestModalStore = create<GuestModalState>((set) => ({
  isOpen: false,
  reason: null,
  message: '',
  onSuccessCallback: undefined,
  openLoginModal: (reason, customMessage, onSuccess) => {
    let msg = 'Please log in to continue.';
    if (reason === 'checkout') {
      msg = 'Please log in or create an account to place your tumbler order.';
    } else if (reason === 'chat') {
      msg = 'Please log in to start a live support conversation with our team.';
    } else if (reason === 'coupon') {
      msg = 'Please log in to collect this voucher to your account.';
    }
    set({
      isOpen: true,
      reason,
      message: customMessage || msg,
      onSuccessCallback: onSuccess,
    });
  },
  closeLoginModal: () => {
    set({ isOpen: false, reason: null, message: '', onSuccessCallback: undefined });
  },
}));
