import { apiClient } from '@/api/axios.client';

export interface InventoryAlertItem {
  productId: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  price: number;
  costPrice: number;
  available: boolean;
}

export interface DashboardSummary {
  kpis: {
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    profitMargin: number;
    totalUnitsSold: number;
    totalOrders: number;
    paidOrdersCount: number;
    averageOrderValue: number;
    totalUsers: number;
    activeProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    inventoryCostValue: number;
    inventoryRetailValue: number;
  };
  ordersByStatus: Record<string, number>;
  inventoryAlerts?: InventoryAlertItem[];
}

export interface SalesPoint {
  date: string;
  ordersCount: number;
  unitsSold?: number;
  dailyRevenue: number;
  dailyCost?: number;
  dailyProfit?: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost?: number;
  totalProfit?: number;
  profitMargin?: number;
  avgUnitPrice?: number;
  avgUnitCost?: number;
  currentStock?: number | null;
  lowStockThreshold?: number;
  ordersCount: number;
}

export async function getDashboardApi(days?: number): Promise<DashboardSummary> {
  const res = await apiClient.get<DashboardSummary>('/analytics/dashboard', {
    params: days ? { days } : undefined,
  });
  return res.data;
}

export async function getSalesApi(days = 30): Promise<SalesPoint[]> {
  const res = await apiClient.get<SalesPoint[]>('/analytics/sales', {
    params: { days },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getTopProductsApi(
  limit = 8,
  days?: number,
): Promise<TopProduct[]> {
  const res = await apiClient.get<TopProduct[]>('/analytics/top-products', {
    params: days ? { limit, days } : { limit },
  });
  return Array.isArray(res.data) ? res.data : [];
}
