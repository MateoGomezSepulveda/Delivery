import { Link, Outlet } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ServerStatusBadge } from '@/components/layout/ServerStatusBadge';

export function AuthLayout() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Left Brand Showcase Column (Desktop) */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 p-12 text-white flex-col justify-between">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-lg">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-heading text-xl font-extrabold tracking-tight">
                DeliveryPro
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-orange-100">
                Secure Identity & RBAC
              </span>
            </div>
          </Link>
        </div>

        <div className="space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Fase 1 — Autenticación JWT + Rotación de Refresh Tokens</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Una sola cuenta para pedir, repartir o administrar tu plataforma.
          </h1>
          <p className="text-orange-50 text-base leading-relaxed">
            Conectado directamente con tu backend NestJS con encriptación{' '}
            <code className="bg-black/20 px-1.5 py-0.5 rounded font-mono text-xs">
              bcrypt
            </code>
            , protección anti-fuerza bruta (Rate Limiting) y redirección
            automática según tu rol.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm font-medium text-orange-50">
              <ShieldCheck className="w-5 h-5 text-white shrink-0" />
              <span>
                Access Token (15 min) + Refresh Token (7 días) con rotación automática
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-orange-50">
              <KeyRound className="w-5 h-5 text-white shrink-0" />
              <span>
                Recuperación de contraseña con token de un solo uso (15 min)
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-orange-50">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <span>
                Guards de propiedad (OwnershipGuard) y control por roles (CLIENT, DELIVERY, ADMIN)
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-orange-100/80 flex items-center justify-between border-t border-white/15 pt-6">
          <span>© 2026 DeliveryPro Full-Stack</span>
          <span>UI/UX Pro Max Design System</span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <ServerStatusBadge />
            <ThemeToggle />
          </div>
        </div>

        <div className="my-auto py-8 w-full max-w-md mx-auto">
          <Outlet />
        </div>

        <div className="text-center text-xs text-slate-400 dark:text-slate-500">
          Protegido por NestJS ThrottlerGuard, Helmet y JWT Bearer Auth.
        </div>
      </div>
    </div>
  );
}
