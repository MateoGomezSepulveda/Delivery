import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Camera,
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { updateUserApi } from '@/api/endpoints/users.api';
import { uploadImageToS3Api } from '@/api/endpoints/uploads.api';
import { refreshTokensApi } from '@/api/endpoints/auth.api';
import { extractErrorMessage, getStoredTokens } from '@/api/axios.client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoleBadge } from '@/components/ui/Badge';

export function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, setSession, updateUserState, setUserAvatar, logout } =
    useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);

  if (!user) return null;

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

        <div className="flex flex-wrap items-center gap-3">
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

      {/* Security & Token Rotation Diagnostic Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Rotación de Refresh Token Activa (15 min Access / 7 días Refresh)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Además de la rotación automática ante errores 401, puedes probar
            manualmente el endpoint <code>POST /api/v1/auth/refresh</code> aquí:
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
    </div>
  );
}
