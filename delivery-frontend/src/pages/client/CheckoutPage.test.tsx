import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutPage } from '@/pages/client/CheckoutPage';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import type { Address, Cart, Order } from '@/types/order.types';

const mockGetCartApi = vi.fn();
const mockGetMyAddressesApi = vi.fn();
const mockCreateOrderApi = vi.fn();
const mockPayOrderApi = vi.fn();
const mockNavigate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastWarning = vi.fn();
const mockToastLoading = vi.fn();

vi.mock('@/api/endpoints/cart.api', () => ({
  getCartApi: () => mockGetCartApi(),
}));

vi.mock('@/api/endpoints/addresses.api', () => ({
  getMyAddressesApi: () => mockGetMyAddressesApi(),
}));

vi.mock('@/api/endpoints/orders.api', () => ({
  createOrderApi: (...args: unknown[]) => mockCreateOrderApi(...args),
  payOrderApi: (...args: unknown[]) => mockPayOrderApi(...args),
}));

vi.mock('@/components/addresses/AddressesModal', () => ({
  AddressesModal: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
    loading: (...args: unknown[]) => mockToastLoading(...args),
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

const defaultAddress: Address = {
  _id: 'addr-1',
  userId: 'user-1',
  title: 'Casa',
  street: 'Calle 123 #45-67',
  city: 'Bogotá',
  state: 'Cundinamarca',
  zipCode: '110111',
  country: 'Colombia',
  isDefault: true,
};

const activeCart: Cart = {
  _id: 'cart-1',
  userId: 'user-1',
  status: 'ACTIVE',
  items: [
    {
      productId: {
        _id: 'prod-1',
        name: 'Pizza Margarita',
        description: 'Masa madre artesanal',
        price: 30000,
        available: true,
        categoryId: 'cat-1',
      },
      quantity: 2,
      price: 30000,
    },
  ],
  total: 60000,
};

function renderCheckoutPage() {
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
        <CheckoutPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useCartDrawerStore.setState({
      isOpen: false,
      isAddressModalOpen: false,
      activeAddressLabel: 'Seleccionar dirección de entrega',
      selectedAddress: null,
      appliedCoupon: null,
    });
  });

  it('shows empty state when the cart has no items', async () => {
    mockGetCartApi.mockResolvedValue({
      _id: 'cart-empty',
      userId: 'user-1',
      status: 'ACTIVE',
      items: [],
      total: 0,
    });
    mockGetMyAddressesApi.mockResolvedValue([]);

    renderCheckoutPage();

    expect(
      await screen.findByText('Tu carrito está vacío'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /explorar catálogo/i }),
    ).toBeInTheDocument();
  });

  it('renders cart breakdown with applied coupon discount and creates order without MP redirect', async () => {
    const user = userEvent.setup();
    useCartDrawerStore.setState({
      appliedCoupon: {
        code: 'DESCUENTO10',
        discountType: 'FIXED',
        discountValue: 10000,
        originalTotal: 60000,
        discountAmount: 10000,
        finalTotal: 50000,
      },
    });

    mockGetCartApi.mockResolvedValue(activeCart);
    mockGetMyAddressesApi.mockResolvedValue([defaultAddress]);

    const createdOrder: Order = {
      _id: 'order-abc123',
      userId: 'user-1',
      items: [
        {
          productId: 'prod-1',
          name: 'Pizza Margarita',
          quantity: 2,
          price: 30000,
        },
      ],
      total: 60000,
      address: 'Calle 123 #45-67, Bogotá',
      status: 'PENDING',
    };
    mockCreateOrderApi.mockResolvedValue(createdOrder);

    renderCheckoutPage();

    expect(
      await screen.findByText('Confirmación y Checkout Seguro'),
    ).toBeInTheDocument();
    expect(screen.getByText('Pizza Margarita')).toBeInTheDocument();
    expect(screen.getByText(/Cupón \(DESCUENTO10\)/i)).toBeInTheDocument();

    const submitButton = screen.getByRole('button', {
      name: /confirmar pedido y ver seguimiento/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateOrderApi).toHaveBeenCalledWith({
        address: expect.stringContaining('Calle 123 #45-67'),
      });
    });

    expect(mockPayOrderApi).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      '¡Pedido creado con éxito!',
      expect.any(Object),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/orders/order-abc123');
  });
});
