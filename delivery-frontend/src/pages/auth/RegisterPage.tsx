import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Lock, Mail, User as UserIcon, UserPlus } from 'lucide-react';
import { loginApi, registerApi } from '@/api/endpoints/auth.api';
import { extractErrorMessage, setStoredTokens } from '@/api/axios.client';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
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
      // 1. Crear usuario en POST /api/v1/auth/register (siempre asigna rol CLIENT)
      const createdUser = await registerApi({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // 2. Iniciar sesión automáticamente en POST /api/v1/auth/login
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
        toast.error('Demasiados registros desde esta IP (429)', {
          description:
            'El límite de seguridad es de 3 registros por minuto. Espera un momento.',
        });
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
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-card space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Crear Cuenta
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Regístrate para hacer pedidos y seguir tus entregas en tiempo real.
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
          label="Contraseña (mínimo 6 caracteres)"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password}
          autoComplete="new-password"
        />

        <Input
          label="Confirmar Contraseña"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

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
