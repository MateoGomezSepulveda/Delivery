import { apiClient } from '@/api/axios.client';
import type { CreateReviewPayload, Review } from '@/types/catalog.types';

export async function getProductReviewsApi(
  productId: string,
): Promise<Review[]> {
  const response = await apiClient.get<Review[]>(
    `/reviews/product/${productId}`,
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function createReviewApi(
  payload: CreateReviewPayload,
): Promise<Review> {
  const response = await apiClient.post<Review>('/reviews', payload);
  return response.data;
}

export async function deleteReviewApi(
  reviewId: string,
): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(
    `/reviews/${reviewId}`,
  );
  return response.data;
}
