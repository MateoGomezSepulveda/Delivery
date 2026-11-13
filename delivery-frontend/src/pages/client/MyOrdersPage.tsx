import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  MapPin,
  Package,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import { getMyOrdersApi } from '@/api/endpoints/orders.api';
import type { OrderStatus } from '@/types/api.types';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PaginationBar } from '@/components/catalog/PaginationBar';
import { cn } from '@/utils/cn';

const STATUS_FILTERS: { label: string; value?: OrderStatus }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Pagados', value: 'PAID' },
  { label: 'Confirmados', value: 'CONFIRMED' },
  { label: 'En Cocina', value: 'PREPARING' },
  { label: 'En Camino', value: 'OUT_FOR_DELIVERY' },
  { label: 'Entregados', value: 'DELIVERED' },
  { label: 'Cancelados', value: 'CANCELLED' },
];

export function MyOrdersPage() {
  const [page, setPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(
    undefined,
  );
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['my-orders', page, statusFilter, dateFrom, dateTo],
    queryFn: () =>
      getMyOrdersApi({
        page,
        limit: 6,
        status: statusFilter,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo
          ? new Date(`${dateTo}T23:59:59.999Z`).toISOString()
          : undefined,
      }),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, lastPage: 1 };

  const handleResetFilters = () => {
    setStatusFilter(undefined);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(statusFilter || dateFrom || dateTo);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-950/70 px-3 py-1 text-xs font-bold text-orange-700 dark:text-orange-300 mb-2">
            <Package className="w-3.5 h-3.5" />
            Historial & Seguimiento en Vivo
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mis Pedidos ({meta.total})
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Consulta el estado de tus órdenes, paga pedidos pendientes o califica los platos entregados.
          </p>
        </div>

        <Link to="/">
          <Button variant="primary" leftIcon={<Sparkles className="w-4 h-4" />}>
            Hacer Nuevo Pedido
          </Button>
        </Link>
      </div>

      {/* Filters Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={cn(
                  'shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                  isActive
                    ? 'bg-orange-600 text-white shadow-warm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Date Range Filter Row */}
        <div className="flex flex-wrap items-end justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Calendar className="w-3 h-3 text-orange-600" />
                Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Calendar className="w-3 h-3 text-orange-600" />
                Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Limpiar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-52 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse space-y-4"
            >
              <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
              <div className="h-16 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8" />}
          title={
            hasActiveFilters
              ? 'No se encontraron pedidos con estos filtros'
              : 'Aún no has realizado ningún pedido'
          }
          description={
            hasActiveFilters
              ? 'Intenta cambiar el estado seleccionado o el rango de fechas.'
              : 'Explora el catálogo gastronómico, arma tu carrito y realiza tu primera orden.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={handleResetFilters}>
                Restablecer Filtros
              </Button>
            ) : (
              <Link to="/">
                <Button variant="primary">Ir al Catálogo</Button>
              </Link>
            )
          }
        />
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 md:grid-cols-2 gap-5 transition-opacity',
            isFetching && 'opacity-75',
          )}
        >
          {orders.map((order) => (
            <article
              key={order._id}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card hover:border-orange-300 dark:hover:border-orange-800 transition-all flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                {/* Top Row: ID + Date + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      Orden #{order._id.slice(-8).toUpperCase()}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {order.createdAt
                        ? formatDateTime(order.createdAt)
                        : 'Reciente'}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Delivery Address */}
                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3">
                  <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">
                    {order.address || 'Dirección estándar registrada'}
                  </span>
                </div>

                {/* Items Preview Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {order.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      <strong className="text-orange-600">
                        {item.quantity}×
                      </strong>{' '}
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer: Total + CTA */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Orden
                  </span>
                  <span className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(order.total)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {order.status === 'DELIVERED' && (
                    <Link to={`/orders/${order._id}`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Star className="w-3.5 h-3.5" />}
                      >
                        Calificar
                      </Button>
                    </Link>
                  )}

                  <Link to={`/orders/${order._id}`}>
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Ver Detalle
                    </Button>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.lastPage > 1 && (
        <PaginationBar
          meta={meta}
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}
    </div>
  );
}
