import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Crosshair,
  MapPin,
  Navigation,
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
import type { DeliveryProfile } from '@/types/delivery.types';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

type Mode = 'off' | 'gps' | 'sim';

const BOGOTA = { lat: 4.711, lng: -74.0721 };
const SIM_STEPS = 30;
const SEND_EVERY_MS = 3000;

export function RiderActiveRoutePage() {
  const queryClient = useQueryClient();
  const { profile } = useOutletContext<{ profile: DeliveryProfile }>();

  const [mode, setMode] = useState<Mode>('off');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    profile.currentLocation ?? null,
  );
  const [sentCount, setSentCount] = useState(0);
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
      lastSentRef.current = 0; // el simulador envía cada tick
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
      toast.success('Pedido entregado');
    },
    onError: (err) =>
      toast.error('No se pudo marcar como entregado', {
        description: extractErrorMessage(err),
      }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">Ruta activa</h1>
        <p className="text-xs text-slate-500">
          Transmite tu ubicación al cliente mientras entregas.
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
          description="Acepta un pedido en la pestaña Disponibles."
        />
      ) : (
        orders.map((order) => {
          const customer =
            typeof order.userId === 'object' ? order.userId : null;
          return (
            <article
              key={order._id}
              className="rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-extrabold uppercase text-blue-600">
                    #{order._id.slice(-8).toUpperCase()}
                  </span>
                  {customer && (
                    <p className="text-sm font-semibold">{customer.name}</p>
                  )}
                </div>
                <span className="font-heading text-lg font-extrabold">
                  {formatCurrency(order.total)}
                </span>
              </div>

              <div className="flex items-start gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>{order.address}</span>
              </div>

              <Button
                className="w-full h-12 text-base"
                isLoading={
                  deliverMutation.isPending &&
                  deliverMutation.variables === order._id
                }
                onClick={() => deliverMutation.mutate(order._id)}
                leftIcon={<CheckCircle2 className="w-5 h-5" />}
              >
                Marcar como Entregado
              </Button>
            </article>
          );
        })
      )}
    </div>
  );
}
