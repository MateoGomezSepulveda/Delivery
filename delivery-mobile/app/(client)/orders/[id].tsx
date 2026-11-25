import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  MapPin,
  Navigation,
  Star,
  X,
  XCircle,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { extractErrorMessage } from '@/api/axios.client';
import {
  cancelOrderApi,
  getOrderByIdApi,
  payOrderApi,
} from '@/api/endpoints/orders.api';
import { createReviewApi } from '@/api/endpoints/reviews.api';
import { OrderStatusBadge, PaymentMethodBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSocket } from '@/hooks/useSocket';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { OrderStatus } from '@/types/api.types';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

const ONLINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING', label: 'Pedido recibido' },
  { status: 'PAID', label: 'Pago aprobado' },
  { status: 'CONFIRMED', label: 'Confirmado' },
  { status: 'PREPARING', label: 'Alistando productos' },
  { status: 'OUT_FOR_DELIVERY', label: 'Repartidor en camino' },
  { status: 'DELIVERED', label: 'Entregado' },
];

const CASH_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING', label: 'Pedido recibido' },
  { status: 'CONFIRMED', label: 'Confirmado' },
  { status: 'PREPARING', label: 'Alistando productos' },
  { status: 'OUT_FOR_DELIVERY', label: 'Repartidor en camino' },
  { status: 'DELIVERED', label: 'Entregado y cobrado' },
];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useAppTheme();
  const queryClient = useQueryClient();

  const [liveLocation, setLiveLocation] = useState<{
    lat: number;
    lng: number;
    updatedAt?: string;
  } | null>(null);
  const [payingMp, setPayingMp] = useState(false);

  // Estado Modal de Calificación
  const [reviewTarget, setReviewTarget] = useState<{
    productId: string;
    name: string;
  } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useSocket({
    onLocationUpdate: (payload) => {
      if (payload.orderId === id) {
        setLiveLocation({
          lat: payload.lat,
          lng: payload.lng,
          updatedAt: payload.updatedAt,
        });
      }
    },
  });

  const {
    data: order,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrderByIdApi(String(id)),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrderApi(String(id)),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      toast.info('Pedido cancelado');
    },
    onError: (err) => {
      toast.error('No se pudo cancelar el pedido', {
        description: extractErrorMessage(err),
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      createReviewApi({
        product: reviewTarget!.productId,
        order: String(id),
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      if (reviewTarget?.productId) {
        void queryClient.invalidateQueries({
          queryKey: ['reviews', reviewTarget.productId],
        });
      }
      setReviewTarget(null);
      setRating(5);
      setComment('');
      toast.success('¡Gracias por tu calificación!');
    },
    onError: (err) => {
      toast.error('No se pudo enviar la reseña', {
        description: extractErrorMessage(err),
      });
    },
  });

  const handlePayNow = async () => {
    if (!order) return;
    setPayingMp(true);
    try {
      const res = await payOrderApi(order._id);
      if (res.paymentUrl) {
        await WebBrowser.openBrowserAsync(res.paymentUrl);
        await refetch();
      }
    } catch (error) {
      toast.error('No pudimos abrir la pasarela de pago', {
        description: extractErrorMessage(error),
      });
    } finally {
      setPayingMp(false);
    }
  };

  if (isLoading || !order) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.bg }]}>
        <Skeleton height={120} borderRadius={22} style={{ marginBottom: 12 }} />
        <Skeleton height={220} borderRadius={22} />
      </View>
    );
  }

  const shortId = order._id.slice(-6).toUpperCase();
  const isCash = order.paymentMethod === 'CASH_ON_DELIVERY';
  const steps = isCash ? CASH_STEPS : ONLINE_STEPS;
  const activeIndex = steps.findIndex((s) => s.status === order.status);
  const isCancelledOrFailed =
    order.status === 'CANCELLED' || order.status === 'FAILED';

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cabecera */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ArrowLeft size={18} color={colors.text} strokeWidth={2.2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>
              Pedido #{shortId}
            </Text>
            {order.createdAt ? (
              <Text style={[styles.subDate, { color: colors.textMuted }]}>
                {formatDateTime(order.createdAt)}
              </Text>
            ) : null}
          </View>
          <OrderStatusBadge
            status={order.status}
            paymentMethod={order.paymentMethod}
          />
        </View>

        {/* Tarjeta de Tracking GPS en Vivo cuando está en camino */}
        {(order.status === 'OUT_FOR_DELIVERY' || liveLocation) && (
          <View
            style={[
              styles.gpsCard,
              {
                backgroundColor: colors.secondarySoft,
                borderColor: colors.secondaryBorder,
              },
            ]}
          >
            <View style={styles.gpsHeader}>
              <Navigation
                size={19}
                color={colors.secondary}
                strokeWidth={2.2}
              />
              <Text style={[styles.gpsTitle, { color: colors.secondary }]}>
                Seguimiento GPS en Tiempo Real
              </Text>
            </View>

            <Text style={[styles.gpsDesc, { color: colors.textSecondary }]}>
              {liveLocation
                ? `Última coordenada recibida: ${liveLocation.lat.toFixed(5)}, ${liveLocation.lng.toFixed(5)}`
                : 'Tu repartidor ya salió con tu pedido. Recibirás sus coordenadas GPS en vivo aquí.'}
            </Text>

            <Button
              title={
                liveLocation
                  ? 'Ver ubicación del repartidor en Google Maps'
                  : 'Ver dirección en Google Maps'
              }
              size="sm"
              variant="secondary"
              rightIcon={
                <ExternalLink size={14} color="#FFFFFF" strokeWidth={2.2} />
              }
              onPress={() => {
                const url = liveLocation
                  ? `https://www.google.com/maps/search/?api=1&query=${liveLocation.lat},${liveLocation.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
                void Linking.openURL(url);
              }}
            />
          </View>
        )}

        {/* Línea de Tiempo del Pedido */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Progreso del pedido
          </Text>

          {isCancelledOrFailed ? (
            <View
              style={[
                styles.cancelledBanner,
                {
                  backgroundColor: colors.dangerSoft,
                  borderColor: colors.dangerBorder,
                },
              ]}
            >
              <XCircle size={18} color={colors.danger} strokeWidth={2.2} />
              <Text style={[styles.cancelledText, { color: colors.danger }]}>
                {order.status === 'CANCELLED'
                  ? 'Este pedido fue cancelado.'
                  : 'El pago del pedido falló.'}
              </Text>
            </View>
          ) : (
            <View style={styles.stepperList}>
              {steps.map((s, idx) => {
                const completed = activeIndex >= idx;
                const isCurrent = activeIndex === idx;
                return (
                  <View key={s.status} style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: completed
                            ? colors.primary
                            : colors.surfaceMuted,
                          borderColor: completed
                            ? colors.primary
                            : colors.borderStrong,
                        },
                      ]}
                    >
                      {completed ? (
                        <CheckCircle2
                          size={14}
                          color="#FFFFFF"
                          strokeWidth={2.4}
                        />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        {
                          color: completed ? colors.text : colors.textMuted,
                          fontFamily: isCurrent
                            ? FONTS.sansBold
                            : FONTS.sansMedium,
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Acciones cuando el pedido está PENDING */}
          {order.status === 'PENDING' ? (
            <View style={styles.pendingActions}>
              {!isCash && order.paymentStatus !== 'PAID' ? (
                <Button
                  title="Pagar Ahora con MercadoPago"
                  size="md"
                  fullWidth
                  loading={payingMp}
                  leftIcon={
                    <CreditCard size={17} color="#FFFFFF" strokeWidth={2.2} />
                  }
                  onPress={() => void handlePayNow()}
                />
              ) : null}

              <Button
                title="Cancelar Pedido"
                size="md"
                variant="outline"
                fullWidth
                loading={cancelMutation.isPending}
                onPress={() => cancelMutation.mutate()}
              />
            </View>
          ) : null}
        </View>

        {/* Dirección y Método de Pago */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.addrRow}>
            <MapPin size={17} color={colors.primary} strokeWidth={2.2} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                Dirección de entrega
              </Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>
                {order.address}
              </Text>
            </View>
          </View>

          <PaymentMethodBadge
            method={order.paymentMethod}
            paymentStatus={order.paymentStatus}
          />

          {isCash && order.cashAmountGiven ? (
            <Text style={[styles.cashInfo, { color: colors.textSecondary }]}>
              Pagas con {formatCurrency(order.cashAmountGiven)} · Cambio:{' '}
              {formatCurrency(order.changeDue ?? 0)}
            </Text>
          ) : null}
        </View>

        {/* Productos y Reseñas */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Productos ({order.items.length})
          </Text>

          {order.items.map((item, idx) => {
            const prodId =
              typeof item.productId === 'object' && item.productId !== null
                ? item.productId._id
                : String(item.productId);

            return (
              <View
                key={`${prodId}-${idx}`}
                style={[styles.itemRow, { borderBottomColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.text }]}>
                    {item.quantity}x {item.name}
                  </Text>
                  <Text
                    style={[styles.itemUnit, { color: colors.textSecondary }]}
                  >
                    {formatCurrency(item.price)} c/u
                  </Text>

                  {order.status === 'DELIVERED' ? (
                    <Pressable
                      onPress={() =>
                        setReviewTarget({ productId: prodId, name: item.name })
                      }
                      style={styles.rateBtn}
                    >
                      <Star
                        size={13}
                        color="#F59E0B"
                        fill="#F59E0B"
                        strokeWidth={2}
                      />
                      <Text
                        style={[styles.rateText, { color: colors.primary }]}
                      >
                        Calificar producto
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <Text style={[styles.itemSubtotal, { color: colors.text }]}>
                  {formatCurrency(item.price * item.quantity)}
                </Text>
              </View>
            );
          })}

          <View style={styles.totalsWrap}>
            {typeof order.subtotal === 'number' ? (
              <View style={styles.finRow}>
                <Text
                  style={[styles.finLabel, { color: colors.textSecondary }]}
                >
                  Subtotal
                </Text>
                <Text style={[styles.finVal, { color: colors.text }]}>
                  {formatCurrency(order.subtotal)}
                </Text>
              </View>
            ) : null}

            {order.riderDiscount ? (
              <View style={styles.finRow}>
                <Text style={[styles.finLabel, { color: colors.secondary }]}>
                  Beneficio Mensajero
                </Text>
                <Text style={[styles.finVal, { color: colors.secondary }]}>
                  -{formatCurrency(order.riderDiscount)}
                </Text>
              </View>
            ) : null}

            {order.couponDiscount ? (
              <View style={styles.finRow}>
                <Text style={[styles.finLabel, { color: colors.success }]}>
                  Cupón ({order.couponCode})
                </Text>
                <Text style={[styles.finVal, { color: colors.success }]}>
                  -{formatCurrency(order.couponDiscount)}
                </Text>
              </View>
            ) : null}

            <View style={styles.finRow}>
              <Text style={[styles.finLabel, { color: colors.textSecondary }]}>
                Domicilio
              </Text>
              <Text style={[styles.finVal, { color: colors.text }]}>
                {formatCurrency(order.deliveryFee ?? 5000)}
              </Text>
            </View>

            <View style={styles.finTotalRow}>
              <Text style={[styles.finTotalLabel, { color: colors.text }]}>
                Total
              </Text>
              <Text style={[styles.finTotalVal, { color: colors.primary }]}>
                {formatCurrency(order.total)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal de Calificación de Producto Entregado */}
      <Modal
        visible={Boolean(reviewTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Calificar producto
              </Text>
              <Pressable onPress={() => setReviewTarget(null)}>
                <X size={20} color={colors.textSecondary} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={[styles.modalProdName, { color: colors.primary }]}>
              {reviewTarget?.name}
            </Text>

            <View style={styles.starsPicker}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setRating(s)}
                  style={styles.starBtn}
                >
                  <Star
                    size={30}
                    color="#F59E0B"
                    fill={s <= rating ? '#F59E0B' : 'transparent'}
                    strokeWidth={2}
                  />
                </Pressable>
              ))}
            </View>

            <Input
              label="Tu opinión (opcional)"
              value={comment}
              onChangeText={setComment}
              placeholder="¿Qué te pareció la calidad y temperatura?"
            />

            <Button
              title="Publicar Reseña"
              size="lg"
              fullWidth
              loading={reviewMutation.isPending}
              onPress={() => reviewMutation.mutate()}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
  },
  subDate: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
  },
  gpsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 10,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 15,
  },
  gpsDesc: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 18.5,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
  },
  cancelledBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelledText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13.5,
  },
  stepperList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 13.5,
  },
  pendingActions: {
    marginTop: 6,
    gap: 8,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  metaLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11.5,
  },
  metaVal: {
    fontFamily: FONTS.sansSemi,
    fontSize: 14,
    marginTop: 2,
  },
  cashInfo: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12.5,
  },
  itemRow: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemName: {
    fontFamily: FONTS.sansSemi,
    fontSize: 14,
  },
  itemUnit: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    marginTop: 2,
  },
  rateBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rateText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
  },
  itemSubtotal: {
    fontFamily: FONTS.headingSemi,
    fontSize: 14.5,
  },
  totalsWrap: {
    gap: 7,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  finLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
  },
  finVal: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
  },
  finTotalRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finTotalLabel: {
    fontFamily: FONTS.heading,
    fontSize: 16.5,
  },
  finTotalVal: {
    fontFamily: FONTS.heading,
    fontSize: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    padding: 20,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
  },
  modalProdName: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
  },
  starsPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  starBtn: {
    padding: 4,
  },
});
