import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiErrorResponse, ApiResponse } from '@/types/api.types';

export const AUTH_STORAGE_KEY = 'delivery_auth_tokens_v1';

export interface StoredAuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export function getStoredTokens(): StoredAuthTokens {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw) as Partial<StoredAuthTokens>;
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export function setStoredTokens(tokens: StoredAuthTokens): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface FailedQueueItem {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 1. Request Interceptor: Inyecta automáticamente el JWT Access Token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = getStoredTokens();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * 2. Response Interceptor:
 *    - Desenvuelve automáticamente el contrato { success, data, timestamp } del TransformInterceptor de NestJS.
 *    - Ejecuta Silent Refresh Token Queue ante un 401 Unauthorized usando POST /auth/refresh.
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
      const { refreshToken } = getStoredTokens();

      if (!refreshToken) {
        clearStoredTokens();
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
        const refreshResponse = await axios.post<
          ApiResponse<{ access_token: string; refresh_token: string }>
        >(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const payload =
          'data' in refreshResponse.data && refreshResponse.data.data
            ? refreshResponse.data.data
            : (refreshResponse.data as unknown as {
                access_token: string;
                refresh_token: string;
              });

        const newAccessToken = payload.access_token;
        const newRefreshToken = payload.refresh_token ?? refreshToken;

        setStoredTokens({
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
        clearStoredTokens();
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Extrae un mensaje legible desde el contrato de errores del servidor
 */
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
      return 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.';
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
