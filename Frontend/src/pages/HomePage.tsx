import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlass,
  Sparkle,
  Plus,
  Minus,
  Check,
  Funnel,
  Flame,
  ShieldCheck,
  ArrowsOutSimple,
  ArrowLeft,
  ArrowRight,
} from '@phosphor-icons/react';
import { useSearchParams } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore.js';
import { flyToCart } from '../utils/flyToCart.js';
import { Product, ProductCategory, ProductSubcategory } from '../types/index.js';
import { ProductDetailModal } from '../components/product/ProductDetailModal.js';

const rankConfig = [
  {
    rank: 1,
    title: 'Best Seller',
    flameColor: 'text-amber-200',
    badgeClass:
      'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.55)] border border-amber-300/50 animate-gold-pulse',
    rimClass:
      'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 animate-fire-rim',
  },
  {
    rank: 2,
    title: 'Hot Pick',
    flameColor: 'text-slate-200',
    badgeClass:
      'bg-gradient-to-r from-slate-500 via-zinc-400 to-slate-600 text-white shadow-[0_0_12px_rgba(148,163,184,0.4)] border border-slate-300/50',
    rimClass:
      'bg-gradient-to-r from-slate-300 via-sky-400 to-slate-400 animate-fire-rim',
  },
  {
    rank: 3,
    title: 'Trending',
    flameColor: 'text-amber-200',
    badgeClass:
      'bg-gradient-to-r from-amber-800 via-orange-700 to-amber-900 text-white shadow-[0_0_12px_rgba(180,83,9,0.45)] border border-orange-300/40',
    rimClass:
      'bg-gradient-to-r from-amber-700 via-orange-600 to-amber-900 animate-fire-rim',
  },
];

interface PopularSalesSectionProps {
  popularProducts: Product[];
  handleOpenProduct: (product: Product) => void;
  handleAddToCart: (product: Product, e: React.MouseEvent, imgId: string) => void;
}

const PopularSalesSection: React.FC<PopularSalesSectionProps> = ({
  popularProducts,
  handleOpenProduct,
  handleAddToCart,
}) => {
  const top3 = popularProducts.slice(0, 3);
  const [shiftStep, setShiftStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (top3.length < 3 || isPaused) return;
    const interval = setInterval(() => {
      setShiftStep((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(interval);
  }, [top3.length, isPaused]);

  if (top3.length === 0) return null;

  const renderCardInner = (prod: Product, originalIdx: number) => {
    const config = rankConfig[originalIdx];
    return (
      <>
        {/* Animated Fire Top Frame Rim */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${config.rimClass}`} />

        {/* Floating Animated Flame Ranking Badge */}
        <div
          className={`absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black select-none ${config.badgeClass}`}
        >
          <Flame size={16} weight="fill" className={`animate-fire-flicker ${config.flameColor}`} />
          <span>#{config.rank}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 hidden sm:inline">
            {config.title}
          </span>
        </div>

        {/* Clickable Image & Context to extend/view full details */}
        <div
          onClick={() => handleOpenProduct(prod)}
          className="cursor-pointer group/item"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpenProduct(prod);
            }
          }}
        >
          <div className="relative w-full h-56 rounded-xl overflow-hidden bg-surface-muted mb-4 border border-border">
            <img
              id={`popular-product-img-${prod.id}`}
              src={prod.images[0]}
              alt={prod.title}
              className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
            />
            {/* Quick View Hover Badge */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
              <span className="px-4 py-2 rounded-full bg-black/80 text-white text-xs font-bold backdrop-blur-md shadow-xl flex items-center gap-2 border border-white/30 transform translate-y-2 group-hover/item:translate-y-0 transition-all duration-200">
                <ArrowsOutSimple size={15} weight="bold" className="text-white" />
                <span className="text-white tracking-wide">View Details</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-header-active text-header uppercase">
              {prod.category} · {prod.subcategory.replace('_', ' ')}
            </span>
            <span className="text-xs text-fg-muted font-medium">
              {prod.capacityOz} ml
            </span>
          </div>

          <h3 className="font-semibold text-sm text-fg line-clamp-1 group-hover/item:text-accent-token transition-colors">
            {prod.title}
          </h3>
        </div>

        <div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <div>
              <span className="text-xs text-fg-muted block">Price</span>
              <span className="text-lg font-bold text-accent-token">
                ฿{prod.price.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-success block">
                {prod.salesVolume.toLocaleString()} sold
              </span>
              <span className="text-xs text-fg-muted">In Stock: {prod.stock} units</span>
            </div>
          </div>

          <button
            onClick={(e) => handleAddToCart(prod, e, `popular-product-img-${prod.id}`)}
            disabled={prod.stock <= 0}
            type="button"
            className="mt-3.5 w-full py-2 px-3 rounded-xl bg-primary-token text-on-primary font-semibold text-xs hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
          >
            <Plus size={14} weight="bold" />
            <span>Add to Cart</span>
          </button>
        </div>
      </>
    );
  };

  return (
    <section className="space-y-4">
      {/* Header with Title and Interactive Ranking Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-header-active text-header">
            <Flame size={22} weight="fill" className="animate-fire-flicker text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-fg flex items-center gap-2">
              <span>Popular Sales This Week</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent-token/15 text-accent-token">
                Top 3 Ranking
              </span>
            </h2>
            <p className="text-xs text-fg-muted">
              Best-selling insulated tumblers favored by thousands of daily users
            </p>
          </div>
        </div>

        {/* Ranking Switcher Controls & Progress */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Quick Focus Pills */}
          <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border">
            {top3.map((p, idx) => {
              const isCurrentCenter = (idx - shiftStep + 3) % 3 === 1;
              return (
                <button
                  key={p.id}
                  onClick={() => setShiftStep((idx - 1 + 3) % 3)}
                  type="button"
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isCurrentCenter
                      ? 'bg-accent-token text-on-accent shadow-xs scale-105'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                  title={`Focus #${idx + 1} ${rankConfig[idx].title}`}
                >
                  <Flame size={12} weight="fill" className={rankConfig[idx].flameColor} />
                  <span>#{idx + 1}</span>
                  <span className="hidden md:inline font-normal text-[10px] opacity-90">
                    {rankConfig[idx].title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShiftStep((prev) => (prev + 2) % 3)}
              type="button"
              className="p-1.5 rounded-lg border border-border bg-surface text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors cursor-pointer"
              title="Previous Rank"
            >
              <ArrowLeft size={14} weight="bold" />
            </button>
            <button
              onClick={() => setShiftStep((prev) => (prev + 1) % 3)}
              type="button"
              className="p-1.5 rounded-lg border border-border bg-surface text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors cursor-pointer"
              title="Next Rank"
            >
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop 3-Card Smooth Rotating Frame (md and up) */}
      <div
        className="hidden md:block relative w-full h-[510px]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {top3.map((prod, originalIdx) => {
          const slotIndex = (originalIdx - shiftStep + 3) % 3;
          const isCenterSlot = slotIndex === 1;

          return (
            <div
              key={prod.id}
              onClick={() => {
                if (!isCenterSlot) setShiftStep((originalIdx - 1 + 3) % 3);
              }}
              className={`absolute top-0 bottom-0 w-[calc((100%-2.5rem)/3)] rounded-2xl border bg-surface p-4 flex flex-col justify-between transition-all duration-750 ease-out origin-center group ${
                isCenterSlot
                  ? 'z-30 border-accent-token/60 shadow-2xl ring-2 ring-accent-token/25 opacity-100 filter-none'
                  : 'z-10 border-border opacity-50 saturate-[0.7] brightness-[0.95] hover:opacity-80 hover:saturate-100 hover:shadow-md cursor-pointer'
              }`}
              style={{
                transform: `translateX(calc(${slotIndex} * (100% + 1.25rem))) scale(${isCenterSlot ? 1.02 : 0.88})`,
              }}
            >
              {renderCardInner(prod, originalIdx)}
            </div>
          );
        })}
      </div>

      {/* Mobile Track Slider (< md) */}
      <div
        className="md:hidden overflow-hidden rounded-2xl relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${shiftStep * 100}%)` }}
        >
          {top3.map((prod, originalIdx) => (
            <div
              key={prod.id}
              className="w-full shrink-0 relative rounded-2xl border border-border bg-surface p-4 flex flex-col justify-between"
            >
              {renderCardInner(prod, originalIdx)}
            </div>
          ))}
        </div>

        {/* Mobile Step Dots */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {top3.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setShiftStep((idx - 1 + 3) % 3)}
              type="button"
              className={`h-2 rounded-full transition-all cursor-pointer ${
                (idx - shiftStep + 3) % 3 === 1 ? 'w-6 bg-accent-token' : 'w-2 bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export const HomePage: React.FC = () => {
  const { addItem, openDrawer } = useCartStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<ProductSubcategory | 'all'>('all');

  // Quantity stepper local state per product card (default: 1)
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch popular products
  useEffect(() => {
    fetch('/api/products/popular')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPopularProducts(data);
      })
      .catch(() => {});
  }, []);

  // Sync selectedProduct with URL ?product= query param
  useEffect(() => {
    const urlProductId = searchParams.get('product');
    if (urlProductId) {
      if (!selectedProduct || selectedProduct.id !== urlProductId) {
        // Find in already loaded lists or fetch
        const match =
          products.find((p) => p.id === urlProductId) ||
          popularProducts.find((p) => p.id === urlProductId);
        if (match) {
          setSelectedProduct(match);
        } else {
          fetch(`/api/products/${urlProductId}`)
            .then((r) => r.json())
            .then((data) => {
              if (data && data.id) setSelectedProduct(data);
            })
            .catch(() => {});
        }
      }
    } else if (selectedProduct) {
      setSelectedProduct(null);
    }
  }, [searchParams, products, popularProducts]);

  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('product', product.id);
    setSearchParams(newParams);
  };

  const handleCloseProduct = () => {
    setSelectedProduct(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('product');
    setSearchParams(newParams, { replace: true });
  };

  // Fetch products with search & filter (Debounced 300ms + AbortController)
  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedSubcategory !== 'all') params.set('subcategory', selectedSubcategory);

      fetch(`/api/products?${params.toString()}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setProducts(data);
        })
        .catch((e) => {
          if (e.name !== 'AbortError') console.error('Fetch products error:', e);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, selectedCategory, selectedSubcategory]);

  const getQty = (productId: string) => quantities[productId] || 1;

  const setQty = (productId: string, val: number, maxStock: number) => {
    const clamped = Math.max(1, Math.min(maxStock, val));
    setQuantities((prev) => ({ ...prev, [productId]: clamped }));
  };

  const handleAddToCart = (
    product: Product,
    event?: React.MouseEvent,
    imgElementId?: string
  ) => {
    const qty = getQty(product.id);
    addItem(product, qty);

    // Locate source element for fly animation
    let startEl: HTMLElement | null = null;
    if (imgElementId) {
      startEl = document.getElementById(imgElementId);
    }
    if (!startEl) {
      startEl = document.getElementById(`product-img-${product.id}`);
    }
    if (!startEl && event) {
      startEl = event.currentTarget as HTMLElement;
    }

    flyToCart({
      startElement: startEl,
      imageUrl: product.images[0] || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
      qty,
    });

    setAddedToast(`Added ${qty}× "${product.title}" to My Order!`);
    setTimeout(() => setAddedToast(null), 2500);
  };

  const filterChips = [
    { label: 'All Designs', category: 'all', subcategory: 'all' },
    { label: 'Licensed · Stainless Steel', category: 'licensed', subcategory: 'stainless_steel' },
    { label: 'Licensed · Ceramic Lined', category: 'licensed', subcategory: 'ceramic' },
    { label: 'Plain · SUS 304 Steel', category: 'plain', subcategory: 'ss304' },
    { label: 'Plain · SUS 316 Marine', category: 'plain', subcategory: 'ss316' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Toast Notification: bottom right, non-intrusive so user keeps browsing */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 pr-4 rounded-xl bg-header-active text-header border border-header shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-4">
          <div className="p-1 rounded-full bg-header text-on-header flex items-center justify-center">
            <Check size={14} weight="bold" />
          </div>
          <span className="line-clamp-1 max-w-xs">{addedToast}</span>
          <button
            onClick={() => openDrawer()}
            type="button"
            className="ml-1 px-2.5 py-1 rounded-lg bg-header text-xs font-bold text-on-header hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
          >
            View Order
          </button>
        </div>
      )}

      {/* Hero Section: "Popular Sales This Week" with Fire & Rotating Ranking Animation */}
      <PopularSalesSection
        popularProducts={popularProducts}
        handleOpenProduct={handleOpenProduct}
        handleAddToCart={handleAddToCart}
      />

      {/* Product Catalog Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-fg">
              Full Insulated Drinkware Catalog
            </h2>
            <p className="text-xs text-fg-muted">
              Choose from licensed character editions and plain high-grade 304/316 steel
            </p>
          </div>

          {/* Live Search Input */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
              <MagnifyingGlass size={18} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tumblers by title..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-xs text-fg placeholder:text-fg-muted/70 focus:outline-none focus:ring-2 focus:ring-accent-token"
            />
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-fg-muted flex items-center gap-1.5 pr-1 shrink-0">
            <Funnel size={14} />
            <span>Filter:</span>
          </span>

          {filterChips.map((chip) => {
            const isSelected =
              selectedCategory === chip.category && selectedSubcategory === chip.subcategory;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setSelectedCategory(chip.category as any);
                  setSelectedSubcategory(chip.subcategory as any);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary-token text-on-primary font-bold shadow-xs'
                    : 'bg-surface border border-border text-fg-muted hover:text-fg hover:bg-surface-muted'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="rounded-2xl border border-border p-4 space-y-3 animate-pulse bg-surface">
                <div className="w-full h-52 bg-surface-muted rounded-xl"></div>
                <div className="h-4 bg-surface-muted rounded w-3/4"></div>
                <div className="h-3 bg-surface-muted rounded w-1/2"></div>
                <div className="h-8 bg-surface-muted rounded mt-2"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border rounded-2xl p-8 bg-surface">
            <p className="text-base font-semibold text-fg">No tumblers found</p>
            <p className="text-xs text-fg-muted mt-1 max-w-sm mx-auto">
              We couldn't find any products matching your search query or filter. Try clearing filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedSubcategory('all');
              }}
              type="button"
              className="mt-4 px-4 py-2 rounded-xl bg-header-active text-header font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              const currentQty = getQty(product.id);
              return (
                <div
                  key={product.id}
                  className="rounded-2xl border border-border bg-surface p-4 flex flex-col justify-between hover:shadow-lg transition-all group"
                >
                  {/* Clickable Image & Context to extend/view full details */}
                  <div
                    onClick={() => handleOpenProduct(product)}
                    className="cursor-pointer group/item"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenProduct(product);
                      }
                    }}
                  >
                    {/* Large Product Preview Image with Quick View Hover Overlay */}
                    <div className="relative w-full h-56 rounded-xl overflow-hidden bg-surface-muted mb-3.5 border border-border">
                      <img
                        id={`product-img-${product.id}`}
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                      />
                      {/* Quick View Hover Badge */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-4 py-2 rounded-full bg-black/80 text-white text-xs font-bold backdrop-blur-md shadow-xl flex items-center gap-2 border border-white/30 transform translate-y-2 group-hover/item:translate-y-0 transition-all duration-200">
                          <ArrowsOutSimple size={15} weight="bold" className="text-white" />
                          <span className="text-white tracking-wide">View Details</span>
                        </span>
                      </div>
                    </div>

                    {/* Category Tag Pill */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-header-active text-header uppercase tracking-wider">
                        {product.category === 'licensed' ? 'Licensed' : 'Plain'} ·{' '}
                        {product.subcategory.replace('ss', 'SUS ')}
                      </span>
                      <span className="text-xs text-fg-muted font-medium">
                        {product.capacityOz} ml
                      </span>
                    </div>

                    {/* Product Title */}
                    <h3 className="font-semibold text-sm text-fg line-clamp-2 leading-snug mb-1 group-hover/item:text-accent-token transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-xs text-fg-muted line-clamp-2 leading-relaxed mb-3">
                      {product.description}
                    </p>
                  </div>

                  <div>
                    {/* Price and Stock */}
                    <div className="flex items-center justify-between mb-3 pt-2 border-t border-border">
                      <div>
                        <span className="text-base font-bold text-accent-token">
                          ฿{product.price.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-fg-muted font-medium">
                        {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                      </span>
                    </div>

                    {/* Quantity Stepper & Add to Cart */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-fg-muted">
                        <span>Quantity:</span>
                        <div className="flex items-center border border-border rounded-lg bg-surface-muted">
                          <button
                            onClick={() => setQty(product.id, currentQty - 1, product.stock)}
                            disabled={currentQty <= 1}
                            type="button"
                            className="p-1.5 hover:bg-surface rounded-l-lg text-fg hover:text-fg disabled:opacity-30 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-3 font-bold text-fg text-xs">{currentQty}</span>
                          <button
                            onClick={() => setQty(product.id, currentQty + 1, product.stock)}
                            disabled={currentQty >= product.stock}
                            type="button"
                            className="p-1.5 hover:bg-surface rounded-r-lg text-fg hover:text-fg disabled:opacity-30 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleAddToCart(product, e, `product-img-${product.id}`)}
                        disabled={product.stock <= 0}
                        type="button"
                        className="w-full py-2.5 px-4 rounded-xl bg-primary-token text-on-primary font-semibold text-xs hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} weight="bold" />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Product Information Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={handleCloseProduct}
        onOpenOrderDrawer={() => openDrawer()}
      />
    </div>
  );
};
