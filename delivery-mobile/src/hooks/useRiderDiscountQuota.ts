import { useQuery } from '@tanstack/react-query';
import { getRiderDiscountQuotaApi } from '@/api/endpoints/orders.api';
import { useAuthStore } from '@/store/useAuthStore';

export function useRiderDiscountQuota() {
  const { isAuthenticated, user } = useAuthStore();
  const isRider = isAuthenticated && user?.role === 'DELIVERY';

  return useQuery({
    queryKey: ['rider-discount-quota', user?._id],
    queryFn: getRiderDiscountQuotaApi,
    enabled: isRider,
    staleTime: 60_000,
  });
}
