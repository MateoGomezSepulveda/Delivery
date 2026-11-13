import { apiClient } from '@/api/axios.client';
import type { Cart } from '@/types/order.types';

export async function getCartApi(): Promise<Cart> {
  const response = await apiClient.get<Cart>('/cart');
  return response.data;
}

export async function addToCartApi(
  productId: string,
  quantity = 1,
): Promise<Cart> {
  const response = await apiClient.post<Cart>('/cart/add', {
    productId,
    quantity,
  });
  return response.data;
}

export async function removeFromCartApi(productId: string): Promise<Cart> {
  const response = await apiClient.delete<Cart>('/cart/remove', {
    data: { productId },
  });
  return response.data;
}

export async function clearCartApi(): Promise<Cart> {
  const response = await apiClient.delete<Cart>('/cart/clear');
  return response.data;
}
