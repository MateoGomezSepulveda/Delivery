import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/useAuthStore';
import type { Order } from '@/types/order.types';

type SocketHandler = (...args: unknown[]) => void;

const listeners = new Map<string, SocketHandler[]>();
const mockDisconnect = vi.fn();
const mockRemoveAllListeners = vi.fn(() => {
  listeners.clear();
});

const mockSocket = {
  on: vi.fn((event: string, handler: SocketHandler) => {
    const current = listeners.get(event) ?? [];
    listeners.set(event, [...current, handler]);
    return mockSocket;
  }),
  removeAllListeners: mockRemoveAllListeners,
  disconnect: mockDisconnect,
};

const mockIo = vi.fn((...args: unknown[]) => {
  void args;
  return mockSocket;
});
const mockToastSuccess = vi.fn();
const mockToastInfo = vi.fn();
const mockPlayNotificationSound = vi.fn();
const mockShowOrderStatusNotification = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

vi.mock('@/utils/sound', () => ({
  playNotificationSound: (...args: unknown[]) =>
    mockPlayNotificationSound(...args),
}));

vi.mock('@/utils/browserNotifications', () => ({
  showOrderStatusNotification: (...args: unknown[]) =>
    mockShowOrderStatusNotification(...args),
}));

function emitSocketEvent(event: string, ...args: unknown[]) {
  const handlers = listeners.get(event) ?? [];
  for (const handler of handlers) {
    handler(...args);
  }
}

describe('useSocket — alertas en vivo de repartidores', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    listeners.clear();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useAuthStore.setState({
      user: {
        _id: 'rider-1',
        name: 'Carlos Repartidor',
        email: 'carlos@correo.com',
        role: 'DELIVERY',
      },
      accessToken: 'jwt-rider-token',
      refreshToken: 'refresh-rider-token',
      isAuthenticated: true,
      isHydrating: false,
      avatarsByUserId: {},
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  function createWrapper() {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  }

  it('tracks socket connection state across connect, disconnect, and connect_error', () => {
    const { result } = renderHook(() => useSocket({ playRiderAlerts: true }), {
      wrapper: createWrapper(),
    });

    expect(result.current.connected).toBe(false);

    act(() => emitSocketEvent('connect'));
    expect(result.current.connected).toBe(true);

    act(() => emitSocketEvent('disconnect'));
    expect(result.current.connected).toBe(false);

    act(() => emitSocketEvent('connect'));
    expect(result.current.connected).toBe(true);

    act(() => emitSocketEvent('connect_error'));
    expect(result.current.connected).toBe(false);
  });

  it('plays sound, shows shipping-fee toast, and fires background notification to /delivery when playRiderAlerts is true', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    renderHook(() => useSocket({ playRiderAlerts: true }), {
      wrapper: createWrapper(),
    });

    act(() => {
      emitSocketEvent('new_available_order', {
        _id: '66000000000000000000abcd',
        address: 'Calle 85 # 15-20',
        total: 120000,
        deliveryFee: 6000,
        status: 'PREPARING',
        items: [],
      } satisfies Partial<Order>);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['delivery-available'],
    });
    expect(mockPlayNotificationSound).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      '¡Nuevo pedido disponible #00ABCD!',
      expect.objectContaining({
        description: expect.stringMatching(/Calle 85 # 15-20.*Ganancia envío \+.*6\.000/),
      }),
    );
    expect(mockShowOrderStatusNotification).toHaveBeenCalledWith(
      'Nuevo pedido disponible #00ABCD',
      expect.stringMatching(/Ganancia envío \+.*6\.000/),
      '66000000000000000000abcd',
      '/delivery',
    );
  });

  it('refreshes cache silently when playRiderAlerts is false and toggles live without reconnecting socket', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { rerender } = renderHook(
      ({ playRiderAlerts }: { playRiderAlerts: boolean }) =>
        useSocket({ playRiderAlerts }),
      {
        initialProps: { playRiderAlerts: false },
        wrapper: createWrapper(),
      },
    );

    act(() => {
      emitSocketEvent('new_available_order', {
        _id: '660000000000000000001111',
        address: 'Carrera 7 # 70-10',
        total: 45000,
        deliveryFee: 5000,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['delivery-available'],
    });
    expect(mockPlayNotificationSound).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();

    // Activar alertas al pasar a Online NO debe reconectar Socket.io
    rerender({ playRiderAlerts: true });
    expect(mockIo).toHaveBeenCalledTimes(1);

    act(() => {
      emitSocketEvent('new_available_order', {
        _id: '660000000000000000002222',
        address: 'Carrera 15 # 93-40',
        total: 52000,
        deliveryFee: 5000,
      });
    });

    expect(mockPlayNotificationSound).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
  });

  it('removes taken order immediately from delivery-available cache on order_taken', () => {
    const existingOrders = [
      { _id: 'order-1', address: 'Dir 1', total: 30000, items: [], status: 'PREPARING' },
      { _id: 'order-2', address: 'Dir 2', total: 40000, items: [], status: 'PREPARING' },
    ] as unknown as Order[];
    queryClient.setQueryData(['delivery-available'], existingOrders);

    renderHook(() => useSocket({ playRiderAlerts: true }), {
      wrapper: createWrapper(),
    });

    act(() => {
      emitSocketEvent('order_taken', { orderId: 'order-1' });
    });

    const updated = queryClient.getQueryData<Order[]>(['delivery-available']);
    expect(updated?.map((o) => o._id)).toEqual(['order-2']);
  });
});
