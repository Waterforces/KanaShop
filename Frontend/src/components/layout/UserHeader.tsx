import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Sun,
  Moon,
  User,
  Gear,
  SignOut,
  List,
  X,
  ShieldCheck,
  Ticket,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { useAuthStore } from '../../stores/authStore.js';
import { useThemeStore } from '../../stores/themeStore.js';
import { useCartStore } from '../../stores/cartStore.js';
import { useGuestModalStore } from '../../stores/guestModalStore.js';

export const UserHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { items, openDrawer, isCartBumping } = useCartStore();
  const { openLoginModal } = useGuestModalStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const handleLogout = async () => {
    setIsUserDropdownOpen(false);
    setIsMenuOpen(false);
    await logout(() => navigate('/'));
  };

  const totalItemsCount = items.reduce((sum, i) => sum + i.qty, 0);

  const isActive = (path: string) => location.pathname === path;

  const handleMyOrderClick = () => {
    openDrawer();
  };

  return (
    <header className="sticky top-0 z-40 w-full transition-colors duration-200 border-b border-header bg-header text-header shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 font-heading text-2xl font-bold tracking-tight text-header hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-header-active border border-header flex items-center justify-center font-black text-lg">
            K
          </div>
          <span>KanaShop</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 font-medium text-sm">
          <Link
            to="/"
            className={`px-3.5 py-1.5 rounded-full transition-all duration-150 ${
              isActive('/')
                ? 'bg-header-active font-semibold shadow-xs'
                : 'text-header-muted hover:bg-header-active/60'
            }`}
          >
            Home
          </Link>

          <Link
            to="/coupons"
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-150 ${
              isActive('/coupons')
                ? 'bg-header-active font-semibold shadow-xs'
                : 'text-header-muted hover:bg-header-active/60'
            }`}
          >
            <Ticket size={16} weight={isActive('/coupons') ? 'bold' : 'regular'} />
            Coupon
          </Link>

          {/* My Order Button: opens right-hand slide-out cart panel */}
          <button
            id="header-my-order-btn"
            onClick={handleMyOrderClick}
            type="button"
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-header-muted hover:bg-header-active/60 transition-all duration-150 cursor-pointer relative ${
              isCartBumping
                ? 'animate-cart-bump ring-2 ring-accent-token text-header font-bold bg-header-active/60 shadow-xs'
                : ''
            }`}
            aria-label={`Open shopping cart drawer with ${totalItemsCount} items`}
          >
            <ShoppingBag size={18} weight={isCartBumping ? 'bold' : 'regular'} />
            <span>My Order</span>
            {totalItemsCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-accent-token text-on-accent min-w-5 text-center transition-transform ${
                  isCartBumping ? 'animate-badge-pop scale-110' : ''
                }`}
              >
                {totalItemsCount}
              </span>
            )}
          </button>

          <Link
            to="/status"
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-150 ${
              isActive('/status')
                ? 'bg-header-active font-semibold shadow-xs'
                : 'text-header-muted hover:bg-header-active/60'
            }`}
          >
            <ClockCounterClockwise size={16} weight={isActive('/status') ? 'bold' : 'regular'} />
            Status
          </Link>
        </nav>

        {/* Right Section: Theme Toggle & User Avatar / Login */}
        <div className="flex items-center gap-2.5">
          {/* Theme Switcher Toggle (Light/Dark) */}
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-full hover:bg-header-active/60 text-header transition-colors cursor-pointer"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Toggle Theme (${theme})`}
          >
            {theme === 'light' ? (
              <Moon size={20} weight="bold" />
            ) : (
              <Sun size={20} weight="bold" />
            )}
          </button>

          {/* Authenticated User Menu or Guest Auth Buttons */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                type="button"
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full hover:bg-header-active/60 transition-colors cursor-pointer border border-header"
                aria-expanded={isUserDropdownOpen}
              >
                <img
                  src={user.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`}
                  alt={user.fullName}
                  className="w-7 h-7 rounded-full object-cover border border-header"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`;
                  }}
                />
                <span className="text-xs font-medium max-w-24 truncate hidden sm:inline">
                  {user.fullName || user.username}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isUserDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-surface border border-border shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setIsUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-xs font-medium text-fg-muted">Signed in as</p>
                    <p className="text-sm font-semibold text-fg truncate">@{user.username}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded bg-header-active text-header uppercase">
                      {user.role}
                    </span>
                  </div>

                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-fg hover:bg-surface-muted transition-colors"
                  >
                    <Gear size={18} />
                    <span>Settings & Profile</span>
                  </Link>

                  <Link
                    to="/status"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-fg hover:bg-surface-muted transition-colors"
                  >
                    <ClockCounterClockwise size={18} />
                    <span>My Order History</span>
                  </Link>

                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-accent-token hover:bg-surface-muted transition-colors"
                    >
                      <ShieldCheck size={18} />
                      <span>Admin Control Panel</span>
                    </Link>
                  )}

                  <div className="my-1 border-t border-border" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors text-left cursor-pointer"
                  >
                    <SignOut size={18} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openLoginModal('checkout')}
                type="button"
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full border border-header text-header hover:bg-header-active/50 transition-colors cursor-pointer"
              >
                Log In
              </button>
              <Link
                to="/register"
                className="hidden sm:inline-flex px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full bg-header-active text-header hover:opacity-90 transition-opacity"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile Quick My Order Cart Icon Button */}
          <button
            id="mobile-header-my-order-btn"
            onClick={handleMyOrderClick}
            type="button"
            className={`md:hidden relative p-2 rounded-full hover:bg-header-active/60 text-header transition-transform cursor-pointer ${
              isCartBumping ? 'animate-cart-bump ring-2 ring-accent-token bg-header-active/60' : ''
            }`}
            aria-label={`My Order (${totalItemsCount} items)`}
          >
            <ShoppingBag size={20} weight={isCartBumping ? 'bold' : 'regular'} />
            {totalItemsCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-accent-token text-on-accent min-w-4 text-center shadow-xs ${
                  isCartBumping ? 'animate-badge-pop' : ''
                }`}
              >
                {totalItemsCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-header-active/60 text-header transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-header bg-header px-4 pt-3 pb-5 space-y-1">
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium ${
              isActive('/') ? 'bg-header-active font-semibold' : 'text-header-muted'
            }`}
          >
            Home
          </Link>
          <Link
            to="/coupons"
            onClick={() => setIsMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium ${
              isActive('/coupons') ? 'bg-header-active font-semibold' : 'text-header-muted'
            }`}
          >
            Coupon
          </Link>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              openDrawer();
            }}
            type="button"
            className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-header-muted flex items-center justify-between"
          >
            <span>My Order</span>
            {totalItemsCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-accent-token text-on-accent">
                {totalItemsCount}
              </span>
            )}
          </button>
          <Link
            to="/status"
            onClick={() => setIsMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium ${
              isActive('/status') ? 'bg-header-active font-semibold' : 'text-header-muted'
            }`}
          >
            Order Status
          </Link>
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-semibold text-accent-token"
                >
                  Admin Control Panel
                </Link>
              )}
              <Link
                to="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-header-muted"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-danger flex items-center gap-2 cursor-pointer"
              >
                <SignOut size={18} />
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <Link
              to="/register"
              onClick={() => setIsMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-header-muted"
            >
              Register Account
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
