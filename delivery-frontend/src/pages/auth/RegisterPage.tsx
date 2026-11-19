import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Lock,
  Mail,
  MessageSquare,
  Phone,
  User as UserIcon,
  UserPlus,
} from 'lucide-react';
import { loginApi, registerApi } from '@/api/endpoints/auth.api';
import { extractErrorMessage, setStoredTokens } from '@/api/axios.client';
import { useAuthStore } from '@/store/useAuthStore';
import type { VerificationChannel } from '@/types/auth.types';
import { validatePhoneNumber } from '@/utils/phone';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationChannel, setVerificationChannel] =
    useState<VerificationChannel>('email');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) {
      nextErrors.name = 'Ingresa tu nombre completo (mínimo 2 caracteres).';
    }
    if (!email.trim()) {
      nextErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }
    const phoneErr = validatePhoneNumber(phone);
    if (phoneErr) {
      nextErrors.phone = phoneErr;
    }
    if (!password || password.length < 6) {
      nextErrors.password = 'La contraseña debe tener mínimo 6 caracteres.';
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const createdUser = await registerApi({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        verificationChannel,
      });

      // Flujo estándar con verificación de cuenta (Correo Gmail o SMS)
      if (
        createdUser.requiresEmailVerification !== false &&
        !createdUser.isEmailVerified
      ) {
        const channel = createdUser.verificationChannel ?? verificationChannel;
        toast.success(
          channel === 'sms'
            ? createdUser.smsDelivered
              ? '¡Cuenta creada! Revisa tu SMS'
              : '¡Cuenta creada! Revisa tu código de respaldo en Gmail'
            : '¡Cuenta creada! Revisa tu correo electrónico',
          {
            description:
              channel === 'sms'
                ? 'Ingresa el código de 6 dígitos para activar tu cuenta.'
                : 'Te enviamos un código de 6 dígitos y un enlace para activar tu cuenta.',
          },
        );

        navigate(
          `/verify-email?email=${encodeURIComponent(createdUser.email)}`,
          {
            replace: true,
            state: {
              email: createdUser.email,
              phone: createdUser.phone || phone.trim(),
              name: createdUser.name,
              channel,
              smsDelivered: createdUser.smsDelivered,
              fallbackEmailSent: createdUser.fallbackEmailSent,
              justRegistered: true,
            },
          },
        );
        return;
      }

      // Fallback si la cuenta ya vino verificada
      const tokens = await loginApi({
        email: email.trim(),
        password,
      });

      setStoredTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });

      setSession(tokens, createdUser);

      toast.success(`¡Cuenta creada con éxito, ${createdUser.name}!`, {
        description: 'Tu sesión se ha iniciado automáticamente.',
      });

      navigate('/', { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        toast.error('Demasiados intentos de registro', {
          description:
            'Por seguridad solo se permiten 3 registros por minuto. Espera un momento.',
        });
      } else if (axios.isAxiosError(error) && error.response?.status === 409) {
        const msg = extractErrorMessage(error);
        setErrors((prev) => ({ ...prev, email: msg }));
        toast.error('Correo ya registrado', { description: msg });
      } else {
        toast.error('No se pudo completar el registro', {
          description: extractErrorMessage(error),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-8 shadow-card space-y-6">
      {/* 2-Step Funnel Progress Indicator */}
      <nav aria-label="Progreso de registro" className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            1
          </span>
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
            Tus datos
          </span>
        </div>

        <div className="flex-1 h-0.5 rounded-full bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold shrink-0">
            2
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Verificar cuenta
          </span>
        </div>
      </nav>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Crear Cuenta
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Regístrate con tu celular y correo para hacer pedidos y recibir códigos
          de confirmación por Gmail o SMS.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Nombre Completo"
          placeholder="Ej. Mateo Gómez"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<UserIcon className="w-4 h-4" />}
          error={errors.name}
          autoComplete="name"
        />

        <Input
          label="Correo Electrónico"
          type="email"
          placeholder="mateo@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email}
          autoComplete="email"
        />

        <Input
          label="Número de Celular"
          type="tel"
          placeholder="Ej. 300 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          leftIcon={<Phone className="w-4 h-4" />}
          error={errors.phone}
          autoComplete="tel"
        />

        <Input
          label="Contraseña"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          helperText="Usa al menos 6 caracteres para proteger tu cuenta."
          error={errors.password}
          autoComplete="new-password"
        />

        <Input
          label="Confirmar Contraseña"
          type="password"
          placeholder="Repite tu contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <fieldset className="space-y-2 pt-1">
          <legend className="text-xs font-bold text-slate-700 dark:text-slate-200">
            ¿Dónde quieres recibir tu código de verificación?
          </legend>
          <div
            role="radiogroup"
            aria-label="Canal de verificación"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            <button
              type="button"
              role="radio"
              aria-checked={verificationChannel === 'email'}
              onClick={() => setVerificationChannel('email')}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors duration-200 cursor-pointer flex items-start gap-2.5',
                verificationChannel === 'email'
                  ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 ring-2 ring-orange-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-orange-300',
              )}
            >
              <Mail
                className={cn(
                  'w-4 h-4 shrink-0 mt-0.5',
                  verificationChannel === 'email'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-slate-400',
                )}
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Correo (Gmail)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Código de 6 dígitos y enlace
                </span>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={verificationChannel === 'sms'}
              onClick={() => setVerificationChannel('sms')}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors duration-200 cursor-pointer flex items-start gap-2.5',
                verificationChannel === 'sms'
                  ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 ring-2 ring-orange-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-orange-300',
              )}
            >
              <MessageSquare
                className={cn(
                  'w-4 h-4 shrink-0 mt-0.5',
                  verificationChannel === 'sms'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-slate-400',
                )}
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  SMS al celular
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Código de 6 dígitos a tu móvil
                </span>
              </div>
            </button>
          </div>
        </fieldset>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full"
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Crear mi Cuenta
        </Button>
      </form>

      <SocialAuthButtons disabled={isSubmitting} />

      <div className="border-t border-slate-100 dark:border-slate-800 pt-5 text-center text-sm text-slate-600 dark:text-slate-400">
        ¿Ya tienes una cuenta?{' '}
        <Link
          to="/login"
          className="font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 cursor-pointer"
        >
          Inicia sesión aquí
        </Link>
      </div>
    </div>
  );
}
