import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Archive,
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  LayoutGrid,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  TableProperties,
  Truck,
} from 'lucide-react';
import {
  getAllOrdersAdminApi,
  getAllowedOrderTransitions,
  updateOrderStatusAdminApi,
} from '@/api/endpoints/orders.api';
import { getAllUsersApi } from '@/api/endpoints/users.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { OrderStatus } from '@/types/api.types';
import type { Order } from '@/types/order.types';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { OrderStatusBadge, PaymentMethodBadge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

type ViewMode = 'kanban' | 'table';

interface DispatchColumn {
  id: string;
  step: number;
  title: string;
  subtitle: string;
  statuses: OrderStatus[];
  dotClass: string;
  headerBgClass: string;
  icon: React.ReactNode;
}

/**
 * Orden lógico del despacho sin cocina:
 * 1. Pendientes (por pagar online o por confirmar contraentrega)
 * 2. Pagados (pago online aprobado, listo para confirmar)
 * 3. Confirmados (listo para recoger por repartidor o despachar; incluye legado PREPARING)
 * 4. En camino (repartidor en ruta hacia el cliente)
 * + Sección inferior independiente de Cerrados (Entregados / Cancelados) sin scroll horizontal.
 */
const ACTIVE_COLUMNS: DispatchColumn[] = [
  {
    id: 'pending',
    step: 1,
    title: 'Pendientes',
    subtitle: 'Por pagar o confirmar',
    statuses: ['PENDING', 'FAILED'],
    dotClass: 'bg-amber-500',
    headerBgClass: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/50',
    icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
  },
  {
    id: 'paid',
    step: 2,
    title: 'Pagados',
    subtitle: 'Pago en línea verificado',
    statuses: ['PAID'],
    dotClass: 'bg-emerald-500',
    headerBgClass: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-900/50',
    icon: (
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
    ),
  },
  {
    id: 'confirmed',
    step: 3,
    title: 'Confirmados',
    subtitle: 'Listos para despacho',
    statuses: ['CONFIRMED', 'PREPARING'],
    dotClass: 'bg-orange-500',
    headerBgClass: 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-200/70 dark:border-orange-900/50',
    icon: (
      <PackageCheck className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
    ),
  },
  {
    id: 'out_for_delivery',
    step: 4,
    title: 'En camino',
    subtitle: 'Repartidor en ruta',
    statuses: ['OUT_FOR_DELIVERY'],
    dotClass: 'bg-blue-500',
    headerBgClass: 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-900/50',
    icon: <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
  },
];

const CLOSED_STATUSES: OrderStatus[] = ['DELIVERED', 'CANCELLED'];

const STATUS_FILTER_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'FAILED', label: 'Pago fallido' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'CONFIRMED', label: 'Confirmado (Listo para envío)' },
  { value: 'OUT_FOR_DELIVERY', label: 'En camino' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PAID: 'Marcar pagado',
  CONFIRMED: 'Confirmar',
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
  onTransition: (order: Order, status: OrderStatus) => void;
}) {
  const nextStatuses = getAllowedOrderTransitions(
    order.status,
    order.paymentMethod,
  );
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
          onClick={() => onTransition(order, next)}
        >
          {ACTION_LABEL[next] ?? next}
        </Button>
      ))}
    </div>
  );
}

function DispatchOrderCard({
  order,
  customerName,
  assignedRider,
  disabled,
  onTransition,
}: {
  order: Order;
  customerName: string;
  assignedRider: string | null;
  disabled: boolean;
  onTransition: (order: Order, status: OrderStatus) => void;
}) {
  return (
    <article className="min-w-0 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-2 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/orders/${order._id}`}
          className="font-mono text-xs font-extrabold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer truncate"
        >
          #{order._id.slice(-6).toUpperCase()}
        </Link>
        <span className="text-sm font-extrabold text-slate-900 dark:text-white shrink-0">
          {formatCurrency(order.total)}
        </span>
      </div>

      <div className="space-y-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
          {customerName}
        </p>
        <p className="flex items-start gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
          <span className="line-clamp-2 break-words">
            {order.address || 'Sin dirección'}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] min-w-0">
        <Bike className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        {assignedRider ? (
          <span className="font-semibold text-blue-700 dark:text-blue-400 truncate">
            {assignedRider}
          </span>
        ) : (
          <span className="text-slate-400 truncate">Sin repartidor</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <OrderStatusBadge
          status={order.status}
          paymentMethod={order.paymentMethod}
        />
        <PaymentMethodBadge
          method={order.paymentMethod}
          paymentStatus={order.paymentStatus}
          compact
        />
      </div>

      {order.paymentMethod === 'CASH_ON_DELIVERY' &&
        order.changeDue &&
        order.changeDue > 0 && (
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            Llevar vueltas: {formatCurrency(order.changeDue)}
          </p>
        )}

      <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <OrderActionButtons
          order={order}
          disabled={disabled}
          onTransition={onTransition}
        />
      </div>
    </article>
  );
}

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [showClosedOrders, setShowClosedOrders] = useState(true);

  const [pendingDispatchOrder, setPendingDispatchOrder] =
    useState<Order | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => getAllOrdersAdminApi({ page: 1, limit: 100 }),
    refetchInterval: 20_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-riders'],
    queryFn: async () => {
      try {
        return await getAllUsersApi({ page: 1, limit: 100 });
      } catch {
        return { data: [], meta: { total: 0, page: 1, lastPage: 1 } };
      }
    },
    retry: false,
  });

  const riders = useMemo(
    () => (usersData?.data ?? []).filter((u) => u.role === 'DELIVERY'),
    [usersData?.data],
  );

  const ridersMap = useMemo(() => {
    const map = new Map<string, string>();
    (usersData?.data ?? []).forEach((u) => {
      map.set(u._id, u.name);
    });
    return map;
  }, [usersData?.data]);

  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
      deliveryId,
    }: {
      id: string;
      status: OrderStatus;
      deliveryId?: string;
    }) =>
      deliveryId
        ? updateOrderStatusAdminApi(id, status, deliveryId)
        : updateOrderStatusAdminApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sales'] });
      queryClient.invalidateQueries({ queryKey: ['admin-top-products'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setPendingDispatchOrder(null);
      setSelectedRiderId('');
      toast.success('Estado actualizado');
    },
    onError: (err) =>
      toast.error('Transición no permitida', {
        description: extractErrorMessage(err),
      }),
  });

  // Ojo: typeof null === 'object'. Si el cliente fue eliminado, populate devuelve null.
  const customerName = (o: Order) => {
    if (o.userId && typeof o.userId === 'object') {
      return o.userId.name || 'Cliente';
    }
    return o.userId ? 'Cliente' : 'Cliente eliminado';
  };

  const customerEmail = (o: Order) =>
    o.userId && typeof o.userId === 'object' ? (o.userId.email ?? '') : '';

  const riderName = useCallback(
    (o: Order): string | null => {
      if (!o.deliveryId) return null;
      if (typeof o.deliveryId === 'object' && o.deliveryId.name) {
        return o.deliveryId.name;
      }
      const id =
        typeof o.deliveryId === 'string' ? o.deliveryId : o.deliveryId._id;
      if (!id) return null;
      return ridersMap.get(id) ?? `Rider #${id.slice(-4).toUpperCase()}`;
    },
    [ridersMap],
  );

  const filteredOrders = useMemo(() => {
    const orders = data?.data ?? [];
    const term = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== 'ALL') {
        const matchesConfirmedLegacy =
          statusFilter === 'CONFIRMED' && order.status === 'PREPARING';
        if (order.status !== statusFilter && !matchesConfirmedLegacy) {
          return false;
        }
      }
      if (!term) return true;

      const idMatch = order._id.toLowerCase().includes(term);
      const nameMatch = customerName(order).toLowerCase().includes(term);
      const emailMatch = customerEmail(order).toLowerCase().includes(term);
      const addressMatch = (order.address || '').toLowerCase().includes(term);
      const riderMatch = (riderName(order) || '').toLowerCase().includes(term);
      return idMatch || nameMatch || emailMatch || addressMatch || riderMatch;
    });
  }, [data?.data, searchTerm, statusFilter, riderName]);

  const closedOrders = useMemo(
    () => filteredOrders.filter((o) => CLOSED_STATUSES.includes(o.status)),
    [filteredOrders],
  );

  const handleTransition = (order: Order, status: OrderStatus) => {
    if (status === 'OUT_FOR_DELIVERY' && !order.deliveryId) {
      setPendingDispatchOrder(order);
      setSelectedRiderId(riders[0]?._id ?? '');
      return;
    }
    mutation.mutate({ id: order._id, status });
  };

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
            Despacho de pedidos
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Flujo directo sin cocina · Últimos 100 pedidos · actualización cada
            20 s ({filteredOrders.length} mostrados)
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
              <span>Tablero</span>
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
            className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 cursor-pointer"
          >
            <option value="ALL">Todos los estados</option>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando pedidos...</p>
      ) : viewMode === 'kanban' ? (
        <div className="space-y-5">
          {/* Flujo activo en 4 columnas responsivas (SIN scroll horizontal) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {ACTIVE_COLUMNS.map((col) => {
              const colOrders = filteredOrders.filter((o) =>
                col.statuses.includes(o.status),
              );
              return (
                <section
                  key={col.id}
                  aria-label={col.title}
                  className="min-w-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900/70 p-3 space-y-3"
                >
                  <div
                    className={cn(
                      'rounded-xl border px-3 py-2 flex items-center justify-between gap-2',
                      col.headerBgClass,
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          col.dotClass,
                        )}
                      />
                      <div className="min-w-0">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                          {col.icon}
                          <span className="truncate">
                            {col.step}. {col.title}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                          {col.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-white/90 dark:bg-slate-800 text-xs font-extrabold text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 shrink-0">
                      {colOrders.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {colOrders.map((o) => (
                      <DispatchOrderCard
                        key={o._id}
                        order={o}
                        customerName={customerName(o)}
                        assignedRider={riderName(o)}
                        disabled={mutation.isPending}
                        onTransition={handleTransition}
                      />
                    ))}

                    {colOrders.length === 0 && (
                      <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-6 rounded-xl border border-dashed border-slate-300/80 dark:border-slate-700/80">
                        Sin pedidos en esta etapa
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Sección de pedidos cerrados (Entregados / Cancelados) en grilla fluida */}
          <section
            aria-label="Cerrados"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Cerrados
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pedidos entregados y cancelados ({closedOrders.length})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowClosedOrders((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {showClosedOrders ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Ocultar cerrados</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Mostrar cerrados ({closedOrders.length})</span>
                  </>
                )}
              </button>
            </div>

            {showClosedOrders &&
              (closedOrders.length === 0 ? (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  Sin pedidos cerrados
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {closedOrders.map((o) => (
                    <DispatchOrderCard
                      key={o._id}
                      order={o}
                      customerName={customerName(o)}
                      assignedRider={riderName(o)}
                      disabled={mutation.isPending}
                      onTransition={handleTransition}
                    />
                  ))}
                </div>
              ))}
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
          {/* Tabla fluida de 5 columnas en escritorio (SIN scroll horizontal) */}
          <div className="hidden lg:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="w-[15%] px-4 py-3 font-bold">Pedido</th>
                  <th className="w-[27%] px-4 py-3 font-bold">
                    Cliente y Dirección
                  </th>
                  <th className="w-[16%] px-4 py-3 font-bold">Repartidor</th>
                  <th className="w-[18%] px-4 py-3 font-bold">Total y Pago</th>
                  <th className="w-[24%] px-4 py-3 font-bold">
                    Estado y Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No hay pedidos que coincidan con el filtro actual.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const assignedRider = riderName(o);
                    return (
                      <tr
                        key={o._id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 align-top">
                          <Link
                            to={`/orders/${o._id}`}
                            className="font-mono text-xs font-extrabold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer block"
                          >
                            #{o._id.slice(-6).toUpperCase()}
                          </Link>
                          {o.createdAt && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                              {formatDateTime(o.createdAt)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                            {customerName(o)}
                          </p>
                          {customerEmail(o) && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {customerEmail(o)}
                            </p>
                          )}
                          <p className="mt-1 flex items-start gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                            <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                            <span className="line-clamp-2 break-words">
                              {o.address || 'Sin dirección'}
                            </span>
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="inline-flex items-center gap-1.5 text-xs min-w-0 max-w-full">
                            <Bike className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            {assignedRider ? (
                              <span className="font-semibold text-blue-700 dark:text-blue-400 truncate">
                                {assignedRider}
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                Sin asignar
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top space-y-1.5">
                          <p className="font-heading font-extrabold text-slate-900 dark:text-white">
                            {formatCurrency(o.total)}
                          </p>
                          <PaymentMethodBadge
                            method={o.paymentMethod}
                            paymentStatus={o.paymentStatus}
                            compact
                          />
                          {o.paymentMethod === 'CASH_ON_DELIVERY' &&
                            o.changeDue &&
                            o.changeDue > 0 && (
                              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                Llevar vueltas: {formatCurrency(o.changeDue)}
                              </p>
                            )}
                        </td>
                        <td className="px-4 py-3 align-top space-y-2">
                          <OrderStatusBadge
                            status={o.status}
                            paymentMethod={o.paymentMethod}
                          />
                          <OrderActionButtons
                            order={o}
                            disabled={mutation.isPending}
                            onTransition={handleTransition}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Lista responsiva apilada para móvil y tablet (SIN scroll horizontal) */}
          <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredOrders.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No hay pedidos que coincidan con el filtro actual.
              </p>
            ) : (
              filteredOrders.map((o) => (
                <div key={o._id} className="p-3">
                  <DispatchOrderCard
                    order={o}
                    customerName={customerName(o)}
                    assignedRider={riderName(o)}
                    disabled={mutation.isPending}
                    onTransition={handleTransition}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal para asignar repartidor o confirmar despacho sin repartidor */}
      <Modal
        isOpen={Boolean(pendingDispatchOrder)}
        onClose={() => setPendingDispatchOrder(null)}
        title="Despachar pedido a entrega"
        size="sm"
      >
        {pendingDispatchOrder && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  El pedido #{pendingDispatchOrder._id.slice(-6).toUpperCase()}{' '}
                  no tiene repartidor asignado.
                </p>
                <p className="mt-0.5">
                  Selecciona un repartidor disponible para asignarlo al pedido o
                  espera a que un mensajero lo tome desde la Rider App.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="select-rider-dispatch"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
              >
                Asignar repartidor
              </label>
              <select
                id="select-rider-dispatch"
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm cursor-pointer"
              >
                <option value="">Sin asignar (despacho manual)</option>
                {riders.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPendingDispatchOrder(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                isLoading={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    id: pendingDispatchOrder._id,
                    status: 'OUT_FOR_DELIVERY',
                    deliveryId: selectedRiderId || undefined,
                  })
                }
              >
                Confirmar despacho
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
