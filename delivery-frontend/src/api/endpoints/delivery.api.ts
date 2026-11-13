import { apiClient } from '@/api/axios.client';
import type {
  CreateDeliveryProfilePayload,
  DeliveryOrder,
  DeliveryProfile,
  DeliveryStats,
} from '@/types/delivery.types';

const asList = (data: unknown): DeliveryOrder[] =>
  Array.isArray(data) ? (data as DeliveryOrder[]) : [];

export async function getDeliveryProfileApi(): Promise<DeliveryProfile> {
  const res = await apiClient.get<DeliveryProfile>('/delivery/profile');
  return res.data;
}

export async function createDeliveryProfileApi(
  payload: CreateDeliveryProfilePayload,
): Promise<DeliveryProfile> {
  const res = await apiClient.post<DeliveryProfile>(
    '/delivery/profile',
    payload,
  );
  return res.data;
}

export async function updateAvailabilityApi(
  isAvailable: boolean,
): Promise<DeliveryProfile> {
  const res = await apiClient.patch<DeliveryProfile>('/delivery/availability', {
    isAvailable,
  });
  return res.data;
}

export async function updateLocationApi(
  lat: number,
  lng: number,
): Promise<DeliveryProfile> {
  const res = await apiClient.patch<DeliveryProfile>('/delivery/location', {
    lat,
    lng,
  });
  return res.data;
}

export async function getAvailableOrdersApi(): Promise<DeliveryOrder[]> {
  const res = await apiClient.get<DeliveryOrder[]>('/delivery/orders/available');
  return asList(res.data);
}

export async function getActiveOrdersApi(): Promise<DeliveryOrder[]> {
  const res = await apiClient.get<DeliveryOrder[]>('/delivery/orders/active');
  return asList(res.data);
}

export async function acceptOrderApi(orderId: string): Promise<DeliveryOrder> {
  const res = await apiClient.patch<DeliveryOrder>(
    `/delivery/orders/${orderId}/accept`,
  );
  return res.data;
}

export async function deliverOrderApi(orderId: string): Promise<DeliveryOrder> {
  const res = await apiClient.patch<DeliveryOrder>(
    `/delivery/orders/${orderId}/deliver`,
  );
  return res.data;
}

export async function getDeliveryStatsApi(): Promise<DeliveryStats> {
  const res = await apiClient.get<DeliveryStats>('/delivery/stats');
  return res.data;
}
