/**
 * Contrato estándar del TransformInterceptor del Backend NestJS:
 * { success: true, data: T, timestamp: string }
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Contrato estándar de paginación retornado por paginate() del Backend
 */
export interface PaginationMeta {
  total: number;
  page: number;
  lastPage: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Contrato estándar de errores del HttpExceptionFilter del Backend
 */
export interface ApiErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  message: string | string[];
  error?: string;
}

export type UserRole = 'CLIENT' | 'DELIVERY' | 'ADMIN';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

/**
 * Respuesta de @nestjs/terminus en GET /api/v1/health
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, { status: string; [key: string]: unknown }>;
  error?: Record<string, { status: string; [key: string]: unknown }>;
  details?: Record<string, { status: string; [key: string]: unknown }>;
}
