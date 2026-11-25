import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL } from '@/config/env';
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from '@/storage/tokenStorage';
import type { ApiErrorResponse, ApiResponse } from '@/types/api.types';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface FailedQueueItem {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

type SessionExpiredListener = () => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

function notifySessionExpired(): void {
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Evita que un listener defectuoso interrumpa a los demás
    }
  });
}

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 1. Request Interceptor: Hidrata SecureStore si hace falta e inyecta el Bearer Token.
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { accessToken } = await getStoredTokens();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * 2. Response Interceptor:
 *    - Desenvuelve automáticamente { success: true, data, timestamp } del TransformInterceptor de NestJS.
 *    - Ejecuta Silent Refresh Token Queue ante un 401 Unauthorized rotando tokens en expo-secure-store.
 */
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as Partial<ApiResponse<unknown>>;
    if (
      body &&
      typeof body === 'object' &&
      'success' in body &&
      'data' in body &&
      body.success === true
    ) {
      response.data = body.data;
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/verify-email') ||
      originalRequest.url?.includes('/auth/resend-verification') ||
      originalRequest.url?.includes('/auth/google') ||
      originalRequest.url?.includes('/auth/facebook');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      const { refreshToken } = await getStoredTokens();

      if (!refreshToken) {
        await clearStoredTokens();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newAccessToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshBaseUrl = originalRequest.baseURL ?? API_BASE_URL;
        const refreshResponse = await axios.post<
          ApiResponse<{ access_token: string; refresh_token: string }>
        >(`${refreshBaseUrl}/auth/refresh`, {
          refreshToken,
        });

        const payload =
          refreshResponse.data &&
          typeof refreshResponse.data === 'object' &&
          'data' in refreshResponse.data &&
          refreshResponse.data.data
            ? refreshResponse.data.data
            : (refreshResponse.data as unknown as {
                access_token: string;
                refresh_token: string;
              });

        const newAccessToken = payload.access_token;
        const newRefreshToken = payload.refresh_token ?? refreshToken;

        await setStoredTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearStoredTokens();
        notifySessionExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const data = error.response?.data;
    const directMsg = data?.message;
    if (Array.isArray(directMsg)) return directMsg.join('. ');
    if (typeof directMsg === 'string' && directMsg.trim()) return directMsg;

    const nestedError = data?.error;
    if (typeof nestedError === 'string' && nestedError.trim()) {
      return nestedError;
    }
    if (nestedError && typeof nestedError === 'object') {
      const nestedMsg = nestedError.message;
      if (Array.isArray(nestedMsg)) return nestedMsg.join('. ');
      if (typeof nestedMsg === 'string' && nestedMsg.trim()) return nestedMsg;
    }

    if (error.code === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor. Verifica que la API esté encendida en la misma red Wi-Fi.';
    }
  }
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

export interface ApiErrorDetails {
  code?: string;
  email?: string;
  statusCode?: number;
  message: string;
}

export function extractApiErrorDetails(error: unknown): ApiErrorDetails {
  const message = extractErrorMessage(error);
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const data = error.response?.data;
    const nested =
      data?.error && typeof data.error === 'object' ? data.error : undefined;
    return {
      code: nested?.code,
      email: nested?.email,
      statusCode: error.response?.status ?? data?.statusCode,
      message,
    };
  }
  return { message };
}
