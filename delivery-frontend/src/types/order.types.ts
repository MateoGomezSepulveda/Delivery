import type { OrderStatus } from '@/types/api.types';
import type { Product } from '@/types/catalog.types';

export interface CartItem {
  productId: Product | string;
  quantity: number;
  price: number;
}

export interface Cart {
  _id: string;
  userId: string;
  status: 'ACTIVE' | 'CHECKED_OUT';
  items: CartItem[];
  total: number;
}

export interface Address {
  _id: string;
  userId: string;
  title: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  phone?: string;
  deliveryInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressPayload {
  title: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
  phone?: string;
  deliveryInstructions?: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  _id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  expirationDate: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}

export interface CreateCouponPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  expirationDate: string;
  usageLimit?: number;
  isActive?: boolean;
}

export interface AppliedCouponResult {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
}

export interface OrderItem {
  productId: Product | string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderUserPopulated {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export type PaymentMethod = 'MERCADOPAGO' | 'CASH_ON_DELIVERY';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface Order {
  _id: string;
  // null cuando el usuario referenciado fue eliminado (populate devuelve null)
  userId: OrderUserPopulated | string | null;
  deliveryId?: OrderUserPopulated | string | null;
  items: OrderItem[];
  subtotal?: number;
  riderDiscount?: number;
  couponCode?: string | null;
  couponDiscount?: number;
  total: number;
  address: string;
  status: OrderStatus;
  paymentId?: string;
  paymentUrl?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  cashAmountGiven?: number | null;
  changeDue?: number;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderPayload {
  address: string;
  couponCode?: string;
  paymentMethod?: PaymentMethod;
  cashAmountGiven?: number;
}

export interface VerifyOrderPaymentResponse {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  mpStatus: string;
  order: Order;
}

export interface RiderDiscountQuota {
  eligible: boolean;
  isRider: boolean;
  monthlyLimit: number;
  usedThisMonth: number;
  remaining: number;
  discountPercent: number;
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface PayOrderResponse {
  paymentUrl: string;
}
