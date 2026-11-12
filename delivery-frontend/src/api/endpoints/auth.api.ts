import { apiClient } from '@/api/axios.client';
import type {
  AuthTokensResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from '@/types/auth.types';

export async function registerApi(payload: RegisterPayload): Promise<User> {
  const response = await apiClient.post<User>('/auth/register', payload);
  return response.data;
}

export async function loginApi(
  payload: LoginPayload,
): Promise<AuthTokensResponse> {
  const response = await apiClient.post<AuthTokensResponse>(
    '/auth/login',
    payload,
  );
  return response.data;
}

export async function refreshTokensApi(
  refreshToken: string,
): Promise<AuthTokensResponse> {
  const response = await apiClient.post<AuthTokensResponse>('/auth/refresh', {
    refreshToken,
  });
  return response.data;
}

export async function logoutApi(
  refreshToken: string,
): Promise<{ success: boolean }> {
  const response = await apiClient.post<{ success: boolean }>('/auth/logout', {
    refreshToken,
  });
  return response.data;
}

export async function forgotPasswordApi(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  const response = await apiClient.post<ForgotPasswordResponse>(
    '/auth/forgot-password',
    payload,
  );
  return response.data;
}

export async function resetPasswordApi(
  payload: ResetPasswordPayload,
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    '/auth/reset-password',
    payload,
  );
  return response.data;
}
