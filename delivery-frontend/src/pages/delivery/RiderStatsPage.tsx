import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Truck } from 'lucide-react';
import { getDeliveryStatsApi } from '@/api/endpoints/delivery.api';

export function RiderStatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: getDeliveryStatsApi,
  });

  const cards = [
    {
      label: 'Entregas completadas',
      value: data?.delivered ?? 0,
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'En curso',
      value: data?.inProgress ?? 0,
      icon: <Truck className="w-6 h-6" />,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
    },
  ];

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-extrabold">Mis métricas</h1>
      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3"
            >
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center ${c.color}`}
              >
                {c.icon}
              </div>
              <p className="font-heading text-4xl font-extrabold">{c.value}</p>
              <p className="text-xs font-semibold text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
