# Design System Master File — KanaShop

> **LOGIC:** When building a specific page, first check `design-system/kanashop/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** KanaShop (Premium Insulated Drinkware & Tumblers)
**Generated & Updated:** 2026-10-04
**Category:** E-commerce Lifestyle / Insulated Drinkware

---

## Global Rules

### Color Palette & Theme Tokens

#### Header Tokens (Light Green in Light Theme / Dark Green in Dark Theme)
| Role | Light Theme (Mint) | Dark Theme (Forest) | Description / Contrast |
|------|--------------------|---------------------|------------------------|
| Header Background | `#DCFCE7` | `#14532D` | Solid brand frame, sticky bar |
| Header Foreground | `#14532D` | `#F0FDF4` | Logo, primary nav, icons (8.3:1 / 8.8:1) |
| Header Muted Nav | `#166534` | `#BBF7D0` | Inactive nav links (6.5:1 / 7.5:1) |
| Header Active Pill | `#BBF7D0` | `#166534` | Current active route pill indicator |
| Header Border | `#BBF7D0` | `#166534` | Subtle bottom divider |
| Header Focus Ring | `#15803D` | `#86EFAC` | 2px accessible focus ring |
| Cart Count Badge | `#A16207` (white text) | `#CA8A04` (dark text) | Cart counter badge |

#### Body & Surface Tokens
| Role | Light Theme | Dark Theme | Usage |
|------|-------------|------------|-------|
| `--bg` | `#FAFAF9` | `#0C0A09` | Main page background |
| `--surface` | `#FFFFFF` | `#1C1917` | Cards, drawer, modals, admin sidebar |
| `--surface-muted` | `#F5F5F4` | `#292524` | Inputs, table zebra stripes, footer |
| `--fg` | `#0C0A09` | `#FAFAF9` | Primary headings & body text |
| `--fg-muted` | `#57534E` | `#A8A29E` | Secondary descriptions, timestamps |
| `--border` | `#D6D3D1` | `#3A3532` | Thin structural card & divider borders |
| `--primary` | `#1C1917` | `#FAFAF9` | "Add to Cart", selected filter pill |
| `--on-primary` | `#FFFFFF` | `#0C0A09` | Text on primary button |
| `--accent` | `#A16207` | `#CA8A04` | Checkout button, prices, rank badges, user chat |
| `--on-accent` | `#FFFFFF` | `#0C0A09` | Text on accent buttons |
| `--success` | `#15803D` | `#4ADE80` | Discount tags, order "Completed" status |
| `--warning` | `#B45309` | `#FBBF24` | "Packing" status, suspended badge |
| `--danger` | `#DC2626` | `#F87171` | Delete buttons, "Banned", rejected orders |
| `--ring` | `#A16207` | `#CA8A04` | Focus ring in page content |

### Typography

- **Heading Font:** Outfit (`500`, `600`, `700`)
- **Body Font:** IBM Plex Sans Thai (`400`, `500`, `600`)
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600&display=swap');
```
- Heading style: Clean geometric sans-serif with tight tracking.
- Body style: Highly legible Thai & Latin glyph support with clear character distinctions.

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths & Glass Accents

- **Card Shadow:** `0 1px 2px rgba(0, 0, 0, 0.05)`
- **Hover Shadow:** `0 8px 24px rgba(0, 0, 0, 0.08)` (no scale transform to prevent layout shift)
- **Modal Overlay / Scrim:** `rgba(12, 10, 9, 0.55)` (light) / `rgba(0, 0, 0, 0.65)` (dark) with `backdrop-filter: blur(8px)`
- **Drawer & Chat Glass:** `backdrop-filter: blur(16px)` on semi-translucent surfaces.

---

## Anti-Patterns (Do NOT Use)

- ❌ **No emojis as structural icons** — Use vector SVG icons (`@phosphor-icons/react` or `lucide-react`).
- ❌ **No password_resets.json** — Passwords overwrite directly in `Data_account.json`; temporary passcodes held in server memory.
- ❌ **No layout-shifting hovers** — Maintain fixed dimensions; change color/shadow only.
- ❌ **No translucent green on sticky header** — Header is solid `#DCFCE7` (light) / `#14532D` (dark) to prevent contrast loss over images.
- ❌ **No blocked paste in auth** — Allow password managers and OTP paste.

---

## Pre-Delivery Checklist

- [ ] Header color: light mint (`#DCFCE7`) in light mode, deep forest (`#14532D`) in dark mode
- [ ] No emojis used as icons (use SVG)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum; dark mode text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] Sticky header has scroll-padding compensation so content is not obscured
