import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { playNotificationSound } from '@/utils/sound';
import { showOrderStatusNotification } from '@/utils/browserNotifications';
import { formatCurrency } from '@/utils/formatters';
import type { Order } from '@/types/order.types';
import type { OrderStatus } from '@/types/api.types';

export interface DeliveryLocation {
  orderId: string;
  lat: number;
  lng: number;
}

export interface UseSocketOptions {
  /**
   * Activa alertas sonoras, toast y notificaciones del navegador cuando llegan
   * nuevos pedidos disponibles (`new_available_order`). En el portal del
   * repartidor se enlaza con el estado Online (`isAvailable === true`).
   */
  playRiderAlerts?: boolean;
}

const DEFAULT_DELIVERY_FEE = 5000;

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  PENDING: 'Tu pedido está pendiente de pago.',
  PAID: 'Pago confirmado. Esperando confirmación del local.',
  FAILED: 'El pago fue rechazado. Puedes reintentarlo.',
  CONFIRMED: 'El local confirmó tu pedido.',
  PREPARING: 'Tu pedido se está alistando para envío.',
  OUT_FOR_DELIVERY: '¡Tu repartidor va en camino!',
  DELIVERED: '¡Pedido entregado! Ya puedes calificar tus productos.',
  CANCELLED: 'Tu pedido fue cancelado.',
};

export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

/**
 * Conexión Socket.io autenticada con EventsGateway.
 * - Envía el JWT en `auth.token` (el navegador no permite headers custom en WS).
 * - Se reconecta con el nuevo token cuando el Refresh Token lo rota.
 * - `order_status_updated` -> actualiza caché, toast y sonido.
 * - `delivery_location_updated` -> guarda posición en caché ['delivery-location', orderId].
 * - `new_available_order` -> invalida lista de disponibles y, si `playRiderAlerts` es true, dispara alerta con sonido.
 * - `order_taken` -> remueve al instante el pedido ya tomado de la lista de disponibles.
 */
export function useSocket(options?: UseSocketOptions): { connected: boolean } {
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();
  const [connected, setConnected] = useState(false);
  const playRiderAlertsRef = useRef(Boolean(options?.playRiderAlerts));

  useEffect(() => {
    playRiderAlertsRef.current = Boolean(options?.playRiderAlerts);
  }, [options?.playRiderAlerts]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setConnected(false);
      return;
    }

    const socket: Socket = io(WS_URL, {
      auth: { token: `Bearer ${accessToken}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('order_status_updated', (order: Order) => {
      if (!order?._id) return;
      queryClient.setQueryData<Order | undefined>(['order', order._id], (old) =>
        old ? { ...old, status: order.status } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['order', order._id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });

      toast.info(`Pedido #${order._id.slice(-6).toUpperCase()}`, {
        description: STATUS_MESSAGES[order.status] ?? order.status,
      });
      playNotificationSound();

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        void showOrderStatusNotification(
          `Pedido #${order._id.slice(-6).toUpperCase()}`,
          STATUS_MESSAGES[order.status] ?? order.status,
          order._id,
        );
      }
    });

    socket.on('delivery_location_updated', (loc: DeliveryLocation) => {
      if (!loc?.orderId) return;
      queryClient.setQueryData(['delivery-location', loc.orderId], loc);
    });

    socket.on('new_available_order', (order: Order) => {
      if (!order?._id) return;
      queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
      queryClient.invalidateQueries({ queryKey: ['rider-available-orders'] });

      if (!playRiderAlertsRef.current) return;

      const shortId = order._id.slice(-6).toUpperCase();
      const riderEarning =
        order.deliveryFee && order.deliveryFee > 0
          ? order.deliveryFee
          : DEFAULT_DELIVERY_FEE;
      const summary = `${order.address || 'Nueva entrega'} · Ganancia envío +${formatCurrency(riderEarning)}`;
      toast.success(`¡Nuevo pedido disponible #${shortId}!`, {
        description: summary,
      });
      playNotificationSound();

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        void showOrderStatusNotification(
          `Nuevo pedido disponible #${shortId}`,
          summary,
          order._id,
          '/delivery',
        );
      }
    });

    socket.on('order_taken', (payload: { orderId?: string }) => {
      if (!payload?.orderId) return;
      queryClient.setQueryData<Order[] | undefined>(
        ['delivery-available'],
        (prev) =>
          Array.isArray(prev)
            ? prev.filter((o) => o._id !== payload.orderId)
            : prev,
      );
      queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
      queryClient.invalidateQueries({ queryKey: ['rider-available-orders'] });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [accessToken, isAuthenticated, queryClient]);

  return { connected };
}
