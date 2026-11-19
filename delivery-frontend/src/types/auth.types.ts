import type { UserRole } from '@/types/api.types';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isEmailVerified?: boolean;
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
}

export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
}

export interface ForgotPasswordResponse {
  message: string;
  devToken?: string;
}

export interface UploadFileResponse {
  success?: boolean;
  url: string;
}
