import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Banknote,
  CreditCard,
  MapPin,
  PackageCheck,
  Phone,
  Power,
  Radio,
  Store,
  User as UserIcon,
} from 'lucide-react';
import {
  acceptOrderApi,
  getAvailableOrdersApi,
} from '@/api/endpoints/delivery.api';
import { extractErrorMessage } from '@/api/axios.client';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { formatPhoneDisplay } from '@/utils/phone';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { DeliveryOutletContext } from '@/components/layout/DeliveryLayout';

export function RiderAvailableOrdersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile, onToggleAvailability, isTogglingAvailability } =
    useOutletContext<DeliveryOutletContext>();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['delivery-available'],
    queryFn: getAvailableOrdersApi,
    refetchInterval: 10_000,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => acceptOrderApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-active'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
      toast.success('Pedido aceptado', {
        description: 'Ve a Ruta Activa para iniciar tu navegación y tracking.',
      });
      navigate('/delivery/active');
    },
    onError: (err) =>
      toast.error('No se pudo aceptar el pedido', {
        description: extractErrorMessage(err),
      }),
  });

  const isOffline = !profile.isAvailable;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
            Pedidos disponibles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pedidos confirmados y listos para recoger con alertas instantáneas
            en tiempo real.
          </p>
        </div>

        <Badge
          variant={isOffline ? 'neutral' : 'success'}
          icon={<Radio className="w-3.5 h-3.5" />}
        >
          {isOffline ? 'Alertas en pausa (Offline)' : 'Alertas en vivo activas'}
        </Badge>
      </div>

      {isOffline && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/90 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Estás en estado No disponible (Offline)</p>
              <p className="text-amber-800 dark:text-amber-300">
                Debes activar tu estado a <strong>Disponible (Online)</strong>{' '}
                para poder aceptar entregas.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="primary"
            isLoading={isTogglingAvailability}
            onClick={() => onToggleAvailability(true)}
            leftIcon={<Power className="w-3.5 h-3.5" />}
            className="shrink-0"
          >
            Ponerme Disponible
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-sm text-slate-500 py-10">
          Buscando pedidos...
        </p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<PackageCheck className="w-7 h-7" />}
          title="No hay pedidos por recoger"
          description="Cuando un pedido sea confirmado por la tienda recibirás una alerta con sonido aquí al instante."
        />
      ) : (
        orders.map((order) => {
          const customer =
            typeof order.userId === 'object' && order.userId !== null
              ? order.userId
              : null;

          return (
            <article
              key={order._id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-extrabold uppercase text-blue-600 dark:text-blue-400">
                    #{order._id.slice(-8).toUpperCase()}
                  </span>
                  <p className="text-xs text-slate-400">
                    {order.createdAt ? formatDateTime(order.createdAt) : ''}
                  </p>
                </div>
                <span className="font-heading text-xl font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(order.total)}
                </span>
              </div>

              {order.paymentMethod === 'CASH_ON_DELIVERY' ? (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/90 dark:bg-amber-950/35 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-extrabold text-amber-900 dark:text-amber-200">
                    <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    Cobrar en efectivo: {formatCurrency(order.total)}
                  </span>
                  {order.cashAmountGiven && order.cashAmountGiven > 0 ? (
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                      Paga con {formatCurrency(order.cashAmountGiven)}
                      {order.changeDue && order.changeDue > 0
                        ? ` · Llevar vueltas: ${formatCurrency(order.changeDue)}`
                        : ' · Exacto'}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 px-3.5 py-2 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pagado en línea · No cobrar al cliente</span>
                </div>
              )}

              {customer && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    {customer.name}
                  </span>
                  {customer.phone && (
                    <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {formatPhoneDisplay(customer.phone)}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="text-slate-800 dark:text-slate-200">
                  {order.address}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Store className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                </span>
              </div>

              <Button
                className="w-full h-12 text-base"
                disabled={isOffline}
                isLoading={
                  acceptMutation.isPending &&
                  acceptMutation.variables === order._id
                }
                onClick={() => acceptMutation.mutate(order._id)}
              >
                {isOffline
                  ? 'Activa estado Disponible para aceptar'
                  : 'Aceptar Entrega'}
              </Button>
            </article>
          );
        })
      )}
    </div>
  );
}
