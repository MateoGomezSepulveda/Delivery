import { apiClient } from '@/api/axios.client';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  CreateDeliveryProfilePayload,
  DeliveryOrder,
  DeliveryOrderHistoryItem,
  DeliveryProfile,
  DeliveryProfileStatus,
  DeliveryStats,
  ReviewDeliveryProfilePayload,
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

export async function getDeliveryProfilesAdminApi(
  status?: DeliveryProfileStatus,
): Promise<DeliveryProfile[]> {
  const res = await apiClient.get<DeliveryProfile[]>('/delivery/profiles', {
    params: status ? { status } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function reviewDeliveryProfileAdminApi(
  profileId: string,
  payload: ReviewDeliveryProfilePayload,
): Promise<DeliveryProfile> {
  const res = await apiClient.patch<DeliveryProfile>(
    `/delivery/profiles/${profileId}/status`,
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

export async function getDeliveryHistoryApi(
  page = 1,
  limit = 10,
): Promise<PaginatedResponse<DeliveryOrderHistoryItem>> {
  const res = await apiClient.get<PaginatedResponse<DeliveryOrderHistoryItem>>(
    '/delivery/orders/history',
    { params: { page, limit } },
  );
  if (res.data && Array.isArray(res.data.data)) {
    return res.data;
  }
  const raw = Array.isArray(res.data)
    ? (res.data as DeliveryOrderHistoryItem[])
    : [];
  return {
    data: raw,
    meta: { total: raw.length, page: 1, lastPage: 1 },
  };
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
