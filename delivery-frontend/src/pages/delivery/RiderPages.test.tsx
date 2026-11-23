import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { RiderAvailableOrdersPage } from '@/pages/delivery/RiderAvailableOrdersPage';
import { RiderActiveRoutePage } from '@/pages/delivery/RiderActiveRoutePage';
import { RiderStatsPage } from '@/pages/delivery/RiderStatsPage';
import type { DeliveryOutletContext } from '@/components/layout/DeliveryLayout';
import type { DeliveryProfile } from '@/types/delivery.types';

const mockGetAvailableOrdersApi = vi.fn();
const mockAcceptOrderApi = vi.fn();
const mockGetActiveOrdersApi = vi.fn();
const mockDeliverOrderApi = vi.fn();
const mockUpdateLocationApi = vi.fn();
const mockGetDeliveryStatsApi = vi.fn();
const mockGetDeliveryHistoryApi = vi.fn();

vi.mock('@/api/endpoints/delivery.api', () => ({
  getAvailableOrdersApi: (...args: unknown[]) =>
    mockGetAvailableOrdersApi(...args),
  acceptOrderApi: (...args: unknown[]) => mockAcceptOrderApi(...args),
  getActiveOrdersApi: (...args: unknown[]) => mockGetActiveOrdersApi(...args),
  deliverOrderApi: (...args: unknown[]) => mockDeliverOrderApi(...args),
  updateLocationApi: (...args: unknown[]) => mockUpdateLocationApi(...args),
  getDeliveryStatsApi: (...args: unknown[]) => mockGetDeliveryStatsApi(...args),
  getDeliveryHistoryApi: (...args: unknown[]) =>
    mockGetDeliveryHistoryApi(...args),
}));

function renderWithOutletContext(
  element: React.ReactNode,
  context: DeliveryOutletContext,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper() {
    return <Outlet context={context} />;
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={['/delivery']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route element={<Wrapper />}>
            <Route path="/delivery" element={element} />
            <Route path="/delivery/active" element={<div>Ruta Activa</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const baseProfile: DeliveryProfile = {
  _id: 'prof-1',
  userId: 'rider-1',
  vehicleType: 'MOTO',
  plate: 'XYZ-987',
  licensePlate: 'XYZ-987',
  status: 'APPROVED',
  isAvailable: false,
};

describe('Rider App — Bloque de Repartidores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('RiderAvailableOrdersPage blocks accepting orders while Offline and triggers 1-click go Online', async () => {
    const user = userEvent.setup();
    const onToggleAvailability = vi.fn();

    mockGetAvailableOrdersApi.mockResolvedValue([
      {
        _id: '660000000000000000001234',
        userId: {
          _id: 'client-1',
          name: 'Laura Cliente',
          email: 'laura@correo.com',
          phone: '+573001112233',
        },
        items: [{ productId: 'p-1', name: 'Pizza Artesanal', quantity: 2, price: 25000 }],
        total: 50000,
        status: 'PREPARING',
        address: 'Calle 85 # 12-40, Bogotá',
        createdAt: '2026-11-20T12:00:00.000Z',
      },
    ]);

    renderWithOutletContext(<RiderAvailableOrdersPage />, {
      profile: { ...baseProfile, isAvailable: false },
      onToggleAvailability,
      isTogglingAvailability: false,
    });

    expect(
      await screen.findByText(/estás en estado no disponible/i),
    ).toBeInTheDocument();
    expect(await screen.findByText('Laura Cliente')).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', {
      name: /activa estado disponible para aceptar/i,
    });
    expect(acceptBtn).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: /ponerme disponible/i }),
    );
    expect(onToggleAvailability).toHaveBeenCalledWith(true);
  });

  it('RiderActiveRoutePage shows customer Call/WhatsApp, Google Maps/Waze links, and requires modal confirmation to deliver', async () => {
    const user = userEvent.setup();

    mockGetActiveOrdersApi.mockResolvedValue([
      {
        _id: '660000000000000000005678',
        userId: {
          _id: 'client-2',
          name: 'Andrés Destino',
          email: 'andres@correo.com',
          phone: '+573105556677',
        },
        items: [{ productId: 'p-2', name: 'Hamburguesa Doble', quantity: 1, price: 32000 }],
        total: 32000,
        status: 'OUT_FOR_DELIVERY',
        address: 'Carrera 7 # 71-21, Bogotá',
        createdAt: '2026-11-20T12:30:00.000Z',
      },
    ]);
    mockDeliverOrderApi.mockResolvedValue({ status: 'DELIVERED' });

    renderWithOutletContext(<RiderActiveRoutePage />, {
      profile: { ...baseProfile, isAvailable: true },
      onToggleAvailability: vi.fn(),
      isTogglingAvailability: false,
    });

    expect(await screen.findByText('Andrés Destino')).toBeInTheDocument();

    const callLink = screen.getByRole('link', { name: /llamar al cliente/i });
    expect(callLink).toHaveAttribute('href', 'tel:+573105556677');

    const waLink = screen.getByRole('link', { name: /whatsapp/i });
    expect(waLink.getAttribute('href')).toContain('https://wa.me/573105556677');

    const mapsLink = screen.getByRole('link', { name: /google maps/i });
    expect(mapsLink.getAttribute('href')).toContain(
      'https://www.google.com/maps/search/?api=1&query=',
    );

    const wazeLink = screen.getByRole('link', { name: /waze/i });
    expect(wazeLink.getAttribute('href')).toContain('https://waze.com/ul?q=');

    await user.click(
      screen.getByRole('button', { name: /marcar como entregado/i }),
    );
    expect(mockDeliverOrderApi).not.toHaveBeenCalled();

    expect(
      await screen.findByText(/confirmar entrega completada/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /sí, confirmar entrega/i }),
    );

    await waitFor(() => {
      expect(mockDeliverOrderApi).toHaveBeenCalledWith(
        '660000000000000000005678',
      );
    });
  });

  it('RiderActiveRoutePage displays cash collection alert and requires cash-received checkbox before completing CASH_ON_DELIVERY', async () => {
    const user = userEvent.setup();

    mockGetActiveOrdersApi.mockResolvedValue([
      {
        _id: '660000000000000000007777',
        userId: {
          _id: 'client-cash',
          name: 'Mateo Efectivo',
          email: 'mateo@correo.com',
          phone: '+573105556677',
        },
        items: [{ productId: 'p-9', name: 'Aguardiente 750ml', quantity: 1, price: 42000 }],
        total: 42000,
        status: 'OUT_FOR_DELIVERY',
        paymentMethod: 'CASH_ON_DELIVERY',
        paymentStatus: 'PENDING',
        cashAmountGiven: 50000,
        changeDue: 8000,
        address: 'Calle 90 # 11-20, Bogotá',
        createdAt: '2026-11-20T13:00:00.000Z',
      },
    ]);
    mockDeliverOrderApi.mockResolvedValue({
      status: 'DELIVERED',
      paymentStatus: 'PAID',
    });

    renderWithOutletContext(<RiderActiveRoutePage />, {
      profile: { ...baseProfile, isAvailable: true },
      onToggleAvailability: vi.fn(),
      isTogglingAvailability: false,
    });

    expect(await screen.findByText('Mateo Efectivo')).toBeInTheDocument();
    expect(
      screen.getByText(/cobrar en efectivo al entregar/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/llevar vueltas/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /marcar como entregado/i }),
    );

    const confirmDeliveryBtn = await screen.findByRole('button', {
      name: /sí, confirmar entrega/i,
    });
    expect(confirmDeliveryBtn).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    expect(confirmDeliveryBtn).toBeEnabled();

    await user.click(confirmDeliveryBtn);

    await waitFor(() => {
      expect(mockDeliverOrderApi).toHaveBeenCalledWith(
        '660000000000000000007777',
      );
    });
  });

  it('RiderStatsPage renders KPI summary cards and completed delivery history using only shipping fee earnings', async () => {
    mockGetDeliveryStatsApi.mockResolvedValue({
      delivered: 12,
      inProgress: 1,
      deliveredToday: 3,
      todayEarnings: 15000,
      estimatedEarnings: 60000,
    });
    mockGetDeliveryHistoryApi.mockResolvedValue({
      data: [
        {
          _id: '660000000000000000009999',
          userId: {
            _id: 'client-3',
            name: 'Camila Historial',
            email: 'camila@correo.com',
          },
          items: [{ productId: 'p-3', name: 'Sushi Roll', quantity: 1, price: 250000 }],
          total: 255000,
          deliveryFee: 5000,
          riderEarning: 5000,
          status: 'DELIVERED',
          address: 'Av. El Dorado # 68-10',
          updatedAt: '2026-11-20T14:00:00.000Z',
        },
      ],
      meta: { total: 1, page: 1, lastPage: 1 },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RiderStatsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('Entregas hoy')).toBeInTheDocument();
    expect(screen.getByText('Ganancias por envíos')).toBeInTheDocument();
    expect(screen.getByText(/Solo tarifa de envío/i)).toBeInTheDocument();
    expect(
      await screen.findByText('Av. El Dorado # 68-10'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Camila Historial/i)).toBeInTheDocument();
    expect(screen.getByText('Costo de envío')).toBeInTheDocument();
    expect(screen.queryByText(/255\.000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Recaudado:/i)).not.toBeInTheDocument();
  });
});
