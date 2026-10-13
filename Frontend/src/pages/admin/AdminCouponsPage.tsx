import React, { useState, useEffect } from 'react';
import { Ticket, Plus, CheckCircle, X, Trash, PencilSimple } from '@phosphor-icons/react';
import { Coupon } from '../../types/index.js';

export const AdminCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('10');
  const [minSpend, setMinSpend] = useState('500');
  const [maxDiscount, setMaxDiscount] = useState('200');
  const [usageLimit, setUsageLimit] = useState('500');
  const [active, setActive] = useState(true);

  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coupons/admin/all');
      const data = await res.json();
      if (Array.isArray(data)) setCoupons(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setTitle('');
    setDescription('');
    setType('percent');
    setValue('10');
    setMinSpend('500');
    setMaxDiscount('200');
    setUsageLimit('500');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    setCode(c.code);
    setTitle(c.title);
    setDescription(c.description || '');
    setType(c.type);
    setValue(String(c.value));
    setMinSpend(String(c.minSpend || 0));
    setMaxDiscount(c.maxDiscount !== undefined && c.maxDiscount !== null ? String(c.maxDiscount) : '');
    setUsageLimit(String(c.usageLimit || 500));
    setActive(c.active ?? true);
    setIsModalOpen(true);
  };

  const handleSubmitCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (editingCoupon) {
        // Edit existing coupon
        const res = await fetch(`/api/coupons/admin/${editingCoupon.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code.toUpperCase().trim(),
            title: title.trim(),
            description: description.trim(),
            type,
            value: parseFloat(value),
            minSpend: parseFloat(minSpend || '0'),
            maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
            usageLimit: parseInt(usageLimit || '500', 10),
            active,
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to update coupon');
        }

        showToast(`Updated coupon "${code.toUpperCase()}" successfully`);
      } else {
        // Create new coupon
        const res = await fetch('/api/coupons/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code.toUpperCase().trim(),
            title: title.trim(),
            description: description.trim(),
            type,
            value: parseFloat(value),
            minSpend: parseFloat(minSpend || '0'),
            maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
            usageLimit: parseInt(usageLimit || '500', 10),
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to create coupon');
        }

        showToast(`Created coupon "${code.toUpperCase()}" successfully`);
      }

      setIsModalOpen(false);
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      const res = await fetch(`/api/coupons/admin/${c.id}/toggle`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update status');
      }

      showToast(`Coupon "${c.code}" is now ${!c.active ? 'Active' : 'Inactive'}`);
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to permanently delete coupon "${code}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/coupons/admin/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete coupon');
      }

      showToast(`Deleted coupon "${code}"`);
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-fg">Coupons & Promo Vouchers</h1>
          <p className="text-xs text-fg-muted mt-1">
            Configure, edit discount parameters, and toggle activate/deactivate status for customer cart checkouts.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          type="button"
          className="py-2.5 px-4 rounded-xl bg-accent-token text-on-accent font-bold text-xs hover:opacity-95 transition-all shadow-sm cursor-pointer flex items-center gap-2 self-start"
        >
          <Plus size={16} weight="bold" />
          <span>Create Voucher</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted/60 text-fg-muted border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Title & Description</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Min. Spend</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-fg">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-accent-token">
                    {c.code}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-fg">{c.title}</p>
                    <p className="text-[11px] text-fg-muted">{c.description}</p>
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    {c.type === 'percent' ? `${c.value}% OFF` : `฿${c.value} OFF`}
                    {c.maxDiscount ? (
                      <span className="block text-[10px] text-fg-muted font-normal">
                        (Max ฿{c.maxDiscount.toLocaleString()})
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 px-4 font-mono">฿{c.minSpend.toLocaleString()}</td>
                  <td className="py-3 px-4 text-fg-muted">
                    {c.usedCount} / {c.usageLimit} used
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(c)}
                      title={c.active ? 'Click to deactivate' : 'Click to activate'}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                        c.active
                          ? 'bg-success/15 text-success hover:bg-success/25'
                          : 'bg-surface-muted text-fg-muted hover:bg-surface-muted/80 border border-border'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${c.active ? 'bg-success' : 'bg-fg-muted'}`} />
                      <span>{c.active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(c)}
                      type="button"
                      className="p-1.5 rounded-lg border border-border hover:bg-surface-muted text-fg transition-colors cursor-pointer"
                      title="Edit Coupon"
                    >
                      <PencilSimple size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.code)}
                      type="button"
                      className="p-1.5 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                      title="Delete Coupon"
                    >
                      <Trash size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-fg-muted">
                    No coupons created yet. Click "Create Voucher" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold font-heading text-fg">
                {editingCoupon ? 'Edit Promo Voucher' : 'Create Promo Voucher'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                type="button"
                className="p-1 rounded-full text-fg-muted hover:text-fg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCoupon} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-fg mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  placeholder="SUMMER20"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-fg mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Summer Hydration 20% Off"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                />
              </div>

              <div>
                <label className="block font-semibold text-fg mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Valid for all stainless steel tumblers"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-fg mb-1">Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Baht (฿)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-fg mb-1">Value *</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-fg mb-1">Min. Spend (฿)</label>
                  <input
                    type="number"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-fg mb-1">Max Discount (฿)</label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-fg mb-1">Usage Limit</label>
                <input
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                />
              </div>

              {/* Activate / Inactivate Toggle Checkbox */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-muted/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-accent-token accent-accent-token cursor-pointer"
                />
                <div>
                  <p className="font-semibold text-fg">Coupon Activated</p>
                  <p className="text-[11px] text-fg-muted">
                    {active
                      ? 'Coupon is active and can be collected & applied by customers at checkout'
                      : 'Coupon is inactive and deactivated/hidden from customers'}
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-border text-fg-muted hover:text-fg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="py-2 px-5 rounded-xl bg-accent-token text-on-accent font-bold cursor-pointer hover:opacity-90 disabled:opacity-50"
                >
                  {formLoading
                    ? 'Saving...'
                    : editingCoupon
                    ? 'Save Changes'
                    : 'Create Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
