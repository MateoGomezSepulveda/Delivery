import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Tabs, useRouter } from 'expo-router';
import {
  Bike,
  Car,
  Clock,
  Navigation,
  PackageSearch,
  Power,
  RefreshCw,
  Store,
  Wallet,
  XCircle,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { extractErrorMessage } from '@/api/axios.client';
import {
  createDeliveryProfileApi,
  getActiveOrdersApi,
  getDeliveryProfileApi,
  updateAvailabilityApi,
} from '@/api/endpoints/delivery.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { VehicleType } from '@/types/delivery.types';

export default function DeliveryLayout() {
  const router = useRouter();
  const colors = useAppTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTO');
  const [plate, setPlate] = useState('');

  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery({
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
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['delivery-active'],
    queryFn: getActiveOrdersApi,
    enabled: Boolean(
      isAuthenticated &&
        profile &&
        (!profile.status || profile.status === 'APPROVED'),
    ),
    refetchInterval: 15_000,
  });

  const { connected: socketConnected } = useSocket({
    playRiderAlerts: Boolean(profile?.isAvailable),
  });

  const createProfileMutation = useMutation({
    mutationFn: () =>
      createDeliveryProfileApi({
        vehicleType,
        plate: plate.trim().toUpperCase() || undefined,
        licensePlate: plate.trim().toUpperCase() || undefined,
        phone: user?.phone,
      }),
    onSuccess: (created) => {
      queryClient.setQueryData(['delivery-profile', user?._id], created);
      toast.success('Perfil de repartidor enviado');
    },
    onError: (err) => {
      toast.error('No se pudo registrar el perfil', {
        description: extractErrorMessage(err),
      });
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: (nextAvailable: boolean) =>
      updateAvailabilityApi(nextAvailable),
    onSuccess: (updated) => {
      queryClient.setQueryData(['delivery-profile', user?._id], updated);
      void queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
      toast.info(
        updated.isAvailable
          ? 'Estás EN LÍNEA recibiendo pedidos'
          : 'Pasaste a modo desconectado',
      );
    },
    onError: (err) => {
      toast.error('No se pudo cambiar tu disponibilidad', {
        description: extractErrorMessage(err),
      });
    },
  });

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.statePad}>
          <Skeleton height={80} borderRadius={22} />
          <Skeleton height={220} borderRadius={22} />
        </View>
      </SafeAreaView>
    );
  }

  // Sin perfil de repartidor aún -> Onboarding
  if (!profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.statePad}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Bike size={30} color={colors.primary} strokeWidth={2.2} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              Activa tu Perfil de Repartidor
            </Text>
            <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
              Registra tu medio de transporte para comenzar a aceptar pedidos y
              ganar el 100% del valor del domicilio.
            </Text>

            <View style={styles.vehiclesRow}>
              {(['MOTO', 'BICYCLE', 'CAR'] as VehicleType[]).map((v) => {
                const active = vehicleType === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setVehicleType(v)}
                    style={[
                      styles.vehicleOpt,
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
                    {v === 'CAR' ? (
                      <Car
                        size={17}
                        color={active ? colors.primary : colors.textSecondary}
                        strokeWidth={2}
                      />
                    ) : (
                      <Bike
                        size={17}
                        color={active ? colors.primary : colors.textSecondary}
                        strokeWidth={2}
                      />
                    )}
                    <Text
                      style={[
                        styles.vehicleOptText,
                        { color: active ? colors.primaryText : colors.text },
                      ]}
                    >
                      {v === 'MOTO'
                        ? 'Moto'
                        : v === 'BICYCLE'
                          ? 'Bici'
                          : 'Carro'}
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
                placeholder="Ej. ABC12D"
              />
            ) : null}

            <Button
              title="Enviar Solicitud"
              size="lg"
              fullWidth
              loading={createProfileMutation.isPending}
              onPress={() => createProfileMutation.mutate()}
            />

            <Button
              title="Volver al Catálogo"
              variant="outline"
              size="md"
              fullWidth
              onPress={() => router.navigate('/(client)')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Solicitud en revisión o rechazada
  if (profile.status === 'PENDING' || profile.status === 'REJECTED') {
    const isPending = profile.status === 'PENDING';
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.statePad}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {isPending ? (
              <Clock size={32} color={colors.warning} strokeWidth={2.2} />
            ) : (
              <XCircle size={32} color={colors.danger} strokeWidth={2.2} />
            )}
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              {isPending
                ? 'Solicitud en revisión administrativa'
                : 'Solicitud rechazada'}
            </Text>
            <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
              {isPending
                ? 'Un administrador verificará tus datos pronto. Mientras tanto puedes seguir comprando en el catálogo.'
                : profile.rejectionReason ||
                  'Por favor revisa los datos de tu vehículo desde tu perfil.'}
            </Text>

            <Button
              title="Actualizar Estado"
              size="md"
              fullWidth
              leftIcon={
                <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.2} />
              }
              onPress={() => void refetch()}
            />

            <Button
              title="Ir al Catálogo Cliente"
              variant="outline"
              size="md"
              fullWidth
              onPress={() => router.navigate('/(client)')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, { backgroundColor: colors.bg }]}
    >
      {/* Barra Superior Rider App */}
      <View style={styles.headerWrap}>
        <View
          style={[
            styles.riderNavbar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.brandRow}>
            <View
              style={[styles.riderIcon, { backgroundColor: colors.secondary }]}
            >
              <Bike size={18} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <View>
              <View style={styles.titleWithDot}>
                <Text style={[styles.brandTitle, { color: colors.text }]}>
                  Rider<Text style={{ color: colors.secondary }}>Pro</Text>
                </Text>
                <View
                  style={[
                    styles.wsDot,
                    {
                      backgroundColor: socketConnected ? '#10B981' : '#94A3B8',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.vehicleMeta, { color: colors.textMuted }]}>
                {profile.vehicleType}
                {profile.plate ? ` · ${profile.plate}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: profile.isAvailable }}
              disabled={availabilityMutation.isPending}
              onPress={() => availabilityMutation.mutate(!profile.isAvailable)}
              style={[
                styles.onlineToggle,
                {
                  backgroundColor: profile.isAvailable
                    ? colors.successSoft
                    : colors.surfaceMuted,
                  borderColor: profile.isAvailable
                    ? colors.success
                    : colors.borderStrong,
                },
              ]}
            >
              <Power
                size={14}
                color={
                  profile.isAvailable ? colors.success : colors.textSecondary
                }
                strokeWidth={2.3}
              />
              <Text
                style={[
                  styles.onlineText,
                  {
                    color: profile.isAvailable
                      ? colors.success
                      : colors.textSecondary,
                  },
                ]}
              >
                {profile.isAvailable ? 'En Línea' : 'Offline'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ir a tienda cliente"
              onPress={() => router.navigate('/(client)')}
              style={[
                styles.shopBtn,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primaryBorder,
                },
              ]}
            >
              <Store size={15} color={colors.primary} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.secondary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: {
              fontFamily: FONTS.sansSemi,
              fontSize: 11.5,
              marginBottom: 4,
            },
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              height: 62 + insets.bottom,
              paddingTop: 6,
              paddingBottom: Math.max(6, insets.bottom),
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Disponibles',
              tabBarIcon: ({ color, size }) => (
                <PackageSearch
                  size={size - 2}
                  color={color}
                  strokeWidth={2.1}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="active"
            options={{
              title: 'Ruta Activa',
              tabBarBadge:
                activeOrders.length > 0 ? activeOrders.length : undefined,
              tabBarBadgeStyle: {
                backgroundColor: colors.secondary,
                color: '#FFFFFF',
                fontFamily: FONTS.sansBold,
                fontSize: 10.5,
              },
              tabBarIcon: ({ color, size }) => (
                <Navigation size={size - 2} color={color} strokeWidth={2.1} />
              ),
            }}
          />

          <Tabs.Screen
            name="stats"
            options={{
              title: 'Ganancias',
              tabBarIcon: ({ color, size }) => (
                <Wallet size={size - 2} color={color} strokeWidth={2.1} />
              ),
            }}
          />
        </Tabs>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  statePad: {
    padding: 16,
    gap: 14,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  stateTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
  },
  stateDesc: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 20,
  },
  vehiclesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  vehicleOpt: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.4,
    paddingVertical: 11,
    alignItems: 'center',
    gap: 4,
  },
  vehicleOptText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
  },
  headerWrap: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
  },
  riderNavbar: {
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  riderIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontFamily: FONTS.heading,
    fontSize: 17,
  },
  wsDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  vehicleMeta: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  onlineToggle: {
    height: 36,
    borderRadius: 999,
    borderWidth: 1.3,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onlineText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
  },
  shopBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
