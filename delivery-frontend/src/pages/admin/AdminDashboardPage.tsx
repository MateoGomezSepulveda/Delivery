import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CircleDollarSign,
  Download,
  Package,
  PiggyBank,
  Receipt,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  getDashboardApi,
  getSalesApi,
  getTopProductsApi,
  type SalesPoint,
} from '@/api/endpoints/analytics.api';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Badge, OrderStatusBadge } from '@/components/ui/Badge';
import type { OrderStatus } from '@/types/api.types';
import { cn } from '@/utils/cn';

type DateRangeOption = '7d' | '30d' | 'month' | '90d' | 'all';
type ChartViewMode = 'both' | 'profit';
type ProductSortMode = 'profit' | 'quantity';

const RANGE_OPTIONS: { key: DateRangeOption; label: string }[] = [
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: 'month', label: 'Este mes' },
  { key: '90d', label: '90 días' },
  { key: 'all', label: 'Histórico' },
];

function getDaysForRange(range: DateRangeOption): number | undefined {
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  if (range === '90d') return 90;
  if (range === 'month') {
    const now = new Date();
    return Math.max(1, now.getDate());
  }
  return undefined;
}

function RevenueProfitBars({
  points,
  mode,
}: {
  points: SalesPoint[];
  mode: ChartViewMode;
}) {
  const maxVal = Math.max(
    ...points.map((p) =>
      mode === 'profit'
        ? Math.abs(p.dailyProfit ?? 0)
        : Math.max(p.dailyRevenue, Math.abs(p.dailyProfit ?? 0)),
    ),
    1,
  );

  return (
    <div className="flex items-end gap-2 sm:gap-3 h-56 pt-6 overflow-x-auto pb-1">
      {points.map((p) => {
        const cost = p.dailyCost ?? 0;
        const profit = p.dailyProfit ?? p.dailyRevenue - cost;
        const margin =
          p.dailyRevenue > 0 ? ((profit / p.dailyRevenue) * 100).toFixed(1) : '0.0';
        const revHeight = Math.max((p.dailyRevenue / maxVal) * 100, 4);
        const profitHeight = Math.max((Math.abs(profit) / maxVal) * 100, 4);

        return (
          <div
            key={p.date}
            className="flex-1 min-w-[26px] group relative flex flex-col items-center justify-end h-full gap-1.5"
          >
            <div className="w-full flex-1 flex items-end justify-center gap-1">
              {mode === 'both' && (
                <div
                  className="w-full max-w-[20px] rounded-t-md bg-orange-500 group-hover:bg-orange-600 transition-colors duration-200"
                  style={{ height: `${revHeight}%` }}
                />
              )}
              <div
                className={cn(
                  'w-full rounded-t-md transition-colors duration-200',
                  mode === 'profit' ? 'max-w-[36px]' : 'max-w-[20px]',
                  profit < 0
                    ? 'bg-red-500 group-hover:bg-red-600'
                    : 'bg-emerald-500 group-hover:bg-emerald-600',
                )}
                style={{ height: `${profitHeight}%` }}
              />
            </div>

            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full">
              {p.date.slice(5)}
            </span>

            <div className="hidden group-hover:block absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-xl bg-slate-900 text-white text-[11px] px-3 py-2 shadow-xl border border-slate-700/80 space-y-0.5 pointer-events-none">
              <p className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">
                {p.date} · {p.ordersCount}{' '}
                {p.ordersCount === 1 ? 'pedido' : 'pedidos'}
              </p>
              <p className="text-orange-300">
                Ventas: <strong>{formatCurrency(p.dailyRevenue)}</strong>
              </p>
              <p className="text-slate-300">
                Costo compra: <strong>{formatCurrency(cost)}</strong>
              </p>
              <p className={profit < 0 ? 'text-red-300' : 'text-emerald-300'}>
                Ganancia real: <strong>{formatCurrency(profit)}</strong> ({margin}%)
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminDashboardPage() {
  const [range, setRange] = useState<DateRangeOption>('30d');
  const [chartMode, setChartMode] = useState<ChartViewMode>('both');
  const [productSort, setProductSort] = useState<ProductSortMode>('profit');

  const queryDays = useMemo(() => getDaysForRange(range), [range]);
  const salesDays = queryDays ?? 90;

  const dashboard = useQuery({
    queryKey: ['admin-dashboard', queryDays ?? 'all'],
    queryFn: () => getDashboardApi(queryDays),
  });
  const sales = useQuery({
    queryKey: ['admin-sales', salesDays],
    queryFn: () => getSalesApi(salesDays),
  });
  const top = useQuery({
    queryKey: ['admin-top-products', queryDays ?? 'all'],
    queryFn: () => getTopProductsApi(10, queryDays),
  });

  const k = dashboard.data?.kpis;
  const inventoryAlerts = dashboard.data?.inventoryAlerts ?? [];

  const periodTotals = useMemo(() => {
    const pts = sales.data ?? [];
    const revenue = pts.reduce((s, p) => s + p.dailyRevenue, 0);
    const cost = pts.reduce((s, p) => s + (p.dailyCost ?? 0), 0);
    const profit = pts.reduce(
      (s, p) => s + (p.dailyProfit ?? p.dailyRevenue - (p.dailyCost ?? 0)),
      0,
    );
    return { revenue, cost, profit };
  }, [sales.data]);

  const sortedProducts = useMemo(() => {
    const list = [...(top.data ?? [])];
    if (productSort === 'quantity') {
      return list.sort(
        (a, b) =>
          b.totalQuantitySold - a.totalQuantitySold ||
          (b.totalProfit ?? 0) - (a.totalProfit ?? 0),
      );
    }
    return list.sort(
      (a, b) =>
        (b.totalProfit ?? b.totalRevenue - (b.totalCost ?? 0)) -
          (a.totalProfit ?? a.totalRevenue - (a.totalCost ?? 0)) ||
        b.totalQuantitySold - a.totalQuantitySold,
    );
  }, [top.data, productSort]);

  const topMetricMax = Math.max(
    ...sortedProducts.map((p) =>
      productSort === 'quantity'
        ? p.totalQuantitySold
        : Math.max(0, p.totalProfit ?? p.totalRevenue - (p.totalCost ?? 0)),
    ),
    1,
  );

  const netProfit = k?.netProfit ?? 0;
  const profitMargin = k?.profitMargin ?? 0;
  const isNegativeProfit = netProfit < 0;

  const handleExportCsv = () => {
    const lines: string[] = [];
    lines.push(
      'Seccion,Metrica_Fecha_Producto,Cantidad_Unidades,Ventas_Ingresos,Costo_Compra,Ganancia_Neta_Real,Margen_Porcentaje,Stock_Actual',
    );
    lines.push(
      `KPI,Resumen Financiero (${range}),${k?.totalUnitsSold ?? 0},${k?.totalRevenue ?? 0},${k?.totalCost ?? 0},${k?.netProfit ?? 0},${k?.profitMargin ?? 0}%,0`,
    );
    lines.push(
      `KPI,Ticket Promedio,${k?.paidOrdersCount ?? 0},${k?.averageOrderValue ?? 0},0,0,0%,0`,
    );
    lines.push(
      `KPI,Inventario Actual,${k?.activeProducts ?? 0},${k?.inventoryRetailValue ?? 0},${k?.inventoryCostValue ?? 0},${(k?.inventoryRetailValue ?? 0) - (k?.inventoryCostValue ?? 0)},0%,${k?.lowStockProducts ?? 0} bajos / ${k?.outOfStockProducts ?? 0} agotados`,
    );
    lines.push(`KPI,Usuarios Registrados,${k?.totalUsers ?? 0},0,0,0,0%,0`);

    (sales.data ?? []).forEach((s) => {
      const cost = s.dailyCost ?? 0;
      const profit = s.dailyProfit ?? s.dailyRevenue - cost;
      const margin =
        s.dailyRevenue > 0 ? ((profit / s.dailyRevenue) * 100).toFixed(1) : '0';
      lines.push(
        `Ventas Diarias,${s.date},${s.unitsSold ?? s.ordersCount},${s.dailyRevenue},${cost},${profit},${margin}%,`,
      );
    });

    sortedProducts.forEach((p) => {
      const safeName = `"${p.name.replace(/"/g, '""')}"`;
      const cost = p.totalCost ?? 0;
      const profit = p.totalProfit ?? p.totalRevenue - cost;
      const margin =
        p.profitMargin ??
        (p.totalRevenue > 0
          ? Number(((profit / p.totalRevenue) * 100).toFixed(1))
          : 0);
      lines.push(
        `Rentabilidad Producto,${safeName},${p.totalQuantitySold},${p.totalRevenue},${cost},${profit},${margin}%,${p.currentStock ?? ''}`,
      );
    });

    const csvContent = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `reporte-ganancias-analytics-${range}-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Reporte financiero CSV exportado correctamente');
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Controles de Período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
            Dashboard Financiero &amp; Analytics
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Ingresos reales, costos de compra, ganancia neta por producto y salud
            del inventario
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Seleccionar período de análisis"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-bold transition-colors duration-200 cursor-pointer',
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
        <div
          role="alert"
          className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300"
        >
          No se pudieron cargar los KPIs (verifica que tu sesión ADMIN esté activa).
        </div>
      )}

      {/* Bloque 1: KPIs Financieros Reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              Ventas totales
            </span>
            <CircleDollarSign className="w-5 h-5 text-orange-600" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
            {dashboard.isLoading ? '...' : formatCurrency(k?.totalRevenue ?? 0)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {k?.paidOrdersCount ?? 0} pedidos pagados / confirmados
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              Costo de compra
            </span>
            <Wallet className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
            {dashboard.isLoading ? '...' : formatCurrency(k?.totalCost ?? 0)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {k?.totalUnitsSold ?? 0} unidades vendidas (COGS)
          </p>
        </div>

        <div
          className={cn(
            'rounded-2xl border p-5 shadow-card space-y-2',
            isNegativeProfit
              ? 'border-red-200 dark:border-red-900/70 bg-red-50/50 dark:bg-red-950/20'
              : 'border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/50 dark:bg-emerald-950/20',
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-xs font-bold uppercase tracking-wider',
                isNegativeProfit
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-emerald-700 dark:text-emerald-300',
              )}
            >
              Ganancia neta real
            </span>
            {isNegativeProfit ? (
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                'font-heading text-2xl font-extrabold',
                isNegativeProfit
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-emerald-700 dark:text-emerald-300',
              )}
            >
              {dashboard.isLoading ? '...' : formatCurrency(netProfit)}
            </p>
            <Badge variant={isNegativeProfit ? 'danger' : 'success'}>
              {profitMargin}% margen
            </Badge>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Ingresos descontando costos y cupones
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              Capital en inventario
            </span>
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
            {dashboard.isLoading
              ? '...'
              : formatCurrency(k?.inventoryCostValue ?? 0)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Venta potencial: {formatCurrency(k?.inventoryRetailValue ?? 0)}
          </p>
        </div>
      </div>

      {/* Bloque 2: KPIs Operativos y Salud de Stock */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Ticket promedio
            </span>
            <span className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
              {dashboard.isLoading
                ? '...'
                : formatCurrency(k?.averageOrderValue ?? 0)}
            </span>
          </div>
          <Receipt className="w-5 h-5 text-orange-500 shrink-0" />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Pedidos totales
            </span>
            <span className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
              {dashboard.isLoading ? '...' : (k?.totalOrders ?? 0)}
            </span>
          </div>
          <ShoppingBag className="w-5 h-5 text-orange-500 shrink-0" />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Usuarios
            </span>
            <span className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
              {dashboard.isLoading ? '...' : (k?.totalUsers ?? 0)}
            </span>
          </div>
          <Users className="w-5 h-5 text-orange-500 shrink-0" />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Salud de stock
            </span>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge variant="success">{k?.activeProducts ?? 0} activos</Badge>
              {(k?.lowStockProducts ?? 0) > 0 && (
                <Badge variant="warning">{k?.lowStockProducts} bajos</Badge>
              )}
              {(k?.outOfStockProducts ?? 0) > 0 && (
                <Badge variant="danger">{k?.outOfStockProducts} agotados</Badge>
              )}
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
        </div>
      </div>

      {/* Bloque 3: Gráfica Comparativa Ventas vs. Ganancia Neta Real */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-extrabold text-slate-900 dark:text-white">
              Ventas vs. Ganancia Neta Real (
              {RANGE_OPTIONS.find((r) => r.key === range)?.label})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Período de {salesDays} {salesDays === 1 ? 'día' : 'días'}: Ventas{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatCurrency(periodTotals.revenue)}
              </strong>{' '}
              · Costos{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatCurrency(periodTotals.cost)}
              </strong>{' '}
              · Ganancia real{' '}
              <strong
                className={
                  periodTotals.profit < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
              >
                {formatCurrency(periodTotals.profit)}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              {chartMode === 'both' && (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
                  Ventas
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Ganancia real
              </span>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => setChartMode('both')}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer',
                  chartMode === 'both'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400',
                )}
              >
                Comparativa
              </button>
              <button
                type="button"
                onClick={() => setChartMode('profit')}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer',
                  chartMode === 'profit'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400',
                )}
              >
                Solo ganancia
              </button>
            </div>
          </div>
        </div>

        {sales.isLoading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Cargando gráfica...</p>
        ) : (sales.data ?? []).length === 0 ? (
          <p className="text-sm text-slate-500 py-10 text-center">
            Aún no hay ventas registradas en este período.
          </p>
        ) : (
          <RevenueProfitBars points={sales.data ?? []} mode={chartMode} />
        )}
      </section>

      {/* Bloque 4: Rentabilidad Real por Producto */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-extrabold text-slate-900 dark:text-white">
              Rentabilidad real por producto
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Desglose de unidades vendidas, ingresos, costo de compra y ganancia
              neta real por producto
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800/60 self-start">
            <button
              type="button"
              onClick={() => setProductSort('profit')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer',
                productSort === 'profit'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              Más rentables
            </button>
            <button
              type="button"
              onClick={() => setProductSort('quantity')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer',
                productSort === 'quantity'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              Más vendidos
            </button>
          </div>
        </div>

        {sortedProducts.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Sin datos de ventas de productos todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 pr-3">Producto</th>
                  <th className="py-2.5 px-3 text-right">Vendidos</th>
                  <th className="py-2.5 px-3 text-right">Ingresos</th>
                  <th className="py-2.5 px-3 text-right">Costo compra</th>
                  <th className="py-2.5 px-3 text-right">Ganancia real</th>
                  <th className="py-2.5 px-3 text-right">Margen</th>
                  <th className="py-2.5 pl-3 text-right">Stock actual</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p) => {
                  const cost = p.totalCost ?? 0;
                  const profit = p.totalProfit ?? p.totalRevenue - cost;
                  const margin =
                    p.profitMargin ??
                    (p.totalRevenue > 0
                      ? Number(((profit / p.totalRevenue) * 100).toFixed(1))
                      : 0);
                  const barPct = Math.max(
                    4,
                    Math.min(
                      100,
                      ((productSort === 'quantity'
                        ? p.totalQuantitySold
                        : Math.max(0, profit)) /
                        topMetricMax) *
                        100,
                    ),
                  );
                  const threshold = p.lowStockThreshold ?? 5;
                  const stockVal = p.currentStock;

                  return (
                    <tr
                      key={p.productId}
                      className="border-b last:border-0 border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-3 pr-3 min-w-[200px]">
                        <span className="font-semibold text-slate-900 dark:text-white block truncate max-w-[260px]">
                          {p.name}
                        </span>
                        <div className="mt-1.5 h-1.5 w-full max-w-[220px] rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={cn(
                              'h-1.5 rounded-full',
                              profit < 0
                                ? 'bg-red-500'
                                : productSort === 'quantity'
                                  ? 'bg-orange-500'
                                  : 'bg-emerald-500',
                            )}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                        {p.totalQuantitySold} uds
                      </td>
                      <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                        {formatCurrency(p.totalRevenue)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatCurrency(cost)}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-3 text-right font-extrabold whitespace-nowrap',
                          profit < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {profit >= 0 ? '+' : ''}
                        {formatCurrency(profit)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <Badge
                          variant={
                            margin < 0
                              ? 'danger'
                              : margin < 15
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {margin}%
                        </Badge>
                      </td>
                      <td className="py-3 pl-3 text-right whitespace-nowrap">
                        {stockVal === null || stockVal === undefined ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : stockVal <= 0 ? (
                          <Badge variant="danger">Agotado</Badge>
                        ) : stockVal <= threshold ? (
                          <Badge variant="warning">Quedan {stockVal}</Badge>
                        ) : (
                          <Badge variant="neutral">{stockVal} uds</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bloque 5: Alertas de Reposición de Inventario + Pedidos por Estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-heading font-extrabold text-slate-900 dark:text-white">
                Alertas de inventario
              </h3>
            </div>
            <Link
              to="/admin/products"
              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 cursor-pointer"
            >
              <span>Gestionar stock</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {inventoryAlerts.length === 0 ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400 py-4">
              Todo tu catálogo tiene stock saludable por encima del mínimo.
            </p>
          ) : (
            <div className="space-y-2.5">
              {inventoryAlerts.map((item) => (
                <div
                  key={item.productId}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white block truncate">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Venta {formatCurrency(item.price)} · Compra{' '}
                      {formatCurrency(item.costPrice)}
                    </span>
                  </div>

                  {item.stock <= 0 || !item.available ? (
                    <Badge variant="danger">Agotado (0)</Badge>
                  ) : (
                    <Badge variant="warning">
                      Quedan {item.stock}{' '}
                      {item.stock === 1 ? 'unidad' : 'unidades'}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3">
          <h3 className="font-heading font-extrabold text-slate-900 dark:text-white">
            Pedidos por estado
          </h3>
          {Object.entries(dashboard.data?.ordersByStatus ?? {}).map(
            ([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <OrderStatusBadge status={status as OrderStatus} />
                <span className="font-heading font-extrabold text-slate-900 dark:text-white">
                  {count}
                </span>
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
