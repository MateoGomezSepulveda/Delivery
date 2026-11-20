import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from '@/pages/client/ProfilePage';
import { useAuthStore } from '@/store/useAuthStore';

const mockGetNotificationPermission = vi.fn();
const mockRequestPermission = vi.fn();
const mockShowOrderStatusNotification = vi.fn();
const mockPlayNotificationSound = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastWarning = vi.fn();
const mockToastInfo = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/utils/browserNotifications', () => ({
  getNotificationPermission: (...args: unknown[]) =>
    mockGetNotificationPermission(...args),
  requestBrowserNotificationPermission: (...args: unknown[]) =>
    mockRequestPermission(...args),
  showOrderStatusNotification: (...args: unknown[]) =>
    mockShowOrderStatusNotification(...args),
}));

vi.mock('@/utils/sound', () => ({
  playNotificationSound: (...args: unknown[]) =>
    mockPlayNotificationSound(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const mockGetDeliveryProfileApi = vi.fn();
const mockCreateDeliveryProfileApi = vi.fn();

vi.mock('@/api/endpoints/delivery.api', () => ({
  getDeliveryProfileApi: (...args: unknown[]) =>
    mockGetDeliveryProfileApi(...args),
  createDeliveryProfileApi: (...args: unknown[]) =>
    mockCreateDeliveryProfileApi(...args),
}));

vi.mock('@/pages/client/MyOrdersPage', () => ({
  MyOrdersPage: () => null,
}));

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProfilePage Browser Notifications (Bug #6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDeliveryProfileApi.mockResolvedValue(null);
    useAuthStore.setState({
      user: {
        _id: 'u-1',
        name: 'Mateo Cliente',
        email: 'mateo@correo.com',
        role: 'CLIENT',
        isEmailVerified: true,
        authProviders: ['local'],
      },
      accessToken: 'token-1',
      refreshToken: 'refresh-1',
      isAuthenticated: true,
      isHydrating: false,
      avatarsByUserId: {},
    });
  });

  it('shows success toast and plays sound when "Probar Notificación" succeeds', async () => {
    const user = userEvent.setup();
    mockGetNotificationPermission.mockReturnValue('granted');
    mockShowOrderStatusNotification.mockResolvedValue(true);

    renderProfile();

    const btn = screen.getByRole('button', { name: /probar notificación/i });
    await user.click(btn);

    await waitFor(() => {
      expect(mockShowOrderStatusNotification).toHaveBeenCalledTimes(1);
      expect(mockPlayNotificationSound).toHaveBeenCalledTimes(1);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Notificación de prueba enviada',
        expect.objectContaining({
          description: expect.stringMatching(/No molestar/i),
        }),
      );
    });
  });

  it('shows fallback warning toast when native notification returns false', async () => {
    const user = userEvent.setup();
    mockGetNotificationPermission.mockReturnValue('granted');
    mockShowOrderStatusNotification.mockResolvedValue(false);

    renderProfile();

    await user.click(
      screen.getByRole('button', { name: /probar notificación/i }),
    );

    await waitFor(() => {
      expect(mockToastWarning).toHaveBeenCalledWith(
        'No se pudo mostrar la notificación nativa',
        expect.any(Object),
      );
      expect(mockPlayNotificationSound).toHaveBeenCalledTimes(1);
    });
  });

  it('renders accessible unblock instructions and fallback actions when permission is denied', async () => {
    const user = userEvent.setup();
    mockGetNotificationPermission.mockReturnValue('denied');

    renderProfile();

    expect(screen.getByRole('alert')).toHaveTextContent(
      /cómo desbloquear las notificaciones/i,
    );

    await user.click(
      screen.getByRole('button', { name: /probar alerta en pantalla/i }),
    );

    expect(mockPlayNotificationSound).toHaveBeenCalledTimes(1);
    expect(mockToastInfo).toHaveBeenCalledWith(
      'Alerta de respaldo en pantalla',
      expect.any(Object),
    );
  });

  it('submits rider application as PENDING without promoting CLIENT role immediately', async () => {
    const user = userEvent.setup();
    mockGetNotificationPermission.mockReturnValue('granted');
    mockCreateDeliveryProfileApi.mockResolvedValue({
      _id: 'prof-new-1',
      userId: 'u-1',
      vehicleType: 'MOTO',
      plate: 'ABC-999',
      licensePlate: 'ABC-999',
      status: 'PENDING',
      isAvailable: false,
    });

    renderProfile();

    await user.click(
      screen.getByRole('button', { name: /conviértete en repartidor/i }),
    );
    await user.type(
      screen.getByPlaceholderText(/ej\. abc-123/i),
      'abc-999',
    );
    await user.click(
      screen.getByRole('button', { name: /enviar solicitud de repartidor/i }),
    );

    expect(
      await screen.findByText(/solicitud en revisión por el administrador/i),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().user?.role).toBe('CLIENT');
  });
});
