import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Lock, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { useAuthStore } from '../../stores/authStore.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registeredSuccess = searchParams.get('registered') === '1';

  const { user, setUser } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset inputs on page mount or whenever logout happens
  React.useEffect(() => {
    setIdentifier('');
    setPassword('');
    setError(null);
  }, [user]);

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
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }

      setUser(data.user);
      setIdentifier('');
      setPassword('');
      setError(null);

      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-heading text-2xl font-bold text-fg mb-2"
          >
            <div className="w-8 h-8 rounded-lg bg-header-active border border-header flex items-center justify-center text-header">
              K
            </div>
            <span>KanaShop</span>
          </Link>
          <h1 className="text-xl font-bold font-heading text-fg">Welcome Back</h1>
          <p className="text-xs text-fg-muted mt-1">
            Sign in with your username or email address
          </p>
        </div>

        {registeredSuccess && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
            <CheckCircle size={18} weight="bold" className="shrink-0" />
            <span>Account created successfully! Please sign in with your credentials.</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2"
          >
            <WarningCircle size={18} weight="bold" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

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

        {/* Register Action */}
        <div className="text-center pt-2 border-t border-border text-xs text-fg-muted">
          <span>New to KanaShop? </span>
          <Link to="/register" className="font-bold text-accent-token hover:underline">
            Register an account
          </Link>
        </div>
      </div>
    </div>
  );
};
