import { apiClient } from '@/api/axios.client';
import type { Address, CreateAddressPayload } from '@/types/order.types';

export async function getMyAddressesApi(): Promise<Address[]> {
  const response = await apiClient.get<Address[]>('/addresses');
  return Array.isArray(response.data) ? response.data : [];
}

export async function getAddressByIdApi(id: string): Promise<Address> {
  const response = await apiClient.get<Address>(`/addresses/${id}`);
  return response.data;
}

export async function createAddressApi(
  payload: CreateAddressPayload,
): Promise<Address> {
  const response = await apiClient.post<Address>('/addresses', payload);
  return response.data;
}

export async function updateAddressApi(
  id: string,
  payload: Partial<CreateAddressPayload>,
): Promise<Address> {
  const response = await apiClient.patch<Address>(`/addresses/${id}`, payload);
  return response.data;
}

export async function deleteAddressApi(id: string): Promise<void> {
  await apiClient.delete(`/addresses/${id}`);
}
