import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BarChart3,
  Bike,
  Car,
  Navigation,
  PackageCheck,
  Power,
  ShieldAlert,
} from 'lucide-react';
import {
  createDeliveryProfileApi,
  getDeliveryProfileApi,
  updateAvailabilityApi,
} from '@/api/endpoints/delivery.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { VehicleType } from '@/types/delivery.types';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

const VEHICLES: { value: VehicleType; label: string; icon: React.ReactNode }[] =
  [
    { value: 'MOTO', label: 'Moto', icon: <Bike className="w-5 h-5" /> },
    { value: 'BICYCLE', label: 'Bicicleta', icon: <Bike className="w-5 h-5" /> },
    { value: 'CAR', label: 'Carro', icon: <Car className="w-5 h-5" /> },
  ];

function RiderOnboarding() {
  const queryClient = useQueryClient();
  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTO');
  const [plate, setPlate] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createDeliveryProfileApi({
        vehicleType,
        plate: plate.trim() || undefined,
      }),
    onSuccess: (profile) => {
      queryClient.setQueryData(['delivery-profile'], profile);
      toast.success('¡Perfil de repartidor creado!');
    },
    onError: (err) =>
      toast.error('No se pudo crear el perfil', {
        description: extractErrorMessage(err),
      }),
  });

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
      <div>
        <h2 className="font-heading text-xl font-extrabold">
          Bienvenido, repartidor
        </h2>
        <p className="text-sm text-slate-500">
          Registra tu vehículo para empezar a recibir pedidos.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {VEHICLES.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => setVehicleType(v.value)}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center gap-2 text-xs font-bold cursor-pointer transition-colors',
              vehicleType === v.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700',
            )}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>

      <Input
        label="Placa (opcional)"
        placeholder="ABC-123"
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
      />

      <Button
        className="w-full"
        isLoading={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        Crear perfil de repartidor
      </Button>
    </div>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex flex-col items-center justify-center gap-1 text-xs cursor-pointer',
    isActive
      ? 'text-blue-600 dark:text-blue-400 font-semibold'
      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
  );

export function DeliveryLayout() {
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['delivery-profile'],
    queryFn: getDeliveryProfileApi,
    retry: false,
  });

  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const needsOnboarding = status === 404;
  const forbidden = status === 403;

  const availabilityMutation = useMutation({
    mutationFn: (next: boolean) => updateAvailabilityApi(next),
    onSuccess: (updated) => {
      queryClient.setQueryData(['delivery-profile'], updated);
      toast.success(
        updated.isAvailable ? 'Estás en línea' : 'Te desconectaste',
      );
    },
    onError: (err) =>
      toast.error('No se pudo cambiar la disponibilidad', {
        description: extractErrorMessage(err),
      }),
  });

  const isOnline = Boolean(profile?.isAvailable);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-base font-bold">
                Rider Portal
              </span>
              <Badge variant={isOnline ? 'success' : 'neutral'}>
                {isOnline ? 'En Línea' : 'Desconectado'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profile
                ? `${profile.vehicleType}${profile.plate ? ` · ${profile.plate}` : ''}`
                : 'Rol DELIVERY'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile && (
            <button
              type="button"
              disabled={availabilityMutation.isPending}
              onClick={() => availabilityMutation.mutate(!isOnline)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60',
                isOnline
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          )}
          <ThemeToggle />
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cliente</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 pb-24">
        {isLoading ? (
          <p className="text-center text-sm text-slate-500 py-16">
            Cargando perfil de repartidor...
          </p>
        ) : needsOnboarding ? (
          <RiderOnboarding />
        ) : forbidden ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-5 flex gap-3 text-sm text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p>
              Tu usuario no tiene rol <strong>DELIVERY</strong>. El backend solo
              permite estos endpoints a repartidores. Inicia sesión con una
              cuenta con ese rol.
            </p>
          </div>
        ) : error ? (
          <p className="text-center text-sm text-red-600 py-16">
            {extractErrorMessage(error)}
          </p>
        ) : (
          <Outlet context={{ profile }} />
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto max-w-md grid grid-cols-3 h-16">
          <NavLink to="/delivery" end className={navClass}>
            <PackageCheck className="w-5 h-5" />
            <span>Disponibles</span>
          </NavLink>
          <NavLink to="/delivery/active" className={navClass}>
            <Navigation className="w-5 h-5" />
            <span>Ruta Activa</span>
          </NavLink>
          <NavLink to="/delivery/stats" className={navClass}>
            <BarChart3 className="w-5 h-5" />
            <span>Mis Métricas</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
