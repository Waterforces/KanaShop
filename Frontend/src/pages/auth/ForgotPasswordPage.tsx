import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Envelope,
  Key,
  Lock,
  Clock,
  CheckCircle,
  WarningCircle,
  ArrowLeft,
} from '@phosphor-icons/react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Step 1: Email & Cooldown
  const [email, setEmail] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  // Step 2: Passcode & Verify
  const [passcode, setPasscode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Step 3: New Password Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // 5-minute Cooldown timer tick
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Step 1 Action: Send Passcode
  const handleSendPasscode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || cooldownRemaining > 0) return;

    setError(null);
    setSendLoading(true);
    setSendSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/forgot/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.retryAfter) {
          setCooldownRemaining(data.retryAfter);
        }
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setCooldownRemaining(data.cooldownSeconds || 300);
      setSendSuccessMsg(
        data.message || 'A 6-digit passcode has been sent to your email.'
      );
    } catch (err: any) {
      setError(err.message || 'Error sending passcode.');
    } finally {
      setSendLoading(false);
    }
  };

  // Step 2 Action: Verify Passcode
  const handleVerifyPasscode = async () => {
    if (!passcode.trim() || !email.trim()) {
      setError('Please enter the 6-digit passcode.');
      return;
    }

    setError(null);
    setVerifyLoading(true);

    try {
      const res = await fetch('/api/auth/forgot/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: passcode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired passcode.');
      }

      setIsVerified(true);
      setResetToken(data.resetToken);
    } catch (err: any) {
      setError(err.message || 'Passcode verification failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Step 3 Action: Submit New Password (directly overwriting Data_account.json)
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setResetLoading(true);

    try {
      const res = await fetch('/api/auth/forgot/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      // Redirect to Login page upon successful overwrite
      navigate('/login?reset=1');
    } catch (err: any) {
      setError(err.message || 'Error updating password.');
    } finally {
      setResetLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg mb-4"
          >
            <ArrowLeft size={14} />
            <span>Back to Login</span>
          </Link>
          <h1 className="text-xl font-bold font-heading text-fg">Reset Your Password</h1>
          <p className="text-xs text-fg-muted mt-1">
            Follow the steps below to verify your account and set a new password.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2"
          >
            <WarningCircle size={18} weight="bold" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {sendSuccessMsg && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
            <CheckCircle size={18} weight="bold" className="shrink-0" />
            <span>{sendSuccessMsg}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Step 1: Input Email + Send Passcode with 5-minute cooldown */}
          <div>
            <label className="block text-xs font-semibold text-fg mb-1">
              Registered Email Address *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                  <Envelope size={18} />
                </span>
                <input
                  type="email"
                  value={email}
                  disabled={isVerified}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="somchai@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token disabled:opacity-60"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSendPasscode()}
                disabled={!email.trim() || cooldownRemaining > 0 || sendLoading || isVerified}
                className="px-3.5 py-2.5 rounded-xl bg-header-active text-header font-bold text-xs hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
              >
                {sendLoading ? (
                  <div className="w-4 h-4 border-2 border-header border-t-transparent rounded-full animate-spin"></div>
                ) : cooldownRemaining > 0 ? (
                  <>
                    <Clock size={14} />
                    <span>Wait {formatTimer(cooldownRemaining)}</span>
                  </>
                ) : (
                  <span>Send Passcode</span>
                )}
              </button>
            </div>
            {cooldownRemaining > 0 && (
              <p className="text-[11px] text-fg-muted mt-1">
                5-minute security cooldown active. You can resend in {formatTimer(cooldownRemaining)}.
              </p>
            )}
          </div>

          {/* Step 2: Passcode Input with adjacent "Verify" button */}
          <div>
            <label className="block text-xs font-semibold text-fg mb-1">
              6-Digit Passcode *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                  <Key size={18} />
                </span>
                <input
                  type="text"
                  maxLength={6}
                  value={passcode}
                  disabled={isVerified}
                  onChange={(e) => setPasscode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-sm font-mono tracking-widest text-fg focus:outline-none focus:ring-2 focus:ring-accent-token disabled:opacity-60"
                />
              </div>

              <button
                type="button"
                onClick={handleVerifyPasscode}
                disabled={passcode.length !== 6 || verifyLoading || isVerified}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isVerified
                    ? 'bg-success text-white'
                    : 'bg-primary-token text-on-primary hover:opacity-90 disabled:opacity-40'
                }`}
              >
                {verifyLoading ? (
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                ) : isVerified ? (
                  <>
                    <CheckCircle size={15} weight="bold" />
                    <span>Verified ✓</span>
                  </>
                ) : (
                  <span>Verify</span>
                )}
              </button>
            </div>
          </div>

          {/* Step 3: Dynamically Reveal "New Password" & "Confirm New Password" once verified */}
          {isVerified && (
            <form onSubmit={handleResetSubmit} className="space-y-4 pt-3 border-t border-border animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="p-3 rounded-xl bg-header-active/50 border border-header text-header text-xs">
                Passcode verified! Please enter your new password to overwrite your account record.
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 px-4 rounded-xl bg-accent-token text-on-accent font-bold text-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <div className="w-5 h-5 border-2 border-on-accent border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Update Password in Data_account & Login'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
