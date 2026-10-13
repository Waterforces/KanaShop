import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  User,
  Lock,
  Trash,
  CheckCircle,
  WarningCircle,
  Camera,
} from '@phosphor-icons/react';
import { useAuthStore } from '../stores/authStore.js';
import { useThemeStore } from '../stores/themeStore.js';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, logout, checkAuth } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  // Profile Form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Deletion Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <p className="text-sm font-semibold text-fg">Please log in to manage your settings.</p>
      </div>
    );
  }

  // Handle Theme Change
  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch {}
  };

  // Handle Profile Update (persists in Data_account.json)
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, photoUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      setUser({ ...user, ...data.user });
      setProfileMsg({ type: 'success', text: 'Profile updated and saved to Data_account.json!' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Error updating profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Update (directly overwrites passwordHash in Data_account.json)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setPasswordMsg({
        type: 'success',
        text: 'Password successfully updated in Data_account.json!',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 4000);
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Error updating password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleteLoading(true);

    try {
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: deletePassword, confirmText: deleteConfirmText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account.');
      }

      await logout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting account.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-fg">Account Settings</h1>
        <p className="text-xs text-fg-muted mt-1">
          Manage your personal details, theme preferences, and security credentials.
        </p>
      </div>

      {/* 1. Theme Switcher */}
      <section className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold font-heading text-fg">Interface Theme</h2>
          <p className="text-xs text-fg-muted">
            Choose light mode (light mint header) or dark mode (deep forest header).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
              theme === 'light'
                ? 'border-header bg-header/20 ring-2 ring-header text-header font-bold'
                : 'border-border bg-surface-muted text-fg-muted hover:text-fg'
            }`}
          >
            <Sun size={24} weight={theme === 'light' ? 'bold' : 'regular'} />
            <span className="text-xs">Light Mint Theme</span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
              theme === 'dark'
                ? 'border-header bg-header text-[#F0FDF4] ring-2 ring-header font-bold'
                : 'border-border bg-surface-muted text-fg-muted hover:text-fg'
            }`}
          >
            <Moon size={24} weight={theme === 'dark' ? 'bold' : 'regular'} />
            <span className="text-xs">Dark Forest Theme</span>
          </button>
        </div>
      </section>

      {/* 2. Profile Photo and Username */}
      <section className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold font-heading text-fg">Profile Information</h2>
          <p className="text-xs text-fg-muted">
            All updates persist directly into <code className="font-mono text-xs">Data_account.json</code>.
          </p>
        </div>

        {profileMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              profileMsg.type === 'success'
                ? 'bg-success/10 text-success border border-success/30'
                : 'bg-danger/10 text-danger border border-danger/30'
            }`}
          >
            {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <WarningCircle size={16} />}
            <span>{profileMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
          <div className="flex items-center gap-4">
            <img
              src={photoUrl || user.photoUrl}
              alt={user.fullName}
              className="w-16 h-16 rounded-full object-cover border-2 border-border shadow-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`;
              }}
            />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-fg mb-1">
                Avatar Photo URL
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-fg mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-fg mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-fg mb-1">
              Thai National ID Card (Encrypted)
            </label>
            <input
              type="text"
              disabled
              value={user.maskedThaiId || 'X-XXXX-XXXXX-XX-X'}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted/60 text-xs text-fg-muted font-mono cursor-not-allowed"
            />
            <span className="text-[10px] text-fg-muted mt-1 block">
              Protected by AES-256-GCM encryption.
            </span>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="py-2.5 px-5 rounded-xl bg-primary-token text-on-primary font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
          >
            {profileLoading ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </section>

      {/* 3. Password Change (Directly overwrites Data_account.json) */}
      <section className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold font-heading text-fg">Change Password</h2>
          <p className="text-xs text-fg-muted">
            Directly overwrites and replaces your password hash in <code className="font-mono text-xs">Data_account.json</code>.
          </p>
        </div>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              passwordMsg.type === 'success'
                ? 'bg-success/10 text-success border border-success/30'
                : 'bg-danger/10 text-danger border border-danger/30'
            }`}
          >
            {passwordMsg.type === 'success' ? <CheckCircle size={16} /> : <WarningCircle size={16} />}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-fg mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-fg mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-fg mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="py-2.5 px-5 rounded-xl bg-accent-token text-on-accent font-semibold text-xs hover:opacity-95 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>

      {/* 4. Danger Zone: Delete Account */}
      <section className="p-6 rounded-2xl border border-danger/30 bg-danger/5 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold font-heading text-danger">Delete Account</h2>
          <p className="text-xs text-fg-muted">
            Permanently remove your account and credentials from KanaShop.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="py-2.5 px-4 rounded-xl border border-danger text-danger hover:bg-danger hover:text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2"
        >
          <Trash size={16} />
          <span>Delete KanaShop Account</span>
        </button>
      </section>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold font-heading text-danger">Confirm Account Deletion</h3>
            <p className="text-xs text-fg-muted">
              This action cannot be undone. To confirm, please type <strong className="text-fg">DELETE</strong> and enter your password.
            </p>

            {deleteError && (
              <p className="text-xs text-danger font-medium">{deleteError}</p>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-fg mb-1">
                  Type "DELETE"
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  required
                  placeholder="DELETE"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg mb-1">
                  Your Current Password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-xs text-fg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="py-2 px-4 rounded-xl border border-border text-xs text-fg-muted hover:text-fg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                  className="py-2 px-5 rounded-xl bg-danger text-white font-bold text-xs hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
