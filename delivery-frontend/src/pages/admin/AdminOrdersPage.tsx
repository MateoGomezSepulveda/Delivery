import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPin, RefreshCw } from 'lucide-react';
import {
  getAllOrdersAdminApi,
  ORDER_STATUS_TRANSITIONS,
  updateOrderStatusAdminApi,
} from '@/api/endpoints/orders.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { OrderStatus } from '@/types/api.types';
import type { Order } from '@/types/order.types';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { OrderStatusBadge } from '@/components/ui/Badge';

const COLUMNS: { title: string; statuses: OrderStatus[] }[] = [
  { title: 'Por pagar', statuses: ['PENDING', 'FAILED'] },
  { title: 'Pagados', statuses: ['PAID'] },
  { title: 'Confirmados', statuses: ['CONFIRMED'] },
  { title: 'En cocina', statuses: ['PREPARING'] },
  { title: 'En camino', statuses: ['OUT_FOR_DELIVERY'] },
  { title: 'Cerrados', statuses: ['DELIVERED', 'CANCELLED'] },
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

export function AdminOrdersPage() {
  const queryClient = useQueryClient();

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

  const orders = data?.data ?? [];

  const customerName = (o: Order) =>
    typeof o.userId === 'object' ? o.userId.name : 'Cliente';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-extrabold">
            Despacho de pedidos
          </h2>
          <p className="text-xs text-slate-500">
            Últimos 100 pedidos · se actualiza cada 20 s
          </p>
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

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando pedidos...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colOrders = orders.filter((o) =>
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

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(ORDER_STATUS_TRANSITIONS[o.status] ?? []).map((next) => (
                        <Button
                          key={next}
                          size="sm"
                          variant={next === 'CANCELLED' ? 'danger' : 'secondary'}
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({ id: o._id, status: next })
                          }
                        >
                          {ACTION_LABEL[next] ?? next}
                        </Button>
                      ))}
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
      )}
    </div>
  );
}
