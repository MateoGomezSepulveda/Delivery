import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
import {
  getDeliveryHistoryApi,
  getDeliveryStatsApi,
} from '@/api/endpoints/delivery.api';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PaginationBar } from '@/components/catalog/PaginationBar';

export function RiderStatsPage() {
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: getDeliveryStatsApi,
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['delivery-history', page],
    queryFn: () => getDeliveryHistoryApi(page, 8),
  });

  const cards = [
    {
      label: 'Entregas completadas',
      value: String(stats?.delivered ?? 0),
      subtitle: 'Histórico total',
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Entregas hoy',
      value: String(stats?.deliveredToday ?? 0),
      subtitle: 'Completadas en el día',
      icon: <CalendarCheck className="w-5 h-5" />,
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40',
    },
    {
      label: 'En curso',
      value: String(stats?.inProgress ?? 0),
      subtitle: 'En ruta actualmente',
      icon: <Truck className="w-5 h-5" />,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Ganancias por envíos',
      value: formatCurrency(stats?.estimatedEarnings ?? 0),
      subtitle: `Hoy: ${formatCurrency(stats?.todayEarnings ?? 0)} · Solo tarifa de envío`,
      icon: <CircleDollarSign className="w-5 h-5" />,
      color: 'text-emerald-700 bg-emerald-100/80 dark:bg-emerald-950/60',
    },
  ];

  const deliveries = history?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
          Mis métricas y ganancias
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Resumen de tus entregas realizadas, ganancias por costo de envío y
          registro histórico de rutas.
        </p>
      </div>

      {isLoadingStats ? (
        <p className="text-sm text-slate-500">Cargando métricas...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-card space-y-2.5"
            >
              <div
                className={`h-10 w-10 rounded-2xl flex items-center justify-center ${c.color}`}
              >
                {c.icon}
              </div>
              <div>
                <p className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {c.value}
                </p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                  {c.label}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {c.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historial de entregas completadas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
            Historial de entregas completadas
          </h2>
          {history?.meta && (
            <Badge variant="neutral">
              {history.meta.total}{' '}
              {history.meta.total === 1 ? 'entrega' : 'entregas'}
            </Badge>
          )}
        </div>

        {isLoadingHistory ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Cargando historial...
          </p>
        ) : deliveries.length === 0 ? (
          <EmptyState
            icon={<Package className="w-7 h-7" />}
            title="Aún no tienes entregas finalizadas"
            description="Cuando marques tu primer pedido como Entregado aparecerá aquí con su fecha, dirección y ganancia."
          />
        ) : (
          <div className="space-y-3">
            {deliveries.map((order) => {
              const customer =
                typeof order.userId === 'object' && order.userId !== null
                  ? order.userId
                  : null;
              const earning =
                order.riderEarning ??
                (order.deliveryFee && order.deliveryFee > 0
                  ? order.deliveryFee
                  : 5000);

              return (
                <article
                  key={order._id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold uppercase text-blue-600 dark:text-blue-400">
                          #{order._id.slice(-8).toUpperCase()}
                        </span>
                        <Badge variant="success">Entregado</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {order.updatedAt
                          ? formatDateTime(order.updatedAt)
                          : order.createdAt
                            ? formatDateTime(order.createdAt)
                            : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(earning)}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Costo de envío
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="block truncate">{order.address}</span>
                      {customer && (
                        <span className="text-[11px] text-slate-400">
                          Cliente: {customer.name}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {history?.meta && history.meta.lastPage > 1 && (
              <PaginationBar
                meta={history.meta}
                itemLabel="entregas"
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
