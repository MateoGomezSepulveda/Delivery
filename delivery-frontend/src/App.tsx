import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { AppRouter } from '@/routes/AppRouter';
import { useThemeStore } from '@/store/useThemeStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos por defecto
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  const { resolvedTheme } = useThemeStore();
  const { hydrateSession, logout, user } = useAuthStore();
  const previousUserIdRef = useRef<string | null>(user?._id ?? null);

  useEffect(() => {
    hydrateSession();

    const handleSessionExpired = () => {
      logout();
      useCartDrawerStore.getState().resetCartUi();
      queryClient.clear();
      toast.error('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () =>
      window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [hydrateSession, logout]);

  // Limpia la caché de React Query si cambia de usuario o cierra sesión por cualquier vía
  useEffect(() => {
    const currentUserId = user?._id ?? null;
    if (
      previousUserIdRef.current !== null &&
      previousUserIdRef.current !== currentUserId
    ) {
      queryClient.clear();
    }
    previousUserIdRef.current = currentUserId;
  }, [user?._id]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster
        theme={resolvedTheme}
        position="top-right"
        richColors
        closeButton
      />
    </QueryClientProvider>
  );
}

export default App;
