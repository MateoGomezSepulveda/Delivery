import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { useAuthStore } from '@/store/useAuthStore';

const mockRegisterApi = vi.fn();
const mockLoginApi = vi.fn();
const mockNavigate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/api/endpoints/auth.api', () => ({
  registerApi: (...args: unknown[]) => mockRegisterApi(...args),
  loginApi: (...args: unknown[]) => mockLoginApi(...args),
  logoutApi: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
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

describe('RegisterPage', () => {
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

  it('registers a user and navigates to /verify-email without auto-login when verification is required', async () => {
    const user = userEvent.setup();
    mockRegisterApi.mockResolvedValue({
      _id: 'u-new-1',
      name: 'Laura Gómez',
      email: 'laura@correo.com',
      role: 'CLIENT',
      isEmailVerified: false,
      requiresEmailVerification: true,
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Nombre Completo'), 'Laura Gómez');
    await user.type(
      screen.getByLabelText('Correo Electrónico'),
      'laura@correo.com',
    );
    await user.type(
      screen.getByLabelText('Contraseña (mínimo 6 caracteres)'),
      'Secret123',
    );
    await user.type(
      screen.getByLabelText('Confirmar Contraseña'),
      'Secret123',
    );

    await user.click(screen.getByRole('button', { name: /crear mi cuenta/i }));

    await waitFor(() => {
      expect(mockRegisterApi).toHaveBeenCalledWith({
        name: 'Laura Gómez',
        email: 'laura@correo.com',
        password: 'Secret123',
      });
      expect(mockLoginApi).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        '/verify-email?email=laura%40correo.com',
        {
          replace: true,
          state: {
            email: 'laura@correo.com',
            name: 'Laura Gómez',
            justRegistered: true,
          },
        },
      );
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('shows inline email error when server responds with 409 Conflict', async () => {
    const user = userEvent.setup();
    const conflictError = new AxiosError(
      'Request failed with status code 409',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {
          success: false,
          statusCode: 409,
          error: {
            statusCode: 409,
            message: 'Ya existe una cuenta registrada con este correo electrónico.',
          },
        },
      },
    );
    mockRegisterApi.mockRejectedValue(conflictError);

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Nombre Completo'), 'Laura Gómez');
    await user.type(
      screen.getByLabelText('Correo Electrónico'),
      'laura@correo.com',
    );
    await user.type(
      screen.getByLabelText('Contraseña (mínimo 6 caracteres)'),
      'Secret123',
    );
    await user.type(
      screen.getByLabelText('Confirmar Contraseña'),
      'Secret123',
    );

    await user.click(screen.getByRole('button', { name: /crear mi cuenta/i }));

    expect(
      await screen.findByText(
        'Ya existe una cuenta registrada con este correo electrónico.',
      ),
    ).toBeInTheDocument();
  });
});
