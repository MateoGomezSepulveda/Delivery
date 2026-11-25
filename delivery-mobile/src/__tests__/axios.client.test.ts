import axios, { type AxiosAdapter, type AxiosResponse } from 'axios';

const mockSecureStoreMap = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async (key: string) => mockSecureStoreMap.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStoreMap.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStoreMap.delete(key);
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

import { apiClient, onSessionExpired } from '@/api/axios.client';
import {
  AUTH_STORAGE_KEY,
  getStoredTokens,
  resetTokenStorageForTests,
  setStoredTokens,
} from '@/storage/tokenStorage';

describe('axios.client + expo-secure-store Silent Refresh Queue', () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    mockSecureStoreMap.clear();
    resetTokenStorageForTests();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('unwraps NestJS TransformInterceptor { success, data } and injects Bearer token', async () => {
    await setStoredTokens({
      accessToken: 'token_initial_abc',
      refreshToken: 'refresh_initial_xyz',
    });

    let capturedAuthHeader: string | undefined;

    const adapter: AxiosAdapter = async (config) => {
      capturedAuthHeader = config.headers?.Authorization as string | undefined;
      return {
        data: {
          success: true,
          data: { status: 'ok' },
          timestamp: '2026-11-25T12:00:00.000Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    apiClient.defaults.adapter = adapter;

    const res = await apiClient.get<{ status: string }>('/health');
    expect(capturedAuthHeader).toBe('Bearer token_initial_abc');
    expect(res.data).toEqual({ status: 'ok' });
  });

  it('rotates tokens in SecureStore and replays concurrent 401 requests once', async () => {
    mockSecureStoreMap.set(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        accessToken: 'expired_access',
        refreshToken: 'valid_refresh',
      }),
    );

    const postSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          access_token: 'fresh_access_token',
          refresh_token: 'fresh_refresh_token',
        },
        timestamp: '2026-11-25T12:00:00.000Z',
      },
    });

    const adapter: AxiosAdapter = async (config) => {
      const auth = config.headers?.Authorization as string | undefined;
      if (auth !== 'Bearer fresh_access_token') {
        const err = new axios.AxiosError(
          'Unauthorized',
          'ERR_BAD_REQUEST',
          config,
          null,
          {
            data: { statusCode: 401, message: 'Token expired' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          },
        );
        throw err;
      }

      return {
        data: {
          success: true,
          data: { endpoint: config.url },
          timestamp: '2026-11-25T12:00:00.000Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    apiClient.defaults.adapter = adapter;

    const [r1, r2] = await Promise.all([
      apiClient.get('/orders/me'),
      apiClient.get('/cart'),
    ]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(r1.data).toEqual({ endpoint: '/orders/me' });
    expect(r2.data).toEqual({ endpoint: '/cart' });

    const rotated = await getStoredTokens();
    expect(rotated).toEqual({
      accessToken: 'fresh_access_token',
      refreshToken: 'fresh_refresh_token',
    });
  });

  it('clears SecureStore and notifies onSessionExpired when refresh fails', async () => {
    await setStoredTokens({
      accessToken: 'expired_access',
      refreshToken: 'expired_refresh',
    });

    jest
      .spyOn(axios, 'post')
      .mockRejectedValueOnce(new Error('Refresh token invalid'));

    const expiredListener = jest.fn();
    const unsubscribe = onSessionExpired(expiredListener);

    apiClient.defaults.adapter = async (config) => {
      throw new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        data: { statusCode: 401, message: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      });
    };

    await expect(apiClient.get('/users/me')).rejects.toThrow(
      'Refresh token invalid',
    );
    expect(expiredListener).toHaveBeenCalledTimes(1);

    const afterFailure = await getStoredTokens();
    expect(afterFailure).toEqual({ accessToken: null, refreshToken: null });

    unsubscribe();
  });
});
