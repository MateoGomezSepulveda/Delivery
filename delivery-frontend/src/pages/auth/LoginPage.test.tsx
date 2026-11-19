import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import { LoginPage } from '@/pages/auth/LoginPage';
import { useAuthStore } from '@/store/useAuthStore';

const mockLoginApi = vi.fn();
const mockResendVerificationApi = vi.fn();
const mockGetUserByIdApi = vi.fn();
const mockNavigate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastInfo = vi.fn();
const mockToastWarning = vi.fn();

vi.mock('@/api/endpoints/auth.api', () => ({
  loginApi: (...args: unknown[]) => mockLoginApi(...args),
  resendVerificationApi: (...args: unknown[]) =>
    mockResendVerificationApi(...args),
  loginWithGoogleApi: vi.fn(),
  loginWithFacebookApi: vi.fn(),
  logoutApi: vi.fn(),
}));

vi.mock('@/api/endpoints/users.api', () => ({
  getUserByIdApi: (...args: unknown[]) => mockGetUserByIdApi(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function buildToken(sub: string, role: 'CLIENT' | 'ADMIN' | 'DELIVERY'): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub,
      email: 'test@delivery.com',
      role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  return `${header}.${payload}.signature`;
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrating: false,
    });
    vi.clearAllMocks();
  });

  it('validates required email and password length before submitting', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LoginPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /entrar a mi cuenta/i }));
    expect(
      screen.getByText('El correo electrónico es obligatorio.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('La contraseña es obligatoria.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Correo Electrónico'), 'mateo@test.com');
    await user.type(screen.getByLabelText('Contraseña'), '123');
    await user.click(screen.getByRole('button', { name: /entrar a mi cuenta/i }));

    expect(
      screen.getByText('La contraseña debe tener al menos 6 caracteres.'),
    ).toBeInTheDocument();
    expect(mockLoginApi).not.toHaveBeenCalled();
  });

  it('fills demo admin credentials and navigates to /admin on successful login', async () => {
    const user = userEvent.setup();
    const adminToken = buildToken('admin-1', 'ADMIN');
    mockLoginApi.mockResolvedValue({
      access_token: adminToken,
      refresh_token: 'refresh-admin',
    });
    mockGetUserByIdApi.mockResolvedValue({
      _id: 'admin-1',
      name: 'Super Admin',
      email: 'admin@delivery.com',
      role: 'ADMIN',
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LoginPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /usar admin/i }));
    expect(screen.getByLabelText('Correo Electrónico')).toHaveValue(
      'admin@delivery.com',
    );
    expect(screen.getByLabelText('Contraseña')).toHaveValue('Admin123456');

    await user.click(screen.getByRole('button', { name: /entrar a mi cuenta/i }));

    await waitFor(() => {
      expect(mockLoginApi).toHaveBeenCalledWith({
        email: 'admin@delivery.com',
        password: 'Admin123456',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.role).toBe('ADMIN');
  });

  it('shows email verification alert and redirects to /verify-email when backend returns EMAIL_NOT_VERIFIED', async () => {
    const user = userEvent.setup();
    const unverifiedError = new AxiosError(
      'Request failed with status code 403',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {
          success: false,
          statusCode: 403,
          error: {
            statusCode: 403,
            code: 'EMAIL_NOT_VERIFIED',
            email: 'pendiente@correo.com',
            message: 'Debes verificar tu correo electrónico antes de iniciar sesión.',
          },
        },
      },
    );
    mockLoginApi.mockRejectedValue(unverifiedError);
    mockResendVerificationApi.mockResolvedValue({
      message: 'Código reenviado',
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText('Correo Electrónico'),
      'pendiente@correo.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'Secret123');
    await user.click(screen.getByRole('button', { name: /entrar a mi cuenta/i }));

    expect(
      await screen.findByText('Tu correo aún no está verificado'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /verificar mi correo ahora/i }),
    );

    await waitFor(() => {
      expect(mockResendVerificationApi).toHaveBeenCalledWith({
        email: 'pendiente@correo.com',
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        '/verify-email?email=pendiente%40correo.com',
        {
          state: {
            email: 'pendiente@correo.com',
            justRegistered: true,
          },
        },
      );
    });
  });
});
