import React, { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight,
  Bell,
  Bike,
  Camera,
  Car,
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  UploadCloud,
  User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { updateUserApi } from '@/api/endpoints/users.api';
import { uploadImageToS3Api } from '@/api/endpoints/uploads.api';
import { refreshTokensApi } from '@/api/endpoints/auth.api';
import {
  createDeliveryProfileApi,
  getDeliveryProfileApi,
} from '@/api/endpoints/delivery.api';
import { getMyOrdersApi } from '@/api/endpoints/orders.api';
import { extractErrorMessage, getStoredTokens } from '@/api/axios.client';
import type { VehicleType } from '@/types/delivery.types';
import {
  getNotificationPermission,
  isFirebaseWebConfigured,
  requestBrowserNotificationPermission,
  showOrderStatusNotification,
  type BrowserNotificationPermission,
} from '@/utils/browserNotifications';
import { MyOrdersPage } from '@/pages/client/MyOrdersPage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, RoleBadge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

const RIDER_VEHICLES: {
  value: VehicleType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'MOTO',
    label: 'Motocicleta',
    desc: 'Entregas rápidas de largo alcance',
    icon: <Bike className="w-5 h-5" />,
  },
  {
    value: 'BICYCLE',
    label: 'Bicicleta',
    desc: 'Ideal para zonas cercanas sin placa',
    icon: <Bike className="w-5 h-5" />,
  },
  {
    value: 'CAR',
    label: 'Automóvil',
    desc: 'Pedidos grandes o lluvia',
    icon: <Car className="w-5 h-5" />,
  },
];

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: 'account' | 'orders' | 'rider' =
    tabParam === 'orders'
      ? 'orders'
      : tabParam === 'rider'
        ? 'rider'
        : 'account';

  const setActiveTab = (tab: 'account' | 'orders' | 'rider') => {
    if (tab === 'account') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, setSession, updateUserState, setUserAvatar, logout } =
    useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTO');
  const [plate, setPlate] = useState('');
  const [isActivatingRider, setIsActivatingRider] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [notifPermission, setNotifPermission] =
    useState<BrowserNotificationPermission>(() => getNotificationPermission());

  const isRider = user?.role === 'DELIVERY';

  const { data: deliveryProfile } = useQuery({
    queryKey: ['delivery-profile'],
    queryFn: getDeliveryProfileApi,
    enabled: Boolean(user && isRider),
    retry: false,
  });

  const { data: myOrdersThisMonth } = useQuery({
    queryKey: ['my-orders-rider-quota'],
    queryFn: () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return getMyOrdersApi({
        page: 1,
        limit: 20,
        dateFrom: startOfMonth.toISOString(),
      });
    },
    enabled: Boolean(user && isRider),
  });

  if (!user) return null;

  const monthlyNonCancelledCount =
    myOrdersThisMonth?.data?.filter((o) => o.status !== 'CANCELLED').length ?? 0;
  const remainingRiderDiscounts = Math.max(0, 4 - monthlyNonCancelledCount);

  const handleActivateRiderAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActivatingRider(true);
    try {
      const profile = await createDeliveryProfileApi({
        vehicleType,
        plate: plate.trim() || undefined,
      });
      queryClient.setQueryData(['delivery-profile'], profile);

      // Rotamos el JWT para que el nuevo access_token incluya role: 'DELIVERY'
      const { refreshToken } = getStoredTokens();
      if (refreshToken) {
        const rotated = await refreshTokensApi(refreshToken);
        setSession(rotated, { ...user, role: 'DELIVERY' });
      } else {
        updateUserState({ role: 'DELIVERY' });
      }

      toast.success('¡Felicidades! Ya eres Socio Repartidor en DeliveryPro', {
        description:
          'Tienes acceso a la Rider App y 10% de descuento automático en tus primeros 4 pedidos de cada mes.',
      });
    } catch (error) {
      toast.error('No se pudo activar tu cuenta de repartidor', {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsActivatingRider(false);
    }
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const uploaded = await uploadImageToS3Api(file, 'avatars');
      // Guardamos el DataURL optimizado para visualización inmediata (evita errores 403 si el bucket S3 es privado)
      setUserAvatar(user._id, uploaded.previewDataUrl || uploaded.url);
      toast.success('¡Foto de perfil actualizada con éxito!', {
        description: uploaded.url.startsWith('http')
          ? `Subida a S3: ${uploaded.url}`
          : 'Imagen normalizada a JPG y guardada en tu perfil.',
      });
    } catch (error) {
      toast.error('No se pudo subir la imagen a S3', {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('El nombre y el correo electrónico son obligatorios.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatedUser = await updateUserApi(user._id, {
        name: name.trim(),
        email: email.trim(),
      });
      updateUserState({
        name: updatedUser.name,
        email: updatedUser.email,
      });
      toast.success('Datos de perfil actualizados', {
        description: 'Validado por OwnershipGuard en PATCH /api/v1/users/:id',
      });
    } catch (error) {
      toast.error('Error al actualizar perfil', {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await updateUserApi(user._id, {
        password: newPassword,
      });
      setNewPassword('');
      setConfirmPassword('');
      toast.success('¡Contraseña actualizada correctamente!', {
        description: 'Re-hasheada con bcrypt en el servidor.',
      });
    } catch (error) {
      toast.error('Error al cambiar contraseña', {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleManualTokenRefresh = async () => {
    const { refreshToken } = getStoredTokens();
    if (!refreshToken) {
      toast.error('No hay refreshToken almacenado.');
      return;
    }

    setIsRefreshingToken(true);
    try {
      const rotated = await refreshTokensApi(refreshToken);
      setSession(rotated, user);
      toast.success('¡Rotación de Refresh Token exitosa!', {
        description:
          'POST /api/v1/auth/refresh emitió un nuevo par access_token + refresh_token.',
      });
    } catch (error) {
      toast.error('Error al rotar Refresh Token', {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Has cerrado sesión correctamente.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Profile Card + S3 Avatar Upload */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="relative group">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-24 w-24 rounded-3xl object-cover border-2 border-orange-500 shadow-md"
              />
            ) : (
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-orange-600 to-red-600 text-white font-heading text-2xl font-extrabold flex items-center justify-center shadow-warm">
                {initials}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              title="Subir nueva foto de perfil a AWS S3"
              className="absolute -bottom-2 -right-2 h-9 w-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.jfif,.jpeg,.jpg,.png,.webp,.avif"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {user.name}
              </h1>
              <RoleBadge role={user.role} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {user.email}
            </p>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500">
              ID MongoDB: {user._id}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isRider && (
            <Link to="/delivery">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Bike className="w-4 h-4" />}
              >
                Abrir Rider App
              </Button>
            </Link>
          )}
          <Button
            variant={activeTab === 'orders' ? 'primary' : 'outline'}
            size="sm"
            onClick={() =>
              setActiveTab(activeTab === 'orders' ? 'account' : 'orders')
            }
            leftIcon={
              <Package
                className={cn(
                  'w-4 h-4',
                  activeTab === 'orders' ? 'text-white' : 'text-orange-600',
                )}
              />
            }
          >
            Mis Pedidos
          </Button>
          <Button
            variant="outline"
            size="sm"
            isLoading={isUploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<UploadCloud className="w-4 h-4 text-orange-600" />}
          >
            Subir Avatar a S3
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Navigation Tabs inside Profile: Datos de Cuenta | Mis Pedidos | Modo Repartidor */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer',
            activeTab === 'account'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-orange-50/60 hover:text-orange-600',
          )}
        >
          <UserIcon className="w-4 h-4" />
          <span>Datos y Seguridad</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer',
            activeTab === 'orders'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-orange-50/60 hover:text-orange-600',
          )}
        >
          <Package className="w-4 h-4" />
          <span>Mis Pedidos</span>
        </button>
        {user.role !== 'ADMIN' && (
          <button
            type="button"
            onClick={() => setActiveTab('rider')}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer',
              activeTab === 'rider'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-blue-700 bg-blue-50/70 hover:bg-blue-100/80',
            )}
          >
            <Bike className="w-4 h-4" />
            <span>
              {isRider
                ? 'Beneficios Mensajero (-10%)'
                : 'Conviértete en Repartidor (-10%)'}
            </span>
          </button>
        )}
      </div>

      {activeTab === 'orders' ? (
        <section className="pt-2">
          <MyOrdersPage />
        </section>
      ) : activeTab === 'rider' ? (
        <section className="space-y-6 pt-2">
          {isRider ? (
            <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 text-white shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Membresía Socio Repartidor Activa
                  </span>
                  <h2 className="font-heading text-2xl sm:text-3xl font-extrabold">
                    ¡Eres Mensajero Oficial y Cliente Preferencial!
                  </h2>
                  <p className="text-sm text-blue-100 max-w-2xl">
                    Puedes trabajar entregando pedidos desde la{' '}
                    <strong>Rider App</strong> cuando quieras y, además, al pedir
                    comida para ti como cliente recibes automáticamente un{' '}
                    <strong>10% de descuento</strong> en tus primeros 4 pedidos de
                    cada mes.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 p-4 text-center shrink-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-100">
                    Descuentos -10% este mes
                  </span>
                  <span className="font-heading text-3xl font-extrabold block mt-0.5">
                    {remainingRiderDiscounts} / 4
                  </span>
                  <span className="text-[11px] text-blue-100">
                    disponibles para tus pedidos
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
                  <span className="text-xs text-blue-100 block">
                    Vehículo Registrado
                  </span>
                  <span className="text-base font-extrabold mt-0.5 block">
                    {deliveryProfile?.vehicleType || 'MOTO'}
                    {deliveryProfile?.plate
                      ? ` · Placa ${deliveryProfile.plate}`
                      : ''}
                  </span>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
                  <span className="text-xs text-blue-100 block">
                    Beneficio en Carrito y Checkout
                  </span>
                  <span className="text-base font-extrabold mt-0.5 block">
                    10% OFF Automático
                  </span>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
                  <span className="text-xs text-blue-100 block">
                    Estado en Rider App
                  </span>
                  <span className="text-base font-extrabold mt-0.5 block">
                    {deliveryProfile?.isAvailable
                      ? 'En línea (Recibiendo)'
                      : 'Modo Cliente'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/delivery">
                  <Button
                    variant="outline"
                    leftIcon={<Bike className="w-4 h-4" />}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="border-white bg-white text-blue-700 hover:bg-blue-50"
                  >
                    Ir a Rider App (Entregar Pedidos)
                  </Button>
                </Link>
                <Link to="/">
                  <Button
                    variant="outline"
                    leftIcon={<Tag className="w-4 h-4" />}
                    className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                  >
                    Pedir Comida con mi 10% OFF
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleActivateRiderAccount}
              className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    <Bike className="w-3.5 h-3.5" />
                    Programa de Socios Repartidores
                  </span>
                  <h2 className="font-heading text-2xl font-extrabold text-slate-900">
                    Trabaja como Mensajero y gana descuentos cada mes
                  </h2>
                  <p className="text-sm text-slate-500 max-w-2xl">
                    Activa tu perfil de repartidor en un clic sin perder tu
                    cuenta de cliente. Podrás tomar pedidos en la{' '}
                    <strong>Rider App</strong> cuando quieras y tendrás{' '}
                    <strong className="text-emerald-600">
                      10% de descuento automático en tus primeros 4 pedidos de
                      cada mes
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Elige tu medio de transporte
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {RIDER_VEHICLES.map((v) => {
                    const selected = vehicleType === v.value;
                    return (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => setVehicleType(v.value)}
                        className={cn(
                          'rounded-2xl border p-4 text-left transition-all cursor-pointer flex flex-col gap-2',
                          selected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-blue-300 text-slate-700',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'h-9 w-9 rounded-xl flex items-center justify-center',
                              selected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {v.icon}
                          </span>
                          {selected && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-sm block">
                            {v.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {v.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="max-w-sm">
                <Input
                  label="2. Placa del vehículo (Opcional en bicicleta)"
                  placeholder="Ej. ABC-123"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3 text-xs text-emerald-900">
                <Tag className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    Beneficio incluido al activarte hoy:
                  </span>
                  <span>
                    Seguirás pudiendo pedir comida en el catálogo como siempre,
                    pero el sistema te descontará automáticamente el{' '}
                    <strong>10%</strong> en tus primeros 4 pedidos de cada mes.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="submit"
                  variant="secondary"
                  size="lg"
                  isLoading={isActivatingRider}
                  leftIcon={<Bike className="w-5 h-5" />}
                >
                  Activar mi Cuenta de Mensajero Ahora
                </Button>
              </div>
            </form>
          )}
        </section>
      ) : (
        <>
          {/* Forms Grid: Personal Info & Password Change */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form 1: Datos Personales */}
            <form
              onSubmit={handleUpdateProfile}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5"
            >
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
                <UserIcon className="w-5 h-5 text-orange-600" />
                <div>
                  <h2 className="text-base font-bold">Información Personal</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Endpoint: <code>PATCH /api/v1/users/:id</code>
                  </p>
                </div>
              </div>

              <Input
                label="Nombre Completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<UserIcon className="w-4 h-4" />}
              />

              <Input
                label="Correo Electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                helperText="El backend valida que el correo no esté duplicado en otra cuenta."
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isSavingProfile}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Guardar Cambios
              </Button>
            </form>

            {/* Form 2: Cambiar Contraseña */}
            <form
              onSubmit={handleUpdatePassword}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5"
            >
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <div>
                  <h2 className="text-base font-bold">Seguridad y Contraseña</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Re-encriptación automática con <code>bcrypt</code>
                  </p>
                </div>
              </div>

              <Input
                label="Nueva Contraseña"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="Confirmar Nueva Contraseña"
                type="password"
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="secondary"
                isLoading={isSavingPassword}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Actualizar Contraseña
              </Button>
            </form>
          </div>

          {/* Browser Notifications & FCM Readiness Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-orange-600" />
                  <span>Notificaciones del Navegador (Web / Push SW)</span>
                </h3>
                {notifPermission === 'granted' ? (
                  <Badge variant="success">Activas en este navegador</Badge>
                ) : notifPermission === 'denied' ? (
                  <Badge variant="danger">Bloqueadas en navegador</Badge>
                ) : notifPermission === 'unsupported' ? (
                  <Badge variant="neutral">No soportado</Badge>
                ) : (
                  <Badge variant="warning">Permiso pendiente</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recibe alertas del estado de tu pedido en segundo plano vía{' '}
                <code>sw.js</code> / WebSocket.{' '}
                {isFirebaseWebConfigured()
                  ? 'Variables Firebase Web detectadas.'
                  : 'Push remoto FCM opcional pendiente de credenciales VITE_FIREBASE_*.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {notifPermission !== 'granted' &&
                notifPermission !== 'unsupported' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const next = await requestBrowserNotificationPermission();
                      setNotifPermission(next);
                      if (next === 'granted') {
                        toast.success('Notificaciones activadas en tu navegador');
                      } else {
                        toast.info('Permiso de notificaciones no concedido');
                      }
                    }}
                    leftIcon={<Bell className="w-4 h-4" />}
                  >
                    Activar Alertas
                  </Button>
                )}
              {notifPermission === 'granted' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await showOrderStatusNotification(
                      'DeliveryPro — Prueba de Alerta',
                      'Las notificaciones de pedidos están funcionando correctamente.',
                    );
                  }}
                  leftIcon={<Bell className="w-4 h-4" />}
                >
                  Probar Notificación
                </Button>
              )}
            </div>
          </div>

          {/* Security & Token Rotation Diagnostic Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Rotación de Refresh Token Activa (15 min Access / 7 días Refresh)
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Además de la rotación automática ante errores 401, puedes probar
                manualmente el endpoint <code>POST /api/v1/auth/refresh</code>{' '}
                aquí:
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              isLoading={isRefreshingToken}
              onClick={handleManualTokenRefresh}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Probar Rotación de Token
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
