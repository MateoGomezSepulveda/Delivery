import { apiClient } from '@/api/axios.client';
import type { OrderStatus, PaginatedResponse } from '@/types/api.types';
import type {
  CreateOrderPayload,
  DeliveryFeeEstimate,
  Order,
  OrderQueryParams,
  PaymentMethod,
  PayOrderResponse,
  RiderDiscountQuota,
  VerifyOrderPaymentResponse,
} from '@/types/order.types';

export const DEFAULT_DELIVERY_FEE = 5000;

/**
 * Máquina de estados válida del Backend (OrdersService.getAllowedOrderTransitions)
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  // Compatibilidad retroactiva para pedidos históricos en PREPARING
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: ['PENDING', 'CANCELLED'],
};

export function getAllowedOrderTransitions(
  status: OrderStatus,
  paymentMethod: PaymentMethod = 'MERCADOPAGO',
): OrderStatus[] {
  if (status === 'PENDING' && paymentMethod === 'CASH_ON_DELIVERY') {
    return ['CONFIRMED', 'CANCELLED'];
  }
  return ORDER_STATUS_TRANSITIONS[status] ?? [];
}

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
  deliveryId?: string,
): Promise<Order> {
  const response = await apiClient.patch<Order>(`/orders/${orderId}/status`, {
    status,
    ...(deliveryId ? { deliveryId } : {}),
  });
  return response.data;
}
