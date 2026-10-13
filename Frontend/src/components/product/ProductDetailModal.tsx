import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  Sparkle,
  ShieldCheck,
  Drop,
  Flame,
  Check,
  Truck,
  ArrowRight,
} from '@phosphor-icons/react';
import { Product } from '../../types/index.js';
import { useCartStore } from '../../stores/cartStore.js';
import { flyToCart } from '../../utils/flyToCart.js';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOrderDrawer?: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onOpenOrderDrawer,
}) => {
  const { addItem, openDrawer } = useCartStore();
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Reset state when a new product is selected
  useEffect(() => {
    if (product) {
      setSelectedImageIdx(0);
      setQuantity(1);
      setAddedSuccess(false);
    }
  }, [product]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const currentImage = product.images[selectedImageIdx] || product.images[0];

  const getSubcategoryLabel = () => {
    switch (product.subcategory) {
      case 'stainless_steel':
        return 'Double-Wall Stainless Steel';
      case 'ceramic':
        return 'Ceramic Lined Core';
      case 'ss304':
        return 'Grade 304 Food-Safe Stainless Steel';
      case 'ss316':
        return 'Grade 316 Marine Stainless Steel';
      default:
        return product.subcategory;
    }
  };

  const getMaterialDetail = () => {
    switch (product.subcategory) {
      case 'ss316':
        return 'Premium SUS 316 Marine-Grade Austenitic Steel with enhanced molybdenum for maximum resistance to acidic liquids, juices, coffee, and corrosion.';
      case 'ss304':
        return 'Durable SUS 304 (18/8) Food-Grade Stainless Steel engineered for daily hydration, high impact resistance, and zero odor retention.';
      case 'ceramic':
        return 'German-engineered pure ceramic interior lining fired at high temperature. Prevents any metallic aftertaste, making it ideal for specialty coffee, tea, and citrus infusions.';
      case 'stainless_steel':
        return 'Double-wall vacuum insulated 18/8 pro-grade stainless steel with durable anti-scratch powder coating.';
      default:
        return 'Double-wall vacuum insulation technology.';
    }
  };

  const handleQtyChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(product.stock, prev + delta)));
  };

  const handleAddToCart = (e?: React.MouseEvent) => {
    if (product.stock <= 0) return;

    addItem(product, quantity);

    const imgEl = document.getElementById('modal-main-product-img');
    flyToCart({
      startElement: imgEl || (e?.currentTarget as HTMLElement),
      imageUrl: currentImage,
      qty: quantity,
    });

    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
    }, 2500);
  };

  const handleDirectCheckout = (e: React.MouseEvent) => {
    if (product.stock <= 0) return;
    addItem(product, quantity);
    onClose();
    if (onOpenOrderDrawer) {
      onOpenOrderDrawer();
    } else {
      openDrawer();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col md:flex-row rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close product details"
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-surface/80 md:bg-surface-muted text-fg-muted hover:text-fg hover:bg-surface-muted backdrop-blur-md transition-colors cursor-pointer border border-border/40 shadow-xs"
        >
          <X size={18} weight="bold" />
        </button>

        {/* Left Side: Product Image & Gallery */}
        <div className="w-full md:w-1/2 p-5 sm:p-6 md:p-8 bg-surface-muted/40 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
          <div className="space-y-4">
            {/* Primary Large Image View */}
            <div className="relative w-full h-64 sm:h-72 md:h-84 rounded-2xl overflow-hidden bg-surface border border-border flex items-center justify-center shadow-inner group">
              <img
                id="modal-main-product-img"
                src={currentImage}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Floating Status Badges on Image */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-header-active text-header border border-header shadow-xs">
                  {product.category === 'licensed' ? 'Official Licensed' : 'Minimalist Series'}
                </span>
                {product.salesVolume > 1000 && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-accent-token text-on-accent shadow-xs flex items-center gap-1">
                    <Flame size={12} weight="fill" />
                    <span>Best Seller</span>
                  </span>
                )}
              </div>

              {/* Stock status watermark badge */}
              <div className="absolute bottom-3 right-3 pointer-events-none">
                {product.stock > 0 ? (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-surface/90 text-success backdrop-blur-md border border-border shadow-xs flex items-center gap-1">
                    <Check size={12} weight="bold" />
                    <span>In Stock ({product.stock})</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-error/90 text-white backdrop-blur-md shadow-xs">
                    Out of Stock
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Gallery (if multi-image or supplementary previews) */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImageIdx === idx
                        ? 'border-accent-token ring-2 ring-accent-token/20 scale-105'
                        : 'border-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.title} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Confidence Highlights */}
          <div className="hidden sm:grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-[11px] text-fg-muted font-medium">
              <ShieldCheck size={16} className="text-success shrink-0" weight="fill" />
              <span>100% Authentic Quality</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-fg-muted font-medium">
              <Truck size={16} className="text-primary-token shrink-0" weight="fill" />
              <span>Fast 1-2 Day Shipping</span>
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Product Context & Actions */}
        <div className="w-full md:w-1/2 p-5 sm:p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[60vh] md:max-h-[92vh]">
          <div className="space-y-5">
            {/* Category Breadcrumbs & Subcategory */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-fg-muted mb-1.5">
                <span className="capitalize">{product.category}</span>
                <span>/</span>
                <span className="text-header font-bold">{getSubcategoryLabel()}</span>
              </div>

              {/* Title */}
              <h2
                id="product-modal-title"
                className="text-lg sm:text-xl md:text-2xl font-bold font-heading text-fg leading-snug"
              >
                {product.title}
              </h2>
            </div>

            {/* Price & Sales Volume Stat */}
            <div className="flex items-baseline justify-between pb-3 border-b border-border">
              <div>
                <span className="text-xs text-fg-muted block">Direct Price</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-accent-token">
                  ฿{product.price.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-success flex items-center justify-end gap-1">
                  <Flame size={14} weight="fill" />
                  <span>{product.salesVolume.toLocaleString()} sold this week</span>
                </span>
                <span className="text-[11px] text-fg-muted">
                  Capacity: {product.capacityOz} ml
                </span>
              </div>
            </div>

            {/* Product Narrative / Description */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Description & Story</h3>
              <p className="text-xs sm:text-sm text-fg leading-relaxed bg-surface-muted/30 p-3.5 rounded-xl border border-border/50">
                {product.description}
              </p>
            </div>

            {/* Thermal & Material Specifications Grid */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Specifications & Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Thermal retention */}
                <div className="p-3 rounded-xl border border-border bg-surface-muted/30 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-header-active text-header mt-0.5 shrink-0">
                    <Sparkle size={16} weight="bold" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-fg block">Thermal Vacuum</span>
                    <span className="text-[10px] text-fg-muted">Cold up to 24h · Hot up to 12h</span>
                  </div>
                </div>

                {/* Capacity */}
                <div className="p-3 rounded-xl border border-border bg-surface-muted/30 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-header-active text-header mt-0.5 shrink-0">
                    <Drop size={16} weight="bold" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-fg block">Capacity Volume</span>
                    <span className="text-[10px] text-fg-muted">{product.capacityOz} ml</span>
                  </div>
                </div>
              </div>

              {/* Material Detail Box */}
              <div className="p-3 rounded-xl border border-border bg-surface text-xs text-fg-muted leading-relaxed">
                <strong className="text-fg font-semibold block mb-0.5">Material Composition:</strong>
                {getMaterialDetail()}
              </div>
            </div>
          </div>

          {/* Bottom Action Area: Stepper & Add to Cart */}
          <div className="mt-6 pt-4 border-t border-border space-y-3">
            {/* Quantity Selector & Realtime Subtotal */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-fg-muted block">Select Quantity</span>
                <span className="text-xs font-bold text-fg">
                  Subtotal: ฿{(product.price * quantity).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center border border-border rounded-xl bg-surface-muted">
                <button
                  type="button"
                  onClick={() => handleQtyChange(-1)}
                  disabled={quantity <= 1}
                  className="p-2 hover:bg-surface rounded-l-xl text-fg disabled:opacity-30 cursor-pointer transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} weight="bold" />
                </button>
                <span className="px-4 font-bold text-fg text-sm">{quantity}</span>
                <button
                  type="button"
                  onClick={() => handleQtyChange(1)}
                  disabled={quantity >= product.stock}
                  className="p-2 hover:bg-surface rounded-r-xl text-fg disabled:opacity-30 cursor-pointer transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} weight="bold" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="w-full py-3 px-4 rounded-xl bg-primary-token text-on-primary font-bold text-xs hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                {addedSuccess ? (
                  <>
                    <Check size={16} weight="bold" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} weight="bold" />
                    <span>Add to Cart ({quantity})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDirectCheckout}
                disabled={product.stock <= 0}
                className="w-full py-3 px-4 rounded-xl bg-header-active text-header font-bold text-xs hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer border border-header flex items-center justify-center gap-2"
              >
                <ShoppingBag size={16} weight="bold" />
                <span>Buy Now / Order</span>
                <ArrowRight size={14} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
