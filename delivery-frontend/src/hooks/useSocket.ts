import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { playNotificationSound } from '@/utils/sound';
import { showOrderStatusNotification } from '@/utils/browserNotifications';
import type { Order } from '@/types/order.types';
import type { OrderStatus } from '@/types/api.types';

export interface DeliveryLocation {
  orderId: string;
  lat: number;
  lng: number;
}

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  PENDING: 'Tu pedido está pendiente de pago.',
  PAID: 'Pago confirmado. Esperando confirmación del local.',
  FAILED: 'El pago fue rechazado. Puedes reintentarlo.',
  CONFIRMED: 'El restaurante confirmó tu pedido.',
  PREPARING: 'Tu pedido se está preparando en cocina.',
  OUT_FOR_DELIVERY: '¡Tu repartidor va en camino!',
  DELIVERED: '¡Pedido entregado! Ya puedes calificar tus platos.',
  CANCELLED: 'Tu pedido fue cancelado.',
};

export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

/**
 * Conexión Socket.io autenticada con EventsGateway.
 * - Envía el JWT en `auth.token` (el navegador no permite headers custom en WS).
 * - Se reconecta con el nuevo token cuando el Refresh Token lo rota.
 * - `order_status_updated` -> actualiza caché, toast y sonido.
 * - `delivery_location_updated` -> guarda posición en caché ['delivery-location', orderId].
 */
export function useSocket(): { connected: boolean } {
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();
  const [connected, setConnected] = useState(false);

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

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [accessToken, isAuthenticated, queryClient]);

  return { connected };
}
