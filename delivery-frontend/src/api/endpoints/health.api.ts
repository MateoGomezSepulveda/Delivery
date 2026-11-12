import { apiClient } from '@/api/axios.client';
import type { HealthCheckResponse } from '@/types/api.types';

export async function getServerHealth(): Promise<HealthCheckResponse> {
  const response = await apiClient.get<HealthCheckResponse>('/health');
  return response.data;
}
