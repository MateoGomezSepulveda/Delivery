import { apiClient } from '@/api/axios.client';
import type { PaginatedResponse } from '@/types/api.types';
import type { Product, ProductQueryParams } from '@/types/catalog.types';

export async function getProductsApi(
  params?: ProductQueryParams,
): Promise<PaginatedResponse<Product>> {
  const cleanParams: Record<string, unknown> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        cleanParams[key] = value;
      }
    });
  }

  const response = await apiClient.get<PaginatedResponse<Product> | Product[]>(
    '/products',
    {
      params: cleanParams,
    },
  );

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

export async function getProductByIdApi(id: string): Promise<Product> {
  const response = await apiClient.get<Product>(`/products/${id}`);
  return response.data;
}
