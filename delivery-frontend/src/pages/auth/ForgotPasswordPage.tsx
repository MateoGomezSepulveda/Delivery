import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react';
import { forgotPasswordApi } from '@/api/endpoints/auth.api';
import { extractErrorMessage } from '@/api/axios.client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const sendRecoveryEmail = async (targetEmail: string) => {
    setIsSubmitting(true);
    try {
      const response = await forgotPasswordApi({ email: targetEmail });
      setSubmittedEmail(targetEmail);
      setSubmittedMessage(
        response.message ||
          'Si el correo está registrado, enviamos un enlace seguro para restablecer tu contraseña (válido por 15 minutos).',
      );
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      toast.success('Correo de recuperación enviado', {
        description: `Revisa tu bandeja de entrada o spam en ${targetEmail}.`,
      });
    } catch (err) {
      toast.error('No se pudo procesar la solicitud', {
        description: extractErrorMessage(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    setError(undefined);
    await sendRecoveryEmail(normalized);
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
          Ingresa tu correo electrónico y te enviaremos un enlace seguro para
          crear una nueva contraseña (válido por 15 minutos).
        </p>
      </div>

      {submittedMessage ? (
        <div className="space-y-5">
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 flex items-start gap-3 text-sm text-emerald-900 dark:text-emerald-200"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Revisa tu correo electrónico</p>
              <p className="text-xs leading-relaxed">{submittedMessage}</p>
              {submittedEmail && (
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 pt-1">
                  Correo consultado: {submittedEmail}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 p-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-bold text-slate-800 dark:text-slate-100">
              ¿No encuentras el mensaje?
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Revisa las carpetas de Spam o Promociones.</li>
              <li>
                Haz clic en el botón <strong>Restablecer mi contraseña</strong>{' '}
                dentro del correo.
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              isLoading={isSubmitting}
              disabled={cooldownSeconds > 0 || !submittedEmail}
              onClick={() =>
                submittedEmail && void sendRecoveryEmail(submittedEmail)
              }
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              {cooldownSeconds > 0
                ? `Reenviar en ${cooldownSeconds}s`
                : 'Reenviar enlace'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setSubmittedMessage(null);
                setSubmittedEmail(null);
                setCooldownSeconds(0);
              }}
            >
              Usar otro correo
            </Button>
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
            Enviar Enlace de Recuperación
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
