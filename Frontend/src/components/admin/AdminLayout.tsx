import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingBag,
  ChatCircleDots,
  Users,
  Ticket,
  ChartLineUp,
  ArrowSquareOut,
  SignOut,
  Sun,
  Moon,
  ShieldCheck,
  QrCode,
} from '@phosphor-icons/react';
import { useAuthStore } from '../../stores/authStore.js';
import { useThemeStore } from '../../stores/themeStore.js';
import { PaymentQrModal } from './PaymentQrModal.js';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Route guard: only admin allowed
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg text-fg">
        <div className="max-w-md w-full p-8 rounded-2xl bg-surface border border-border text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <ShieldCheck size={28} weight="bold" />
          </div>
          <h2 className="text-xl font-bold font-heading">Administrator Access Required</h2>
          <p className="text-xs text-fg-muted">
            You must be signed in with an administrative account to access the control panel.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/login"
              className="py-2.5 px-5 rounded-xl bg-primary-token text-on-primary font-bold text-xs hover:opacity-90"
            >
              Sign in as Admin
            </Link>
            <Link
              to="/"
              className="py-2.5 px-5 rounded-xl border border-border text-xs font-semibold hover:bg-surface-muted"
            >
              Back to Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navLinks = [
    { to: '/admin', label: 'Dashboard', icon: ChartLineUp, exact: true },
    { to: '/admin/products', label: 'Product Catalog', icon: Package },
    { to: '/admin/orders', label: 'Order Management', icon: ShoppingBag },
    { to: '/admin/chat', label: 'Customer Support Chat', icon: ChatCircleDots },
    { to: '/admin/users', label: 'User Directory', icon: Users },
    { to: '/admin/coupons', label: 'Coupons & Vouchers', icon: Ticket },
    { to: '/admin/security', label: 'Security & Audit (ความปลอดภัย)', icon: ShieldCheck },
  ];

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg transition-colors duration-200">
      {/* Admin Top Bar (Forest Green Branding) */}
      <header className="sticky top-0 z-30 h-16 border-b border-header bg-header text-header flex items-center justify-between px-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-header"
          >
            <div className="w-7 h-7 rounded-lg bg-header-active border border-header flex items-center justify-center font-black text-sm">
              K
            </div>
            <span>KanaShop Admin Control Panel</span>
          </Link>
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-header-active text-header uppercase">
            Ops Console
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Payment QR Quick Action */}
          <button
            onClick={() => setQrModalOpen(true)}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-header-active border border-header text-header hover:opacity-90 transition-opacity text-xs font-semibold cursor-pointer shadow-2xs"
            title="Configure Store PromptPay QR Code"
          >
            <QrCode size={15} weight="bold" />
            <span className="hidden sm:inline">Payment QR</span>
          </button>

          {/* Back to Client Store Link */}
          <Link
            to="/"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-header text-header hover:bg-header-active/50 transition-colors text-xs font-semibold"
          >
            <span>Live Store</span>
            <ArrowSquareOut size={14} />
          </Link>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-full hover:bg-header-active/60 text-header transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} weight="bold" /> : <Sun size={18} weight="bold" />}
          </button>

          {/* Admin Profile */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-header">
            <img
              src={user.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`}
              alt={user.fullName}
              className="w-8 h-8 rounded-full object-cover border border-header"
            />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-header line-clamp-1">{user.fullName}</p>
              <p className="text-[10px] text-header-muted">Administrator</p>
            </div>
            <button
              onClick={() => {
                logout(() => navigate('/'));
              }}
              type="button"
              className="p-1.5 rounded-lg hover:bg-header-active/60 text-header transition-colors cursor-pointer ml-1"
              title="Logout"
            >
              <SignOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-border bg-surface shrink-0 hidden md:flex flex-col justify-between p-4">
          <div className="space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
              Store Management
            </div>

            {navLinks.map((item) => {
              const active = isActive(item.to, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-accent-token text-on-accent shadow-xs'
                      : 'text-fg-muted hover:text-fg hover:bg-surface-muted'
                  }`}
                >
                  <Icon size={18} weight={active ? 'bold' : 'regular'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Payment QR Settings Modal Trigger */}
            <button
              onClick={() => setQrModalOpen(true)}
              type="button"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-fg-muted hover:text-fg hover:bg-surface-muted transition-all cursor-pointer text-left"
            >
              <QrCode size={18} />
              <span>Payment QR Settings</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-surface-muted border border-border text-center text-[11px] text-fg-muted">
            <p className="font-semibold text-fg">KanaShop v1.2</p>
            <p className="mt-0.5">Direct File Storage Active</p>
          </div>
        </aside>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-bg">
          <Outlet />
        </main>
      </div>

      {/* Global Payment QR Modal for Admin Control Panel */}
      <PaymentQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};
