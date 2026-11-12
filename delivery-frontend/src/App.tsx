import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { AppRouter } from '@/routes/AppRouter';
import { useThemeStore } from '@/store/useThemeStore';
import { useAuthStore } from '@/store/useAuthStore';

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
  const { hydrateSession, logout } = useAuthStore();

  useEffect(() => {
    hydrateSession();

    const handleSessionExpired = () => {
      logout();
      queryClient.clear();
      toast.error('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () =>
      window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [hydrateSession, logout]);

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
