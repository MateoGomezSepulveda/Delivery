import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CircleDollarSign,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Users,
  Utensils,
} from 'lucide-react';
import {
  getDashboardApi,
  getSalesApi,
  getTopProductsApi,
} from '@/api/endpoints/analytics.api';
import { formatCurrency } from '@/utils/formatters';
import { OrderStatusBadge } from '@/components/ui/Badge';
import type { OrderStatus } from '@/types/api.types';
import { cn } from '@/utils/cn';

function SalesBars({
  points,
}: {
  points: { date: string; dailyRevenue: number; ordersCount: number }[];
}) {
  const max = Math.max(...points.map((p) => p.dailyRevenue), 1);
  return (
    <div className="flex items-end gap-2 h-52 pt-4">
      {points.map((p) => (
        <div
          key={p.date}
          className="flex-1 min-w-[10px] group relative flex flex-col items-center justify-end h-full gap-1.5"
        >
          <div className="w-full flex-1 flex items-end justify-center">
            <div
              className="w-full max-w-[44px] rounded-t-md bg-orange-500 group-hover:bg-orange-600 transition-colors"
              style={{ height: `${Math.max((p.dailyRevenue / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 truncate max-w-full">
            {p.date.slice(5)}
          </span>
          <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-lg bg-slate-900 text-white text-[11px] px-2 py-1 shadow-lg">
            {p.date}: {formatCurrency(p.dailyRevenue)} · {p.ordersCount} pedidos
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardPage() {
  const [days, setDays] = useState(30);

  const dashboard = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboardApi,
  });
  const sales = useQuery({
    queryKey: ['admin-sales', days],
    queryFn: () => getSalesApi(days),
  });
  const top = useQuery({
    queryKey: ['admin-top-products'],
    queryFn: () => getTopProductsApi(5),
  });

  const k = dashboard.data?.kpis;
  const cards = [
    {
      label: 'Ingresos',
      value: formatCurrency(k?.totalRevenue ?? 0),
      icon: <CircleDollarSign className="w-5 h-5" />,
    },
    {
      label: 'Pedidos totales',
      value: String(k?.totalOrders ?? 0),
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      label: 'Ticket promedio',
      value: formatCurrency(k?.averageOrderValue ?? 0),
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      label: 'Pedidos pagados',
      value: String(k?.paidOrdersCount ?? 0),
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: 'Usuarios',
      value: String(k?.totalUsers ?? 0),
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: 'Productos activos',
      value: String(k?.activeProducts ?? 0),
      icon: <Utensils className="w-5 h-5" />,
    },
  ];

  const topMax = Math.max(...(top.data ?? []).map((p) => p.totalQuantitySold), 1);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-extrabold">
        Dashboard Analytics
      </h2>

      {dashboard.isError && (
        <p className="text-sm text-red-600">
          No se pudieron cargar los KPIs (¿sesión ADMIN activa?).
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                {c.label}
              </span>
              <span className="text-orange-600">{c.icon}</span>
            </div>
            <p className="font-heading text-2xl font-extrabold mt-2">
              {dashboard.isLoading ? '...' : c.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-extrabold">Ventas diarias</h3>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-bold cursor-pointer',
                  days === d
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {sales.isLoading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : (sales.data ?? []).length === 0 ? (
          <p className="text-sm text-slate-500 py-10 text-center">
            Aún no hay ventas en este período.
          </p>
        ) : (
          <SalesBars points={sales.data ?? []} />
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4">
          <h3 className="font-heading font-extrabold">Top productos</h3>
          {(top.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">Sin datos todavía.</p>
          ) : (
            top.data!.map((p) => (
              <div key={p.productId} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold truncate pr-2">{p.name}</span>
                  <span className="text-slate-500 shrink-0">
                    {p.totalQuantitySold} uds · {formatCurrency(p.totalRevenue)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${(p.totalQuantitySold / topMax) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3">
          <h3 className="font-heading font-extrabold">Pedidos por estado</h3>
          {Object.entries(dashboard.data?.ordersByStatus ?? {}).map(
            ([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <OrderStatusBadge status={status as OrderStatus} />
                <span className="font-heading font-extrabold">{count}</span>
              </div>
            ),
          )}
          {Object.keys(dashboard.data?.ordersByStatus ?? {}).length === 0 && (
            <p className="text-sm text-slate-500">Sin pedidos todavía.</p>
          )}
        </section>
      </div>
    </div>
  );
}
