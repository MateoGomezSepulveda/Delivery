import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { useAuthStore } from '@/store/useAuthStore';

const mockVerifyEmailApi = vi.fn();
const mockResendVerificationApi = vi.fn();
const mockNavigate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastInfo = vi.fn();

vi.mock('@/api/endpoints/auth.api', () => ({
  verifyEmailApi: (...args: unknown[]) => mockVerifyEmailApi(...args),
  resendVerificationApi: (...args: unknown[]) =>
    mockResendVerificationApi(...args),
  logoutApi: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
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

describe('VerifyEmailPage', () => {
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

  it('verifies a 6-digit OTP code and activates the user session', async () => {
    const user = userEvent.setup();
    mockVerifyEmailApi.mockResolvedValue({
      message: '¡Correo electrónico verificado con éxito!',
      access_token: 'verified-access-token',
      refresh_token: 'verified-refresh-token',
      user: {
        _id: 'u-1',
        name: 'Laura Gómez',
        email: 'laura@correo.com',
        role: 'CLIENT',
        isEmailVerified: true,
      },
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/verify-email',
            search: '?email=laura%40correo.com',
            state: { email: 'laura@correo.com', justRegistered: false },
          },
        ]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    const firstBox = screen.getByLabelText('Dígito 1 de 6');
    await user.click(firstBox);
    await user.paste('482913');

    await user.click(
      screen.getByRole('button', { name: /verificar mi correo/i }),
    );

    await waitFor(() => {
      expect(mockVerifyEmailApi).toHaveBeenCalledWith({
        email: 'laura@correo.com',
        code: '482913',
      });
    });

    expect(await screen.findByText('¡Correo verificado!')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.isEmailVerified).toBe(true);
  });

  it('auto-verifies when arriving via email link with ?token=', async () => {
    mockVerifyEmailApi.mockResolvedValue({
      message: '¡Correo electrónico verificado con éxito!',
      access_token: 'link-access-token',
      refresh_token: 'link-refresh-token',
      user: {
        _id: 'u-2',
        name: 'Mateo Cliente',
        email: 'mateo@correo.com',
        role: 'CLIENT',
        isEmailVerified: true,
      },
    });

    render(
      <MemoryRouter
        initialEntries={['/verify-email?token=abc123validtoken']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockVerifyEmailApi).toHaveBeenCalledWith({
        token: 'abc123validtoken',
      });
    });

    expect(await screen.findByText('¡Correo verificado!')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('allows resending a new verification code', async () => {
    const user = userEvent.setup();
    mockResendVerificationApi.mockResolvedValue({
      message: 'Nuevo código enviado',
    });

    render(
      <MemoryRouter
        initialEntries={['/verify-email?email=laura%40correo.com']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: /reenviar código por correo/i }),
    );

    await waitFor(() => {
      expect(mockResendVerificationApi).toHaveBeenCalledWith({
        email: 'laura@correo.com',
        channel: 'email',
      });
    });

    expect(screen.getByText(/reenviar en 1:00/i)).toBeInTheDocument();
  });

  it('displays phone destination, fallback notice, and SMS resend button when channel is sms', async () => {
    const user = userEvent.setup();
    mockResendVerificationApi.mockResolvedValue({
      message: 'Nuevo código enviado por SMS',
      verificationChannel: 'sms',
      smsDelivered: true,
      fallbackEmailSent: false,
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/verify-email',
            search: '?email=laura%40correo.com',
            state: {
              email: 'laura@correo.com',
              phone: '+573001234567',
              channel: 'sms',
              fallbackEmailSent: true,
              justRegistered: false,
            },
          },
        ]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Verifica tu cuenta vía SMS')).toBeInTheDocument();
    expect(screen.getByText('+57 300 123 4567')).toBeInTheDocument();
    expect(screen.getByText(/respaldo por correo activado/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /enviar código por sms/i }),
    );

    await waitFor(() => {
      expect(mockResendVerificationApi).toHaveBeenCalledWith({
        email: 'laura@correo.com',
        channel: 'sms',
      });
    });
  });
});
