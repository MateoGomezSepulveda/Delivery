import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';

const mockGetDashboardApi = vi.fn();
const mockGetSalesApi = vi.fn();
const mockGetTopProductsApi = vi.fn();

vi.mock('@/api/endpoints/analytics.api', () => ({
  getDashboardApi: (...args: unknown[]) => mockGetDashboardApi(...args),
  getSalesApi: (...args: unknown[]) => mockGetSalesApi(...args),
  getTopProductsApi: (...args: unknown[]) => mockGetTopProductsApi(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AdminDashboardPage (Real Profit & Inventory Analytics)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDashboardApi.mockResolvedValue({
      kpis: {
        totalRevenue: 450000,
        totalCost: 270000,
        netProfit: 180000,
        profitMargin: 40,
        totalUnitsSold: 12,
        totalOrders: 6,
        paidOrdersCount: 5,
        averageOrderValue: 90000,
        totalUsers: 22,
        activeProducts: 7,
        lowStockProducts: 2,
        outOfStockProducts: 1,
        inventoryCostValue: 1200000,
        inventoryRetailValue: 1950000,
      },
      ordersByStatus: {
        DELIVERED: 5,
        PENDING: 1,
      },
      inventoryAlerts: [
        {
          productId: 'p-low',
          name: 'Whisky 12 Años',
          stock: 2,
          lowStockThreshold: 5,
          price: 165000,
          costPrice: 110000,
          available: true,
        },
        {
          productId: 'p-zero',
          name: 'Queso Brie 200g',
          stock: 0,
          lowStockThreshold: 5,
          price: 34000,
          costPrice: 21000,
          available: false,
        },
      ],
    });
    mockGetSalesApi.mockResolvedValue([
      {
        date: '2026-11-18',
        ordersCount: 3,
        unitsSold: 7,
        dailyRevenue: 250000,
        dailyCost: 150000,
        dailyProfit: 100000,
      },
      {
        date: '2026-11-19',
        ordersCount: 2,
        unitsSold: 5,
        dailyRevenue: 200000,
        dailyCost: 120000,
        dailyProfit: 80000,
      },
    ]);
    mockGetTopProductsApi.mockResolvedValue([
      {
        productId: 'p-low',
        name: 'Whisky 12 Años',
        totalQuantitySold: 3,
        totalRevenue: 495000,
        totalCost: 330000,
        totalProfit: 165000,
        profitMargin: 33.3,
        currentStock: 2,
        lowStockThreshold: 5,
        ordersCount: 3,
      },
      {
        productId: 'p-beer',
        name: 'Six Pack Club Colombia',
        totalQuantitySold: 9,
        totalRevenue: 238500,
        totalCost: 157500,
        totalProfit: 81000,
        profitMargin: 34,
        currentStock: 15,
        lowStockThreshold: 5,
        ordersCount: 5,
      },
    ]);
  });

  it('renders real net profit KPIs, product profitability breakdown, and inventory alerts', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AdminDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('40% margen')).toBeInTheDocument();
    expect(screen.getByText('Ganancia neta real')).toBeInTheDocument();
    expect(screen.getByText('Costo de compra')).toBeInTheDocument();
    expect(screen.getByText('Capital en inventario')).toBeInTheDocument();
    expect(screen.getByText('12 unidades vendidas (COGS)')).toBeInTheDocument();

    // Inventory alerts
    expect(screen.getByText('Alertas de inventario')).toBeInTheDocument();
    expect(screen.getByText('Quedan 2 unidades')).toBeInTheDocument();
    expect(screen.getByText('Agotado (0)')).toBeInTheDocument();

    // Product profitability table & sort toggle
    expect(await screen.findByText('33.3%')).toBeInTheDocument();
    expect(screen.getByText('Rentabilidad real por producto')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /más vendidos/i }));
    expect(screen.getByText('Six Pack Club Colombia')).toBeInTheDocument();
  });
});
