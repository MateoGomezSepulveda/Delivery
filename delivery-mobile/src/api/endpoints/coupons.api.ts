import { apiClient } from '@/api/axios.client';
import type { AppliedCouponResult, Coupon } from '@/types/order.types';

export async function applyCouponApi(
  code: string,
  orderTotal: number,
): Promise<AppliedCouponResult> {
  const response = await apiClient.post<AppliedCouponResult>('/coupons/apply', {
    code: code.trim().toUpperCase(),
    orderTotal,
  });
  return response.data;
}

export async function getCouponsApi(): Promise<Coupon[]> {
  const response = await apiClient.get<Coupon[]>('/coupons');
  return Array.isArray(response.data) ? response.data : [];
}
