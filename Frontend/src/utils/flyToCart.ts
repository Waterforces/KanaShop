import { useCartStore } from '../stores/cartStore.js';

interface FlyToCartOptions {
  startElement?: HTMLElement | null;
  imageUrl: string;
  qty?: number;
  onComplete?: () => void;
}

export const getCartTargetElement = (): HTMLElement | null => {
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  const desktopBtn = document.getElementById('header-my-order-btn');
  const mobileBtn = document.getElementById('mobile-header-my-order-btn');

  if (isDesktop && desktopBtn) return desktopBtn;
  if (!isDesktop && mobileBtn) return mobileBtn;
  return desktopBtn || mobileBtn;
};

export const flyToCart = ({
  startElement,
  imageUrl,
  qty = 1,
  onComplete,
}: FlyToCartOptions) => {
  if (typeof window === 'undefined') return;

  // If user prefers reduced motion, trigger cart bump directly without flight
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    useCartStore.getState().triggerCartBump();
    onComplete?.();
    return;
  }

  const targetEl = getCartTargetElement();

  // Starting coordinates (center of product image or card)
  let startX = window.innerWidth / 2;
  let startY = window.innerHeight / 2;

  if (startElement) {
    const rect = startElement.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  }

  // Target coordinates (center of My Order button in sticky header)
  let endX = window.innerWidth - 80;
  let endY = 32;

  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    endX = rect.left + rect.width / 2;
    endY = rect.top + rect.height / 2;
  }

  const dx = endX - startX;
  const dy = endY - startY;

  // Create floating flyer container
  const flyer = document.createElement('div');
  flyer.className = 'fixed pointer-events-none z-[9999] select-none';
  flyer.style.left = `${startX}px`;
  flyer.style.top = `${startY}px`;
  flyer.style.transform = 'translate(-50%, -50%)';

  // Inner preview card showing product image
  const card = document.createElement('div');
  card.className =
    'relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-accent-token bg-white ring-4 ring-accent-token/20 transition-all';

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = 'Flying cart item';
  img.className = 'w-full h-full object-cover';
  card.appendChild(img);

  if (qty > 1) {
    const badge = document.createElement('span');
    badge.className =
      'absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-black rounded-full bg-accent-token text-on-accent shadow-xs';
    badge.textContent = `+${qty}`;
    card.appendChild(badge);
  }

  flyer.appendChild(card);
  document.body.appendChild(flyer);

  // Parabolic trajectory keyframes: smooth buoyant arc towards header
  const keyframes: Keyframe[] = [
    {
      transform: 'translate(-50%, -50%) translate3d(0px, 0px, 0px) scale(1) rotate(0deg)',
      opacity: 1,
      offset: 0,
    },
    {
      transform: `translate(-50%, -50%) translate3d(${dx * 0.22}px, ${dy * 0.12 - 40}px, 0px) scale(1.08) rotate(-7deg)`,
      opacity: 1,
      offset: 0.25,
    },
    {
      transform: `translate(-50%, -50%) translate3d(${dx * 0.58}px, ${dy * 0.5 - 28}px, 0px) scale(0.75) rotate(5deg)`,
      opacity: 0.95,
      offset: 0.58,
    },
    {
      transform: `translate(-50%, -50%) translate3d(${dx * 0.88}px, ${dy * 0.85}px, 0px) scale(0.38) rotate(-2deg)`,
      opacity: 0.8,
      offset: 0.85,
    },
    {
      transform: `translate(-50%, -50%) translate3d(${dx}px, ${dy}px, 0px) scale(0.12) rotate(0deg)`,
      opacity: 0,
      offset: 1,
    },
  ];

  const animation = flyer.animate(keyframes, {
    duration: 750,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    fill: 'forwards',
  });

  const cleanup = () => {
    flyer.remove();

    // Spawn mini arrival ripple / sparkle burst at My Order target
    const ripple = document.createElement('div');
    ripple.className =
      'fixed pointer-events-none z-[9999] rounded-full border-2 border-accent-token bg-accent-token/25 shadow-md';
    ripple.style.left = `${endX}px`;
    ripple.style.top = `${endY}px`;
    ripple.style.width = '32px';
    ripple.style.height = '32px';
    ripple.style.transform = 'translate(-50%, -50%) scale(0.2)';
    document.body.appendChild(ripple);

    ripple.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 1 },
        { transform: 'translate(-50%, -50%) scale(2.2)', opacity: 0 },
      ],
      { duration: 380, easing: 'ease-out' }
    ).onfinish = () => ripple.remove();

    // Trigger cart bump wiggle in header
    useCartStore.getState().triggerCartBump();
    onComplete?.();
  };

  animation.onfinish = cleanup;
  animation.oncancel = () => flyer.remove();
};
