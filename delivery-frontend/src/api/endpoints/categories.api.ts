import { apiClient } from '@/api/axios.client';
import type { PaginatedResponse } from '@/types/api.types';
import type { Category, CreateCategoryPayload } from '@/types/catalog.types';

export async function getCategoriesApi(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<Category>> {
  const response = await apiClient.get<
    PaginatedResponse<Category> | Category[]
  >('/categories', {
    params: { limit: 50, ...params },
  });

  if (Array.isArray(response.data)) {
    return {
      data: response.data,
      meta: {
        total: response.data.length,
        page: 1,
        lastPage: 1,
      },
    };
  }

  return response.data;
}

export async function getCategoryByIdApi(id: string): Promise<Category> {
  const response = await apiClient.get<Category>(`/categories/${id}`);
  return response.data;
}

export async function createCategoryApi(
  payload: CreateCategoryPayload,
): Promise<Category> {
  const response = await apiClient.post<Category>('/categories', payload);
  return response.data;
}

export async function updateCategoryApi(
  id: string,
  payload: Partial<CreateCategoryPayload>,
): Promise<Category> {
  const response = await apiClient.patch<Category>(
    `/categories/${id}`,
    payload,
  );
  return response.data;
}

export async function deleteCategoryApi(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
