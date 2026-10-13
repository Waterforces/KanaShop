import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Drop,
  Sparkle,
  Phone,
  Envelope,
  MapPin,
  ChatCircleText,
} from '@phosphor-icons/react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-surface-muted/60 text-fg-muted mt-20 transition-colors duration-200">
      {/* Product highlights banner */}
      <div className="border-b border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="p-3 rounded-xl bg-header-active text-header">
              <Drop size={26} weight="duotone" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-fg">24H Cold & 12H Hot</h4>
              <p className="text-xs text-fg-muted">Double-wall vacuum copper insulation</p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="p-3 rounded-xl bg-header-active text-header">
              <ShieldCheck size={26} weight="duotone" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-fg">Food Grade SUS 304 & 316</h4>
              <p className="text-xs text-fg-muted">100% BPA Free & non-toxic materials</p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="p-3 rounded-xl bg-header-active text-header">
              <Sparkle size={26} weight="duotone" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-fg">Official Licensed Editions</h4>
              <p className="text-xs text-fg-muted">Authentic designs & durable ceramic lining</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer navigation & info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-header-active border border-header flex items-center justify-center font-bold text-sm text-header">
              K
            </div>
            <span className="font-heading font-bold text-xl text-fg">KanaShop</span>
          </div>
          <p className="text-xs text-fg-muted leading-relaxed mb-4">
            KanaShop crafts and curates world-class insulated drinkware and tumblers for active, modern hydration.
          </p>
          <div className="flex items-center gap-2 text-xs text-fg">
            <span className="inline-block w-2 h-2 rounded-full bg-success"></span>
            <span>Real-time Thai support available</span>
          </div>
        </div>

        <div>
          <h5 className="font-semibold text-sm text-fg mb-3">Product Catalog</h5>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/?category=licensed&subcategory=stainless_steel" className="hover:text-fg transition-colors">
                Licensed · Stainless Steel
              </Link>
            </li>
            <li>
              <Link to="/?category=licensed&subcategory=ceramic" className="hover:text-fg transition-colors">
                Licensed · Ceramic Interior
              </Link>
            </li>
            <li>
              <Link to="/?category=plain&subcategory=ss304" className="hover:text-fg transition-colors">
                Plain · SUS 304 Everyday
              </Link>
            </li>
            <li>
              <Link to="/?category=plain&subcategory=ss316" className="hover:text-fg transition-colors">
                Plain · SUS 316 Marine Grade
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h5 className="font-semibold text-sm text-fg mb-3">Customer Care</h5>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/coupons" className="hover:text-fg transition-colors">
                Coupons & Discounts
              </Link>
            </li>
            <li>
              <Link to="/status" className="hover:text-fg transition-colors">
                Track Order Status
              </Link>
            </li>
            <li>
              <Link to="/settings" className="hover:text-fg transition-colors">
                Account Settings
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h5 className="font-semibold text-sm text-fg mb-3">Store Contact</h5>
          <ul className="space-y-2.5 text-xs text-fg-muted">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="text-accent-token shrink-0 mt-0.5" />
              <span>88 Sukhumvit Road, Khlong Toei, Bangkok 10110, Thailand</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="text-accent-token shrink-0" />
              <span>+66 2 123 4567 / 081-234-5678</span>
            </li>
            <li className="flex items-center gap-2">
              <Envelope size={16} className="text-accent-token shrink-0" />
              <span>support@kanashop.com</span>
            </li>
            <li className="flex items-center gap-2">
              <ChatCircleText size={16} className="text-accent-token shrink-0" />
              <span>LINE: @kanashop (24/7 Service)</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border py-4 text-center text-xs text-fg-muted">
        <p>© {new Date().getFullYear()} KanaShop Co., Ltd. All rights reserved. Built with precision and care.</p>
      </div>
    </footer>
  );
};
