import { apiClient } from '@/api/axios.client';
import type { OrderStatus, PaginatedResponse } from '@/types/api.types';
import type {
  CreateOrderPayload,
  Order,
  OrderQueryParams,
  PayOrderResponse,
} from '@/types/order.types';

/**
 * Máquina de estados válida del Backend (OrdersService.validTransitions)
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: ['PENDING', 'CANCELLED'],
};

export async function createOrderApi(
  payload: CreateOrderPayload,
): Promise<Order> {
  const response = await apiClient.post<Order>('/orders', payload);
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

export async function getAllOrdersAdminApi(
  params?: OrderQueryParams,
): Promise<PaginatedResponse<Order>> {
  const response = await apiClient.get<PaginatedResponse<Order>>('/orders', {
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

export async function updateOrderStatusAdminApi(
  orderId: string,
  status: OrderStatus,
): Promise<Order> {
  const response = await apiClient.patch<Order>(`/orders/${orderId}/status`, {
    status,
  });
  return response.data;
}
