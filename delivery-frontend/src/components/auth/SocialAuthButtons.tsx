import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  loginWithFacebookApi,
  loginWithGoogleApi,
} from '@/api/endpoints/auth.api';
import { extractErrorMessage, setStoredTokens } from '@/api/axios.client';
import { useAuthStore } from '@/store/useAuthStore';
import {
  requestFacebookAuthCode,
  requestGoogleAccessToken,
} from '@/utils/oauthPopups';
import type { SocialAuthResponse } from '@/types/auth.types';
import { cn } from '@/utils/cn';

export function GoogleBrandIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export function FacebookBrandIcon({
  className = 'w-5 h-5',
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  );
}

interface SocialAuthButtonsProps {
  disabled?: boolean;
}

export function SocialAuthButtons({ disabled = false }: SocialAuthButtonsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuthStore();

  const [loadingProvider, setLoadingProvider] = useState<
    'google' | 'facebook' | null
  >(null);

  const finishSocialSession = (
    response: SocialAuthResponse,
    providerLabel: string,
  ) => {
    setStoredTokens({
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    });
    setSession(
      {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      },
      response.user,
    );

    if (response.isNewUser) {
      toast.success(`¡Bienvenido a DeliveryPro, ${response.user.name}!`, {
        description: `Tu cuenta fue creada y verificada automáticamente con ${providerLabel}.`,
      });
    } else if (response.linkedExistingAccount) {
      toast.success(`¡${providerLabel} vinculado a tu cuenta!`, {
        description: `Sesión iniciada como ${response.user.name}.`,
      });
    } else {
      toast.success(`¡Bienvenido de nuevo, ${response.user.name}!`, {
        description: `Sesión iniciada con ${providerLabel}.`,
      });
    }

    const fromPath = (location.state as { from?: { pathname?: string } })?.from
      ?.pathname;

    if (fromPath && fromPath !== '/login' && fromPath !== '/register') {
      navigate(fromPath, { replace: true });
    } else if (response.user.role === 'ADMIN') {
      navigate('/admin', { replace: true });
    } else if (response.user.role === 'DELIVERY') {
      navigate('/delivery', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleGoogleClick = async () => {
    setLoadingProvider('google');
    try {
      const { accessToken } = await requestGoogleAccessToken();
      const response = await loginWithGoogleApi({ accessToken });
      finishSocialSession(response, 'Google');
    } catch (error) {
      toast.error('No se pudo iniciar sesión con Google', {
        description: extractErrorMessage(error),
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleFacebookClick = async () => {
    setLoadingProvider('facebook');
    try {
      const { code, redirectUri } = await requestFacebookAuthCode();
      const response = await loginWithFacebookApi({ code, redirectUri });
      finishSocialSession(response, 'Facebook');
    } catch (error) {
      toast.error('No se pudo iniciar sesión con Facebook', {
        description: extractErrorMessage(error),
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const isBusy = disabled || loadingProvider !== null;

  return (
    <div className="space-y-4">
      <div className="relative flex items-center" role="separator">
        <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
        <span className="mx-3 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
          o continúa con
        </span>
        <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={isBusy}
          className={cn(
            'inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-sm',
            'hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-800 dark:hover:border-slate-600',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950',
            'transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:pointer-events-none',
          )}
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-300 shrink-0" />
          ) : (
            <GoogleBrandIcon className="w-4 h-4" />
          )}
          <span>Continuar con Google</span>
        </button>

        <button
          type="button"
          onClick={handleFacebookClick}
          disabled={isBusy}
          className={cn(
            'inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-sm',
            'hover:bg-blue-50/60 hover:border-blue-300 dark:hover:bg-slate-800 dark:hover:border-blue-700',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950',
            'transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:pointer-events-none',
          )}
        >
          {loadingProvider === 'facebook' ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
          ) : (
            <FacebookBrandIcon className="w-4 h-4" />
          )}
          <span>Continuar con Facebook</span>
        </button>
      </div>
    </div>
  );
}
