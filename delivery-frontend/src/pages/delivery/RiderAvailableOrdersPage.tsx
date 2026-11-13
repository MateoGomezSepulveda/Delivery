import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapPin, PackageCheck, Store } from 'lucide-react';
import {
  acceptOrderApi,
  getAvailableOrdersApi,
} from '@/api/endpoints/delivery.api';
import { extractErrorMessage } from '@/api/axios.client';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { DeliveryProfile } from '@/types/delivery.types';

export function RiderAvailableOrdersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useOutletContext<{ profile: DeliveryProfile }>();

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
      toast.success('Pedido aceptado', {
        description: 'Ve a Ruta Activa para transmitir tu ubicación.',
      });
      navigate('/delivery/active');
    },
    onError: (err) =>
      toast.error('No se pudo aceptar el pedido', {
        description: extractErrorMessage(err),
      }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">
          Pedidos disponibles
        </h1>
        <p className="text-xs text-slate-500">
          Listos en cocina (PREPARING). Se actualiza cada 10 segundos.
        </p>
      </div>

      {!profile.isAvailable && (
        <div className="rounded-2xl bg-slate-200/70 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
          Estás desconectado. Activa el botón Online para marcar que estás
          trabajando.
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-sm text-slate-500 py-10">Buscando...</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<PackageCheck className="w-7 h-7" />}
          title="No hay pedidos por recoger"
          description="Cuando un pedido pase a PREPARING aparecerá aquí."
        />
      ) : (
        orders.map((order) => (
          <article
            key={order._id}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-xs font-extrabold uppercase text-blue-600">
                  #{order._id.slice(-8).toUpperCase()}
                </span>
                <p className="text-xs text-slate-400">
                  {order.createdAt ? formatDateTime(order.createdAt) : ''}
                </p>
              </div>
              <span className="font-heading text-xl font-extrabold">
                {formatCurrency(order.total)}
              </span>
            </div>

            <div className="flex items-start gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{order.address}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Store className="w-3.5 h-3.5" />
              {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
            </div>

            <Button
              className="w-full h-12 text-base"
              isLoading={
                acceptMutation.isPending && acceptMutation.variables === order._id
              }
              onClick={() => acceptMutation.mutate(order._id)}
            >
              Aceptar Entrega
            </Button>
          </article>
        ))
      )}
    </div>
  );
}
