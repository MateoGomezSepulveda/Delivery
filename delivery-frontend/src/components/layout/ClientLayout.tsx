import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Bike,
  LayoutDashboard,
  MapPin,
  ShoppingBag,
  Sparkles,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ServerStatusBadge } from '@/components/layout/ServerStatusBadge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { cn } from '@/utils/cn';

export function ClientLayout() {
  const location = useLocation();
  const { isOpen, openDrawer, closeDrawer, activeAddressLabel } =
    useCartDrawerStore();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Floating Navbar following ui-ux-pro-max rules */}
      <header className="sticky top-4 z-40 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-card px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-5">
            <Link
              to="/"
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="h-10 w-10 rounded-xl bg-orange-600 dark:bg-orange-500 text-white flex items-center justify-center shadow-warm transition-transform duration-200 group-hover:scale-105">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <span className="font-heading text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Delivery<span className="text-orange-600 dark:text-orange-400">Pro</span>
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 -mt-1">
                  Full-Stack Platform
                </span>
              </div>
            </Link>

            {/* Active Delivery Address Pill */}
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              <MapPin className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="truncate max-w-[200px]">{activeAddressLabel}</span>
            </div>
          </div>

          {/* Role Layout Switcher (Navigation between portals) */}
          <nav className="hidden lg:flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200/60 dark:border-slate-700/60">
            <Link
              to="/"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                location.pathname === '/'
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Portal Cliente</span>
            </Link>
            <Link
              to="/delivery"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Bike className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Rider App</span>
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Panel Admin</span>
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block">
              <ServerStatusBadge />
            </div>
            <ThemeToggle />
            <Button
              variant="primary"
              size="sm"
              onClick={openDrawer}
              leftIcon={<ShoppingBag className="w-4 h-4" />}
            >
              <span>Carrito</span>
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[11px]">
                0
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Outlet />
      </main>

      {/* Slide-over Cart Drawer Base */}
      <Drawer
        isOpen={isOpen}
        onClose={closeDrawer}
        title="Tu Carrito de Compras"
        subtitle={`Entrega en: ${activeAddressLabel}`}
        footer={
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Subtotal estimado
              </span>
              <span className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                $0
              </span>
            </div>
            <Button
              variant="primary"
              className="w-full"
              onClick={closeDrawer}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Explorar Catálogo
            </Button>
          </div>
        }
      >
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title="Tu carrito está vacío"
          description="En la Fase 3 conectaremos este Drawer con GET /api/v1/cart y mutaciones optimistas en tiempo real."
        />
      </Drawer>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>
            © 2026 <strong>DeliveryPro</strong> — Arquitectura React 18 + TypeScript + NestJS 11.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-orange-600 cursor-pointer">
              Cliente
            </Link>
            <Link to="/delivery" className="hover:text-blue-600 cursor-pointer">
              Repartidor
            </Link>
            <Link to="/admin" className="hover:text-emerald-600 cursor-pointer">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
