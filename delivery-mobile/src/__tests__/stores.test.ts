const mockSecureMap = new Map<string, string>();
const mockAsyncMap = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async (k: string) => mockSecureMap.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecureMap.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecureMap.delete(k);
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => mockAsyncMap.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => {
    mockAsyncMap.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockAsyncMap.delete(k);
  }),
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: {
    Success: 'Success',
    Error: 'Error',
    Warning: 'Warning',
  },
  notificationAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
}));

import { resetTokenStorageForTests } from '@/storage/tokenStorage';
import { useAuthStore } from '@/store/useAuthStore';
import {
  DEFAULT_ADDRESS_LABEL,
  useCartUiStore,
} from '@/store/useCartUiStore';
import { useThemeStore } from '@/store/useThemeStore';
import { toast, useToastStore } from '@/store/useToastStore';

describe('Zustand mobile stores (Auth, CartUI, Theme, Toast)', () => {
  beforeEach(() => {
    mockSecureMap.clear();
    mockAsyncMap.clear();
    resetTokenStorageForTests();
    useCartUiStore.getState().resetCartUi();
    useToastStore.getState().dismiss();
  });

  it('persists session in useAuthStore and resets CartUI when switching users', async () => {
    useCartUiStore.getState().setSelectedAddress({
      _id: 'addr-1',
      userId: 'user-a',
      title: 'Casa',
      street: 'Cra 15 # 85-10',
      city: 'Bogotá',
      state: 'Cundinamarca',
      zipCode: '110111',
      country: 'Colombia',
      isDefault: true,
    });

    expect(useCartUiStore.getState().activeAddressLabel).toContain('Cra 15');

    await useAuthStore.getState().setSession(
      { access_token: 'acc_b', refresh_token: 'ref_b' },
      {
        _id: 'user-b',
        name: 'Mateo Rider',
        email: 'mateo@deliverypro.co',
        role: 'DELIVERY',
      },
    );

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.role).toBe('DELIVERY');
    expect(useCartUiStore.getState().activeAddressLabel).toBe(
      DEFAULT_ADDRESS_LABEL,
    );

    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('manages theme preferences and toast notifications cleanly', async () => {
    await useThemeStore.getState().setPreference('dark');
    expect(useThemeStore.getState().preference).toBe('dark');

    toast.success('Pedido confirmado', { description: 'En camino' });
    expect(useToastStore.getState().current).not.toBeNull();
    expect(useToastStore.getState().current?.title).toBe('Pedido confirmado');

    useToastStore.getState().dismiss();
    expect(useToastStore.getState().current).toBeNull();
  });
});
