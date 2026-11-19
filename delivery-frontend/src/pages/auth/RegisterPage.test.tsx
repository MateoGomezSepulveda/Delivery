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
  loginWithGoogleApi: vi.fn(),
  loginWithFacebookApi: vi.fn(),
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

  it('registers a user with mandatory phone and navigates to /verify-email without auto-login', async () => {
    const user = userEvent.setup();
    mockRegisterApi.mockResolvedValue({
      _id: 'u-new-1',
      name: 'Laura Gómez',
      email: 'laura@correo.com',
      phone: '+573001234567',
      role: 'CLIENT',
      isEmailVerified: false,
      requiresEmailVerification: true,
      verificationChannel: 'email',
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
    await user.type(screen.getByLabelText('Número de Celular'), '3001234567');
    await user.type(
      screen.getByLabelText('Contraseña'),
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
        phone: '3001234567',
        password: 'Secret123',
        verificationChannel: 'email',
      });
      expect(mockLoginApi).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        '/verify-email?email=laura%40correo.com',
        {
          replace: true,
          state: expect.objectContaining({
            email: 'laura@correo.com',
            phone: '+573001234567',
            name: 'Laura Gómez',
            channel: 'email',
            justRegistered: true,
          }),
        },
      );
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('validates mandatory phone and allows selecting SMS verification channel', async () => {
    const user = userEvent.setup();
    mockRegisterApi.mockResolvedValue({
      _id: 'u-new-sms',
      name: 'Carlos SMS',
      email: 'carlos@correo.com',
      phone: '+573009876543',
      role: 'CLIENT',
      isEmailVerified: false,
      requiresEmailVerification: true,
      verificationChannel: 'sms',
      smsDelivered: false,
      fallbackEmailSent: true,
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Nombre Completo'), 'Carlos SMS');
    await user.type(
      screen.getByLabelText('Correo Electrónico'),
      'carlos@correo.com',
    );
    await user.type(
      screen.getByLabelText('Contraseña'),
      'Secret123',
    );
    await user.type(
      screen.getByLabelText('Confirmar Contraseña'),
      'Secret123',
    );

    // Intento sin celular -> bloqueado en frontend
    await user.click(screen.getByRole('button', { name: /crear mi cuenta/i }));
    expect(
      await screen.findByText('El número de celular es obligatorio.'),
    ).toBeInTheDocument();
    expect(mockRegisterApi).not.toHaveBeenCalled();

    // Ingresar celular y elegir SMS al celular
    await user.type(screen.getByLabelText('Número de Celular'), '3009876543');
    await user.click(screen.getByRole('radio', { name: /sms al celular/i }));
    await user.click(screen.getByRole('button', { name: /crear mi cuenta/i }));

    await waitFor(() => {
      expect(mockRegisterApi).toHaveBeenCalledWith({
        name: 'Carlos SMS',
        email: 'carlos@correo.com',
        phone: '3009876543',
        password: 'Secret123',
        verificationChannel: 'sms',
      });
    });
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
    await user.type(screen.getByLabelText('Número de Celular'), '3001234567');
    await user.type(
      screen.getByLabelText('Contraseña'),
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
