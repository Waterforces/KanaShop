import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Lock, User, WarningCircle } from '@phosphor-icons/react';
import { useGuestModalStore } from '../../stores/guestModalStore.js';
import { useAuthStore } from '../../stores/authStore.js';

export const LoginModal: React.FC = () => {
  const { isOpen, message, closeLoginModal, onSuccessCallback } = useGuestModalStore();
  const { user, setUser } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Clear credentials whenever modal opens or whenever user logs out
  useEffect(() => {
    if (isOpen || !user) {
      setIdentifier('');
      setPassword('');
      setError(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIdentifier('');
    setPassword('');
    setError(null);
    closeLoginModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      setIdentifier('');
      setPassword('');
      setError(null);
      closeLoginModal();

      if (onSuccessCallback) {
        onSuccessCallback();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-header-active border border-header flex items-center justify-center text-header mb-3 font-bold text-xl">
            K
          </div>
          <h3 id="login-modal-title" className="text-xl font-bold font-heading text-fg">
            Welcome to KanaShop
          </h3>
          <p className="text-xs text-fg-muted mt-1.5 px-4 leading-normal">
            {message || 'Sign in to access your cart, place orders, and chat with customer support.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2"
          >
            <WarningCircle size={18} weight="bold" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-fg mb-1">
              Username or Email
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                <User size={18} />
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="off"
                placeholder="person001"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-sm text-fg placeholder:text-fg-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-token"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-fg">Password</label>
              <Link
                to="/forgot-password"
                onClick={closeLoginModal}
                className="text-xs font-medium text-accent-token hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-sm text-fg placeholder:text-fg-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-token"
              />
            </div>
          </div>

          {/* Centered Login Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-primary-token text-on-primary font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        {/* Footer info: Register link */}
        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-fg-muted">
          <span>Don't have an account yet? </span>
          <Link
            to="/register"
            onClick={closeLoginModal}
            className="font-bold text-accent-token hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};
