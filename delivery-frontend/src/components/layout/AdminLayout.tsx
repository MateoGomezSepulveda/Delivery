import { Link, Outlet } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  FolderKanban,
  ShieldAlert,
  Sparkles,
  Tag,
  Users,
  Utensils,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ServerStatusBadge } from '@/components/layout/ServerStatusBadge';
import { Badge } from '@/components/ui/Badge';

const sidebarLinks = [
  { label: 'Dashboard Analytics', icon: BarChart3, active: true },
  { label: 'Despacho de Pedidos', icon: ClipboardList, active: false },
  { label: 'Catálogo Productos', icon: Utensils, active: false },
  { label: 'Categorías', icon: FolderKanban, active: false },
  { label: 'Cupones y Promos', icon: Tag, active: false },
  { label: 'Usuarios y Roles', icon: Users, active: false },
];

export function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Sidebar */}
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
              <div
                key={item.label}
                className={
                  item.active
                    ? 'flex items-center gap-3 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 px-3.5 py-2.5 text-sm font-semibold cursor-pointer'
                    : 'flex items-center gap-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer'
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold">
              Centro de Control Ejecutivo
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ServerStatusBadge />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLayoutPreview() {
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/40 p-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            AdminLayout Listo (Fase 0)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            En la <strong>Fase 7</strong> conectaremos aquí los Aggregation Pipelines de{' '}
            <code className="font-mono text-xs bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded">
              /api/v1/analytics
            </code>
            , el tablero Kanban de pedidos y los CRUDs con subida de imágenes a AWS S3.
          </p>
        </div>
      </div>
    </div>
  );
}
