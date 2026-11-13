import { apiClient } from '@/api/axios.client';
import type {
  AppliedCouponResult,
  Coupon,
  CreateCouponPayload,
} from '@/types/order.types';

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

export async function createCouponApi(
  payload: CreateCouponPayload,
): Promise<Coupon> {
  const response = await apiClient.post<Coupon>('/coupons', payload);
  return response.data;
}

export async function updateCouponApi(
  id: string,
  payload: Partial<CreateCouponPayload>,
): Promise<Coupon> {
  const response = await apiClient.patch<Coupon>(`/coupons/${id}`, payload);
  return response.data;
}

export async function deleteCouponApi(
  id: string,
): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(
    `/coupons/${id}`,
  );
  return response.data;
}
