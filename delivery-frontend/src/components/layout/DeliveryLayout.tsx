import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BarChart3,
  Bike,
  Car,
  Clock,
  LogOut,
  Navigation,
  PackageCheck,
  Power,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  createDeliveryProfileApi,
  getDeliveryProfileApi,
  updateAvailabilityApi,
} from '@/api/endpoints/delivery.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { DeliveryProfile, VehicleType } from '@/types/delivery.types';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

export interface DeliveryOutletContext {
  profile: DeliveryProfile;
  onToggleAvailability: (next: boolean) => void;
  isTogglingAvailability: boolean;
}

const VEHICLES: { value: VehicleType; label: string; icon: React.ReactNode }[] =
  [
    { value: 'MOTO', label: 'Moto', icon: <Bike className="w-5 h-5" /> },
    { value: 'BICYCLE', label: 'Bicicleta', icon: <Bike className="w-5 h-5" /> },
    { value: 'CAR', label: 'Carro', icon: <Car className="w-5 h-5" /> },
  ];

function RiderOnboarding({
  initialVehicle = 'MOTO',
  initialPlate = '',
  rejectionReason,
}: {
  initialVehicle?: VehicleType;
  initialPlate?: string;
  rejectionReason?: string;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [vehicleType, setVehicleType] = useState<VehicleType>(initialVehicle);
  const [plate, setPlate] = useState(initialPlate);

  const mutation = useMutation({
    mutationFn: () => {
      const cleanPlate = plate.trim() || undefined;
      return createDeliveryProfileApi({
        vehicleType,
        plate: cleanPlate,
        licensePlate: cleanPlate,
        phone: user?.phone || undefined,
      });
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(['delivery-profile'], profile);
      toast.success(
        profile.status === 'PENDING'
          ? 'Solicitud enviada para revisión del Administrador'
          : '¡Perfil de repartidor listo!',
      );
    },
    onError: (err) =>
      toast.error('No se pudo enviar la solicitud', {
        description: extractErrorMessage(err),
      }),
  });

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
      <div>
        <h2 className="font-heading text-xl font-extrabold">
          {rejectionReason
            ? 'Reenviar solicitud de repartidor'
            : 'Bienvenido, repartidor'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Registra tu vehículo para que el administrador verifique tu cuenta y
          puedas empezar a recibir pedidos.
        </p>
      </div>

      {rejectionReason && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 p-3.5 flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300"
        >
          <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-bold">Tu solicitud anterior fue rechazada</p>
            <p>{rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {VEHICLES.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => setVehicleType(v.value)}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center gap-2 text-xs font-bold cursor-pointer transition-colors duration-200',
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
        label="Placa (opcional en bicicleta)"
        placeholder="ABC-123"
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
      />

      <Button
        className="w-full"
        isLoading={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {rejectionReason ? 'Volver a enviar solicitud' : 'Enviar solicitud'}
      </Button>
    </div>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex flex-col items-center justify-center gap-1 text-xs cursor-pointer transition-colors duration-200',
    isActive
      ? 'text-blue-600 dark:text-blue-400 font-semibold'
      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
  );

export function DeliveryLayout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    useCartDrawerStore.getState().resetCartUi();
    queryClient.clear();
    toast.success('Sesión cerrada correctamente.');
    navigate('/login');
  };

  const {
    data: profile,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['delivery-profile'],
    queryFn: getDeliveryProfileApi,
    retry: false,
  });

  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const needsOnboarding = status === 404;
  const forbidden = status === 403;

  const isPendingApproval = profile?.status === 'PENDING';
  const isRejected = profile?.status === 'REJECTED';
  const isApproved = Boolean(profile) && !isPendingApproval && !isRejected;

  const availabilityMutation = useMutation({
    mutationFn: (next: boolean) => updateAvailabilityApi(next),
    onSuccess: (updated) => {
      queryClient.setQueryData(['delivery-profile'], updated);
      toast.success(
        updated.isAvailable
          ? 'Estás en línea (Disponible para pedidos)'
          : 'Te desconectaste (No recibirás pedidos)',
      );
    },
    onError: (err) =>
      toast.error('No se pudo cambiar la disponibilidad', {
        description: extractErrorMessage(err),
      }),
  });

  const isOnline = Boolean(isApproved && profile?.isAvailable);
  const resolvedPlate = profile?.licensePlate || profile?.plate;

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
              {isPendingApproval ? (
                <Badge variant="warning">En revisión</Badge>
              ) : isRejected ? (
                <Badge variant="danger">Rechazada</Badge>
              ) : (
                <Badge variant={isOnline ? 'success' : 'neutral'}>
                  {isOnline ? 'En Línea' : 'Desconectado'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profile
                ? `${profile.vehicleType}${resolvedPlate ? ` · ${resolvedPlate}` : ''}`
                : 'Rol DELIVERY'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isApproved && (
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
          <Link
            to="/"
            className="group inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-orange-200 hover:bg-orange-50/60 hover:text-orange-600 transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-600 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="hidden sm:inline">Catálogo</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Cerrar sesión"
            className="h-9 w-9 text-slate-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 pb-24">
        {isLoading ? (
          <p className="text-center text-sm text-slate-500 py-16">
            Cargando perfil de repartidor...
          </p>
        ) : needsOnboarding ? (
          <RiderOnboarding />
        ) : isPendingApproval ? (
          <div
            role="status"
            className="rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card space-y-4 text-center"
          >
            <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-heading text-xl font-extrabold text-slate-900 dark:text-white">
                Solicitud en revisión por el Administrador
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Recibimos tu registro ({profile?.vehicleType}
                {resolvedPlate ? ` · ${resolvedPlate}` : ''}). Apenas un
                administrador apruebe tu cuenta podrás activar tu estado Online
                y aceptar entregas.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                isLoading={isFetching}
                onClick={() => void refetch()}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Verificar estado
              </Button>
              <Link to="/">
                <Button variant="outline" size="sm">
                  Volver al catálogo
                </Button>
              </Link>
            </div>
          </div>
        ) : isRejected && profile ? (
          <RiderOnboarding
            initialVehicle={profile.vehicleType}
            initialPlate={resolvedPlate ?? ''}
            rejectionReason={
              profile.rejectionReason ||
              'El administrador rechazó la solicitud anterior. Verifica los datos de tu vehículo e inténtalo de nuevo.'
            }
          />
        ) : forbidden ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-5 flex gap-3 text-sm text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p>
              Tu usuario aún no tiene rol <strong>DELIVERY</strong> aprobado.
              Solicita tu ingreso desde tu perfil o inicia sesión con una cuenta
              de repartidor aprobada.
            </p>
          </div>
        ) : error ? (
          <p className="text-center text-sm text-red-600 py-16">
            {extractErrorMessage(error)}
          </p>
        ) : profile ? (
          <Outlet
            context={
              {
                profile,
                onToggleAvailability: (next: boolean) =>
                  availabilityMutation.mutate(next),
                isTogglingAvailability: availabilityMutation.isPending,
              } satisfies DeliveryOutletContext
            }
          />
        ) : null}
      </main>

      {isApproved && (
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
      )}
    </div>
  );
}
