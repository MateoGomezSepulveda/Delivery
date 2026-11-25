import { apiClient } from '@/api/axios.client';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  CreateOrderPayload,
  DeliveryFeeEstimate,
  Order,
  OrderQueryParams,
  PayOrderResponse,
  RiderDiscountQuota,
  VerifyOrderPaymentResponse,
} from '@/types/order.types';

export const DEFAULT_DELIVERY_FEE = 5000;

export async function createOrderApi(
  payload: CreateOrderPayload,
): Promise<Order> {
  const response = await apiClient.post<Order>('/orders', payload);
  return response.data;
}

export async function getDeliveryFeeApi(params?: {
  address?: string;
  subtotal?: number;
}): Promise<DeliveryFeeEstimate> {
  const response = await apiClient.get<DeliveryFeeEstimate>(
    '/orders/delivery-fee',
    { params },
  );
  return response.data;
}

export async function getRiderDiscountQuotaApi(): Promise<RiderDiscountQuota> {
  const response = await apiClient.get<RiderDiscountQuota>(
    '/orders/rider-discount-quota',
  );
  return response.data;
}

export async function getMyOrdersApi(
  params?: OrderQueryParams,
): Promise<PaginatedResponse<Order>> {
  const response = await apiClient.get<PaginatedResponse<Order>>('/orders/me', {
    params,
  });

  if (response.data && Array.isArray(response.data.data)) {
    return response.data;
  }

  const raw = Array.isArray(response.data) ? (response.data as Order[]) : [];
  return {
    data: raw,
    meta: { total: raw.length, page: 1, lastPage: 1 },
  };
}

export async function getOrderByIdApi(orderId: string): Promise<Order> {
  const response = await apiClient.get<Order>(`/orders/${orderId}`);
  return response.data;
}

export async function cancelOrderApi(orderId: string): Promise<Order> {
  const response = await apiClient.patch<Order>(`/orders/${orderId}/cancel`);
  return response.data;
}

export async function payOrderApi(orderId: string): Promise<PayOrderResponse> {
  const response = await apiClient.post<PayOrderResponse>(
    `/orders/${orderId}/pay`,
  );
  return response.data;
}

export async function verifyOrderPaymentApi(
  orderId: string,
  paymentId: string,
): Promise<VerifyOrderPaymentResponse> {
  const response = await apiClient.post<VerifyOrderPaymentResponse>(
    `/orders/${orderId}/verify-payment`,
    { paymentId },
  );
  return response.data;
}
