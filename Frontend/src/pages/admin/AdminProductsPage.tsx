import React, { useState, useEffect } from 'react';
import {
  Plus,
  PencilSimple,
  Trash,
  X,
  Package,
  CheckCircle,
  Funnel,
  Sparkle,
} from '@phosphor-icons/react';
import { Product, ProductCategory, ProductSubcategory } from '../../types/index.js';

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>('licensed');
  const [subcategory, setSubcategory] = useState<ProductSubcategory>('stainless_steel');
  const [capacityOz, setCapacityOz] = useState('30');
  const [price, setPrice] = useState('890');
  const [stock, setStock] = useState('50');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?category=all&subcategory=all');
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setTitle('');
    setDescription('');
    setCategory('licensed');
    setSubcategory('stainless_steel');
    setCapacityOz('500');
    setPrice('890');
    setStock('50');
    setImageFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setTitle(p.title);
    setDescription(p.description);
    setCategory(p.category);
    setSubcategory(p.subcategory);
    setCapacityOz(p.capacityOz.toString());
    setPrice(p.price.toString());
    setStock(p.stock.toString());
    setImageFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  // Adjust default subcategory when category changes
  const handleCategoryChange = (newCat: ProductCategory) => {
    setCategory(newCat);
    if (newCat === 'licensed') {
      setSubcategory('stainless_steel');
    } else {
      setSubcategory('ss304');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('subcategory', subcategory);
      formData.append('capacityOz', capacityOz);
      formData.append('price', price);
      formData.append('stock', stock);

      if (imageFile) {
        formData.append('images', imageFile);
      } else if (!editingProduct) {
        alert('Please select an image file to upload.');
        setFormLoading(false);
        return;
      }

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save product');
      }

      setToast(editingProduct ? 'Product updated!' : 'New product created!');
      setIsModalOpen(false);
      await fetchProducts();
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToast(`Deleted "${name}"`);
        await fetchProducts();
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      alert('Failed to delete product');
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

      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-fg">Product Catalog Management</h1>
          <p className="text-xs text-fg-muted mt-1">
            Create, modify, and manage inventory across Licensed and Plain tumbler categories.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          type="button"
          className="py-2.5 px-4 rounded-xl bg-accent-token text-on-accent font-bold text-xs hover:opacity-95 transition-all shadow-sm cursor-pointer flex items-center gap-2 self-start"
        >
          <Plus size={16} weight="bold" />
          <span>Add New Tumbler</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted/60 text-fg-muted border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-4">Preview</th>
                <th className="py-3 px-4">Product Title</th>
                <th className="py-3 px-4">Taxonomy</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Sales</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-fg">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <img
                      src={p.images[0] || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=200&q=80'}
                      alt={p.title}
                      className="w-12 h-12 rounded-lg object-cover bg-surface-muted border border-border"
                    />
                  </td>
                  <td className="py-3 px-4 font-semibold text-fg max-w-xs">{p.title}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-header-active text-header uppercase">
                      {p.category} · {p.subcategory.replace('ss', 'SUS ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">{p.capacityOz} ml</td>
                  <td className="py-3 px-4 font-bold text-accent-token">฿{p.price.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={p.stock < 10 ? 'text-danger font-bold' : ''}>
                      {p.stock} units
                    </span>
                  </td>
                  <td className="py-3 px-4 text-fg-muted">{p.salesVolume}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(p)}
                      type="button"
                      className="p-1.5 rounded-lg border border-border hover:bg-surface-muted text-fg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <PencilSimple size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.title)}
                      type="button"
                      className="p-1.5 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-fg-muted">
                    No products in catalog. Click "Add New Tumbler" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
        >
          <div className="w-full max-w-xl rounded-2xl bg-surface border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold font-heading text-fg">
                {editingProduct ? 'Edit Insulated Tumbler' : 'Add New Tumbler to Catalog'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                type="button"
                className="p-1 rounded-full text-fg-muted hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-fg mb-1">Product Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Kana Classic 30oz Stainless Tumbler"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                />
              </div>

              <div>
                <label className="block font-semibold text-fg mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Double-wall vacuum insulation, keeps cold for 24h..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                />
              </div>

              {/* Product Taxonomy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-fg mb-1">Primary Category *</label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg cursor-pointer"
                  >
                    <option value="licensed">Licensed Designs</option>
                    <option value="plain">Unlicensed / Plain Designs</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-fg mb-1">Subcategory *</label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value as ProductSubcategory)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg cursor-pointer"
                  >
                    {category === 'licensed' ? (
                      <>
                        <option value="stainless_steel">Stainless Steel</option>
                        <option value="ceramic">Ceramic Interior</option>
                      </>
                    ) : (
                      <>
                        <option value="ss304">Grade 304 Stainless Steel</option>
                        <option value="ss316">Grade 316 Stainless Steel</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-fg mb-1">Capacity (ml) *</label>
                  <input
                    type="number"
                    value={capacityOz}
                    onChange={(e) => setCapacityOz(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-fg mb-1">Price (฿) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-fg mb-1">Stock Units *</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg"
                  />
                </div>
              </div>

              {/* Image Input (File Upload Only) */}
              <div className="space-y-2">
                <label className="block font-semibold text-fg">
                  Product Image File {editingProduct ? '(Upload new file to replace)' : '*'}
                </label>

                {/* Thumbnail Preview */}
                {(previewUrl || editingProduct?.images?.[0]) && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-surface-muted">
                    <img
                      src={previewUrl || editingProduct?.images?.[0]}
                      alt="Product preview"
                      className="w-14 h-14 rounded-lg object-cover border border-border bg-surface shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-semibold text-fg truncate">
                        {imageFile ? imageFile.name : 'Current Image on File'}
                      </p>
                      <p className="text-[11px] text-fg-muted">
                        {imageFile
                          ? `${(imageFile.size / 1024).toFixed(1)} KB`
                          : 'Direct server storage'}
                      </p>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  required={!editingProduct}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImageFile(file);
                    if (file) {
                      setPreviewUrl(URL.createObjectURL(file));
                    } else {
                      setPreviewUrl(null);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-muted text-fg text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-header-active file:text-header hover:file:opacity-90 cursor-pointer"
                />
                <p className="text-[10px] text-fg-muted">
                  Image file upload only (JPG, PNG, WEBP, GIF). Saved directly to server disk.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-border text-fg-muted hover:text-fg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="py-2.5 px-6 rounded-xl bg-accent-token text-on-accent font-bold hover:opacity-95 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
