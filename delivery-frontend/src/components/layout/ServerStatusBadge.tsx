import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw, WifiOff } from 'lucide-react';
import { getServerHealth } from '@/api/endpoints/health.api';
import { cn } from '@/utils/cn';

export function ServerStatusBadge() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['server-health'],
    queryFn: getServerHealth,
    retry: 1,
    refetchInterval: 30000,
  });

  const isHealthy = !isError && data?.status === 'ok';

  return (
    <button
      type="button"
      onClick={() => refetch()}
      title="Haz clic para verificar el estado de GET /api/v1/health"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200 cursor-pointer',
        isLoading
          ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          : isHealthy
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300'
            : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800/60 dark:bg-red-950/60 dark:text-red-300',
      )}
    >
      {isLoading || isFetching ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : isHealthy ? (
        <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <WifiOff className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
      )}
      <span>
        {isLoading
          ? 'Verificando API...'
          : isHealthy
            ? 'API Online (Mongo OK)'
            : 'API Offline'}
      </span>
    </button>
  );
}
