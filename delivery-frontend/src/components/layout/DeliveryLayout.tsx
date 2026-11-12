import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Bike,
  Compass,
  Navigation,
  PackageCheck,
  Power,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

export function DeliveryLayout() {
  const [isOnline, setIsOnline] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Rider Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-base font-bold">
                Rider Portal
              </span>
              <Badge variant={isOnline ? 'success' : 'neutral'}>
                {isOnline ? 'En Línea' : 'Desconectado'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Layout Mobile-First · Rol DELIVERY
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOnline((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer',
              isOnline
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            )}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </button>
          <ThemeToggle />
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cliente</span>
          </Link>
        </div>
      </header>

      {/* Main Mobile-First Viewport */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto max-w-md grid grid-cols-3 h-16">
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 text-blue-600 dark:text-blue-400 font-semibold text-xs cursor-pointer"
          >
            <PackageCheck className="w-5 h-5" />
            <span>Disponibles</span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
          >
            <Navigation className="w-5 h-5" />
            <span>Ruta Activa</span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Mis Métricas</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export function DeliveryLayoutPreview() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 p-5">
        <div className="flex items-center gap-3">
          <Compass className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              DeliveryLayout Listo (Fase 0)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              En la <strong>Fase 6</strong> conectaremos aquí los 8 endpoints de{' '}
              <code className="font-mono text-xs bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded">
                /api/v1/delivery
              </code>{' '}
              y el transmisor GPS en tiempo real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
