import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  resendVerificationApi,
  verifyEmailApi,
} from '@/api/endpoints/auth.api';
import { extractErrorMessage, setStoredTokens } from '@/api/axios.client';
import { useAuthStore } from '@/store/useAuthStore';
import type { User } from '@/types/auth.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

interface VerifyEmailLocationState {
  email?: string;
  name?: string;
  justRegistered?: boolean;
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setSession } = useAuthStore();

  const locationState = (location.state ?? {}) as VerifyEmailLocationState;
  const tokenFromUrl = searchParams.get('token')?.trim() || '';
  const emailFromUrl = searchParams.get('email')?.trim() || '';

  const initialEmail = locationState.email || emailFromUrl || '';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [emailError, setEmailError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | null>(null);

  const [isVerifying, setIsVerifying] = useState(Boolean(tokenFromUrl));
  const [isResending, setIsResending] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [cooldown, setCooldown] = useState<number>(
    locationState.justRegistered ? RESEND_COOLDOWN_SECONDS : 0,
  );

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const tokenAttemptedRef = useRef<string | null>(null);

  const navigateByRole = useCallback(
    (user: User) => {
      if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'DELIVERY') {
        navigate('/delivery', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    },
    [navigate],
  );

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Automatic link verification when ?token= is present in URL
  useEffect(() => {
    if (!tokenFromUrl || tokenAttemptedRef.current === tokenFromUrl) return;
    tokenAttemptedRef.current = tokenFromUrl;

    let isCancelled = false;
    setIsVerifying(true);
    setTokenError(null);

    verifyEmailApi({ token: tokenFromUrl })
      .then((res) => {
        if (isCancelled) return;
        setStoredTokens({
          accessToken: res.access_token,
          refreshToken: res.refresh_token,
        });
        setSession(
          { access_token: res.access_token, refresh_token: res.refresh_token },
          res.user,
        );
        setVerifiedUser(res.user);
        toast.success('¡Correo verificado con éxito!', {
          description: `Bienvenido a DeliveryPro, ${res.user.name}.`,
        });
      })
      .catch((err) => {
        if (isCancelled) return;
        const msg = extractErrorMessage(err);
        setTokenError(msg);
        toast.error('No se pudo verificar el enlace', { description: msg });
      })
      .finally(() => {
        if (!isCancelled) {
          setIsVerifying(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [tokenFromUrl, setSession]);

  // Focus first OTP box when mounted in manual code entry mode
  useEffect(() => {
    if (!tokenFromUrl && !verifiedUser && !isEditingEmail) {
      inputRefs.current[0]?.focus();
    }
  }, [tokenFromUrl, verifiedUser, isEditingEmail]);

  const codeValue = digits.join('');

  const handleDigitChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replace(/\D/g, '');
    setCodeError(null);

    if (!cleaned) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    // Handle multi-digit paste or autofill inside a single box
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, CODE_LENGTH).split('');
      setDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < CODE_LENGTH; i++) {
          next[i] = pasted[i] ?? '';
        }
        return next;
      });
      const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });

    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
      }
      setCodeError(null);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const numeric = pastedText.replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!numeric) return;

    e.preventDefault();
    const chars = numeric.split('');
    setDigits(() =>
      Array.from({ length: CODE_LENGTH }, (_, i) => chars[i] ?? ''),
    );
    setCodeError(null);
    const focusIndex = Math.min(chars.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(undefined);
    setCodeError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Ingresa un correo electrónico válido.');
      setIsEditingEmail(true);
      return;
    }

    if (codeValue.length !== CODE_LENGTH) {
      setCodeError('Ingresa los 6 dígitos del código enviado a tu correo.');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await verifyEmailApi({
        email: trimmedEmail,
        code: codeValue,
      });

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
      setVerifiedUser(response.user);

      toast.success('¡Correo verificado con éxito!', {
        description: `Tu cuenta ya está activa, ${response.user.name}.`,
      });
    } catch (err) {
      const msg = extractErrorMessage(err);
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        const rateMsg =
          'Has realizado demasiados intentos. Espera un minuto antes de intentar de nuevo.';
        setCodeError(rateMsg);
        toast.error('Límite de intentos alcanzado', { description: rateMsg });
      } else {
        setCodeError(msg);
        toast.error('No se pudo verificar tu correo', { description: msg });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Ingresa tu correo electrónico para reenviar el código.');
      setIsEditingEmail(true);
      return;
    }

    setEmailError(undefined);
    setCodeError(null);
    setTokenError(null);
    setIsResending(true);

    try {
      const res = await resendVerificationApi({ email: trimmedEmail });

      if (res.alreadyVerified) {
        toast.info('Tu correo ya está verificado', {
          description: 'Puedes iniciar sesión con tu cuenta ahora mismo.',
        });
        navigate('/login', { replace: true });
        return;
      }

      setDigits(Array(CODE_LENGTH).fill(''));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setIsEditingEmail(false);

      toast.success('Nuevo código enviado', {
        description: 'Revisa tu bandeja de entrada o carpeta de spam.',
      });
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        toast.error('Espera un momento antes de reenviar', {
          description:
            'Por seguridad puedes solicitar hasta 3 códigos por minuto.',
        });
      } else {
        toast.error('No se pudo reenviar el correo', {
          description: extractErrorMessage(err),
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-8 shadow-card space-y-6">
      {/* 2-Step Funnel Progress Indicator */}
      <nav aria-label="Progreso de registro" className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
            <Check className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Cuenta creada
          </span>
        </div>

        <div
          className={cn(
            'flex-1 h-0.5 rounded-full transition-colors duration-300',
            verifiedUser
              ? 'bg-emerald-500'
              : 'bg-orange-200 dark:bg-orange-900/60',
          )}
        />

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-300',
              verifiedUser
                ? 'bg-emerald-600 text-white'
                : 'bg-orange-600 text-white',
            )}
          >
            {verifiedUser ? <Check className="w-3.5 h-3.5" /> : '2'}
          </span>
          <span
            className={cn(
              'text-xs font-bold transition-colors duration-300',
              verifiedUser
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-orange-600 dark:text-orange-400',
            )}
          >
            Verificar correo
          </span>
        </div>
      </nav>

      {/* State 1: Verified Successfully */}
      {verifiedUser ? (
        <div className="space-y-6 py-2 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <MailCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              ¡Correo verificado!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tu cuenta de{' '}
              <strong className="text-slate-900 dark:text-white">
                {verifiedUser.email}
              </strong>{' '}
              ya está confirmada y tu sesión está activa.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 flex items-center gap-3 text-left text-xs text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Ya puedes agregar productos al carrito, guardar tus direcciones y
              seguir tus pedidos en tiempo real.
            </span>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => navigateByRole(verifiedUser)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Empezar a pedir ahora
          </Button>
        </div>
      ) : tokenFromUrl && isVerifying ? (
        /* State 2: Auto-verifying link token */
        <div className="py-10 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Verificando tu correo...
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Estamos confirmando tu enlace de verificación. Solo tomará un
              instante.
            </p>
          </div>
        </div>
      ) : (
        /* State 3: 6-digit OTP Entry (or expired token recovery) */
        <>
          <div className="space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
              <MailCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Verifica tu correo electrónico
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {tokenError
                ? 'El enlace no pudo verificarse. Puedes ingresar el código de 6 dígitos o solicitar uno nuevo.'
                : 'Enviamos un código de 6 dígitos y un enlace de confirmación válido por 15 minutos.'}
            </p>
          </div>

          {tokenError && (
            <div
              role="alert"
              className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/90 dark:bg-amber-950/40 p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Enlace inválido o expirado</p>
                <p>{tokenError}</p>
              </div>
            </div>
          )}

          {/* Target Email Pill or Input */}
          {!isEditingEmail && email ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Enviado a
                  </span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">
                    {email}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingEmail(true)}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 shrink-0 cursor-pointer transition-colors duration-200"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="mateo@correo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(undefined);
              }}
              leftIcon={<Mail className="w-4 h-4" />}
              error={emailError}
              autoComplete="email"
            />
          )}

          {/* 6-Digit OTP Verification Form */}
          <form onSubmit={handleVerifySubmit} className="space-y-5" noValidate>
            <fieldset className="space-y-2.5">
              <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Código de verificación (6 dígitos)
              </legend>

              <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={CODE_LENGTH}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Dígito ${index + 1} de ${CODE_LENGTH}`}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    onPaste={handleDigitPaste}
                    disabled={isVerifying}
                    className={cn(
                      'h-12 sm:h-14 w-full rounded-xl border-2 bg-white dark:bg-slate-950 text-center font-heading text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white',
                      'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500',
                      'disabled:opacity-60',
                      codeError
                        ? 'border-red-400 dark:border-red-500'
                        : digit
                          ? 'border-orange-500/80 dark:border-orange-400/80 bg-orange-50/30 dark:bg-orange-950/20'
                          : 'border-slate-200 dark:border-slate-700',
                    )}
                  />
                ))}
              </div>

              {codeError && (
                <p
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{codeError}</span>
                </p>
              )}
            </fieldset>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isVerifying}
              disabled={codeValue.length !== CODE_LENGTH || !email.trim()}
              className="w-full"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Verificar mi correo
            </Button>
          </form>

          {/* Resend Code Section */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                ¿No recibiste el correo?
              </span>
              Revisa tu carpeta de spam o solicita un código nuevo.
            </div>

            {cooldown > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>Reenviar en {formatCountdown(cooldown)}</span>
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                isLoading={isResending}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="shrink-0"
              >
                Reenviar código
              </Button>
            )}
          </div>
        </>
      )}

      <div className="border-t border-slate-100 dark:border-slate-800 pt-5 text-center text-sm text-slate-600 dark:text-slate-400">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 cursor-pointer transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Iniciar Sesión</span>
        </Link>
      </div>
    </div>
  );
}
