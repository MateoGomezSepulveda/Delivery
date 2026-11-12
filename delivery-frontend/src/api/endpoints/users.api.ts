import { apiClient } from '@/api/axios.client';
import type { PaginatedResponse, UserRole } from '@/types/api.types';
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

export async function getAllUsersApi(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<User>> {
  const response = await apiClient.get<PaginatedResponse<User>>('/users', {
    params,
  });
  return response.data;
}

export async function changeUserRoleApi(
  id: string,
  role: UserRole,
): Promise<User> {
  const response = await apiClient.patch<User>(`/users/${id}/role`, { role });
  return response.data;
}

export async function deleteUserApi(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
