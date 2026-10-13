import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { UserHeader } from './UserHeader.js';
import { Footer } from './Footer.js';
import { CartDrawer } from '../cart/CartDrawer.js';
import { CheckoutModal } from '../cart/CheckoutModal.js';
import { FloatingChat } from '../chat/FloatingChat.js';
import { LoginModal } from '../auth/LoginModal.js';

export const UserLayout: React.FC = () => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg transition-colors duration-200">
      {/* Light Mint in Light Theme / Deep Forest in Dark Theme Header */}
      <UserHeader />

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />

      {/* Slide-out Cart Drawer */}
      <CartDrawer onOpenCheckout={() => setIsCheckoutOpen(true)} />

      {/* Centered Checkout Modal: cleanly unmount when closed to guarantee fresh state */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}

      {/* Southeast Corner Floating Support Chat */}
      <FloatingChat />

      {/* Guest Restriction Interactive Login Modal */}
      <LoginModal />
    </div>
  );
};
