export type Role = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned';

export interface UserAccount {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  photoUrl: string;
  maskedThaiId: string;
  username: string;
  preferences?: {
    theme: 'light' | 'dark';
  };
  collectedCoupons: string[];
  status?: UserStatus;
  banReason?: string | null;
  suspendedUntil?: string | null;
  createdAt: string;
}

export type ProductCategory = 'licensed' | 'plain';
export type ProductSubcategory =
  | 'stainless_steel'
  | 'ceramic'
  | 'ss304'
  | 'ss316';

export interface Product {
  id: string;
  title: string;
  description: string;
  category: ProductCategory;
  subcategory: ProductSubcategory;
  capacityOz: number;
  price: number;
  stock: number;
  salesVolume: number;
  images: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'WAITING_VERIFICATION'
  | 'PAID'
  | 'PACKING'
  | 'PROGRESS'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface OrderItem {
  productId: string;
  title: string;
  unitPrice: number;
  qty: number;
  category: ProductCategory;
  subcategory: ProductSubcategory;
  image: string;
}

export interface OrderAddress {
  recipient: string;
  phone: string;
  line1: string;
  district: string;
  province: string;
  postalCode: string;
}

export interface OrderPayment {
  method: 'promptpay' | 'card';
  status: 'pending' | 'paid' | 'failed';
  ref?: string;
  paidAt?: string;
  last4?: string;
  cardBrand?: string;
  slipUrl?: string;
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  at: string;
  by: string;
  note?: string;
}

export interface RefundInfo {
  option: 'image' | 'bank' | 'promptpay';
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  promptPayNumber?: string;
  imageUrl?: string;
  reason?: string;
  submittedAt: string;
}

export interface PromptPayQRResult {
  payload: string;
  qrDataUrl: string;
  qrImageUrl?: string;
  promptPayId?: string;
  accountName?: string;
  bankName?: string;
}

export interface PaymentSettings {
  promptPayId: string;
  accountName: string;
  bankName: string;
  qrImageUrl?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  couponCode: string | null;
  subtotal: number;
  discount: number;
  total: number;
  address: OrderAddress;
  payment: OrderPayment;
  status: OrderStatus;
  history: OrderHistoryEntry[];
  refundInfo?: RefundInfo;
  rejectionReason?: string;
  cancelReason?: string;
  cancelledBy?: 'admin' | 'buyer';
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  type: 'percent' | 'fixed';
  value: number;
  minSpend: number;
  maxDiscount?: number;
  startsAt: string;
  expiresAt: string;
  usageLimit: number;
  usedCount: number;
  usedBy?: string[];
  active: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'admin';
  senderId: string;
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  createdAt: string;
  readByAdmin: boolean;
  readByUser: boolean;
}

export interface ConversationSummary {
  userId: string;
  username: string;
  fullName: string;
  photoUrl: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastSender: 'user' | 'admin';
  unreadForAdmin: number;
  unreadForUser: number;
}
