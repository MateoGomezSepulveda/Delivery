import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_STORAGE_KEY, getStoredTokens } from '@/api/axios.client';
import type { User } from '@/types/auth.types';

const mockLogoutApi = vi.fn();
const mockGetUserByIdApi = vi.fn();

vi.mock('@/api/endpoints/auth.api', () => ({
  logoutApi: (...args: unknown[]) => mockLogoutApi(...args),
}));

vi.mock('@/api/endpoints/users.api', () => ({
  getUserByIdApi: (...args: unknown[]) => mockGetUserByIdApi(...args),
}));

import { useAuthStore } from '@/store/useAuthStore';
import {
  CART_UI_STORAGE_KEY,
  DEFAULT_ADDRESS_LABEL,
  useCartDrawerStore,
} from '@/store/useCartDrawerStore';

function buildJwt(sub: string, role: User['role'] = 'CLIENT'): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub,
      email: 'cliente@delivery.com',
      role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.sig`;
}

const sampleUser: User = {
  _id: 'user-001',
  name: 'Mateo Cliente',
  email: 'cliente@delivery.com',
  role: 'CLIENT',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartDrawerStore.getState().resetCartUi();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrating: false,
      avatarsByUserId: {},
    });
    vi.clearAllMocks();
  });

  it('persists tokens, authenticates user and restores saved avatar in setSession', () => {
    useAuthStore.getState().setUserAvatar(sampleUser._id, 'https://img.local/avatar.png');

    const access = buildJwt(sampleUser._id);
    useAuthStore.getState().setSession(
      { access_token: access, refresh_token: 'refresh-xyz' },
      sampleUser,
    );

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.name).toBe('Mateo Cliente');
    expect(state.user?.avatarUrl).toBe('https://img.local/avatar.png');
    expect(getStoredTokens()).toEqual({
      accessToken: access,
      refreshToken: 'refresh-xyz',
    });
  });

  it('merges partial profile updates with updateUserState', () => {
    useAuthStore.getState().setSession(
      { access_token: buildJwt(sampleUser._id), refresh_token: 'r1' },
      sampleUser,
    );

    useAuthStore.getState().updateUserState({ name: 'Mateo Actualizado' });

    expect(useAuthStore.getState().user?.name).toBe('Mateo Actualizado');
    expect(useAuthStore.getState().user?.email).toBe('cliente@delivery.com');
  });

  it('clears state when hydrating without tokens or with invalid JWT', async () => {
    await useAuthStore.getState().hydrateSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ accessToken: 'malformed.jwt', refreshToken: 'r1' }),
    );
    await useAuthStore.getState().hydrateSession();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(getStoredTokens().accessToken).toBeNull();
  });

  it('hydrates active user profile from backend when valid token is stored', async () => {
    const access = buildJwt(sampleUser._id, 'ADMIN');
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ accessToken: access, refreshToken: 'refresh-ok' }),
    );
    mockGetUserByIdApi.mockResolvedValue({ ...sampleUser, role: 'ADMIN' });

    await useAuthStore.getState().hydrateSession();

    expect(mockGetUserByIdApi).toHaveBeenCalledWith(sampleUser._id);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.role).toBe('ADMIN');
    expect(useAuthStore.getState().isHydrating).toBe(false);
  });

  it('clears session and storage on logout even if backend API fails', async () => {
    useAuthStore.getState().setSession(
      { access_token: buildJwt(sampleUser._id), refresh_token: 'refresh-kill' },
      sampleUser,
    );
    mockLogoutApi.mockRejectedValue(new Error('Network down'));

    await useAuthStore.getState().logout();

    expect(mockLogoutApi).toHaveBeenCalledWith('refresh-kill');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(getStoredTokens()).toEqual({
      accessToken: null,
      refreshToken: null,
    });
  });

  it('resets active address, applied coupon and cart drawer UI on logout (Bug #3)', async () => {
    useAuthStore.getState().setSession(
      { access_token: buildJwt(sampleUser._id), refresh_token: 'refresh-1' },
      sampleUser,
    );
    useCartDrawerStore.getState().setSelectedAddress({
      _id: 'addr-1',
      userId: sampleUser._id,
      title: 'Casa',
      street: 'Calle 85 #15-20',
      city: 'Bogotá',
      state: 'Cundinamarca',
      zipCode: '110221',
      country: 'Colombia',
      isDefault: true,
    });
    useCartDrawerStore.getState().setAppliedCoupon({
      code: 'PROMO10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      originalTotal: 50000,
      discountAmount: 5000,
      finalTotal: 45000,
    });
    useCartDrawerStore.getState().openDrawer();

    mockLogoutApi.mockResolvedValue({ success: true });
    await useAuthStore.getState().logout();

    const cartUi = useCartDrawerStore.getState();
    expect(cartUi.isOpen).toBe(false);
    expect(cartUi.selectedAddress).toBeNull();
    expect(cartUi.appliedCoupon).toBeNull();
    expect(cartUi.activeAddressLabel).toBe(DEFAULT_ADDRESS_LABEL);
    expect(localStorage.getItem(CART_UI_STORAGE_KEY)).toBeNull();
  });

  it('resets cart UI address and coupon when switching to a different user in setSession (Bug #3)', () => {
    useAuthStore.getState().setSession(
      { access_token: buildJwt(sampleUser._id), refresh_token: 'refresh-a' },
      sampleUser,
    );
    useCartDrawerStore.getState().setSelectedAddress({
      _id: 'addr-a',
      userId: sampleUser._id,
      title: 'Oficina',
      street: 'Cra 7 #71-21',
      city: 'Bogotá',
      state: 'Cundinamarca',
      zipCode: '110231',
      country: 'Colombia',
      isDefault: true,
    });

    const otherUser: User = {
      _id: 'user-002',
      name: 'Otro Cliente',
      email: 'otro@delivery.com',
      role: 'CLIENT',
    };
    useAuthStore.getState().setSession(
      { access_token: buildJwt(otherUser._id), refresh_token: 'refresh-b' },
      otherUser,
    );

    const cartUi = useCartDrawerStore.getState();
    expect(cartUi.selectedAddress).toBeNull();
    expect(cartUi.activeAddressLabel).toBe(DEFAULT_ADDRESS_LABEL);
  });
});
