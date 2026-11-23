import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_DELIVERY_FEE,
  getDeliveryFeeApi,
} from '@/api/endpoints/orders.api';

interface UseDeliveryFeeOptions {
  address?: string;
  subtotal?: number;
  enabled?: boolean;
}

/**
 * Consulta la tarifa de domicilio vigente desde el backend (GET /orders/delivery-fee).
 * Usa DEFAULT_DELIVERY_FEE ($5.000 COP) como fallback inmediato mientras responde la API
 * para evitar saltos visuales (CLS) y queda listo para tarifas dinámicas por dirección/subtotal.
 */
export function useDeliveryFee({
  address,
  subtotal,
  enabled = true,
}: UseDeliveryFeeOptions = {}) {
  const normalizedAddress =
    address && address !== 'Seleccionar dirección de entrega'
      ? address.trim()
      : undefined;

  const query = useQuery({
    queryKey: ['delivery-fee', normalizedAddress ?? '', subtotal ?? 0],
    queryFn: () =>
      getDeliveryFeeApi({
        ...(normalizedAddress ? { address: normalizedAddress } : {}),
        ...(typeof subtotal === 'number' && subtotal > 0 ? { subtotal } : {}),
      }),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const deliveryFee =
    typeof query.data?.deliveryFee === 'number' && query.data.deliveryFee >= 0
      ? query.data.deliveryFee
      : DEFAULT_DELIVERY_FEE;

  return {
    ...query,
    deliveryFee,
    pricingMode: query.data?.pricingMode ?? 'FLAT',
  };
}
