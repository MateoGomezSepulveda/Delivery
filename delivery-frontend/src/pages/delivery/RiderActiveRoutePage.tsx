import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Crosshair,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  PlayCircle,
  Satellite,
  StopCircle,
} from 'lucide-react';
import {
  deliverOrderApi,
  getActiveOrdersApi,
  updateLocationApi,
} from '@/api/endpoints/delivery.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { DeliveryOutletContext } from '@/components/layout/DeliveryLayout';
import type { DeliveryOrder } from '@/types/delivery.types';
import { formatCurrency } from '@/utils/formatters';
import { formatPhoneDisplay } from '@/utils/phone';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';

type Mode = 'off' | 'gps' | 'sim';

const BOGOTA = { lat: 4.711, lng: -74.0721 };
const SIM_STEPS = 30;
const SEND_EVERY_MS = 3000;

function sanitizePhoneForWhatsApp(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  return digits;
}

function buildGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function buildWazeUrl(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function RiderActiveRoutePage() {
  const queryClient = useQueryClient();
  const { profile } = useOutletContext<DeliveryOutletContext>();

  const [mode, setMode] = useState<Mode>('off');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    profile.currentLocation ?? null,
  );
  const [sentCount, setSentCount] = useState(0);
  const [orderToConfirm, setOrderToConfirm] = useState<DeliveryOrder | null>(
    null,
  );
  const [cashCollectedConfirmed, setCashCollectedConfirmed] = useState(false);
  const lastSentRef = useRef(0);
  const simRef = useRef<number | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['delivery-active'],
    queryFn: getActiveOrdersApi,
    refetchInterval: 15_000,
  });

  const sendLocation = useCallback(async (lat: number, lng: number) => {
    setPosition({ lat, lng });
    const now = Date.now();
    if (now - lastSentRef.current < SEND_EVERY_MS) return;
    lastSentRef.current = now;
    try {
      await updateLocationApi(lat, lng);
      setSentCount((c) => c + 1);
    } catch (err) {
      toast.error('No se pudo enviar la ubicación', {
        description: extractErrorMessage(err),
      });
    }
  }, []);

  // GPS real
  useEffect(() => {
    if (mode !== 'gps') return;
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      setMode('off');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => void sendLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        toast.error('No se pudo leer el GPS', { description: err.message });
        setMode('off');
      },
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [mode, sendLocation]);

  // Simulador: camina en línea recta ~1.5 km hacia un destino ficticio
  useEffect(() => {
    if (mode !== 'sim') return;
    const start = position ?? BOGOTA;
    const target = { lat: start.lat + 0.01, lng: start.lng + 0.01 };
    let step = 0;
    simRef.current = window.setInterval(() => {
      step += 1;
      const t = step / SIM_STEPS;
      lastSentRef.current = 0;
      void sendLocation(
        start.lat + (target.lat - start.lat) * t,
        start.lng + (target.lng - start.lng) * t,
      );
      if (step >= SIM_STEPS) {
        if (simRef.current) window.clearInterval(simRef.current);
        setMode('off');
        toast.info('El simulador llegó al destino');
      }
    }, SEND_EVERY_MS);
    return () => {
      if (simRef.current) window.clearInterval(simRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sendLocation]);

  const deliverMutation = useMutation({
    mutationFn: (id: string) => deliverOrderApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-active'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-history'] });
      setOrderToConfirm(null);
      setCashCollectedConfirmed(false);
      toast.success('¡Entrega confirmada con éxito!');
    },
    onError: (err) =>
      toast.error('No se pudo marcar como entregado', {
        description: extractErrorMessage(err),
      }),
  });

  const confirmCustomer =
    orderToConfirm && typeof orderToConfirm.userId === 'object'
      ? orderToConfirm.userId
      : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
          Ruta activa
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Contacta al cliente, abre tu ruta en Google Maps o Waze y transmite tu
          ubicación en vivo.
        </p>
      </div>

      {/* Transmisor GPS */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-blue-600" />
            <h2 className="font-heading font-extrabold">Emisor de ubicación</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {mode === 'off'
              ? 'Apagado'
              : mode === 'gps'
                ? 'GPS real'
                : 'Simulador'}{' '}
            · {sentCount} envíos
          </span>
        </div>

        {position && (
          <p className="text-xs font-mono text-slate-500">
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={mode === 'gps' ? 'danger' : 'primary'}
            onClick={() => setMode(mode === 'gps' ? 'off' : 'gps')}
            leftIcon={
              mode === 'gps' ? (
                <StopCircle className="w-4 h-4" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )
            }
          >
            {mode === 'gps' ? 'Detener GPS' : 'Usar mi GPS'}
          </Button>
          <Button
            variant={mode === 'sim' ? 'danger' : 'secondary'}
            onClick={() => setMode(mode === 'sim' ? 'off' : 'sim')}
            leftIcon={
              mode === 'sim' ? (
                <StopCircle className="w-4 h-4" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )
            }
          >
            {mode === 'sim' ? 'Detener' : 'Simular ruta'}
          </Button>
        </div>
        <p className="text-[11px] text-slate-400">
          El simulador mueve tu posición paso a paso (cada 3 s) para probar el
          tracking del cliente desde tu PC.
        </p>
      </section>

      {isLoading ? (
        <p className="text-center text-sm text-slate-500 py-10">Cargando...</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Navigation className="w-7 h-7" />}
          title="No tienes entregas en curso"
          description="Acepta un pedido en la pestaña Disponibles para iniciar una ruta."
        />
      ) : (
        orders.map((order) => {
          const customer =
            typeof order.userId === 'object' && order.userId !== null
              ? order.userId
              : null;
          const customerPhone = customer?.phone;
          const waPhone = sanitizePhoneForWhatsApp(customerPhone);
          const shortCode = order._id.slice(-8).toUpperCase();
          const waMessage = encodeURIComponent(
            `¡Hola ${customer?.name || ''}! Soy tu repartidor de DeliveryPro, voy en camino con tu pedido #${shortCode}.`,
          );

          return (
            <article
              key={order._id}
              className="rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-extrabold uppercase text-blue-600 dark:text-blue-400">
                    #{shortCode}
                  </span>
                  {customer && (
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {customer.name}
                    </p>
                  )}
                  {customerPhone && (
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Celular: {formatPhoneDisplay(customerPhone)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="block font-heading text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    +
                    {formatCurrency(
                      order.deliveryFee && order.deliveryFee > 0
                        ? order.deliveryFee
                        : 5000,
                    )}
                  </span>
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Ganancia envío
                  </span>
                </div>
              </div>

              {order.paymentMethod === 'CASH_ON_DELIVERY' ? (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/90 dark:bg-amber-950/35 px-3.5 py-2.5 space-y-1 text-xs">
                  <p className="inline-flex items-center gap-1.5 font-extrabold text-amber-900 dark:text-amber-200">
                    <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    Cobrar en efectivo al entregar: {formatCurrency(order.total)}
                  </p>
                  {order.cashAmountGiven && order.cashAmountGiven > 0 ? (
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      El cliente paga con {formatCurrency(order.cashAmountGiven)}
                      {order.changeDue && order.changeDue > 0
                        ? ` · Llevar vueltas: ${formatCurrency(order.changeDue)}`
                        : ' · Pago exacto'}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 px-3.5 py-2 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pagado en línea · No cobrar al cliente</span>
                </div>
              )}

              {/* Dirección de entrega */}
              <div className="flex items-start gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="text-slate-800 dark:text-slate-200">
                  {order.address}
                </span>
              </div>

              {/* Contacto directo con el cliente */}
              {customerPhone && (
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`tel:${customerPhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-blue-400 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 transition-colors duration-200 cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span>Llamar al cliente</span>
                  </a>
                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}?text=${waMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors duration-200 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              )}

              {/* Navegación GPS externa: Google Maps & Waze */}
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={buildGoogleMapsUrl(order.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/70 dark:bg-orange-950/30 px-3 py-2.5 text-xs font-bold text-orange-800 dark:text-orange-300 hover:bg-orange-100/80 transition-colors duration-200 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-orange-600" />
                  <span>Abrir en Google Maps</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
                <a
                  href={buildWazeUrl(order.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 px-3 py-2.5 text-xs font-bold text-sky-800 dark:text-sky-300 hover:bg-sky-100/80 transition-colors duration-200 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-sky-600" />
                  <span>Abrir en Waze</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>

              <Button
                className="w-full h-12 text-base"
                isLoading={
                  deliverMutation.isPending &&
                  deliverMutation.variables === order._id
                }
                onClick={() => {
                  setCashCollectedConfirmed(false);
                  setOrderToConfirm(order);
                }}
                leftIcon={<CheckCircle2 className="w-5 h-5" />}
              >
                Marcar como Entregado
              </Button>
            </article>
          );
        })
      )}

      {/* Modal de confirmación antes de cerrar una entrega */}
      <Modal
        isOpen={Boolean(orderToConfirm)}
        onClose={() => {
          setOrderToConfirm(null);
          setCashCollectedConfirmed(false);
        }}
        title="Confirmar entrega completada"
        description="Verifica que entregaste todos los productos al cliente antes de finalizar esta ruta."
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOrderToConfirm(null);
                setCashCollectedConfirmed(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={
                orderToConfirm?.paymentMethod === 'CASH_ON_DELIVERY' &&
                !cashCollectedConfirmed
              }
              isLoading={deliverMutation.isPending}
              onClick={() => {
                if (orderToConfirm) {
                  deliverMutation.mutate(orderToConfirm._id);
                }
              }}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Sí, confirmar entrega
            </Button>
          </div>
        }
      >
        {orderToConfirm && (
          <div className="space-y-3 text-sm">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-extrabold uppercase text-blue-600">
                  Pedido #{orderToConfirm._id.slice(-8).toUpperCase()}
                </span>
                <span className="font-heading font-extrabold text-emerald-600 dark:text-emerald-400">
                  Envío: +
                  {formatCurrency(
                    orderToConfirm.deliveryFee && orderToConfirm.deliveryFee > 0
                      ? orderToConfirm.deliveryFee
                      : 5000,
                  )}
                </span>
              </div>
              {confirmCustomer && (
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Cliente: {confirmCustomer.name}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dirección: {orderToConfirm.address}
              </p>
            </div>

            {orderToConfirm.paymentMethod === 'CASH_ON_DELIVERY' && (
              <label
                htmlFor="confirm-cash-collected"
                className="flex items-start gap-2.5 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 cursor-pointer"
              >
                <input
                  id="confirm-cash-collected"
                  type="checkbox"
                  checked={cashCollectedConfirmed}
                  onChange={(e) => setCashCollectedConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>
                  <strong>
                    Confirmo que recibí {formatCurrency(orderToConfirm.total)} en
                    efectivo
                  </strong>{' '}
                  del cliente
                  {orderToConfirm.changeDue && orderToConfirm.changeDue > 0
                    ? ` (vueltas entregadas: ${formatCurrency(orderToConfirm.changeDue)})`
                    : ''}
                  .
                </span>
              </label>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Al confirmar, el pedido pasará a estado <strong>DELIVERED</strong>{' '}
              y se notificará automáticamente al cliente.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
