# KanaShop — Insulated Tumblers & Water Bottles E-Commerce Platform

A modern full-stack e-commerce web application featuring **User Portal** and **Admin Control Panel**, built strictly according to the UI/UX design specification with clean separation of concerns and human-readable JSON storage.

---

## 🌟 Highlights & Feature Implementation

### 1. Separation of Concerns & Modular Architecture
- **`Frontend/`**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand + Socket.IO Client.
- **`Backend/`**: Node.js + Express 5 + TypeScript + Socket.IO + Multer + Zod.
- **`Backend/data/`**: Human-readable JSON file storage:
  - `Data_account.json`: User accounts, hashed passwords, roles (`user`, `admin`), Thai ID encryption, status (`active`, `suspended`, `banned`).
  - `products.json`: Full drinkware catalog across Licensed and Plain categories.
  - `orders.json`: Orders, addresses, payments, state machine histories, buyer accept/reject feedback.
  - `coupons.json`: Promo vouchers and usage counters.
  - `message_data/<userId>.json` & `_index.json`: Per-user chat histories and live inbox summaries.
  - **Zero `password_resets.json`**: Temporary passcodes are held in-memory; password changes directly overwrite `Data_account.json`.

### 2. UI/UX Design System: "Steel & Brass" with Green Header
- **Header in Light Theme**: Light Mint Green (`#DCFCE7`), deep forest text (`#14532D`), pill active indicator (`#BBF7D0`).
- **Header in Dark Theme**: Deep Forest Green (`#14532D`), light mint text (`#F0FDF4`), pill active indicator (`#166534`).
- **Accent & Actions**: Brass Gold (`#A16207` light / `#CA8A04` dark) for Checkout, prices, and badges.
- **Typography**: `Outfit` (headings) + `IBM Plex Sans Thai` (body, full Thai & Latin glyph support).

### 3. Product Taxonomy
- **Licensed Designs**: Subdivided into:
  - Stainless Steel (e.g. Studio Ghibli Totoro, Star Wars Mandalorian)
  - Ceramic Interior (e.g. Moomin Valley Nordic, Sanrio Hello Kitty 50th)
- **Unlicensed / Plain Designs**: Subdivided into:
  - Grade 304 Stainless Steel (SUS 304 everyday tumblers)
  - Grade 316 Stainless Steel (SUS 316 marine/medical grade tumblers)

### 4. Interactive Guest Restrictions
- Unauthenticated visitors can freely browse products, search, and view details.
- Attempting to **Place an Order / Checkout** or **Chat with the Admin** immediately triggers an **interactive login modal popup**.
- Upon signing in, the pending action automatically resumes.

### 5. Authentication & Account Flows
- **Login Interface**: Username/Email, Password, centered sign-in button, "Forgot Password?", "Register".
- **Register Page**: Full Name, Email, Phone, Photo (URL or file upload), 13-digit Thai National ID with real checksum verification and AES-256-GCM encryption, Username, Password, Confirm Password.
- **Forgot Password Page**:
  - Step 1: Input email -> Click "Send Passcode" (enforces a 5-minute security cooldown).
  - Step 2: Input 6-digit passcode with adjacent "Verify" button.
  - Step 3: Verified status dynamically reveals "New Password" & "Confirm New Password".
  - Submitting overwrites the `passwordHash` in `Data_account.json` and redirects to Login.

### 6. User Portal & Cart Drawer
- **Navigation Header**: Home, Coupon, My Order (badge counter), Status, Settings with avatar.
- **Home**: "Popular Sales This Week" hero showcase with sales volume rank badges (#1, #2, #3), filter chips, live search, and large product cards with quantity steppers.
- **My Order (Slide-out Cart Panel)**: Right-hand vertical slide-out panel, quantity modifiers, trash removal, single-coupon selector, dynamic total calculation.
- **Checkout Modal**: Centered modal for delivery address + two payment gateways:
  - **PromptPay QR Code**: Real PromptPay payload generation, QR code display, and 15-minute countdown.
  - **Credit / Debit Card**: Mock gateway interface with zero-store card privacy guarantee.
- **Order Status**: Dedicated tracking view with stepper timeline (`Paid` → `Packing` → `Delivered` → `Completed`), and interactive buyer **Accept / Reject confirmation gate** when delivered.
- **User Settings**: Light/Dark theme switcher, Profile photo and username updates, in-place password overwrite, and account deletion confirmation.

### 7. Realtime Floating Admin Chat (Southeast Corner)
- Bottom-right floating trigger button with unread count badge.
- Realtime WebSocket messaging via Socket.IO.
- Text messages and photo/image uploads.
- Per-user persistence in `Backend/data/message_data/<userId>.json`.

### 8. Admin Control Panel (`/admin`)
- **Dashboard**: KPI revenue statistics, orders to pack, inventory overview, and recent order stream.
- **Product Catalog Management**: Add, edit, and delete products across all categories and subcategories.
- **Customer Support Chat**: Live inbox view sorted by most recently active conversation at the top, displaying conversation threads chronologically (newest message at the bottom).
- **Order Management**: Transition states from `Packing` → `Delivered` → `Completed`, with visibility into buyer feedback if rejected.
- **User Management**: Customer account directory with administrative **Ban** or **Suspend** (1, 7, 14, 30 days) controls.
- **Coupons Management**: Create and configure promotional vouchers.

---

## 🚀 Running the Project

### Prerequisites
- Node.js (v20+ recommended, current v22.8.0)
- npm (v10+)

### Start Both Servers

#### 1. Backend Server
```bash
cd Backend
npm run dev
# Running on http://localhost:5000
```

#### 2. Frontend Development Server
```bash
cd Frontend
npm run dev
# Running on http://localhost:5173
```

Open `http://localhost:5173` in your browser to explore the store!

---

## 🔑 Default Seed Accounts

| Role | Username | Password | Email | Note |
|---|---|---|---|---|
| **Customer** | `somchai` | `password123` | `somchai@example.com` | Sample customer account with orders and chat history |
| **Admin** | `admin` | `password123` | `admin@kanashop.com` | Administrator access to `/admin` control panel |

*(You can also register your own account using any valid 13-digit Thai National ID, e.g. `1103701234568` or `1103702345674`)*
