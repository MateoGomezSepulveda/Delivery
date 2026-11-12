import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, KeyRound, Mail, Send } from 'lucide-react';
import { forgotPasswordApi } from '@/api/endpoints/auth.api';
import { extractErrorMessage } from '@/api/axios.client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    setError(undefined);
    setIsSubmitting(true);

    try {
      const response = await forgotPasswordApi({ email: email.trim() });
      setSubmittedMessage(
        response.message ||
          'Si el correo está registrado, se ha generado un token de recuperación válido por 15 minutos.',
      );
      if (response.devToken) {
        setDevResetToken(response.devToken);
      }
      toast.success('Solicitud de recuperación procesada');
    } catch (err) {
      toast.error('Error al solicitar recuperación', {
        description: extractErrorMessage(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-card space-y-6">
      <div className="space-y-2">
        <div className="h-11 w-11 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
          <KeyRound className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Recuperar Contraseña
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ingresa tu correo electrónico y generaremos un token temporal de un
          solo uso (expira en 15 minutos).
        </p>
      </div>

      {submittedMessage ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 flex items-start gap-3 text-sm text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Solicitud enviada</p>
              <p className="text-xs mt-1">{submittedMessage}</p>
            </div>
          </div>

          {devResetToken && (
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 p-4 space-y-3">
              <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
                Token de Desarrollo recibido desde NestJS (devToken):
              </p>
              <code className="block rounded-xl bg-slate-950 text-emerald-400 p-2.5 text-[11px] font-mono break-all">
                {devResetToken}
              </code>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() =>
                  navigate(`/reset-password?token=${devResetToken}`)
                }
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Restablecer Contraseña con este Token Ahora
              </Button>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link
              to="/reset-password"
              className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
            >
              Ya tengo un token, ir al formulario de cambio →
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Correo Electrónico de tu Cuenta"
            type="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            error={error}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full"
            leftIcon={<Send className="w-4 h-4" />}
          >
            Enviar Token de Recuperación
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
