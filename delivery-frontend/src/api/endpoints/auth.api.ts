import { apiClient } from '@/api/axios.client';
import type {
  AuthTokensResponse,
  FacebookAuthPayload,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  GoogleAuthPayload,
  LinkProviderResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  ResendVerificationPayload,
  ResendVerificationResponse,
  ResetPasswordPayload,
  SocialAuthResponse,
  VerifyEmailPayload,
  VerifyEmailResponse,
} from '@/types/auth.types';

export async function registerApi(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>(
    '/auth/register',
    payload,
  );
  return response.data;
}

export async function verifyEmailApi(
  payload: VerifyEmailPayload,
): Promise<VerifyEmailResponse> {
  const response = await apiClient.post<VerifyEmailResponse>(
    '/auth/verify-email',
    payload,
  );
  return response.data;
}

export async function resendVerificationApi(
  payload: ResendVerificationPayload,
): Promise<ResendVerificationResponse> {
  const response = await apiClient.post<ResendVerificationResponse>(
    '/auth/resend-verification',
    payload,
  );
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

export async function loginWithGoogleApi(
  payload: GoogleAuthPayload,
): Promise<SocialAuthResponse> {
  const response = await apiClient.post<SocialAuthResponse>(
    '/auth/google',
    payload,
  );
  return response.data;
}

export async function loginWithFacebookApi(
  payload: FacebookAuthPayload,
): Promise<SocialAuthResponse> {
  const response = await apiClient.post<SocialAuthResponse>(
    '/auth/facebook',
    payload,
  );
  return response.data;
}

export async function linkGoogleApi(
  payload: GoogleAuthPayload,
): Promise<LinkProviderResponse> {
  const response = await apiClient.post<LinkProviderResponse>(
    '/auth/link/google',
    payload,
  );
  return response.data;
}

export async function linkFacebookApi(
  payload: FacebookAuthPayload,
): Promise<LinkProviderResponse> {
  const response = await apiClient.post<LinkProviderResponse>(
    '/auth/link/facebook',
    payload,
  );
  return response.data;
}

export async function unlinkProviderApi(
  provider: 'google' | 'facebook',
): Promise<LinkProviderResponse> {
  const response = await apiClient.delete<LinkProviderResponse>(
    `/auth/unlink/${provider}`,
  );
  return response.data;
}
