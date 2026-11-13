import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bike,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Package,
  ShoppingBag,
  Store,
  User as UserIcon,
  UserPlus,
  UtensilsCrossed,
} from 'lucide-react';
import { getCartApi } from '@/api/endpoints/cart.api';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ServerStatusBadge } from '@/components/layout/ServerStatusBadge';
import { Button } from '@/components/ui/Button';
import { RoleBadge } from '@/components/ui/Badge';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { AddressesModal } from '@/components/addresses/AddressesModal';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/utils/cn';

export function ClientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openDrawer, openAddressModal, activeAddressLabel } =
    useCartDrawerStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { connected: socketConnected } = useSocket();

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
  });

  const cartItemCount =
    cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada correctamente.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Floating Navbar following ui-ux-pro-max rules */}
      <header className="sticky top-4 z-40 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-card px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo + Address Pill */}
          <div className="flex items-center gap-4">
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

            {/* Clickable Active Delivery Address Pill */}
            <button
              type="button"
              onClick={openAddressModal}
              title="Haz clic para abrir tu libreta de direcciones y mapa"
              className="hidden md:flex items-center gap-2 rounded-xl bg-slate-100/80 hover:bg-orange-50 dark:bg-slate-800/70 dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="truncate max-w-[190px]">{activeAddressLabel}</span>
            </button>
          </div>

          {/* Role Layout Switcher */}
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
              <span>Catálogo</span>
            </Link>
            <Link
              to="/orders"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                location.pathname.startsWith('/orders')
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Mis Pedidos</span>
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
              <span>Admin</span>
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden xl:block">
              <ServerStatusBadge />
            </div>
            <ThemeToggle />
            {isAuthenticated && (
              <span
                title={
                  socketConnected
                    ? 'Tiempo real conectado'
                    : 'Tiempo real desconectado'
                }
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  socketConnected ? 'bg-emerald-500' : 'bg-slate-400',
                )}
              />
            )}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                    location.pathname === '/profile'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800',
                  )}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-orange-600" />
                  )}
                  <span className="max-w-[100px] truncate">{user.name}</span>
                  <span className="hidden sm:inline-block">
                    <RoleBadge role={user.role} />
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4 text-slate-500 hover:text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<LogIn className="w-3.5 h-3.5" />}
                  >
                    Ingresar
                  </Button>
                </Link>
                <Link to="/register" className="hidden sm:block">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                  >
                    Registro
                  </Button>
                </Link>
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={openDrawer}
              leftIcon={<ShoppingBag className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Carrito</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[11px]">
                {cartItemCount}
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Outlet />
      </main>

      {/* Slide-over Cart Drawer & Addresses Modal */}
      <CartDrawer />
      <AddressesModal />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>
            © 2026 <strong>DeliveryPro</strong> — Arquitectura React 18 + TypeScript + NestJS 11.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-orange-600 cursor-pointer">
              Catálogo
            </Link>
            <Link to="/orders" className="hover:text-orange-600 cursor-pointer">
              Mis Pedidos
            </Link>
            <Link to="/profile" className="hover:text-orange-600 cursor-pointer">
              Mi Perfil
            </Link>
            <Link to="/ui-lab" className="hover:text-orange-600 cursor-pointer">
              UI Lab
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
