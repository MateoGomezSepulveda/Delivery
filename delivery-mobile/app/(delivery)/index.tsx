import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  MapPin,
  PackageSearch,
  Power,
  User as UserIcon,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { extractErrorMessage } from '@/api/axios.client';
import {
  acceptOrderApi,
  getAvailableOrdersApi,
  getDeliveryProfileApi,
  updateAvailabilityApi,
} from '@/api/endpoints/delivery.api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import { formatCurrency } from '@/utils/formatters';

export default function RiderAvailableOrdersScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['delivery-profile', user?._id],
    queryFn: getDeliveryProfileApi,
  });

  const {
    data: orders = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['delivery-available'],
    queryFn: getAvailableOrdersApi,
    refetchInterval: 12_000,
  });

  const goOnlineMutation = useMutation({
    mutationFn: () => updateAvailabilityApi(true),
    onSuccess: (updated) => {
      queryClient.setQueryData(['delivery-profile', user?._id], updated);
      void refetch();
      toast.success('¡Ya estás en línea!');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (orderId: string) => acceptOrderApi(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
      void queryClient.invalidateQueries({ queryKey: ['delivery-active'] });
      toast.success('¡Entrega asignada!', {
        description: 'Revisa los datos del cliente y dirígete al punto.',
      });
      router.navigate('/(delivery)/active');
    },
    onError: (err) => {
      toast.error('No se pudo tomar el pedido', {
        description: extractErrorMessage(err),
      });
    },
    onSettled: () => setAcceptingId(null),
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={colors.secondary}
          colors={[colors.secondary]}
        />
      }
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>
        Pedidos Disponibles ({orders.length})
      </Text>

      {profile && !profile.isAvailable ? (
        <View
          style={[
            styles.offlineBanner,
            {
              backgroundColor: colors.warningSoft,
              borderColor: colors.warningBorder,
            },
          ]}
        >
          <Text style={[styles.offlineTitle, { color: colors.text }]}>
            Estás en modo Offline
          </Text>
          <Text style={[styles.offlineDesc, { color: colors.textSecondary }]}>
            Activa tu disponibilidad para recibir alertas instantáneas y poder
            aceptar entregas cercanas.
          </Text>
          <Button
            title="Ponerme Disponible"
            size="md"
            variant="secondary"
            loading={goOnlineMutation.isPending}
            leftIcon={<Power size={16} color="#FFFFFF" strokeWidth={2.2} />}
            onPress={() => goOnlineMutation.mutate()}
          />
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.stack}>
          <Skeleton height={180} borderRadius={22} />
          <Skeleton height={180} borderRadius={22} />
        </View>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No hay pedidos listos en este momento"
          description="Mantente en línea; apenas un pedido pase a preparación te avisaremos con vibración en vivo."
          actionLabel="Actualizar bolsa"
          onAction={() => void refetch()}
        />
      ) : (
        <View style={styles.stack}>
          {orders.map((order) => {
            const shortId = order._id.slice(-6).toUpperCase();
            const earning =
              order.deliveryFee && order.deliveryFee > 0
                ? order.deliveryFee
                : 5000;
            const isCash = order.paymentMethod === 'CASH_ON_DELIVERY';
            const customer =
              typeof order.userId === 'object' && order.userId !== null
                ? order.userId
                : null;

            return (
              <View
                key={order._id}
                style={[
                  styles.orderCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.orderCode, { color: colors.text }]}>
                    Pedido #{shortId}
                  </Text>
                  <Badge variant="success">
                    +{formatCurrency(earning)} · Ganancia envío
                  </Badge>
                </View>

                {/* Alerta Financiera */}
                {isCash ? (
                  <View
                    style={[
                      styles.payBox,
                      {
                        backgroundColor: colors.warningSoft,
                        borderColor: colors.warningBorder,
                      },
                    ]}
                  >
                    <Banknote
                      size={18}
                      color={colors.warning}
                      strokeWidth={2.2}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.payTitle, { color: colors.warning }]}
                      >
                        Cobrar en efectivo: {formatCurrency(order.total)}
                      </Text>
                      {order.cashAmountGiven ? (
                        <Text
                          style={[
                            styles.paySub,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Paga con {formatCurrency(order.cashAmountGiven)} ·
                          Llevar cambio: {formatCurrency(order.changeDue ?? 0)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.payBox,
                      {
                        backgroundColor: colors.successSoft,
                        borderColor: colors.successBorder,
                      },
                    ]}
                  >
                    <CreditCard
                      size={18}
                      color={colors.success}
                      strokeWidth={2.2}
                    />
                    <Text style={[styles.payTitle, { color: colors.success }]}>
                      Pagado en línea · No cobrar al cliente
                    </Text>
                  </View>
                )}

                {customer ? (
                  <View style={styles.infoRow}>
                    <UserIcon
                      size={14}
                      color={colors.textMuted}
                      strokeWidth={2}
                    />
                    <Text
                      style={[styles.infoText, { color: colors.textSecondary }]}
                    >
                      {customer.name}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.infoRow}>
                  <MapPin size={14} color={colors.primary} strokeWidth={2.2} />
                  <Text style={[styles.addrText, { color: colors.text }]}>
                    {order.address}
                  </Text>
                </View>

                <Text
                  numberOfLines={2}
                  style={[styles.itemsPreview, { color: colors.textMuted }]}
                >
                  {order.items
                    .map((i) => `${i.quantity}x ${i.name}`)
                    .join(' · ')}
                </Text>

                <Button
                  title="Aceptar Entrega"
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled={!profile?.isAvailable}
                  loading={acceptMutation.isPending && acceptingId === order._id}
                  leftIcon={
                    <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.2} />
                  }
                  onPress={() => {
                    setAcceptingId(order._id);
                    acceptMutation.mutate(order._id);
                  }}
                />
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 14,
  },
  screenTitle: {
    fontFamily: FONTS.heading,
    fontSize: 21,
  },
  offlineBanner: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  offlineTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
  },
  offlineDesc: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  stack: {
    gap: 12,
  },
  orderCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderCode: {
    fontFamily: FONTS.heading,
    fontSize: 17,
  },
  payBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  payTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
  },
  paySub: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  infoText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13.5,
  },
  addrText: {
    flex: 1,
    fontFamily: FONTS.sansSemi,
    fontSize: 14,
    lineHeight: 19,
  },
  itemsPreview: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
  },
});
