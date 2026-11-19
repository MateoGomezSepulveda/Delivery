import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { useAuthStore } from '@/store/useAuthStore';
import {
  DEFAULT_ADDRESS_LABEL,
  useCartDrawerStore,
} from '@/store/useCartDrawerStore';

const mockGetCartApi = vi.fn();
const mockLogoutApi = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/api/endpoints/cart.api', () => ({
  getCartApi: (...args: unknown[]) => mockGetCartApi(...args),
}));

vi.mock('@/api/endpoints/auth.api', () => ({
  logoutApi: (...args: unknown[]) => mockLogoutApi(...args),
}));

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ connected: true }),
}));

vi.mock('@/components/cart/CartDrawer', () => ({
  CartDrawer: () => null,
}));

vi.mock('@/components/addresses/AddressesModal', () => ({
  AddressesModal: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ClientLayout logout cleanup (Bug #3 & Bug #4)', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartDrawerStore.getState().resetCartUi();
    useAuthStore.setState({
      user: {
        _id: 'u-client-1',
        name: 'Mateo Cliente',
        email: 'mateo@correo.com',
        role: 'CLIENT',
      },
      accessToken: 'token-1',
      refreshToken: 'refresh-1',
      isAuthenticated: true,
      isHydrating: false,
      avatarsByUserId: {},
    });
    vi.clearAllMocks();
  });

  it('clears cart query cache, resets cart counter to 0, and resets active address on logout', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    mockGetCartApi.mockResolvedValue({
      _id: 'cart-1',
      userId: 'u-client-1',
      status: 'ACTIVE',
      items: [
        { productId: 'p-1', quantity: 2, price: 20000 },
        { productId: 'p-2', quantity: 1, price: 15000 },
      ],
      total: 55000,
    });
    mockLogoutApi.mockResolvedValue({ success: true });

    useCartDrawerStore.getState().setSelectedAddress({
      _id: 'addr-1',
      userId: 'u-client-1',
      title: 'Casa',
      street: 'Calle 85 #15-20',
      city: 'Bogotá',
      state: 'Cundinamarca',
      zipCode: '110221',
      country: 'Colombia',
      isDefault: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ClientLayout />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('button', { name: /carrito\s*3/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Casa: Calle 85 #15-20, Bogotá'),
    ).toBeInTheDocument();

    await user.click(screen.getByTitle('Cerrar sesión'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    expect(
      screen.getByRole('button', { name: /carrito\s*0/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_ADDRESS_LABEL)).toBeInTheDocument();
    expect(queryClient.getQueryData(['cart'])).toBeUndefined();
  });
});
