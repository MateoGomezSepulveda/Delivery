import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartMutations } from '@/hooks/useCartMutations';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import type { Product } from '@/types/catalog.types';
import type { Cart } from '@/types/order.types';

const mockAddToCartApi = vi.fn();
const mockRemoveFromCartApi = vi.fn();
const mockClearCartApi = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/api/endpoints/cart.api', () => ({
  addToCartApi: (...args: unknown[]) => mockAddToCartApi(...args),
  removeFromCartApi: (...args: unknown[]) => mockRemoveFromCartApi(...args),
  clearCartApi: (...args: unknown[]) => mockClearCartApi(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const sampleProduct: Product = {
  _id: 'prod-1',
  name: 'Burger Clásica',
  description: 'Carne artesanal 150g',
  price: 25000,
  available: true,
  categoryId: 'cat-1',
};

const initialCart: Cart = {
  _id: 'cart-1',
  userId: 'user-1',
  status: 'ACTIVE',
  items: [
    {
      productId: sampleProduct,
      quantity: 1,
      price: 25000,
    },
  ],
  total: 25000,
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setupHook(seedCart?: Cart) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  if (seedCart) {
    queryClient.setQueryData(['cart'], seedCart);
  }

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    queryClient,
    ...renderHook(() => useCartMutations(), { wrapper }),
  };
}

describe('useCartMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartDrawerStore.setState({ appliedCoupon: null });
  });

  it('optimistically increments quantity on addMutation and commits server result', async () => {
    const deferred = createDeferred<Cart>();
    mockAddToCartApi.mockReturnValue(deferred.promise);

    const { queryClient, result } = setupHook(initialCart);

    act(() => {
      result.current.addMutation.mutate({
        productId: 'prod-1',
        quantity: 2,
        product: sampleProduct,
      });
    });

    await waitFor(() => {
      const optimistic = queryClient.getQueryData<Cart>(['cart']);
      expect(optimistic?.items[0]?.quantity).toBe(3);
      expect(optimistic?.total).toBe(75000);
    });

    const serverCart: Cart = {
      ...initialCart,
      items: [{ productId: sampleProduct, quantity: 3, price: 25000 }],
      total: 75000,
    };

    await act(async () => {
      deferred.resolve(serverCart);
    });

    await waitFor(() => {
      expect(result.current.addMutation.isSuccess).toBe(true);
    });
    expect(mockAddToCartApi).toHaveBeenCalledWith('prod-1', 2);
    expect(queryClient.getQueryData<Cart>(['cart'])?.total).toBe(75000);
  });

  it('rolls back optimistic addMutation state and shows toast error on failure', async () => {
    mockAddToCartApi.mockRejectedValue(new Error('Sin stock'));

    const { queryClient, result } = setupHook(initialCart);

    act(() => {
      result.current.addMutation.mutate({
        productId: 'prod-1',
        quantity: 1,
        product: sampleProduct,
      });
    });

    await waitFor(() => {
      expect(result.current.addMutation.isError).toBe(true);
    });

    const rolledBack = queryClient.getQueryData<Cart>(['cart']);
    expect(rolledBack?.items[0]?.quantity).toBe(1);
    expect(rolledBack?.total).toBe(25000);
    expect(mockToastError).toHaveBeenCalledWith(
      'No se pudo actualizar el carrito',
      expect.any(Object),
    );
  });

  it('optimistically removes item and rolls back if removeFromCartApi fails', async () => {
    const deferred = createDeferred<Cart>();
    mockRemoveFromCartApi.mockReturnValue(deferred.promise);

    const { queryClient, result } = setupHook(initialCart);

    act(() => {
      result.current.removeMutation.mutate('prod-1');
    });

    await waitFor(() => {
      const optimistic = queryClient.getQueryData<Cart>(['cart']);
      expect(optimistic?.items).toHaveLength(0);
      expect(optimistic?.total).toBe(0);
    });

    await act(async () => {
      deferred.reject(new Error('Fallo de red'));
    });

    await waitFor(() => {
      expect(result.current.removeMutation.isError).toBe(true);
    });

    const restored = queryClient.getQueryData<Cart>(['cart']);
    expect(restored?.items).toHaveLength(1);
    expect(restored?.total).toBe(25000);
    expect(mockToastError).toHaveBeenCalledWith(
      'Error al remover producto',
      expect.any(Object),
    );
  });

  it('clears items and applied coupon on clearMutation success', async () => {
    useCartDrawerStore.setState({
      appliedCoupon: {
        code: 'PROMO10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        originalTotal: 25000,
        discountAmount: 2500,
        finalTotal: 22500,
      },
    });
    mockClearCartApi.mockResolvedValue({
      ...initialCart,
      items: [],
      total: 0,
    });

    const { queryClient, result } = setupHook(initialCart);

    act(() => {
      result.current.clearMutation.mutate();
    });

    await waitFor(() => {
      expect(result.current.clearMutation.isSuccess).toBe(true);
    });

    expect(queryClient.getQueryData<Cart>(['cart'])?.items).toHaveLength(0);
    expect(useCartDrawerStore.getState().appliedCoupon).toBeNull();
    expect(mockToastSuccess).toHaveBeenCalledWith('Carrito vaciado correctamente');
  });
});
