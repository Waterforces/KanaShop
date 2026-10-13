import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldWarning,
  Prohibit,
  CheckCircle,
  X,
  WarningCircle,
  Clock,
  Trash,
} from '@phosphor-icons/react';
import { UserAccount, UserStatus } from '../../types/index.js';
import { useAuthStore } from '../../stores/authStore.js';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Status Action Modal
  const [targetUser, setTargetUser] = useState<UserAccount | null>(null);
  const [newStatus, setNewStatus] = useState<UserStatus>('suspended');
  const [suspendDays, setSuspendDays] = useState('7');
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/admin/all');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openActionModal = (u: UserAccount) => {
    setTargetUser(u);
    setNewStatus(u.status === 'active' ? 'suspended' : 'active');
    setBanReason(u.banReason || '');
    setSuspendDays('7');
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/admin/${targetUser.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          banReason: newStatus !== 'active' ? banReason : null,
          suspendDays: newStatus === 'suspended' ? suspendDays : undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update user status');
      }

      setToast(`Account status updated for @${targetUser.username}`);
      setTargetUser(null);
      await fetchUsers();
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string, role?: string) => {
    const isTargetAdmin = role === 'admin';
    if (
      !confirm(
        `Are you sure you want to permanently delete ${isTargetAdmin ? 'administrator' : 'user'} @${username}?\n\nThis will completely remove the account from Data_account.json and purge their chat history.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/users/admin/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account.');
      }

      setToast(`Account @${username} deleted permanently from Data_account.json.`);
      if (targetUser?.id === userId) {
        setTargetUser(null);
      }
      await fetchUsers();
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Error deleting account');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-header-active text-header border border-header shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-4">
          <CheckCircle size={18} weight="bold" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-fg">User Account Directory</h1>
        <p className="text-xs text-fg-muted mt-1">
          Inspect customer accounts stored in Data_account.json with administrative suspension and ban controls.
        </p>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted/60 text-fg-muted border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Thai National ID</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-fg">
              {users.map((u) => {
                const isBanned = u.status === 'banned';
                const isSuspended = u.status === 'suspended';
                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-surface-muted/30 transition-colors ${
                      isBanned ? 'opacity-60 bg-danger/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4 flex items-center gap-3">
                      <img
                        src={u.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${u.fullName}`}
                        alt={u.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-border"
                      />
                      <div>
                        <p className="font-bold text-fg">{u.fullName}</p>
                        <p className="text-[10px] text-fg-muted font-mono">@{u.username}</p>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <p>{u.email}</p>
                      <p className="text-[10px] text-fg-muted font-mono">{u.phone}</p>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      {u.maskedThaiId || 'X-XXXX-XXXXX-XX-X'}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-accent-token text-on-accent'
                            : 'bg-surface-muted text-fg-muted'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success">
                          Active
                        </span>
                      ) : isSuspended ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/15 text-warning">
                            Suspended
                          </span>
                          {u.suspendedUntil && (
                            <p className="text-[9px] text-fg-muted mt-0.5">
                              Until {new Date(u.suspendedUntil).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/15 text-danger">
                            Banned
                          </span>
                          {u.banReason && (
                            <p className="text-[9px] text-danger mt-0.5 truncate max-w-[120px]">
                              {u.banReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-fg-muted text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {u.id === currentUser?.id ? (
                        <span className="text-[11px] font-bold text-fg-muted px-2.5 py-1 rounded-lg bg-surface-muted border border-border">
                          You (Active)
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => openActionModal(u)}
                              type="button"
                              className="py-1 px-2.5 rounded-lg border border-border hover:bg-surface-muted text-fg transition-colors cursor-pointer text-xs font-semibold"
                            >
                              Modify Status
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username, u.role)}
                            type="button"
                            className="p-1.5 rounded-lg border border-danger/30 hover:bg-danger/10 text-danger transition-colors cursor-pointer"
                            title={`Permanently Delete ${u.role === 'admin' ? 'Administrator' : 'User'} from Data_account.json`}
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Moderate Status Modal */}
      {targetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold font-heading text-fg">
                  Manage User Status: @{targetUser.username}
                </h3>
                <p className="text-xs text-fg-muted">{targetUser.fullName}</p>
              </div>
              <button
                onClick={() => setTargetUser(null)}
                type="button"
                className="p-1 rounded-full text-fg-muted hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-fg mb-1">Select Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg cursor-pointer"
                >
                  <option value="active">Active (Normal Access)</option>
                  <option value="suspended">Suspended (Temporary Lockout)</option>
                  <option value="banned">Banned (Permanent Revocation)</option>
                </select>
              </div>

              {newStatus === 'suspended' && (
                <div>
                  <label className="block font-semibold text-fg mb-1">
                    Suspension Duration (Days)
                  </label>
                  <select
                    value={suspendDays}
                    onChange={(e) => setSuspendDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                  >
                    <option value="1">1 Day</option>
                    <option value="3">3 Days</option>
                    <option value="7">7 Days (1 Week)</option>
                    <option value="14">14 Days (2 Weeks)</option>
                    <option value="30">30 Days (1 Month)</option>
                  </select>
                </div>
              )}

              {newStatus !== 'active' && (
                <div>
                  <label className="block font-semibold text-fg mb-1">Reason / Note *</label>
                  <textarea
                    rows={2}
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    required
                    placeholder="e.g., Inappropriate chat behavior or suspicious chargebacks"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleDeleteUser(targetUser.id, targetUser.username)}
                  className="py-2 px-3 rounded-xl border border-danger/40 hover:bg-danger/10 text-danger text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Permanently remove user from Data_account.json"
                >
                  <Trash size={14} />
                  <span>Delete from File</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetUser(null)}
                    className="py-2 px-4 rounded-xl border border-border text-fg-muted hover:text-fg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`py-2 px-5 rounded-xl font-bold text-white cursor-pointer shadow-xs ${
                      newStatus === 'active'
                        ? 'bg-success hover:opacity-90'
                        : newStatus === 'suspended'
                          ? 'bg-warning hover:opacity-90'
                          : 'bg-danger hover:opacity-90'
                    }`}
                  >
                    {actionLoading ? 'Updating...' : `Set as ${newStatus.toUpperCase()}`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
