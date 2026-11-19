import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { useAuthStore } from '@/store/useAuthStore';

const mockRequestGoogleAccessToken = vi.fn();
const mockRequestFacebookAuthCode = vi.fn();
const mockLoginWithGoogleApi = vi.fn();
const mockLoginWithFacebookApi = vi.fn();
const mockNavigate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/utils/oauthPopups', () => ({
  requestGoogleAccessToken: (...args: unknown[]) =>
    mockRequestGoogleAccessToken(...args),
  requestFacebookAuthCode: (...args: unknown[]) =>
    mockRequestFacebookAuthCode(...args),
}));

vi.mock('@/api/endpoints/auth.api', () => ({
  loginWithGoogleApi: (...args: unknown[]) => mockLoginWithGoogleApi(...args),
  loginWithFacebookApi: (...args: unknown[]) =>
    mockLoginWithFacebookApi(...args),
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

describe('SocialAuthButtons', () => {
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

  it('completes Google OAuth popup login and activates the session', async () => {
    const user = userEvent.setup();
    mockRequestGoogleAccessToken.mockResolvedValue({
      accessToken: 'google-access-token-123',
    });
    mockLoginWithGoogleApi.mockResolvedValue({
      access_token: 'jwt-access-google',
      refresh_token: 'jwt-refresh-google',
      isNewUser: true,
      linkedExistingAccount: false,
      user: {
        _id: 'u-google-1',
        name: 'Mateo Google',
        email: 'mateo@gmail.com',
        role: 'CLIENT',
        googleId: 'g-123',
        authProviders: ['google'],
        isEmailVerified: true,
      },
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <SocialAuthButtons />
      </MemoryRouter>,
    );

    expect(screen.getByText('o continúa con')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /continuar con google/i }),
    );

    await waitFor(() => {
      expect(mockLoginWithGoogleApi).toHaveBeenCalledWith({
        accessToken: 'google-access-token-123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.googleId).toBe('g-123');
  });

  it('completes Facebook OAuth popup login and activates the session', async () => {
    const user = userEvent.setup();
    mockRequestFacebookAuthCode.mockResolvedValue({
      code: 'fb-auth-code-456',
      redirectUri: 'http://localhost:5173/auth/facebook/callback',
    });
    mockLoginWithFacebookApi.mockResolvedValue({
      access_token: 'jwt-access-fb',
      refresh_token: 'jwt-refresh-fb',
      isNewUser: false,
      linkedExistingAccount: true,
      user: {
        _id: 'u-fb-1',
        name: 'Laura Facebook',
        email: 'laura@fb.com',
        role: 'CLIENT',
        facebookId: 'fb-456',
        authProviders: ['local', 'facebook'],
        isEmailVerified: true,
      },
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <SocialAuthButtons />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: /continuar con facebook/i }),
    );

    await waitFor(() => {
      expect(mockLoginWithFacebookApi).toHaveBeenCalledWith({
        code: 'fb-auth-code-456',
        redirectUri: 'http://localhost:5173/auth/facebook/callback',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.facebookId).toBe('fb-456');
  });
});
