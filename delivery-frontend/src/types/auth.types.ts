import type { UserRole } from '@/types/api.types';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isEmailVerified?: boolean;
  googleId?: string;
  facebookId?: string;
  authProviders?: string[];
  riderRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  vehicleType?: string;
  plate?: string;
  fcmTokens?: string[];
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterResponse extends User {
  requiresEmailVerification?: boolean;
  message?: string;
}

export interface VerifyEmailPayload {
  email?: string;
  code?: string;
  token?: string;
}

export interface VerifyEmailResponse {
  message: string;
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
  alreadyVerified?: boolean;
}

export interface GoogleAuthPayload {
  idToken?: string;
  accessToken?: string;
}

export interface FacebookAuthPayload {
  accessToken?: string;
  code?: string;
  redirectUri?: string;
}

export interface SocialAuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  isNewUser: boolean;
  linkedExistingAccount: boolean;
}

export interface LinkProviderResponse {
  message: string;
  user: User;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

/**
 * UpdateUserDto extiende PartialType(CreateUserDto) en el backend:
 * permite actualizar name, email y password.
 */
export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  avatarUrl?: string | null;
}

export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface UploadFileResponse {
  success?: boolean;
  url: string;
}
