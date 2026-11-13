import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  LayoutGrid,
  MapPin,
  RefreshCw,
  Search,
  TableProperties,
} from 'lucide-react';
import {
  getAllOrdersAdminApi,
  ORDER_STATUS_TRANSITIONS,
  updateOrderStatusAdminApi,
} from '@/api/endpoints/orders.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { OrderStatus } from '@/types/api.types';
import type { Order } from '@/types/order.types';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OrderStatusBadge } from '@/components/ui/Badge';

type ViewMode = 'kanban' | 'table';

const COLUMNS: { title: string; statuses: OrderStatus[] }[] = [
  { title: 'Por pagar', statuses: ['PENDING', 'FAILED'] },
  { title: 'Pagados', statuses: ['PAID'] },
  { title: 'Confirmados', statuses: ['CONFIRMED'] },
  { title: 'En cocina', statuses: ['PREPARING'] },
  { title: 'En camino', statuses: ['OUT_FOR_DELIVERY'] },
  { title: 'Cerrados', statuses: ['DELIVERED', 'CANCELLED'] },
];

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'FAILED',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PAID: 'Marcar pagado',
  CONFIRMED: 'Confirmar',
  PREPARING: 'A cocina',
  OUT_FOR_DELIVERY: 'Despachar',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelar',
  PENDING: 'Reabrir',
};

function OrderActionButtons({
  order,
  disabled,
  onTransition,
}: {
  order: Order;
  disabled: boolean;
  onTransition: (id: string, status: OrderStatus) => void;
}) {
  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
  if (nextStatuses.length === 0) {
    return <span className="text-[11px] text-slate-400">Sin acciones</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {nextStatuses.map((next) => (
        <Button
          key={next}
          size="sm"
          variant={next === 'CANCELLED' ? 'danger' : 'secondary'}
          disabled={disabled}
          onClick={() => onTransition(order._id, next)}
        >
          {ACTION_LABEL[next] ?? next}
        </Button>
      ))}
    </div>
  );
}

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => getAllOrdersAdminApi({ page: 1, limit: 100 }),
    refetchInterval: 20_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatusAdminApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sales'] });
      queryClient.invalidateQueries({ queryKey: ['admin-top-products'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      toast.success('Estado actualizado');
    },
    onError: (err) =>
      toast.error('Transición no permitida', {
        description: extractErrorMessage(err),
      }),
  });

  const customerName = (o: Order) =>
    typeof o.userId === 'object' ? o.userId.name : 'Cliente';

  const customerEmail = (o: Order) =>
    typeof o.userId === 'object' ? o.userId.email : '';

  const filteredOrders = useMemo(() => {
    const orders = data?.data ?? [];
    const term = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }
      if (!term) return true;

      const idMatch = order._id.toLowerCase().includes(term);
      const nameMatch = customerName(order).toLowerCase().includes(term);
      const emailMatch = customerEmail(order).toLowerCase().includes(term);
      const addressMatch = (order.address || '').toLowerCase().includes(term);
      return idMatch || nameMatch || emailMatch || addressMatch;
    });
  }, [data?.data, searchTerm, statusFilter]);

  const handleTransition = (id: string, status: OrderStatus) => {
    mutation.mutate({ id, status });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-extrabold">
            Despacho de pedidos
          </h2>
          <p className="text-xs text-slate-500">
            Últimos 100 pedidos · se actualiza cada 20 s ({filteredOrders.length}{' '}
            mostrados)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            isLoading={isFetching}
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filtros de búsqueda y estado */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8">
          <Input
            placeholder="Buscar por #ID, cliente, correo o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="sm:col-span-4">
          <select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as OrderStatus | 'ALL')
            }
            className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
          >
            <option value="ALL">Todos los estados</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando pedidos...</p>
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colOrders = filteredOrders.filter((o) =>
              col.statuses.includes(o.status),
            );
            return (
              <div
                key={col.title}
                className="w-72 shrink-0 rounded-2xl bg-slate-200/60 dark:bg-slate-900/70 p-3 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    {col.title}
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {colOrders.length}
                  </span>
                </div>

                {colOrders.map((o) => (
                  <div
                    key={o._id}
                    className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/orders/${o._id}`}
                        className="font-mono text-xs font-extrabold text-orange-600 hover:underline cursor-pointer"
                      >
                        #{o._id.slice(-6).toUpperCase()}
                      </Link>
                      <span className="text-sm font-extrabold">
                        {formatCurrency(o.total)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold">{customerName(o)}</p>
                    <p className="flex items-start gap-1 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{o.address}</span>
                    </p>
                    <OrderStatusBadge status={o.status} />

                    <div className="pt-1">
                      <OrderActionButtons
                        order={o}
                        disabled={mutation.isPending}
                        onTransition={handleTransition}
                      />
                    </div>
                  </div>
                ))}

                {colOrders.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-4">
                    Sin pedidos
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Pedido</th>
                  <th className="px-4 py-3 font-bold">Cliente</th>
                  <th className="px-4 py-3 font-bold">Dirección</th>
                  <th className="px-4 py-3 font-bold">Total</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-400"
                    >
                      No hay pedidos que coincidan con el filtro actual.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr
                      key={o._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 align-top">
                        <Link
                          to={`/orders/${o._id}`}
                          className="font-mono text-xs font-extrabold text-orange-600 hover:underline cursor-pointer block"
                        >
                          #{o._id.slice(-6).toUpperCase()}
                        </Link>
                        {o.createdAt && (
                          <span className="text-[11px] text-slate-400">
                            {formatDateTime(o.createdAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-slate-900 dark:text-white text-xs">
                          {customerName(o)}
                        </p>
                        {customerEmail(o) && (
                          <p className="text-[11px] text-slate-400">
                            {customerEmail(o)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top max-w-[220px]">
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {o.address || 'Sin dirección'}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top font-heading font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <OrderActionButtons
                          order={o}
                          disabled={mutation.isPending}
                          onTransition={handleTransition}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
