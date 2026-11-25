import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useOutletContext } from 'react-router-dom';
import {
  DeliveryLayout,
  type DeliveryOutletContext,
} from '@/components/layout/DeliveryLayout';
import type { DeliveryProfile } from '@/types/delivery.types';

const mockGetDeliveryProfileApi = vi.fn();
const mockUpdateAvailabilityApi = vi.fn();
const mockUseSocket = vi.fn();

vi.mock('@/api/endpoints/delivery.api', () => ({
  getDeliveryProfileApi: (...args: unknown[]) =>
    mockGetDeliveryProfileApi(...args),
  createDeliveryProfileApi: vi.fn(),
  updateAvailabilityApi: (...args: unknown[]) =>
    mockUpdateAvailabilityApi(...args),
}));

vi.mock('@/hooks/useSocket', () => ({
  useSocket: (...args: unknown[]) => mockUseSocket(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function ContextProbe() {
  const { socketConnected, profile } =
    useOutletContext<DeliveryOutletContext>();
  return (
    <div>
      <span data-testid="probe-socket">
        {socketConnected ? 'connected' : 'disconnected'}
      </span>
      <span data-testid="probe-online">
        {profile.isAvailable ? 'online' : 'offline'}
      </span>
    </div>
  );
}

function renderDeliveryLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={['/delivery']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/delivery" element={<DeliveryLayout />}>
            <Route index element={<ContextProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DeliveryLayout — conexión Socket.io en Rider Portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSocket.mockReturnValue({ connected: true });
  });

  it('mounts useSocket with playRiderAlerts: true when rider is approved and Online, passing socketConnected to Outlet', async () => {
    const profile: DeliveryProfile = {
      _id: 'prof-1',
      userId: 'rider-1',
      vehicleType: 'MOTO',
      licensePlate: 'ABC-123',
      status: 'APPROVED',
      isAvailable: true,
    };
    mockGetDeliveryProfileApi.mockResolvedValue(profile);

    renderDeliveryLayout();

    expect(await screen.findByTestId('probe-socket')).toHaveTextContent(
      'connected',
    );
    expect(screen.getByTestId('probe-online')).toHaveTextContent('online');
    expect(
      screen.getByRole('status', { name: /conexión en tiempo real activa/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockUseSocket).toHaveBeenLastCalledWith({ playRiderAlerts: true });
    });
  });

  it('mounts useSocket with playRiderAlerts: false when rider is Offline and exposes disconnected state', async () => {
    mockUseSocket.mockReturnValue({ connected: false });
    const profile: DeliveryProfile = {
      _id: 'prof-2',
      userId: 'rider-2',
      vehicleType: 'BICYCLE',
      status: 'APPROVED',
      isAvailable: false,
    };
    mockGetDeliveryProfileApi.mockResolvedValue(profile);

    renderDeliveryLayout();

    expect(await screen.findByTestId('probe-socket')).toHaveTextContent(
      'disconnected',
    );
    expect(screen.getByTestId('probe-online')).toHaveTextContent('offline');
    expect(
      screen.getByRole('status', {
        name: /reconectando conexión en tiempo real/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockUseSocket).toHaveBeenLastCalledWith({
        playRiderAlerts: false,
      });
    });
  });
});
