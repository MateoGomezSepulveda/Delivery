import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react';
import { getCartApi } from '@/api/endpoints/cart.api';
import { getMyAddressesApi } from '@/api/endpoints/addresses.api';
import { createOrderApi, payOrderApi } from '@/api/endpoints/orders.api';
import { clearRecentProductMutations } from '@/api/endpoints/products.api';
import { updateUserApi } from '@/api/endpoints/users.api';
import { useRiderDiscountQuota } from '@/hooks/useRiderDiscountQuota';
import { extractErrorMessage } from '@/api/axios.client';
import type { Product } from '@/types/catalog.types';
import type { Address, PaymentMethod } from '@/types/order.types';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatters';
import { validatePhoneNumber } from '@/utils/phone';
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

function getQuickCashDenominations(total: number): number[] {
  if (total <= 0) return [];
  const candidates = [
    total,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 20000) * 20000,
    Math.ceil(total / 50000) * 50000,
    50000,
    100000,
    200000,
  ].filter((v) => v >= total);

  return Array.from(new Set(candidates))
    .sort((a, b) => a - b)
    .slice(0, 4);
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, updateUserState } = useAuthStore();
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
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('MERCADOPAGO');
  const [cashAmountInput, setCashAmountInput] = useState<string>('');
  const [isRedirectingMp, setIsRedirectingMp] = useState(false);
  const [inlinePhone, setInlinePhone] = useState(user?.phone || '');
  const [inlinePhoneError, setInlinePhoneError] = useState<
    string | undefined
  >();
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const hasValidPhone = Boolean(user?.phone?.trim());

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
  }, [
    addresses,
    selectedAddressId,
    customAddress,
    activeAddressLabel,
    setSelectedAddress,
  ]);

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddressId(addr._id);
    const formatted = formatAddressString(addr);
    setCustomAddress(formatted);
    setSelectedAddress(addr);
  };

  const { data: riderQuota } = useRiderDiscountQuota();

  const items = cart?.items ?? [];
  const subtotal = cart?.total ?? 0;
  const isRider = user?.role === 'DELIVERY';
  const riderDiscount =
    isRider && riderQuota?.eligible ? Math.round(subtotal * 0.1) : 0;
  const discount = appliedCoupon
    ? Math.min(
        appliedCoupon.discountAmount,
        Math.max(0, subtotal - riderDiscount),
      )
    : 0;
  const finalTotal = Math.max(0, subtotal - riderDiscount - discount);

  const parsedCashAmount = useMemo(() => {
    if (!cashAmountInput.trim()) return undefined;
    const numeric = Number(cashAmountInput.replace(/[^\d]/g, ''));
    return Number.isFinite(numeric) ? numeric : undefined;
  }, [cashAmountInput]);

  const cashInputError =
    paymentMethod === 'CASH_ON_DELIVERY' &&
    parsedCashAmount !== undefined &&
    parsedCashAmount < finalTotal
      ? `El monto debe ser igual o mayor a ${formatCurrency(finalTotal)}.`
      : undefined;

  const estimatedChange =
    paymentMethod === 'CASH_ON_DELIVERY' &&
    parsedCashAmount !== undefined &&
    parsedCashAmount >= finalTotal
      ? parsedCashAmount - finalTotal
      : 0;

  const quickCashOptions = useMemo(
    () => getQuickCashDenominations(finalTotal),
    [finalTotal],
  );

  const createOrderMutation = useMutation({
    mutationFn: ({
      addressToUse,
      couponCode,
      method,
      cashAmountGiven,
    }: {
      addressToUse: string;
      couponCode?: string;
      method: PaymentMethod;
      cashAmountGiven?: number;
    }) =>
      createOrderApi({
        address: addressToUse,
        ...(couponCode ? { couponCode } : {}),
        paymentMethod: method,
        ...(method === 'CASH_ON_DELIVERY' && cashAmountGiven !== undefined
          ? { cashAmountGiven }
          : {}),
      }),
    onSuccess: () => {
      clearRecentProductMutations();
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['rider-discount-quota'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sales'] });
      queryClient.invalidateQueries({ queryKey: ['admin-top-products'] });
      setAppliedCoupon(null);
    },
  });

  const handleSaveInlinePhone = async () => {
    if (!user) return;
    const validationErr = validatePhoneNumber(inlinePhone);
    if (validationErr) {
      setInlinePhoneError(validationErr);
      return;
    }
    setInlinePhoneError(undefined);
    setIsSavingPhone(true);
    try {
      const updated = await updateUserApi(user._id, {
        phone: inlinePhone.trim(),
      });
      updateUserState({
        phone: updated.phone,
        isPhoneVerified: updated.isPhoneVerified,
      });
      toast.success('Número de celular guardado', {
        description: 'Ya puedes confirmar tu pedido.',
      });
    } catch (err) {
      toast.error('No se pudo guardar el celular', {
        description: extractErrorMessage(err),
      });
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!hasValidPhone) {
      toast.warning('Número de celular obligatorio', {
        description:
          'Registra tu número de celular para que el repartidor pueda contactarte antes de confirmar el pedido.',
      });
      return;
    }

    const trimmedAddress = customAddress.trim();
    if (!trimmedAddress) {
      toast.warning('Dirección de entrega requerida', {
        description:
          'Selecciona una dirección de tu libreta o escribe la dirección exacta de entrega.',
      });
      return;
    }

    if (cashInputError) {
      toast.warning('Revisa el monto en efectivo', {
        description: cashInputError,
      });
      return;
    }

    const payOnline = paymentMethod === 'MERCADOPAGO';

    try {
      setIsRedirectingMp(payOnline);
      const createdOrder = await createOrderMutation.mutateAsync({
        addressToUse: trimmedAddress,
        couponCode: appliedCoupon?.code,
        method: paymentMethod,
        cashAmountGiven: parsedCashAmount,
      });

      toast.success('¡Pedido creado con éxito!', {
        description: payOnline
          ? `Orden #${createdOrder._id.slice(-6).toUpperCase()} registrada. Conectando con MercadoPago...`
          : `Orden #${createdOrder._id.slice(-6).toUpperCase()} confirmada para pago en efectivo contraentrega.`,
      });

      if (payOnline) {
        try {
          const { paymentUrl } = await payOrderApi(createdOrder._id);
          if (paymentUrl) {
            toast.loading('Redirigiendo a MercadoPago Checkout Pro...');
            window.location.href = paymentUrl;
            return;
          }
        } catch (mpError) {
          toast.warning(
            'Pedido guardado, pero no se pudo abrir MercadoPago',
            {
              description: `${extractErrorMessage(mpError)}. Te llevamos al detalle del pedido para reintentar el pago.`,
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
      setIsRedirectingMp(false);
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
                <Button
                  variant="primary"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
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
            Verifica tu dirección, elige si pagas en línea o en efectivo
            contraentrega y confirma tu pedido.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Pago Online o Contraentrega</span>
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
                        'rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2',
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
                    Revisa las cantidades antes de confirmar tu pedido
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

        {/* Right Column: Step 3 Summary & Payment Method */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-6">
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-xl bg-orange-600 text-white font-heading text-sm font-extrabold flex items-center justify-center shadow-warm">
                3
              </span>
              <div>
                <h2 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
                  Resumen y Método de Pago
                </h2>
                <p className="text-xs text-slate-500">
                  Elige cómo prefieres pagar y aplica tu cupón promocional
                </p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                ¿Cómo deseas pagar?
              </span>

              <div
                role="radiogroup"
                aria-label="Método de pago"
                className="grid grid-cols-1 gap-2.5"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'MERCADOPAGO'}
                  onClick={() => setPaymentMethod('MERCADOPAGO')}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-colors duration-200 cursor-pointer flex items-start justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-orange-500/40',
                    paymentMethod === 'MERCADOPAGO'
                      ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 ring-2 ring-orange-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-slate-700',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                        paymentMethod === 'MERCADOPAGO'
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500',
                      )}
                    >
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Pago en Línea (MercadoPago)
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Tarjeta crédito/débito, PSE o Nequi · Pago anticipado
                        seguro
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'MERCADOPAGO' && (
                    <CheckCircle2 className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'CASH_ON_DELIVERY'}
                  onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-colors duration-200 cursor-pointer flex items-start justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
                    paymentMethod === 'CASH_ON_DELIVERY'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-slate-700',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                        paymentMethod === 'CASH_ON_DELIVERY'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500',
                      )}
                    >
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Efectivo Contraentrega
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Pagas en efectivo al repartidor al recibir tu pedido en
                        la puerta
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'CASH_ON_DELIVERY' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                </button>
              </div>

              {/* Cash Change Calculator */}
              {paymentMethod === 'CASH_ON_DELIVERY' && (
                <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
                  <Input
                    id="cash-amount-input"
                    label="¿Con cuánto vas a pagar? (Opcional, para llevar cambio)"
                    type="number"
                    min={finalTotal}
                    step={1000}
                    placeholder={`Ej. ${Math.ceil(finalTotal / 10000) * 10000 || 50000}`}
                    value={cashAmountInput}
                    onChange={(e) => setCashAmountInput(e.target.value)}
                    leftIcon={<Banknote className="w-4 h-4" />}
                    error={cashInputError}
                  />

                  {quickCashOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {quickCashOptions.map((amount) => {
                        const isExact = amount === finalTotal;
                        const isSelected = parsedCashAmount === amount;
                        return (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setCashAmountInput(String(amount))}
                            className={cn(
                              'rounded-xl px-2.5 py-1.5 text-xs font-bold border transition-colors duration-200 cursor-pointer',
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-400',
                            )}
                          >
                            {isExact ? 'Pago exacto' : formatCurrency(amount)}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {parsedCashAmount !== undefined && !cashInputError && (
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 pt-1 border-t border-emerald-200/70 dark:border-emerald-900/60">
                      <span>
                        {estimatedChange === 0
                          ? 'Pago exacto · Sin devueltas'
                          : 'Vueltas que llevará el repartidor:'}
                      </span>
                      {estimatedChange > 0 && (
                        <span className="font-heading text-sm font-extrabold">
                          {formatCurrency(estimatedChange)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Coupon Input Box */}
            <CouponInputBox orderTotal={subtotal} />

            {/* Financial Breakdown */}
            <div className="space-y-2.5 border-t border-b border-slate-200 dark:border-slate-800 py-4 text-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal productos</span>
                <span className="font-semibold">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Costo de domicilio</span>
                <span className="text-xs font-bold uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  Gratis Promo
                </span>
              </div>

              {riderDiscount > 0 && riderQuota && (
                <div className="flex items-center justify-between text-blue-600 font-bold">
                  <span>
                    Beneficio Socio Mensajero (-10% · {riderQuota.remaining}/
                    {riderQuota.monthlyLimit} disp.)
                  </span>
                  <span>-{formatCurrency(riderDiscount)}</span>
                </div>
              )}

              {isRider && riderQuota && !riderQuota.eligible && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Cupo mensual -10% repartidor agotado (
                    {riderQuota.usedThisMonth}/{riderQuota.monthlyLimit})
                  </span>
                  <span>$0</span>
                </div>
              )}

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

            {!hasValidPhone && (
              <div
                role="region"
                aria-label="Aviso de celular obligatorio"
                className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 p-4 space-y-3"
              >
                <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <Phone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      Número de celular obligatorio para pedir
                    </p>
                    <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                      Registraste tu cuenta sin teléfono. Ingresa tu celular
                      para coordinar la entrega y desbloquear la confirmación.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
                  <div className="flex-1">
                    <Input
                      aria-label="Número de celular obligatorio"
                      type="tel"
                      placeholder="Ej. 300 123 4567"
                      value={inlinePhone}
                      onChange={(e) => {
                        setInlinePhone(e.target.value);
                        if (inlinePhoneError) setInlinePhoneError(undefined);
                      }}
                      leftIcon={<Phone className="w-4 h-4" />}
                      error={inlinePhoneError}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    isLoading={isSavingPhone}
                    onClick={handleSaveInlinePhone}
                    className="sm:mt-0.5 shrink-0"
                  >
                    Guardar celular y continuar
                  </Button>
                </div>
              </div>
            )}

            {/* Primary Smart Action Button */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={createOrderMutation.isPending || isRedirectingMp}
                disabled={
                  createOrderMutation.isPending ||
                  isRedirectingMp ||
                  !hasValidPhone ||
                  Boolean(cashInputError)
                }
                onClick={handleConfirmOrder}
                leftIcon={
                  paymentMethod === 'MERCADOPAGO' ? (
                    <CreditCard className="w-5 h-5" />
                  ) : (
                    <Banknote className="w-5 h-5" />
                  )
                }
              >
                {paymentMethod === 'MERCADOPAGO'
                  ? 'Confirmar y Pagar con MercadoPago'
                  : 'Confirmar Pedido Contraentrega'}
              </Button>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3.5 flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
              <Lock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              {paymentMethod === 'MERCADOPAGO' ? (
                <p>
                  Al confirmar, registraremos tu pedido y te llevaremos a{' '}
                  <strong>MercadoPago Checkout Pro</strong> para pagar con
                  tarjeta, PSE o Nequi de forma protegida.
                </p>
              ) : (
                <p>
                  Tu pedido se enviará directo a confirmación del local. Ten
                  listo el efectivo por{' '}
                  <strong>{formatCurrency(finalTotal)}</strong> al momento de la
                  entrega.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
