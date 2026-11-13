import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bike, Radio } from 'lucide-react';
import type { DeliveryLocation } from '@/hooks/useSocket';

interface LiveTrackingMapProps {
  orderId: string;
}

export function LiveTrackingMap({ orderId }: LiveTrackingMapProps) {
  // La posición la escribe useSocket en la caché al llegar delivery_location_updated
  const { data: location } = useQuery<DeliveryLocation | null>({
    queryKey: ['delivery-location', orderId],
    queryFn: () => null,
    enabled: false,
    initialData: null,
    staleTime: Infinity,
  });

  // Throttle del iframe para no recargar el mapa en cada tick
  const [shown, setShown] = useState<DeliveryLocation | null>(null);
  useEffect(() => {
    if (!location) return;
    const t = setTimeout(() => setShown(location), 1500);
    return () => clearTimeout(t);
  }, [location]);

  const d = 0.006;
  const src = shown
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${shown.lng - d},${shown.lat - d},${shown.lng + d},${shown.lat + d}&layer=mapnik&marker=${shown.lat},${shown.lng}`
    : null;

  return (
    <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5 text-blue-600" />
          <h3 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
            Tu repartidor en vivo
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          WebSocket
        </span>
      </div>

      {src ? (
        <>
          <iframe
            title="Ubicación del repartidor"
            src={src}
            className="w-full h-72 rounded-2xl border border-slate-200 dark:border-slate-700"
          />
          <p className="text-xs text-slate-500">
            Última posición: {shown!.lat.toFixed(5)}, {shown!.lng.toFixed(5)}
          </p>
        </>
      ) : (
        <div className="h-40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs text-slate-500 text-center px-4">
          Esperando la primera ubicación del repartidor
          (PATCH /delivery/location)...
        </div>
      )}
    </section>
  );
}
