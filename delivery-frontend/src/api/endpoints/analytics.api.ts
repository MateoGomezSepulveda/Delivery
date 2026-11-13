import { apiClient } from '@/api/axios.client';

export interface DashboardSummary {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    paidOrdersCount: number;
    averageOrderValue: number;
    totalUsers: number;
    activeProducts: number;
  };
  ordersByStatus: Record<string, number>;
}

export interface SalesPoint {
  date: string;
  ordersCount: number;
  dailyRevenue: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  totalQuantitySold: number;
  totalRevenue: number;
  ordersCount: number;
}

export async function getDashboardApi(): Promise<DashboardSummary> {
  const res = await apiClient.get<DashboardSummary>('/analytics/dashboard');
  return res.data;
}

export async function getSalesApi(days = 30): Promise<SalesPoint[]> {
  const res = await apiClient.get<SalesPoint[]>('/analytics/sales', {
    params: { days },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getTopProductsApi(limit = 5): Promise<TopProduct[]> {
  const res = await apiClient.get<TopProduct[]>('/analytics/top-products', {
    params: { limit },
  });
  return Array.isArray(res.data) ? res.data : [];
}
