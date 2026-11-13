import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react';
import { getCartApi } from '@/api/endpoints/cart.api';
import { getMyAddressesApi } from '@/api/endpoints/addresses.api';
import { createOrderApi, payOrderApi } from '@/api/endpoints/orders.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { Product } from '@/types/catalog.types';
import type { Address } from '@/types/order.types';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { CouponInputBox } from '@/components/cart/CouponInputBox';
import { cn } from '@/utils/cn';

function formatAddressString(addr: Address): string {
  const parts = [
    `${addr.title}: ${addr.street}`,
    addr.city,
    addr.state,
    addr.deliveryInstructions ? `(${addr.deliveryInstructions})` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    openAddressModal,
    activeAddressLabel,
    setSelectedAddress,
    appliedCoupon,
    setAppliedCoupon,
  } = useCartDrawerStore();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [customAddress, setCustomAddress] = useState<string>('');
  const [isProcessingMp, setIsProcessingMp] = useState(false);

  const { data: cart, isLoading: loadingCart } = useQuery({
    queryKey: ['cart'],
    queryFn: getCartApi,
  });

  const { data: addresses = [], isLoading: loadingAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: getMyAddressesApi,
  });

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr =
        addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedAddressId(defaultAddr._id);
      const formatted = formatAddressString(defaultAddr);
      setCustomAddress(formatted);
      setSelectedAddress(defaultAddr);
    } else if (
      addresses.length === 0 &&
      !customAddress &&
      activeAddressLabel &&
      activeAddressLabel !== 'Seleccionar dirección de entrega'
    ) {
      setCustomAddress(activeAddressLabel);
    }
  }, [addresses, selectedAddressId, customAddress, activeAddressLabel, setSelectedAddress]);

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddressId(addr._id);
    const formatted = formatAddressString(addr);
    setCustomAddress(formatted);
    setSelectedAddress(addr);
  };

  const items = cart?.items ?? [];
  const subtotal = cart?.total ?? 0;
  const discount = appliedCoupon
    ? Math.min(appliedCoupon.discountAmount, subtotal)
    : 0;
  const finalTotal = Math.max(0, subtotal - discount);

  const createOrderMutation = useMutation({
    mutationFn: (addressToUse: string) =>
      createOrderApi({ address: addressToUse }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setAppliedCoupon(null);
    },
  });

  const handleConfirmOrder = async (payWithMercadoPago: boolean) => {
    const trimmedAddress = customAddress.trim();
    if (!trimmedAddress) {
      toast.warning('Dirección de entrega requerida', {
        description:
          'Selecciona una dirección de tu libreta o escribe la dirección exacta de entrega.',
      });
      return;
    }

    try {
      setIsProcessingMp(payWithMercadoPago);
      const createdOrder = await createOrderMutation.mutateAsync(trimmedAddress);

      toast.success('¡Pedido creado con éxito!', {
        description: `Orden #${createdOrder._id.slice(-6).toUpperCase()} registrada en MongoDB.`,
      });

      if (payWithMercadoPago) {
        try {
          const { paymentUrl } = await payOrderApi(createdOrder._id);
          if (paymentUrl) {
            toast.loading('Redirigiendo a MercadoPago Checkout Pro...');
            window.location.href = paymentUrl;
            return;
          }
        } catch (mpError) {
          toast.warning(
            'Orden creada, pero MercadoPago Sandbox no pudo iniciarse',
            {
              description: `${extractErrorMessage(mpError)}. Te llevamos al detalle del pedido para probar el pago o seguimiento.`,
            },
          );
          navigate(`/orders/${createdOrder._id}`);
          return;
        }
      }

      navigate(`/orders/${createdOrder._id}`);
    } catch (err) {
      toast.error('No se pudo crear el pedido', {
        description: extractErrorMessage(err),
      });
    } finally {
      setIsProcessingMp(false);
    }
  };

  if (loadingCart) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="h-10 w-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-slate-500">
          Preparando tu resumen de Checkout...
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8" />}
          title="Tu carrito está vacío"
          description="Agrega productos desde el catálogo antes de proceder al Checkout."
          action={
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="primary" leftIcon={<Sparkles className="w-4 h-4" />}>
                  Explorar Catálogo
                </Button>
              </Link>
              <Link to="/orders">
                <Button variant="outline">Ver Mis Pedidos</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al Catálogo
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Confirmación y Checkout Seguro
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verifica tu dirección de entrega, revisa tus platos y completa tu pago con MercadoPago.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Transacción Protegida · NestJS + MercadoPago</span>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Steps 1 & 2 */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Delivery Address */}
          <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-orange-600 text-white font-heading text-sm font-extrabold flex items-center justify-center shadow-warm">
                  1
                </span>
                <div>
                  <h2 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
                    Dirección de Entrega
                  </h2>
                  <p className="text-xs text-slate-500">
                    Elige una dirección guardada o usa el mapa GPS
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openAddressModal}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Gestionar con GPS
              </Button>
            </div>

            {loadingAddresses ? (
              <p className="text-xs text-slate-400 py-4">
                Cargando tu libreta de direcciones...
              </p>
            ) : addresses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr._id;
                  return (
                    <button
                      key={addr._id}
                      type="button"
                      onClick={() => handleSelectAddress(addr)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between gap-2',
                        isSelected
                          ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 ring-2 ring-orange-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-orange-300',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <MapPin
                            className={cn(
                              'w-4 h-4 shrink-0',
                              isSelected ? 'text-orange-600' : 'text-slate-400',
                            )}
                          />
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {addr.title}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {addr.street}, {addr.city} ({addr.state})
                      </p>
                      {addr.deliveryInstructions && (
                        <p className="text-[11px] text-slate-400 italic truncate">
                          Ref: {addr.deliveryInstructions}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  Aún no tienes direcciones guardadas en tu libreta.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openAddressModal}
                  leftIcon={<MapPin className="w-3.5 h-3.5" />}
                >
                  Abrir Mapa GPS y Crear Dirección
                </Button>
              </div>
            )}

            <div className="pt-2">
              <Input
                label="Dirección exacta que recibirá el repartidor (Editable)"
                placeholder="Ej. Casa: Calle 85 #15-20 Apto 402, Bogotá (Portería vidrio)"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                leftIcon={<Truck className="w-4 h-4" />}
              />
            </div>
          </section>

          {/* STEP 2: Order Items Review */}
          <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-orange-600 text-white font-heading text-sm font-extrabold flex items-center justify-center shadow-warm">
                  2
                </span>
                <div>
                  <h2 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
                    Productos de tu Pedido ({items.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sincronizados con tu carrito activo en MongoDB
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item, idx) => {
                const prod =
                  typeof item.productId === 'object' && item.productId !== null
                    ? (item.productId as Product)
                    : null;
                const prodId = prod ? prod._id : String(item.productId);
                const prodName = prod ? prod.name : `Producto #${idx + 1}`;
                const prodImage = prod?.image;

                return (
                  <div
                    key={prodId}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {prodImage ? (
                        <img
                          src={prodImage}
                          alt={prodName}
                          className="h-14 w-14 rounded-2xl object-cover bg-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {prodName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Cantidad: <strong>{item.quantity}</strong> ×{' '}
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>

                    <span className="font-heading text-sm font-extrabold text-slate-900 dark:text-white shrink-0">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Step 3 Summary & Payment */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-6">
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-xl bg-orange-600 text-white font-heading text-sm font-extrabold flex items-center justify-center shadow-warm">
                3
              </span>
              <div>
                <h2 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
                  Resumen y Pasarela de Pago
                </h2>
                <p className="text-xs text-slate-500">
                  Aplica tu cupón promocional antes de confirmar
                </p>
              </div>
            </div>

            {/* Coupon Input Box */}
            <CouponInputBox orderTotal={subtotal} />

            {/* Financial Breakdown */}
            <div className="space-y-2.5 border-t border-b border-slate-200 dark:border-slate-800 py-4 text-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal productos</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Costo de domicilio</span>
                <span className="text-xs font-bold uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  Gratis Promo
                </span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-bold">
                  <span>Cupón ({appliedCoupon?.code})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  Total a Pagar
                </span>
                <span className="font-heading text-2xl font-extrabold text-orange-600 dark:text-orange-400">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={createOrderMutation.isPending && isProcessingMp}
                disabled={createOrderMutation.isPending}
                onClick={() => handleConfirmOrder(true)}
                leftIcon={<CreditCard className="w-5 h-5" />}
              >
                Confirmar y Pagar con MercadoPago
              </Button>

              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full"
                isLoading={createOrderMutation.isPending && !isProcessingMp}
                disabled={createOrderMutation.isPending}
                onClick={() => handleConfirmOrder(false)}
                leftIcon={<Truck className="w-4 h-4" />}
              >
                Confirmar Pedido y Ver Seguimiento
              </Button>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3.5 flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Lock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <p>
                Al confirmar, tu carrito se convierte en una orden en estado{' '}
                <strong>PENDING</strong> (`POST /api/v1/orders`) y se genera tu preferencia de pago en{' '}
                <strong>MercadoPago Checkout Pro</strong> (`POST /api/v1/orders/:id/pay`).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
