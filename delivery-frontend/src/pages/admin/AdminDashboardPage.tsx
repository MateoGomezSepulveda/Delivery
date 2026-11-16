import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Calendar,
  CircleDollarSign,
  Download,
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
import { Button } from '@/components/ui/Button';
import { OrderStatusBadge } from '@/components/ui/Badge';
import type { OrderStatus } from '@/types/api.types';
import { cn } from '@/utils/cn';

type DateRangeOption = '7d' | '30d' | 'month' | '90d';

const RANGE_OPTIONS: { key: DateRangeOption; label: string }[] = [
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: '30 días' },
  { key: 'month', label: 'Este mes' },
  { key: '90d', label: '90 días' },
];

function getDaysForRange(range: DateRangeOption): number {
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  if (range === '90d') return 90;
  const now = new Date();
  return Math.max(1, now.getDate());
}

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
  const [range, setRange] = useState<DateRangeOption>('30d');
  const days = useMemo(() => getDaysForRange(range), [range]);

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

  const topMax = Math.max(
    ...(top.data ?? []).map((p) => p.totalQuantitySold),
    1,
  );

  const handleExportCsv = () => {
    const lines: string[] = [];
    lines.push('Seccion,Metrica_Fecha_Producto,Cantidad_Pedidos,Ingresos_Valor');
    lines.push(`KPI,Ingresos Totales,${k?.totalOrders ?? 0},${k?.totalRevenue ?? 0}`);
    lines.push(
      `KPI,Ticket Promedio,${k?.paidOrdersCount ?? 0},${k?.averageOrderValue ?? 0}`,
    );
    lines.push(`KPI,Usuarios Registrados,${k?.totalUsers ?? 0},0`);
    lines.push(`KPI,Productos Activos,${k?.activeProducts ?? 0},0`);

    (sales.data ?? []).forEach((s) => {
      lines.push(`Ventas Diarias,${s.date},${s.ordersCount},${s.dailyRevenue}`);
    });

    (top.data ?? []).forEach((p) => {
      const safeName = `"${p.name.replace(/"/g, '""')}"`;
      lines.push(
        `Top Productos,${safeName},${p.totalQuantitySold},${p.totalRevenue}`,
      );
    });

    const csvContent = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `reporte-analytics-${range}-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Reporte CSV exportado correctamente');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-extrabold">
            Dashboard Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Métricas ejecutivas, ventas por período y exportación a CSV
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer',
                  range === opt.key
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

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
          <h3 className="font-heading font-extrabold">
            Ventas diarias ({RANGE_OPTIONS.find((r) => r.key === range)?.label})
          </h3>
          <span className="text-xs text-slate-400">
            Ventana de {days} {days === 1 ? 'día' : 'días'}
          </span>
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
                    style={{
                      width: `${(p.totalQuantitySold / topMax) * 100}%`,
                    }}
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
