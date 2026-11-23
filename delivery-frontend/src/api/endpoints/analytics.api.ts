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

export interface CarryOverSummary {
  previousDeficitDebt: number;
  adjustedNetBalance: number;
  closingDeficitDebt: number;
  pendingReceivablesAmount: number;
  pendingReceivablesCount: number;
  inventoryCostValue: number;
  inventoryRetailValue: number;
  carriedInventoryUnits: number;
}

export interface AnalyticsPeriod {
  month: string | null;
  from: string | null;
  to: string | null;
}

export interface DashboardSummary {
  period?: AnalyticsPeriod;
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
  carryOver?: CarryOverSummary;
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

export async function getDashboardApi(
  month?: string,
): Promise<DashboardSummary> {
  const res = await apiClient.get<DashboardSummary>('/analytics/dashboard', {
    params: month ? { month } : undefined,
  });
  return res.data;
}

export async function getSalesApi(month?: string): Promise<SalesPoint[]> {
  const res = await apiClient.get<SalesPoint[]>('/analytics/sales', {
    params: month ? { month } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getTopProductsApi(
  limit = 10,
  month?: string,
): Promise<TopProduct[]> {
  const res = await apiClient.get<TopProduct[]>('/analytics/top-products', {
    params: month ? { limit, month } : { limit },
  });
  return Array.isArray(res.data) ? res.data : [];
}
