import { NavLink, Link, Outlet } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  FolderKanban,
  ShieldAlert,
  Tag,
  Users,
  Utensils,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ServerStatusBadge } from '@/components/layout/ServerStatusBadge';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

const sidebarLinks = [
  { label: 'Dashboard Analytics', icon: BarChart3, to: '/admin', end: true },
  { label: 'Despacho de Pedidos', icon: ClipboardList, to: '/admin/orders' },
  { label: 'Catálogo Productos', icon: Utensils, to: '/admin/products' },
  { label: 'Categorías', icon: FolderKanban, to: '/admin/categories' },
  { label: 'Cupones y Promos', icon: Tag, to: '/admin/coupons' },
  { label: 'Usuarios y Roles', icon: Users, to: '/admin/users' },
];

export function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2.5 px-2 py-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-heading font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading text-base font-bold block">
              DeliveryAdmin
            </span>
            <Badge variant="success" className="mt-0.5">
              Rol ADMIN
            </Badge>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1">
          {sidebarLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors cursor-pointer',
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium',
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Portal Cliente</span>
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between gap-3">
          <h1 className="text-base font-bold">Centro de Control Ejecutivo</h1>
          <div className="flex items-center gap-3">
            <ServerStatusBadge />
            <ThemeToggle />
          </div>
        </header>

        {/* Navegación compacta en móvil */}
        <nav className="md:hidden flex gap-2 overflow-x-auto px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {sidebarLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer',
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'
                    : 'text-slate-600 dark:text-slate-400',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
