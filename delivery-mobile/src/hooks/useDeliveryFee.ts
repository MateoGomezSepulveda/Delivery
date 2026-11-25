import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_DELIVERY_FEE,
  getDeliveryFeeApi,
} from '@/api/endpoints/orders.api';

export function useDeliveryFee({
  address,
  subtotal,
  enabled = true,
}: {
  address?: string;
  subtotal?: number;
  enabled?: boolean;
}) {
  const query = useQuery({
    queryKey: ['delivery-fee', address ?? '', subtotal ?? 0],
    queryFn: () => getDeliveryFeeApi({ address, subtotal }),
    enabled,
    staleTime: 60_000,
  });

  return {
    deliveryFee: query.data?.deliveryFee ?? DEFAULT_DELIVERY_FEE,
    isLoading: query.isLoading,
  };
}
