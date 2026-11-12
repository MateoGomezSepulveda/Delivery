import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  AlertTriangle,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Sparkles,
} from 'lucide-react';
import { loginApi } from '@/api/endpoints/auth.api';
import { getUserByIdApi } from '@/api/endpoints/users.api';
import { extractErrorMessage, setStoredTokens } from '@/api/axios.client';
import { useAuthStore } from '@/store/useAuthStore';
import { decodeJwtPayload } from '@/utils/jwt';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      nextErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Ingresa un formato de correo electrónico válido.';
    }

    if (!password) {
      nextErrors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 6) {
      nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFillAdminSeed = () => {
    setEmail('admin@delivery.com');
    setPassword('Admin123456');
    setErrors({});
    setRateLimitWarning(null);
    toast.info('Credenciales de Admin cargadas', {
      description: 'Tomadas del seed configurado en delivery-backend/.env',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateLimitWarning(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const tokens = await loginApi({
        email: email.trim(),
        password,
      });

      // Guardamos tokens inmediatamente para que GET /users/:id lleve el Bearer token
      setStoredTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });

      const payload = decodeJwtPayload(tokens.access_token);
      if (!payload?.sub) {
        throw new Error('El token JWT recibido no contiene un identificador de usuario válido.');
      }

      const userProfile = await getUserByIdApi(payload.sub);
      setSession(tokens, userProfile);

      toast.success(`¡Bienvenido de nuevo, ${userProfile.name}!`, {
        description: `Sesión iniciada con rol ${userProfile.role}`,
      });

      const fromPath = (location.state as { from?: { pathname?: string } })
        ?.from?.pathname;

      if (fromPath && fromPath !== '/login') {
        navigate(fromPath, { replace: true });
      } else if (userProfile.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (userProfile.role === 'DELIVERY') {
        navigate('/delivery', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const msg =
          'Demasiados intentos de inicio de sesión (Rate Limit: máx 5 por minuto). Espera 60 segundos antes de volver a intentar.';
        setRateLimitWarning(msg);
        toast.error('Límite de intentos alcanzado (429)', {
          description: msg,
        });
      } else {
        toast.error('Error al iniciar sesión', {
          description: extractErrorMessage(error),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-card space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Iniciar Sesión
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ingresa tus credenciales para acceder a tu cuenta en DeliveryPro.
        </p>
      </div>

      {/* Quick Fill Helper for Dev Testing */}
      <div className="rounded-2xl border border-orange-200/80 dark:border-orange-900/50 bg-orange-50/70 dark:bg-orange-950/30 p-3.5 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <span className="font-bold block text-orange-700 dark:text-orange-300">
            Modo Desarrollo
          </span>
          Autocompletar cuenta Admin por defecto
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFillAdminSeed}
          leftIcon={<Sparkles className="w-3.5 h-3.5 text-orange-600" />}
        >
          Usar Admin
        </Button>
      </div>

      {rateLimitWarning && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-4 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">Protección Anti-Fuerza Bruta Activada</p>
            <p className="mt-0.5">{rateLimitWarning}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Correo Electrónico"
          type="email"
          placeholder="ejemplo@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email}
          autoComplete="email"
        />

        <div className="space-y-1">
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password}
            autoComplete="current-password"
          />
          <div className="flex justify-end pt-1">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 inline-flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>¿Olvidaste tu contraseña?</span>
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full"
          leftIcon={<LogIn className="w-4 h-4" />}
        >
          Entrar a mi Cuenta
        </Button>
      </form>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-5 text-center text-sm text-slate-600 dark:text-slate-400">
        ¿Aún no tienes una cuenta?{' '}
        <Link
          to="/register"
          className="font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 cursor-pointer"
        >
          Regístrate gratis aquí
        </Link>
      </div>
    </div>
  );
}
