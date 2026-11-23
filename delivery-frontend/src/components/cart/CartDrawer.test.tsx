import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import type { Product } from '@/types/catalog.types';
import type { Cart } from '@/types/order.types';

const mockGetCartApi = vi.fn();
const mockAddToCartApi = vi.fn();
const mockUpdateCartItemQuantityApi = vi.fn();
const mockRemoveFromCartApi = vi.fn();
const mockClearCartApi = vi.fn();

vi.mock('@/api/endpoints/cart.api', () => ({
  getCartApi: (...args: unknown[]) => mockGetCartApi(...args),
  addToCartApi: (...args: unknown[]) => mockAddToCartApi(...args),
  updateCartItemQuantityApi: (...args: unknown[]) =>
    mockUpdateCartItemQuantityApi(...args),
  removeFromCartApi: (...args: unknown[]) => mockRemoveFromCartApi(...args),
  clearCartApi: (...args: unknown[]) => mockClearCartApi(...args),
}));

vi.mock('@/hooks/useRiderDiscountQuota', () => ({
  useRiderDiscountQuota: () => ({ data: undefined }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const sampleProduct: Product = {
  _id: 'prod-1',
  name: 'Ron Viejo de Caldas',
  description: 'Botella 750ml',
  price: 55000,
  available: true,
  stock: 10,
  categoryId: 'cat-1',
};

function renderCartDrawer(cart: Cart) {
  mockGetCartApi.mockResolvedValue(cart);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  queryClient.setQueryData(['cart'], cart);

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CartDrawer />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CartDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        _id: 'user-1',
        name: 'Mateo',
        email: 'mateo@example.com',
        role: 'CLIENT',
      },
      accessToken: 'token',
      refreshToken: 'refresh',
    });
    useCartDrawerStore.setState({
      isOpen: true,
      activeAddressLabel: 'Casa: Calle 10 #20-30',
      appliedCoupon: null,
    });
  });

  it('decreases item quantity by 1 when clicking the minus button without removing the item', async () => {
    const cartWithThree: Cart = {
      _id: 'cart-1',
      userId: 'user-1',
      status: 'ACTIVE',
      items: [{ productId: sampleProduct, quantity: 3, price: 55000 }],
      total: 165000,
    };

    const updatedCart: Cart = {
      ...cartWithThree,
      items: [{ productId: sampleProduct, quantity: 2, price: 55000 }],
      total: 110000,
    };

    mockUpdateCartItemQuantityApi.mockResolvedValue(updatedCart);
    mockGetCartApi.mockResolvedValue(updatedCart);

    renderCartDrawer(cartWithThree);

    const minusButton = await screen.findByRole('button', {
      name: /Quitar una unidad de Ron Viejo de Caldas/i,
    });
    expect(minusButton).not.toBeDisabled();

    fireEvent.click(minusButton);

    await waitFor(() => {
      expect(mockUpdateCartItemQuantityApi).toHaveBeenCalledWith('prod-1', 2);
    });
    expect(mockRemoveFromCartApi).not.toHaveBeenCalled();
  });

  it('disables the minus button when quantity is 1 while keeping the delete button enabled', async () => {
    const cartWithOne: Cart = {
      _id: 'cart-1',
      userId: 'user-1',
      status: 'ACTIVE',
      items: [{ productId: sampleProduct, quantity: 1, price: 55000 }],
      total: 55000,
    };

    renderCartDrawer(cartWithOne);

    const minusButton = await screen.findByRole('button', {
      name: /Quitar una unidad de Ron Viejo de Caldas/i,
    });
    const deleteButton = screen.getByRole('button', {
      name: /Eliminar Ron Viejo de Caldas del carrito/i,
    });

    expect(minusButton).toBeDisabled();
    expect(deleteButton).not.toBeDisabled();
  });
});
