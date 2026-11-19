import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

const mockForgotPasswordApi = vi.fn();
const mockResetPasswordApi = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/api/endpoints/auth.api', () => ({
  forgotPasswordApi: (...args: unknown[]) => mockForgotPasswordApi(...args),
  resetPasswordApi: (...args: unknown[]) => mockResetPasswordApi(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('Password Recovery Real Flow (ForgotPasswordPage & ResetPasswordPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends password recovery email without rendering any devToken box', async () => {
    const user = userEvent.setup();
    mockForgotPasswordApi.mockResolvedValue({
      message:
        'Si el correo está registrado, enviamos un enlace para restablecer tu contraseña.',
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByPlaceholderText('ejemplo@correo.com'),
      'cliente@correo.com',
    );
    await user.click(
      screen.getByRole('button', { name: /enviar enlace de recuperación/i }),
    );

    await waitFor(() => {
      expect(mockForgotPasswordApi).toHaveBeenCalledWith({
        email: 'cliente@correo.com',
      });
    });

    expect(
      screen.getByText(/revisa tu correo electrónico/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/devToken/i)).not.toBeInTheDocument();
  });

  it('shows missing-link alert when opening /reset-password without ?token', () => {
    render(
      <MemoryRouter
        initialEntries={['/reset-password']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      /enlace de recuperación incompleto/i,
    );
    expect(
      screen.getByRole('button', {
        name: /solicitar nuevo enlace de recuperación/i,
      }),
    ).toBeInTheDocument();
  });

  it('resets password cleanly using ?token=... from email link without showing raw token input', async () => {
    const user = userEvent.setup();
    mockResetPasswordApi.mockResolvedValue({
      message: 'Password reset successfully',
    });

    render(
      <MemoryRouter
        initialEntries={['/reset-password?token=hex-token-999']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>Login View</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/enlace seguro de recuperación verificado/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/token de recuperación/i),
    ).not.toBeInTheDocument();

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    await user.type(passwordInputs[0], 'NuevaClave123');
    await user.type(passwordInputs[1], 'NuevaClave123');
    await user.click(
      screen.getByRole('button', { name: /guardar nueva contraseña/i }),
    );

    await waitFor(() => {
      expect(mockResetPasswordApi).toHaveBeenCalledWith({
        token: 'hex-token-999',
        newPassword: 'NuevaClave123',
      });
    });

    expect(await screen.findByText('Login View')).toBeInTheDocument();
  });
});
