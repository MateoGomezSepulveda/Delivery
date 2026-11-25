import { apiClient } from '@/api/axios.client';
import type { UpdateProfilePayload, User } from '@/types/auth.types';

export async function getUserByIdApi(id: string): Promise<User> {
  const response = await apiClient.get<User>(`/users/${id}`);
  return response.data;
}

export async function updateUserApi(
  id: string,
  payload: UpdateProfilePayload,
): Promise<User> {
  const response = await apiClient.patch<User>(`/users/${id}`, payload);
  return response.data;
}
