import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppRouter } from '@/routes/AppRouter';
import { useThemeStore } from '@/store/useThemeStore';

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
