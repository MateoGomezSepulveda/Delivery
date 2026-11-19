import { useQuery } from '@tanstack/react-query';
import { getRiderDiscountQuotaApi } from '@/api/endpoints/orders.api';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Consulta el cupo mensual real del beneficio -10% de repartidores (máx. 4 pedidos/mes)
 * directamente desde el backend para evitar mostrar descuentos agotados en CartDrawer/Checkout.
 */
export function useRiderDiscountQuota() {
  const { isAuthenticated, user } = useAuthStore();
  const isRider = Boolean(isAuthenticated && user?.role === 'DELIVERY');

  return useQuery({
    queryKey: ['rider-discount-quota', user?._id],
    queryFn: getRiderDiscountQuotaApi,
    enabled: isRider,
    staleTime: 60_000,
    retry: false,
  });
}
