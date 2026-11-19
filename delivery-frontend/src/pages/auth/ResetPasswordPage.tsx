import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { resetPasswordApi } from '@/api/endpoints/auth.api';
import { extractErrorMessage } from '@/api/axios.client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = (searchParams.get('token') || '').trim();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};
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
    if (!token || !validate()) return;

    setIsSubmitting(true);
    try {
      await resetPasswordApi({
        token,
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
        <div className="h-11 w-11 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Crear Nueva Contraseña
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {token
            ? 'Define una nueva contraseña segura para volver a acceder a tu cuenta.'
            : 'Necesitas abrir el enlace seguro que enviamos a tu correo electrónico.'}
        </p>
      </div>

      {!token ? (
        <div className="space-y-4">
          <div
            role="alert"
            className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">
                Enlace de recuperación incompleto o vencido
              </p>
              <p>
                Abre el enlace directamente desde el correo electrónico de
                DeliveryPro o solicita uno nuevo a continuación.
              </p>
            </div>
          </div>

          <Link to="/forgot-password" className="block">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Solicitar Nuevo Enlace de Recuperación
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 px-4 py-3 flex items-center gap-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Enlace seguro de recuperación verificado</span>
          </div>

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
      )}

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
