import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  XCircle,
} from 'lucide-react';
import {
  cancelOrderApi,
  getOrderByIdApi,
  ORDER_STATUS_TRANSITIONS,
  payOrderApi,
  updateOrderStatusAdminApi,
} from '@/api/endpoints/orders.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { OrderStatus } from '@/types/api.types';
import type { Product } from '@/types/catalog.types';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReviewFormModal } from '@/components/orders/ReviewFormModal';
import { cn } from '@/utils/cn';

const TIMELINE_STEPS: {
  key: OrderStatus;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'PENDING',
    label: 'Recibido',
    desc: 'Orden registrada',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    key: 'PAID',
    label: 'Pagado',
    desc: 'Pago verificado',
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    key: 'CONFIRMED',
    label: 'Confirmado',
    desc: 'Aceptado por local',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    key: 'PREPARING',
    label: 'En Cocina',
    desc: 'Preparando platos',
    icon: <ChefHat className="w-4 h-4" />,
  },
  {
    key: 'OUT_FOR_DELIVERY',
    label: 'En Camino',
    desc: 'Repartidor en ruta',
    icon: <Truck className="w-4 h-4" />,
  },
  {
    key: 'DELIVERED',
    label: 'Entregado',
    desc: 'Pedido completado',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
];

function getStepIndex(status: OrderStatus): number {
  const idx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export function OrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    productId: string;
    productName: string;
  } | null>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<string[]>([]);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrderByIdApi(id),
    enabled: Boolean(id),
  });

  const payMutation = useMutation({
    mutationFn: () => payOrderApi(id),
    onSuccess: ({ paymentUrl }) => {
      if (paymentUrl) {
        toast.loading('Redirigiendo a MercadoPago Checkout Pro...');
        window.location.href = paymentUrl;
      }
    },
    onError: (err) => {
      toast.error('Error al generar preferencia de MercadoPago', {
        description: `${extractErrorMessage(err)}. Puedes usar el botón "Simular Retorno MercadoPago" para probar la vista de confirmación.`,
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrderApi(id),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(['order', id], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setIsCancelModalOpen(false);
      toast.success('Pedido cancelado correctamente');
    },
    onError: (err) => {
      toast.error('No se pudo cancelar el pedido', {
        description: extractErrorMessage(err),
      });
    },
  });

  const adminStatusMutation = useMutation({
    mutationFn: (nextStatus: OrderStatus) =>
      updateOrderStatusAdminApi(id, nextStatus),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(['order', id], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      toast.success(`Estado actualizado a ${updatedOrder.status}`, {
        description:
          'Se emitieron las notificaciones por BullMQ y WebSocket (EventsGateway).',
      });
    },
    onError: (err) => {
      toast.error('Transición de estado no permitida', {
        description: extractErrorMessage(err),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="h-10 w-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-slate-500">
          Cargando información del pedido...
        </p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="No encontramos este pedido"
          description="Verifica que el identificador de la orden sea válido o que pertenezca a tu cuenta."
          action={
            <Link to="/orders">
              <Button variant="primary">Volver a Mis Pedidos</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const currentStepIndex = getStepIndex(order.status);
  const isTerminalNegative =
    order.status === 'CANCELLED' || order.status === 'FAILED';
  const canPay = order.status === 'PENDING' || order.status === 'FAILED';
  const canCancel = order.status === 'PENDING';
  const canReview = order.status === 'DELIVERED';
  const isAdmin = user?.role === 'ADMIN';
  const allowedNextStatuses = ORDER_STATUS_TRANSITIONS[order.status] ?? [];

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Mis Pedidos
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Orden #{order._id.slice(-8).toUpperCase()}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Creada el{' '}
            {order.createdAt ? formatDateTime(order.createdAt) : 'Hoy'} · ID
            completo: <span className="font-mono">{order._id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar Estado
          </Button>
        </div>
      </div>

      {/* Status Stepper Card */}
      <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
              Progreso de tu Pedido
            </h2>
            <p className="text-xs text-slate-500">
              Seguimiento paso a paso desde la confirmación hasta la puerta de tu casa
            </p>
          </div>
          {canReview && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              ¡Ya puedes calificar tus platos!
            </span>
          )}
        </div>

        {isTerminalNegative ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 p-4 flex items-center gap-3 text-red-800 dark:text-red-300">
            <XCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div className="text-xs space-y-0.5">
              <p className="font-extrabold text-sm">
                {order.status === 'CANCELLED'
                  ? 'Este pedido fue cancelado'
                  : 'El pago de este pedido fue rechazado'}
              </p>
              <p>
                {order.status === 'CANCELLED'
                  ? 'No se realizarán cargos adicionales sobre esta orden.'
                  : 'Puedes reintentar el pago con MercadoPago usando el botón inferior.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TIMELINE_STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div
                  key={step.key}
                  className={cn(
                    'rounded-2xl border p-3.5 transition-all flex flex-col justify-between gap-2',
                    isCurrent
                      ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 ring-2 ring-orange-500/20'
                      : isCompleted
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-60',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-xl flex items-center justify-center',
                        isCurrent
                          ? 'bg-orange-600 text-white shadow-warm'
                          : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500',
                      )}
                    >
                      {step.icon}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Paso {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {step.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Admin Quick Status Transition Bar (For testing full order lifecycle & reviews!) */}
        {isAdmin && allowedNextStatuses.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Consola Rápida de Estado (Modo Admin)
              </span>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                Avanza el estado (`PATCH /api/v1/orders/:id/status`) hasta{' '}
                <strong>DELIVERED</strong> para probar la calificación de productos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {allowedNextStatuses.map((nextSt) => (
                <Button
                  key={nextSt}
                  size="sm"
                  variant={nextSt === 'CANCELLED' ? 'danger' : 'secondary'}
                  isLoading={adminStatusMutation.isPending}
                  onClick={() => adminStatusMutation.mutate(nextSt)}
                >
                  Pasar a {nextSt}
                </Button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Main Details 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Items & Reviews */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
                Productos del Pedido ({order.items.length})
              </h3>
              {canReview && (
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  Haz clic en &ldquo;Calificar Plato&rdquo; para dejar tu reseña
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {order.items.map((item, idx) => {
                const prod =
                  typeof item.productId === 'object' && item.productId !== null
                    ? (item.productId as Product)
                    : null;
                const prodId = prod ? prod._id : String(item.productId);
                const prodName = item.name || prod?.name || `Plato #${idx + 1}`;
                const prodImage = prod?.image;
                const alreadyReviewed = reviewedProductIds.includes(prodId);

                return (
                  <div
                    key={`${prodId}-${idx}`}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {prodImage ? (
                        <img
                          src={prodImage}
                          alt={prodName}
                          className="h-16 w-16 rounded-2xl object-cover bg-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {prodName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {item.quantity} unidad(es) ×{' '}
                          {formatCurrency(item.price)}
                        </p>
                        <p className="text-xs font-extrabold text-orange-600 dark:text-orange-400 mt-0.5">
                          Subtotal: {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>

                    {canReview && (
                      <div className="shrink-0">
                        {alreadyReviewed ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Reseña Publicada
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReviewTarget({
                                productId: prodId,
                                productName: prodName,
                              })
                            }
                            leftIcon={
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            }
                          >
                            Calificar Plato
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: Delivery Info, Payment & Cancellation */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
            <h3 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
              Resumen de Entrega y Pago
            </h3>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                Dirección de Destino
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {order.address || 'Dirección registrada por el cliente'}
              </p>
            </div>

            <div className="space-y-2 border-t border-b border-slate-200 dark:border-slate-800 py-4 text-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span>Total Productos ({order.items.length})</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Costo de envío</span>
                <span className="text-xs font-bold text-emerald-600">
                  GRATIS
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-slate-900 dark:text-white">
                  Total de la Orden
                </span>
                <span className="font-heading text-xl font-extrabold text-orange-600 dark:text-orange-400">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>

            {/* Payment & Cancellation Actions */}
            <div className="space-y-3">
              {canPay && (
                <>
                  <Button
                    variant="primary"
                    className="w-full"
                    isLoading={payMutation.isPending}
                    onClick={() => payMutation.mutate()}
                    leftIcon={<CreditCard className="w-4 h-4" />}
                  >
                    Pagar Ahora con MercadoPago
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      navigate(
                        `/payments/success?external_reference=${order._id}&payment_id=MP-SANDBOX-${Date.now()}`,
                      )
                    }
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Simular Pago Aprobado (Sandbox Local)
                  </Button>
                </>
              )}

              {canCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsCancelModalOpen(true)}
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  Cancelar Pedido
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="¿Deseas cancelar este pedido?"
        description="Solo se pueden cancelar pedidos que aún se encuentran en estado PENDING antes de entrar a cocina."
        size="sm"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Esta acción cambiará el estado de la orden{' '}
              <strong>#{order._id.slice(-6).toUpperCase()}</strong> a{' '}
              <strong>CANCELLED</strong> (`PATCH /api/v1/orders/:id/cancel`) de
              forma permanente.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="ghost"
              onClick={() => setIsCancelModalOpen(false)}
            >
              No, conservar pedido
            </Button>
            <Button
              variant="danger"
              isLoading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Sí, cancelar pedido
            </Button>
          </div>
        </div>
      </Modal>

      {/* Product Review Modal */}
      {reviewTarget && (
        <ReviewFormModal
          isOpen={Boolean(reviewTarget)}
          onClose={() => setReviewTarget(null)}
          orderId={order._id}
          productId={reviewTarget.productId}
          productName={reviewTarget.productName}
          onReviewCreated={(prodId) =>
            setReviewedProductIds((prev) => [...prev, prodId])
          }
        />
      )}
    </div>
  );
}
