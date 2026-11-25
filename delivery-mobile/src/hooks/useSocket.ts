import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { WS_BASE_URL } from '@/config/env';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import { formatCurrency } from '@/utils/formatters';

interface OrderStatusPayload {
  orderId: string;
  status: string;
}

interface DeliveryLocationPayload {
  orderId: string;
  lat: number;
  lng: number;
  updatedAt?: string;
}

interface AvailableOrderPayload {
  orderId: string;
  deliveryFee?: number;
  address?: string;
}

export function useSocket(options?: {
  playRiderAlerts?: boolean;
  onLocationUpdate?: (payload: DeliveryLocationPayload) => void;
}) {
  const queryClient = useQueryClient();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [connected, setConnected] = useState(false);
  const playAlertsRef = useRef(Boolean(options?.playRiderAlerts));
  const onLocationRef = useRef(options?.onLocationUpdate);

  playAlertsRef.current = Boolean(options?.playRiderAlerts);
  onLocationRef.current = options?.onLocationUpdate;

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setConnected(false);
      return;
    }

    const socket: Socket = io(WS_BASE_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('order_status_updated', (payload: OrderStatusPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      if (payload?.orderId) {
        void queryClient.invalidateQueries({
          queryKey: ['order', payload.orderId],
        });
      }
      toast.info('Actualización de tu pedido', {
        description: `Nuevo estado: ${payload?.status ?? 'Actualizado'}`,
      });
    });

    socket.on('delivery_location_updated', (payload: DeliveryLocationPayload) => {
      onLocationRef.current?.(payload);
    });

    socket.on('new_available_order', (payload: AvailableOrderPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
      if (playAlertsRef.current) {
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => undefined);
        }
        const earning =
          payload?.deliveryFee && payload.deliveryFee > 0
            ? payload.deliveryFee
            : 5000;
        toast.success('¡Nuevo pedido disponible!', {
          description: `Ganancia envío +${formatCurrency(earning)}${
            payload?.address ? ` · ${payload.address}` : ''
          }`,
        });
      }
    });

    socket.on('order_taken', () => {
      void queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
    });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !socket.connected) {
        socket.connect();
      }
    });

    return () => {
      appStateSub.remove();
      socket.disconnect();
      setConnected(false);
    };
  }, [accessToken, isAuthenticated, queryClient]);

  return { connected };
}
