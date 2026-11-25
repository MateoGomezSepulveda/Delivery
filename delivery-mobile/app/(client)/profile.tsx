import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  Bike,
  Camera,
  Car,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
  UserPlus,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { extractErrorMessage } from '@/api/axios.client';
import {
  refreshTokensApi,
  resendVerificationApi,
} from '@/api/endpoints/auth.api';
import {
  createDeliveryProfileApi,
  getDeliveryProfileApi,
} from '@/api/endpoints/delivery.api';
import { uploadImageToS3Api } from '@/api/endpoints/uploads.api';
import { updateUserApi } from '@/api/endpoints/users.api';
import { ServerStatusBadge } from '@/components/layout/ServerStatusBadge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Badge, RoleBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRiderDiscountQuota } from '@/hooks/useRiderDiscountQuota';
import { getStoredTokens } from '@/storage/tokenStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { VehicleType } from '@/types/delivery.types';
import { validatePhoneNumber } from '@/utils/phone';

const VEHICLES: { value: VehicleType; label: string }[] = [
  { value: 'MOTO', label: 'Motocicleta' },
  { value: 'BICYCLE', label: 'Bicicleta' },
  { value: 'CAR', label: 'Automóvil' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setSession, updateUserState, logout } =
    useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTO');
  const [plate, setPlate] = useState('');
  const [applyingRider, setApplyingRider] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
  }, [user?._id, user?.name, user?.phone]);

  const { data: deliveryProfile, refetch: refetchDeliveryProfile } = useQuery({
    queryKey: ['delivery-profile', user?._id],
    queryFn: async () => {
      try {
        return await getDeliveryProfileApi();
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) return null;
        throw err;
      }
    },
    enabled: Boolean(isAuthenticated && user && user.role !== 'ADMIN'),
    retry: false,
  });

  const { data: riderQuota } = useRiderDiscountQuota();

  if (!isAuthenticated || !user) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={styles.guestContent}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.guestIcon, { backgroundColor: colors.primarySoft }]}
          >
            <UserIcon size={28} color={colors.primary} strokeWidth={2.1} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>
            Tu Cuenta DeliveryPro
          </Text>
          <Text style={[styles.guestSub, { color: colors.textSecondary }]}>
            Inicia sesión o regístrate para pedir a domicilio, guardar tus
            direcciones o postularte como socio repartidor.
          </Text>

          <Button
            title="Iniciar Sesión"
            size="lg"
            fullWidth
            leftIcon={<LogIn size={18} color="#FFFFFF" strokeWidth={2.2} />}
            onPress={() => router.push('/(auth)/login')}
          />
          <Button
            title="Crear Cuenta Nueva"
            size="lg"
            variant="outline"
            fullWidth
            leftIcon={
              <UserPlus size={18} color={colors.text} strokeWidth={2} />
            }
            onPress={() => router.push('/(auth)/register')}
          />
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Apariencia
          </Text>
          <ThemeToggle />
        </View>

        <ServerStatusBadge />
      </ScrollView>
    );
  }

  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.warning('Permiso requerido para elegir una foto de tu galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.55,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      setUploadingAvatar(true);
      const dataUrlFallback = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : undefined;

      let finalAvatarUrl = dataUrlFallback;
      try {
        const uploaded = await uploadImageToS3Api(
          {
            uri: asset.uri,
            fileName: asset.fileName,
            mimeType: asset.mimeType,
            fileSize: asset.fileSize,
          },
          'avatars',
        );
        // Igual que en Web: priorizamos DataURL compacto para evitar 403 si S3 es privado
        finalAvatarUrl = dataUrlFallback || uploaded.url;
      } catch {
        if (!dataUrlFallback) {
          throw new Error('No se pudo subir la imagen');
        }
      }

      const updated = await updateUserApi(user._id, {
        avatarUrl: finalAvatarUrl,
      });
      updateUserState({ avatarUrl: updated.avatarUrl || finalAvatarUrl });
      toast.success('¡Foto de perfil actualizada!');
    } catch (error) {
      toast.error('No se pudo cambiar la foto', {
        description: extractErrorMessage(error),
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.warning('El nombre no puede estar vacío');
      return;
    }
    if (phone.trim()) {
      const phoneErr = validatePhoneNumber(phone);
      if (phoneErr) {
        toast.warning(phoneErr);
        return;
      }
    }
    if (newPassword && newPassword.length < 6) {
      toast.warning('La nueva contraseña debe tener mínimo 6 caracteres');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateUserApi(user._id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        password: newPassword ? newPassword : undefined,
      });
      updateUserState({
        name: updated.name,
        phone: updated.phone,
      });
      setNewPassword('');
      toast.success('Datos actualizados correctamente');
    } catch (error) {
      toast.error('No se pudo guardar el perfil', {
        description: extractErrorMessage(error),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const rotateToDeliverySession = async () => {
    const { refreshToken } = await getStoredTokens();
    if (refreshToken) {
      const rotated = await refreshTokensApi(refreshToken);
      await setSession(rotated, { ...user, role: 'DELIVERY' });
    } else {
      updateUserState({ role: 'DELIVERY' });
    }
  };

  const handleApplyAsRider = async () => {
    const cleanPhone = (phone.trim() || user.phone || '').trim();
    const phoneErr = validatePhoneNumber(cleanPhone);
    if (phoneErr) {
      toast.warning(phoneErr);
      return;
    }

    setApplyingRider(true);
    try {
      const cleanPlate = plate.trim().toUpperCase() || undefined;
      const created = await createDeliveryProfileApi({
        vehicleType,
        plate: cleanPlate,
        licensePlate: cleanPlate,
        phone: cleanPhone,
      });
      queryClient.setQueryData(['delivery-profile', user._id], created);

      if (created.status === 'APPROVED') {
        await rotateToDeliverySession();
        toast.success('¡Ya eres Socio Repartidor!');
      } else {
        toast.success('Solicitud enviada para aprobación del Administrador');
      }
    } catch (error) {
      toast.error('No se pudo enviar la postulación', {
        description: extractErrorMessage(error),
      });
    } finally {
      setApplyingRider(false);
    }
  };

  const handleCheckApproval = async () => {
    setCheckingApproval(true);
    try {
      const { data: fresh } = await refetchDeliveryProfile();
      if (fresh?.status === 'APPROVED') {
        await rotateToDeliverySession();
        toast.success('¡Solicitud aprobada! Ya puedes abrir el Portal Rider');
      } else if (fresh?.status === 'REJECTED') {
        toast.warning(
          fresh.rejectionReason || 'Tu solicitud fue rechazada por el admin.',
        );
      } else {
        toast.info('Tu solicitud aún está pendiente de revisión.');
      }
    } catch (error) {
      toast.error('No pudimos verificar el estado', {
        description: extractErrorMessage(error),
      });
    } finally {
      setCheckingApproval(false);
    }
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cabecera de Usuario + Avatar S3 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.profileRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cambiar foto de perfil"
              onPress={() => void handlePickAvatar()}
              style={styles.avatarWrap}
            >
              {user.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImg}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}

              <View
                style={[styles.cameraBadge, { backgroundColor: colors.text }]}
              >
                <Camera size={12} color={colors.surface} strokeWidth={2.2} />
              </View>
            </Pressable>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user.name}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {user.email}
              </Text>

              <View style={styles.badgesRow}>
                <RoleBadge role={user.role} />
                {user.isEmailVerified ? (
                  <Badge variant="success" icon={ShieldCheck}>
                    Verificado
                  </Badge>
                ) : (
                  <Pressable
                    onPress={async () => {
                      try {
                        await resendVerificationApi({ email: user.email });
                        router.push({
                          pathname: '/(auth)/verify-email',
                          params: { email: user.email, channel: 'email' },
                        });
                      } catch (err) {
                        toast.error(extractErrorMessage(err));
                      }
                    }}
                  >
                    <Badge variant="warning" icon={MailCheck}>
                      Verificar correo
                    </Badge>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {uploadingAvatar ? (
            <Text style={[styles.uploadingHint, { color: colors.primary }]}>
              Subiendo y optimizando foto de perfil...
            </Text>
          ) : null}
        </View>

        {/* Programa de Socios Mensajeros */}
        {user.role === 'DELIVERY' ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.secondarySoft,
                borderColor: colors.secondaryBorder,
              },
            ]}
          >
            <View style={styles.riderHead}>
              <Bike size={20} color={colors.secondary} strokeWidth={2.2} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Portal de Socio Repartidor Activo
              </Text>
            </View>
            <Text style={[styles.riderSub, { color: colors.textSecondary }]}>
              Tienes {riderQuota?.remaining ?? 4} de{' '}
              {riderQuota?.monthlyLimit ?? 4} pedidos con -10% de descuento este
              mes, además de acceso completo a entregas.
            </Text>
            <Button
              title="Entrar al Portal Repartidor"
              variant="secondary"
              size="md"
              fullWidth
              leftIcon={<Bike size={17} color="#FFFFFF" strokeWidth={2.2} />}
              onPress={() => router.push('/(delivery)')}
            />
          </View>
        ) : deliveryProfile?.status === 'PENDING' ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.warningSoft,
                borderColor: colors.warningBorder,
              },
            ]}
          >
            <View style={styles.riderHead}>
              <Clock size={19} color={colors.warning} strokeWidth={2.2} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Postulación de Repartidor en Revisión
              </Text>
            </View>
            <Text style={[styles.riderSub, { color: colors.textSecondary }]}>
              Un administrador está revisando tu vehículo (
              {deliveryProfile.vehicleType}). Si ya te aprobaron, pulsa abajo
              para activar tu Portal Rider al instante.
            </Text>
            <Button
              title="Verificar Aprobación"
              size="md"
              variant="outline"
              fullWidth
              loading={checkingApproval}
              leftIcon={
                <RefreshCw size={15} color={colors.text} strokeWidth={2.1} />
              }
              onPress={() => void handleCheckApproval()}
            />
          </View>
        ) : user.role === 'CLIENT' ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.riderHead}>
              <Bike size={19} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                ¿Quieres repartir con DeliveryPro?
              </Text>
            </View>
            <Text style={[styles.riderSub, { color: colors.textSecondary }]}>
              Gana el 100% de cada domicilio entregado y recibe 10% de descuento
              en 4 compras personales al mes.
            </Text>

            <View style={styles.vehicleRow}>
              {VEHICLES.map((v) => {
                const active = vehicleType === v.value;
                return (
                  <Pressable
                    key={v.value}
                    onPress={() => setVehicleType(v.value)}
                    style={[
                      styles.vehicleBtn,
                      {
                        backgroundColor: active
                          ? colors.primarySoft
                          : colors.surfaceMuted,
                        borderColor: active
                          ? colors.primary
                          : colors.borderStrong,
                      },
                    ]}
                  >
                    {v.value === 'CAR' ? (
                      <Car
                        size={16}
                        color={active ? colors.primary : colors.textSecondary}
                        strokeWidth={2}
                      />
                    ) : (
                      <Bike
                        size={16}
                        color={active ? colors.primary : colors.textSecondary}
                        strokeWidth={2}
                      />
                    )}
                    <Text
                      style={[
                        styles.vehicleLabel,
                        { color: active ? colors.primaryText : colors.text },
                      ]}
                    >
                      {v.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {vehicleType !== 'BICYCLE' ? (
              <Input
                label="Placa del vehículo"
                value={plate}
                onChangeText={(t) => setPlate(t.toUpperCase())}
                autoCapitalize="characters"
                placeholder="Ej. ABC12D"
              />
            ) : null}

            <Button
              title="Postularme como Repartidor"
              size="md"
              fullWidth
              loading={applyingRider}
              onPress={() => void handleApplyAsRider()}
            />
          </View>
        ) : null}

        {/* Formulario de Datos Personales */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Datos personales y seguridad
          </Text>

          <Input label="Nombre completo" value={name} onChangeText={setName} />

          <Input
            label="Celular de contacto"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Ej. 300 123 4567"
          />

          <Input
            label="Cambiar contraseña (opcional)"
            value={newPassword}
            onChangeText={setNewPassword}
            isPassword
            placeholder="Dejar en blanco para mantener actual"
          />

          <Button
            title="Guardar Cambios"
            size="md"
            fullWidth
            loading={savingProfile}
            leftIcon={
              <CheckCircle2 size={17} color="#FFFFFF" strokeWidth={2.2} />
            }
            onPress={() => void handleSaveProfile()}
          />
        </View>

        {/* Tema y Estado del Servidor */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tema visual
          </Text>
          <ThemeToggle />
        </View>

        <ServerStatusBadge />

        <Button
          title="Cerrar Sesión"
          variant="danger"
          size="lg"
          fullWidth
          leftIcon={<LogOut size={18} color="#FFFFFF" strokeWidth={2.2} />}
          onPress={async () => {
            await logout();
            queryClient.clear();
            toast.info('Sesión cerrada');
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  guestContent: {
    padding: 16,
    gap: 14,
  },
  guestIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  guestTitle: {
    fontFamily: FONTS.heading,
    fontSize: 21,
    textAlign: 'center',
  },
  guestSub: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    position: 'relative',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 999,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontFamily: FONTS.heading,
    fontSize: 24,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontFamily: FONTS.heading,
    fontSize: 18.5,
  },
  userEmail: {
    fontFamily: FONTS.sans,
    fontSize: 13,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  uploadingHint: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
  },
  riderHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riderSub: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  vehicleBtn: {
    flex: 1,
    borderRadius: 13,
    borderWidth: 1.4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
  },
  vehicleLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 11.5,
  },
});
