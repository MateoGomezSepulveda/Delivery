import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { resetPasswordApi } from '@/api/endpoints/auth.api';
import { extractErrorMessage } from '@/api/axios.client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};
    if (!token.trim()) {
      nextErrors.token = 'El token de recuperación es obligatorio.';
    }
    if (!newPassword || newPassword.length < 6) {
      nextErrors.newPassword =
        'La nueva contraseña debe tener al menos 6 caracteres.';
    }
    if (confirmPassword !== newPassword) {
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
      await resetPasswordApi({
        token: token.trim(),
        newPassword,
      });

      toast.success('¡Contraseña actualizada con éxito!', {
        description: 'Ya puedes iniciar sesión con tu nueva contraseña.',
      });

      navigate('/login', { replace: true });
    } catch (error) {
      toast.error('No se pudo restablecer la contraseña', {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-card space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Nueva Contraseña
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ingresa el token recibido y define tu nueva contraseña segura.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Token de Recuperación"
          placeholder="Pega aquí tu token hexadecimal..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          leftIcon={<KeyRound className="w-4 h-4" />}
          error={errors.token}
        />

        <Input
          label="Nueva Contraseña (mínimo 6 caracteres)"
          type="password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.newPassword}
        />

        <Input
          label="Confirmar Nueva Contraseña"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full"
          leftIcon={<CheckCircle2 className="w-4 h-4" />}
        >
          Guardar Nueva Contraseña
        </Button>
      </form>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-5 text-center text-sm text-slate-600 dark:text-slate-400">
        <Link
          to="/login"
          className="font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 cursor-pointer"
        >
          ← Volver a Iniciar Sesión
        </Link>
      </div>
    </div>
  );
}
