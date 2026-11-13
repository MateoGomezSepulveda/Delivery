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
  role?: string;
}

export interface Order {
  _id: string;
  userId: OrderUserPopulated | string;
  deliveryId?: string;
  items: OrderItem[];
  total: number;
  address: string;
  status: OrderStatus;
  paymentId?: string;
  paymentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderPayload {
  address: string;
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
