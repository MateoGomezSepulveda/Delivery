import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bike,
  Camera,
  Car,
  CheckCircle2,
  Clock,
  KeyRound,
  Link2,
  Lock,
  LogOut,
  Mail,
  MailCheck,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  Unlink,
  UploadCloud,
  User as UserIcon,
  ZoomIn,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { updateUserApi } from '@/api/endpoints/users.api';
import { uploadImageToS3Api } from '@/api/endpoints/uploads.api';
import {
  linkFacebookApi,
  linkGoogleApi,
  refreshTokensApi,
  resendVerificationApi,
  unlinkProviderApi,
} from '@/api/endpoints/auth.api';
import {
  requestFacebookAuthCode,
  requestGoogleAccessToken,
} from '@/utils/oauthPopups';
import {
  FacebookBrandIcon,
  GoogleBrandIcon,
} from '@/components/auth/SocialAuthButtons';
import {
  createDeliveryProfileApi,
  getDeliveryProfileApi,
} from '@/api/endpoints/delivery.api';
import { useRiderDiscountQuota } from '@/hooks/useRiderDiscountQuota';
import { extractErrorMessage, getStoredTokens } from '@/api/axios.client';
import type { VehicleType } from '@/types/delivery.types';
import {
  getNotificationPermission,
  requestBrowserNotificationPermission,
  showOrderStatusNotification,
  type BrowserNotificationPermission,
} from '@/utils/browserNotifications';
import { playNotificationSound } from '@/utils/sound';
import { MyOrdersPage } from '@/pages/client/MyOrdersPage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, RoleBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { UserAvatar } from '@/components/ui/UserAvatar';
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
  const [phone, setPhone] = useState(user?.phone || '');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTO');
  const [plate, setPlate] = useState('');
  const [isActivatingRider, setIsActivatingRider] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [socialActionLoading, setSocialActionLoading] = useState<
    'google' | 'facebook' | null
  >(null);
  const [notifPermission, setNotifPermission] =
    useState<BrowserNotificationPermission>(() => getNotificationPermission());
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  useEffect(() => {
    const syncPermission = () => {
      setNotifPermission(getNotificationPermission());
    };

    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);

    let permissionStatus: PermissionStatus | null = null;
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((status) => {
          permissionStatus = status;
          status.onchange = syncPermission;
        })
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  const isRider = user?.role === 'DELIVERY';

  const { data: deliveryProfile } = useQuery({
    queryKey: ['delivery-profile'],
    queryFn: getDeliveryProfileApi,
    enabled: Boolean(user && isRider),
    retry: false,
  });

  const { data: riderQuota } = useRiderDiscountQuota();

  if (!user) return null;

  const remainingRiderDiscounts = riderQuota?.remaining ?? 4;

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

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const uploaded = await uploadImageToS3Api(file, 'avatars');
      // Guardamos el DataURL optimizado en MongoDB (evita errores 403 si S3 es privado y permite que Admin y otros dispositivos vean la foto)
      const resolvedAvatar = uploaded.previewDataUrl || uploaded.url;
      const updatedUser = await updateUserApi(user._id, {
        avatarUrl: resolvedAvatar,
      });
      const persistedAvatar = updatedUser.avatarUrl || resolvedAvatar;
      setUserAvatar(user._id, persistedAvatar);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('¡Foto de perfil actualizada con éxito!', {
        description:
          'Tu nueva imagen fue guardada en tu cuenta y ya está visible en toda la plataforma.',
      });
    } catch (error) {
      toast.error('No se pudo actualizar la foto de perfil', {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const handleVerifyMyEmail = async () => {
    setIsSendingVerification(true);
    try {
      const res = await resendVerificationApi({ email: user.email });
      if (res.alreadyVerified) {
        updateUserState({ isEmailVerified: true });
        toast.success('Tu correo electrónico ya está verificado.');
        return;
      }
      toast.success('Código de verificación enviado', {
        description: `Revisa tu correo ${user.email} para completar la verificación.`,
      });
      navigate(`/verify-email?email=${encodeURIComponent(user.email)}`, {
        state: {
          email: user.email,
          name: user.name,
          justRegistered: true,
        },
      });
    } catch (error) {
      toast.error('No se pudo enviar el correo de verificación', {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('El nombre y el correo electrónico son obligatorios.');
      return;
    }

    const emailChanged =
      email.trim().toLowerCase() !== user.email.trim().toLowerCase();

    setIsSavingProfile(true);
    try {
      const updatedUser = await updateUserApi(user._id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      updateUserState({
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        isEmailVerified: updatedUser.isEmailVerified,
      });
      if (emailChanged && updatedUser.isEmailVerified === false) {
        toast.success('Datos actualizados. Verifica tu nuevo correo', {
          description:
            'Haz clic en "Verificar ahora" junto a tu correo para confirmar tu nueva dirección.',
        });
      } else {
        toast.success('Datos de perfil actualizados correctamente');
      }
      setIsProfileModalOpen(false);
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
      const updatedUser = await updateUserApi(user._id, {
        password: newPassword,
      });
      updateUserState({
        authProviders: updatedUser.authProviders ?? [
          ...(user.authProviders ?? []),
          'local',
        ],
      });
      setNewPassword('');
      setConfirmPassword('');
      toast.success('¡Contraseña actualizada correctamente!');
    } catch (error) {
      toast.error('Error al cambiar contraseña', {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const isGoogleLinked = Boolean(
    user.googleId || user.authProviders?.includes('google'),
  );
  const isFacebookLinked = Boolean(
    user.facebookId || user.authProviders?.includes('facebook'),
  );
  const hasLocalPassword = user.authProviders
    ? user.authProviders.includes('local')
    : true;
  const activeAuthMethodsCount =
    (hasLocalPassword ? 1 : 0) +
    (isGoogleLinked ? 1 : 0) +
    (isFacebookLinked ? 1 : 0);

  const handleLinkSocial = async (provider: 'google' | 'facebook') => {
    setSocialActionLoading(provider);
    try {
      const response =
        provider === 'google'
          ? await linkGoogleApi(await requestGoogleAccessToken())
          : await linkFacebookApi(await requestFacebookAuthCode());

      updateUserState({
        googleId: response.user.googleId,
        facebookId: response.user.facebookId,
        authProviders: response.user.authProviders,
        isEmailVerified: response.user.isEmailVerified,
        avatarUrl: user.avatarUrl || response.user.avatarUrl,
      });
      toast.success(response.message);
    } catch (error) {
      toast.error(
        `No se pudo vincular ${provider === 'google' ? 'Google' : 'Facebook'}`,
        {
          description: extractErrorMessage(error),
        },
      );
    } finally {
      setSocialActionLoading(null);
    }
  };

  const handleUnlinkSocial = async (provider: 'google' | 'facebook') => {
    if (activeAuthMethodsCount <= 1) {
      toast.warning('Configura una contraseña antes de desvincular', {
        description:
          'Necesitas al menos un método de inicio de sesión activo para no perder el acceso a tu cuenta.',
      });
      return;
    }

    setSocialActionLoading(provider);
    try {
      const response = await unlinkProviderApi(provider);
      updateUserState({
        googleId: response.user.googleId,
        facebookId: response.user.facebookId,
        authProviders: response.user.authProviders,
      });
      toast.success(response.message);
    } catch (error) {
      toast.error(
        `No se pudo desvincular ${provider === 'google' ? 'Google' : 'Facebook'}`,
        {
          description: extractErrorMessage(error),
        },
      );
    } finally {
      setSocialActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    useCartDrawerStore.getState().resetCartUi();
    queryClient.clear();
    toast.success('Has cerrado sesión correctamente.');
    navigate('/login', { replace: true });
  };

  const handleEnableNotifications = async () => {
    const next = await requestBrowserNotificationPermission();
    setNotifPermission(next);

    if (next === 'granted') {
      const sent = await showOrderStatusNotification(
        'DeliveryPro — Alertas Activadas',
        'A partir de ahora te avisaremos cada cambio de estado de tus pedidos.',
      );
      playNotificationSound();
      toast.success('Notificaciones activadas en tu navegador', {
        description: sent
          ? 'Enviamos una notificación de bienvenida para confirmar el canal.'
          : 'Permiso concedido. También recibirás alertas con sonido dentro de la app.',
      });
      return;
    }

    if (next === 'denied') {
      toast.error('Notificaciones bloqueadas por el navegador', {
        description:
          'Haz clic en el icono junto a la URL del navegador para cambiar Notificaciones a "Permitir".',
      });
      return;
    }

    toast.info('Permiso de notificaciones pendiente', {
      description:
        'Cerraste el aviso sin elegir una opción. Puedes intentarlo nuevamente cuando quieras.',
    });
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    try {
      let current = getNotificationPermission();
      setNotifPermission(current);

      if (current === 'default') {
        current = await requestBrowserNotificationPermission();
        setNotifPermission(current);
      }

      if (current !== 'granted') {
        playNotificationSound();
        toast.warning('Notificación nativa no disponible (alerta de respaldo)', {
          description:
            current === 'denied'
              ? 'El navegador tiene bloqueadas las notificaciones para este sitio. Sigue los pasos debajo para habilitarlas.'
              : 'Concede el permiso de notificaciones en tu navegador para ver alertas fuera de la pestaña.',
        });
        return;
      }

      const sent = await showOrderStatusNotification(
        'DeliveryPro — Prueba de Alerta',
        'Las notificaciones de pedidos están funcionando correctamente.',
      );
      playNotificationSound();

      if (sent) {
        toast.success('Notificación de prueba enviada', {
          description:
            'Si no ves el banner del sistema en Windows, verifica que el modo "No molestar" esté desactivado.',
        });
      } else {
        toast.warning('No se pudo mostrar la notificación nativa', {
          description:
            'Mostramos esta alerta de respaldo en pantalla. Revisa los permisos de notificaciones del navegador o del sistema operativo.',
        });
      }
    } finally {
      setIsTestingNotif(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Profile Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="relative group">
            <button
              type="button"
              onClick={handleOpenProfileModal}
              title="Haz clic para ver tu foto en grande o cambiarla"
              className="relative block h-24 w-24 rounded-3xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 cursor-pointer"
            >
              <UserAvatar
                src={user.avatarUrl}
                name={user.name}
                className="h-full w-full rounded-3xl transition-transform duration-200 group-hover:scale-105"
                imgClassName="border-2 border-orange-500 shadow-md"
                fallbackClassName="text-2xl shadow-warm"
              />

              <div className="absolute inset-0 rounded-3xl bg-slate-950/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white gap-1">
                <ZoomIn className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Ver Foto
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleOpenProfileModal}
              title="Ver o cambiar foto de perfil"
              className="absolute -bottom-2 -right-2 h-9 w-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg hover:bg-orange-600 dark:hover:bg-orange-500 dark:hover:text-white transition-colors duration-200 cursor-pointer"
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
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
              {user.isEmailVerified === true ? (
                <Badge
                  variant="success"
                  icon={<MailCheck className="w-3.5 h-3.5" />}
                >
                  Correo verificado
                </Badge>
              ) : user.isEmailVerified === false ? (
                <div className="inline-flex items-center gap-2">
                  <Badge
                    variant="warning"
                    icon={<Clock className="w-3.5 h-3.5" />}
                  >
                    Sin verificar
                  </Badge>
                  <button
                    type="button"
                    onClick={handleVerifyMyEmail}
                    disabled={isSendingVerification}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 underline underline-offset-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingVerification ? 'Enviando...' : 'Verificar ahora'}
                  </button>
                </div>
              ) : null}
            </div>
            {user.phone && (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
                <Phone className="w-3.5 h-3.5 text-orange-600" />
                <span>{user.phone}</span>
              </p>
            )}
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
                    <strong>Rider App</strong> cuando quieras y, además, al hacer
                    pedidos para ti como cliente recibes automáticamente un{' '}
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
                    Pedir en el Catálogo con mi 10% OFF
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
                    Seguirás pudiendo comprar en el catálogo como siempre,
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
                    Actualiza tu nombre y correo electrónico de contacto
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
                helperText="Si cambias tu correo, deberás verificar la nueva dirección."
              />

              <Input
                label="Número de Celular"
                type="tel"
                placeholder="Número de contacto"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
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
                    Mantén tu cuenta protegida actualizando tu clave
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

          {/* Linked Social Accounts Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Link2 className="w-5 h-5 text-orange-600 shrink-0" />
                <div>
                  <h2 className="text-base font-bold">Cuentas vinculadas</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Conecta Google o Facebook para iniciar sesión con un solo
                    clic sin escribir tu contraseña.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Google Row */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm shrink-0">
                    <GoogleBrandIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Google
                    </p>
                    {isGoogleLinked ? (
                      <Badge variant="success">Conectada</Badge>
                    ) : (
                      <Badge variant="neutral">No vinculada</Badge>
                    )}
                  </div>
                </div>

                {isGoogleLinked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={socialActionLoading === 'google'}
                    disabled={
                      socialActionLoading !== null ||
                      activeAuthMethodsCount <= 1
                    }
                    title={
                      activeAuthMethodsCount <= 1
                        ? 'Configura primero una contraseña para poder desvincular Google'
                        : 'Desvincular cuenta de Google'
                    }
                    onClick={() => handleUnlinkSocial('google')}
                    leftIcon={<Unlink className="w-3.5 h-3.5" />}
                  >
                    Desvincular
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={socialActionLoading === 'google'}
                    disabled={socialActionLoading !== null}
                    onClick={() => handleLinkSocial('google')}
                    leftIcon={<Link2 className="w-3.5 h-3.5 text-orange-600" />}
                  >
                    Vincular
                  </Button>
                )}
              </div>

              {/* Facebook Row */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm shrink-0">
                    <FacebookBrandIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Facebook
                    </p>
                    {isFacebookLinked ? (
                      <Badge variant="success">Conectada</Badge>
                    ) : (
                      <Badge variant="neutral">No vinculada</Badge>
                    )}
                  </div>
                </div>

                {isFacebookLinked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={socialActionLoading === 'facebook'}
                    disabled={
                      socialActionLoading !== null ||
                      activeAuthMethodsCount <= 1
                    }
                    title={
                      activeAuthMethodsCount <= 1
                        ? 'Configura primero una contraseña para poder desvincular Facebook'
                        : 'Desvincular cuenta de Facebook'
                    }
                    onClick={() => handleUnlinkSocial('facebook')}
                    leftIcon={<Unlink className="w-3.5 h-3.5" />}
                  >
                    Desvincular
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={socialActionLoading === 'facebook'}
                    disabled={socialActionLoading !== null}
                    onClick={() => handleLinkSocial('facebook')}
                    leftIcon={<Link2 className="w-3.5 h-3.5 text-blue-600" />}
                  >
                    Vincular
                  </Button>
                )}
              </div>
            </div>

            {!hasLocalPassword && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tu cuenta inició con un proveedor externo. Si deseas
                desvincularlo más adelante, define primero una contraseña en la
                tarjeta de <strong>Seguridad y Contraseña</strong>.
              </p>
            )}
          </div>

          {/* Browser Notifications Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-600" />
                    <span>Notificaciones de tu Pedido</span>
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
                  Recibe avisos instantáneos cuando tu pedido sea confirmado,
                  esté en camino o llegue a tu dirección.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {notifPermission === 'default' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleEnableNotifications}
                    leftIcon={<Bell className="w-4 h-4" />}
                  >
                    Activar Alertas
                  </Button>
                )}

                {notifPermission === 'denied' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updated = getNotificationPermission();
                        setNotifPermission(updated);
                        if (updated === 'granted') {
                          toast.success(
                            'Permiso detectado. Ya puedes probar tus notificaciones.',
                          );
                        } else {
                          toast.info(
                            'Las notificaciones siguen bloqueadas en el navegador.',
                          );
                        }
                      }}
                      leftIcon={<RefreshCw className="w-4 h-4" />}
                    >
                      Verificar permiso
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        playNotificationSound();
                        toast.info('Alerta de respaldo en pantalla', {
                          description:
                            'Mientras mantengas la app abierta seguirás recibiendo avisos con sonido.',
                        });
                      }}
                      leftIcon={<Bell className="w-4 h-4" />}
                    >
                      Probar alerta en pantalla
                    </Button>
                  </>
                )}

                {notifPermission === 'granted' && (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isTestingNotif}
                    onClick={handleTestNotification}
                    leftIcon={<Bell className="w-4 h-4" />}
                  >
                    Probar Notificación
                  </Button>
                )}
              </div>
            </div>

            {notifPermission === 'denied' && (
              <div
                role="alert"
                className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    Cómo desbloquear las notificaciones en tu navegador:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-amber-800 dark:text-amber-300">
                    <li>
                      Haz clic en el icono de configuración (candado o ajustes)
                      a la izquierda de la URL.
                    </li>
                    <li>
                      Cambia el permiso <strong>Notificaciones</strong> a{' '}
                      <strong>Permitir</strong>.
                    </li>
                    <li>
                      Pulsa <strong>Verificar permiso</strong> o recarga la
                      página.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal exclusivo para Ver Foto en Grande y Cambiar Foto */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Foto de Perfil"
        description="Visualiza tu foto actual o sube una nueva imagen para tu cuenta."
        size="sm"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsProfileModalOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              {user.avatarUrl ? 'Cambiar Foto' : 'Subir Foto'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative">
            <UserAvatar
              src={user.avatarUrl}
              name={user.name}
              className="h-56 w-56 sm:h-64 sm:w-64 rounded-3xl shadow-xl"
              imgClassName="border-4 border-orange-500"
              fallbackClassName="text-6xl"
            />
          </div>

          <div className="text-center space-y-0.5">
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {user.name}
            </p>
            <p className="text-xs text-slate-400">
              Formatos compatibles: JPG, PNG, WEBP o AVIF
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
