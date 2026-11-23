import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutPage } from '@/pages/client/CheckoutPage';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import type { Address, Cart, Order } from '@/types/order.types';

const mockGetCartApi = vi.fn();
const mockGetMyAddressesApi = vi.fn();
const mockCreateOrderApi = vi.fn();
const mockPayOrderApi = vi.fn();
const mockGetRiderDiscountQuotaApi = vi.fn();
const mockGetDeliveryFeeApi = vi.fn();
const mockUpdateUserApi = vi.fn();
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
  DEFAULT_DELIVERY_FEE: 5000,
  createOrderApi: (...args: unknown[]) => mockCreateOrderApi(...args),
  payOrderApi: (...args: unknown[]) => mockPayOrderApi(...args),
  getRiderDiscountQuotaApi: (...args: unknown[]) =>
    mockGetRiderDiscountQuotaApi(...args),
  getDeliveryFeeApi: (...args: unknown[]) => mockGetDeliveryFeeApi(...args),
}));

vi.mock('@/api/endpoints/users.api', () => ({
  updateUserApi: (...args: unknown[]) => mockUpdateUserApi(...args),
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
    mockGetDeliveryFeeApi.mockResolvedValue({
      deliveryFee: 5000,
      currency: 'COP',
      pricingMode: 'FLAT',
    });
    useAuthStore.setState({
      user: {
        _id: 'user-1',
        name: 'Cliente',
        email: 'cliente@correo.com',
        phone: '+573001234567',
        role: 'CLIENT',
      },
      accessToken: 'tok',
      refreshToken: 'ref',
      isAuthenticated: true,
      isHydrating: false,
      avatarsByUserId: {},
    });
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

  it('renders cart breakdown with applied coupon discount and creates CASH_ON_DELIVERY order with change calculation without MP redirect', async () => {
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
      deliveryFee: 5000,
      total: 55000,
      address: 'Calle 123 #45-67, Bogotá',
      status: 'PENDING',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'PENDING',
      cashAmountGiven: 100000,
      changeDue: 45000,
    };
    mockCreateOrderApi.mockResolvedValue(createdOrder);

    renderCheckoutPage();

    expect(
      await screen.findByText('Confirmación y Checkout Seguro'),
    ).toBeInTheDocument();
    expect(screen.getByText('Pizza Margarita')).toBeInTheDocument();
    expect(screen.getByText(/Cupón \(DESCUENTO10\)/i)).toBeInTheDocument();
    expect(screen.getByText('Costo de domicilio')).toBeInTheDocument();
    expect(screen.queryByText(/Gratis Promo/i)).not.toBeInTheDocument();
    expect(screen.getByText(/\$\s*5\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*55\.000/)).toBeInTheDocument();

    await user.click(
      screen.getByRole('radio', { name: /efectivo contraentrega/i }),
    );
    await user.type(
      screen.getByLabelText(/¿con cuánto vas a pagar\?/i),
      '100000',
    );
    expect(
      screen.getByText(/vueltas que llevará el repartidor/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/\$\s*45\.000/)).toBeInTheDocument();

    const submitButton = screen.getByRole('button', {
      name: /confirmar pedido contraentrega/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateOrderApi).toHaveBeenCalledWith({
        address: expect.stringContaining('Calle 123 #45-67'),
        couponCode: 'DESCUENTO10',
        paymentMethod: 'CASH_ON_DELIVERY',
        cashAmountGiven: 100000,
      });
    });

    expect(mockPayOrderApi).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      '¡Pedido creado con éxito!',
      expect.any(Object),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/orders/order-abc123');
  });

  it('hides rider -10% discount when monthly 4-order quota is exhausted', async () => {
    useAuthStore.setState({
      user: {
        _id: 'rider-1',
        name: 'Rider Test',
        email: 'rider@correo.com',
        phone: '+573001234567',
        role: 'DELIVERY',
      },
      isAuthenticated: true,
    });
    mockGetCartApi.mockResolvedValue(activeCart);
    mockGetMyAddressesApi.mockResolvedValue([defaultAddress]);
    mockGetRiderDiscountQuotaApi.mockResolvedValue({
      eligible: false,
      isRider: true,
      monthlyLimit: 4,
      usedThisMonth: 4,
      remaining: 0,
      discountPercent: 10,
    });

    renderCheckoutPage();

    expect(
      await screen.findByText(/Cupo mensual -10% repartidor agotado \(4\/4\)/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Beneficio Socio Mensajero/i),
    ).not.toBeInTheDocument();
  });

  it('blocks order confirmation for Google user without phone until inline phone is saved', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        _id: 'google-user-1',
        name: 'Ana Google',
        email: 'ana@gmail.com',
        role: 'CLIENT',
        authProviders: ['google'],
      },
      isAuthenticated: true,
    });
    mockGetCartApi.mockResolvedValue(activeCart);
    mockGetMyAddressesApi.mockResolvedValue([defaultAddress]);
    mockUpdateUserApi.mockResolvedValue({
      _id: 'google-user-1',
      name: 'Ana Google',
      email: 'ana@gmail.com',
      phone: '+573105554433',
      role: 'CLIENT',
    });

    renderCheckoutPage();

    const confirmBtn = await screen.findByRole('button', {
      name: /confirmar y pagar con mercadopago/i,
    });
    expect(confirmBtn).toBeDisabled();
    expect(
      screen.getByText(/número de celular obligatorio para pedir/i),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Número de celular obligatorio'),
      '3105554433',
    );
    await user.click(
      screen.getByRole('button', { name: /guardar celular y continuar/i }),
    );

    await waitFor(() => {
      expect(mockUpdateUserApi).toHaveBeenCalledWith('google-user-1', {
        phone: '3105554433',
      });
    });

    await waitFor(() => {
      expect(confirmBtn).toBeEnabled();
    });
    expect(useAuthStore.getState().user?.phone).toBe('+573105554433');
  });
});
