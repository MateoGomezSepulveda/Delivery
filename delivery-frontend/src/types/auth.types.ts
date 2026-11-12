import type { UserRole } from '@/types/api.types';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
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
