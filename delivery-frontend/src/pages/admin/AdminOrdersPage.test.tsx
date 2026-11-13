import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage';
import type { Order } from '@/types/order.types';

const mockGetAllOrdersAdminApi = vi.fn();
const mockUpdateOrderStatusAdminApi = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/api/endpoints/orders.api', async () => {
  const actual = await vi.importActual<
    typeof import('@/api/endpoints/orders.api')
  >('@/api/endpoints/orders.api');
  return {
    ...actual,
    getAllOrdersAdminApi: (...args: unknown[]) =>
      mockGetAllOrdersAdminApi(...args),
    updateOrderStatusAdminApi: (...args: unknown[]) =>
      mockUpdateOrderStatusAdminApi(...args),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const sampleOrders: Order[] = [
  {
    _id: '673a10000000000000000001',
    userId: {
      _id: 'user-1',
      name: 'Laura Gómez',
      email: 'laura@test.com',
    },
    items: [
      {
        productId: 'prod-1',
        name: 'Sushi Roll',
        quantity: 1,
        price: 32000,
      },
    ],
    total: 32000,
    address: 'Av Siempre Viva 742, Medellín',
    status: 'PENDING',
    createdAt: '2026-11-13T15:00:00.000Z',
  },
  {
    _id: '673a10000000000000000002',
    userId: {
      _id: 'user-2',
      name: 'Carlos Ruiz',
      email: 'carlos@test.com',
    },
    items: [
      {
        productId: 'prod-2',
        name: 'Burger Doble',
        quantity: 2,
        price: 28000,
      },
    ],
    total: 56000,
    address: 'Carrera 15 #80-10, Bogotá',
    status: 'CONFIRMED',
    createdAt: '2026-11-13T15:10:00.000Z',
  },
];

function renderAdminOrdersPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AdminOrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllOrdersAdminApi.mockResolvedValue({
      data: sampleOrders,
      meta: { total: 2, page: 1, lastPage: 1 },
    });
  });

  it('switches between Kanban and Tabla views and filters orders by search and status', async () => {
    const user = userEvent.setup();
    renderAdminOrdersPage();

    expect(await screen.findByText('Laura Gómez')).toBeInTheDocument();
    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Por pagar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tabla/i }));

    expect(
      screen.getByRole('columnheader', { name: 'Pedido' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Cliente' }),
    ).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      /buscar por #id, cliente, correo o dirección/i,
    );
    await user.type(searchInput, 'Carlos');

    expect(screen.queryByText('Laura Gómez')).not.toBeInTheDocument();
    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();

    await user.clear(searchInput);
    await user.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'PENDING',
    );

    expect(screen.getByText('Laura Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Ruiz')).not.toBeInTheDocument();
  });

  it('dispatches status transition mutation when clicking action button', async () => {
    const user = userEvent.setup();
    mockUpdateOrderStatusAdminApi.mockResolvedValue({
      ...sampleOrders[0],
      status: 'PAID',
    });

    renderAdminOrdersPage();

    await screen.findByText('Laura Gómez');

    await user.click(screen.getByRole('button', { name: 'Marcar pagado' }));

    await waitFor(() => {
      expect(mockUpdateOrderStatusAdminApi).toHaveBeenCalledWith(
        '673a10000000000000000001',
        'PAID',
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Estado actualizado');
  });
});
