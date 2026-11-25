import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import {
  Banknote,
  CheckCircle2,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Play,
  Square,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
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
  deliverOrderApi,
  getActiveOrdersApi,
  updateLocationApi,
} from '@/api/endpoints/delivery.api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { DeliveryOrder } from '@/types/delivery.types';
import { formatCurrency } from '@/utils/formatters';

type TrackingMode = 'off' | 'gps' | 'sim';

export default function RiderActiveRouteScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const queryClient = useQueryClient();

  const [trackingMode, setTrackingMode] = useState<TrackingMode>('off');
  const [lastCoords, setLastCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<DeliveryOrder | null>(null);
  const [cashConfirmed, setCashConfirmed] = useState(false);

  const watchSubRef = useRef<Location.LocationSubscription | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    data: activeOrders = [],
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['delivery-active'],
    queryFn: getActiveOrdersApi,
    refetchInterval: 12_000,
  });

  const stopTracking = () => {
    if (watchSubRef.current) {
      watchSubRef.current.remove();
      watchSubRef.current = null;
    }
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setTrackingMode('off');
  };

  useEffect(() => {
    return () => {
      if (watchSubRef.current) watchSubRef.current.remove();
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  const startRealGps = async () => {
    stopTracking();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.warning('Permiso GPS requerido para transmitir tu ruta');
        return;
      }

      setTrackingMode('gps');
      watchSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          setLastCoords({ lat, lng });
          void updateLocationApi(lat, lng).catch(() => undefined);
        },
      );
      toast.success('Transmitiendo ubicación GPS real al cliente');
    } catch (error) {
      stopTracking();
      toast.error('No se pudo iniciar el GPS', {
        description: extractErrorMessage(error),
      });
    }
  };

  const startRouteSimulation = () => {
    stopTracking();
    setTrackingMode('sim');
    let step = 0;
    const baseLat = 4.676;
    const baseLng = -74.048;

    simTimerRef.current = setInterval(() => {
      step = (step + 1) % 30;
      const lat = baseLat + step * 0.00045;
      const lng = baseLng + step * 0.00035;
      setLastCoords({ lat, lng });
      void updateLocationApi(lat, lng).catch(() => undefined);
    }, 3000);

    toast.info('Simulador GPS activo (enviando coordenadas cada 3s)');
  };

  const deliverMutation = useMutation({
    mutationFn: (orderId: string) => deliverOrderApi(orderId),
    onSuccess: () => {
      setConfirmOrder(null);
      setCashConfirmed(false);
      void queryClient.invalidateQueries({ queryKey: ['delivery-active'] });
      void queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['delivery-history'] });
      toast.success('¡Entrega completada con éxito!');
    },
    onError: (err) => {
      toast.error('No se pudo cerrar la entrega', {
        description: extractErrorMessage(err),
      });
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
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
          Ruta Activa ({activeOrders.length})
        </Text>

        {/* Panel de Transmisión GPS en Tiempo Real */}
        <View
          style={[
            styles.gpsCard,
            {
              backgroundColor: colors.surface,
              borderColor:
                trackingMode !== 'off' ? colors.secondary : colors.border,
            },
          ]}
        >
          <View style={styles.gpsHeader}>
            <LocateFixed
              size={18}
              color={
                trackingMode !== 'off' ? colors.secondary : colors.textMuted
              }
              strokeWidth={2.2}
            />
            <Text style={[styles.gpsTitle, { color: colors.text }]}>
              Transmisor GPS para Clientes
            </Text>
          </View>

          <Text style={[styles.gpsSub, { color: colors.textSecondary }]}>
            {trackingMode === 'off'
              ? 'Activa el GPS o el simulador para que el cliente vea tu recorrido en vivo.'
              : `Transmitiendo (${trackingMode.toUpperCase()}): ${
                  lastCoords
                    ? `${lastCoords.lat.toFixed(5)}, ${lastCoords.lng.toFixed(5)}`
                    : 'Obteniendo señal...'
                }`}
          </Text>

          <View style={styles.gpsButtonsRow}>
            {trackingMode === 'off' ? (
              <>
                <View style={{ flex: 1 }}>
                  <Button
                    title="GPS Real"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    leftIcon={
                      <LocateFixed size={14} color="#FFFFFF" strokeWidth={2.2} />
                    }
                    onPress={() => void startRealGps()}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Simular Ruta"
                    variant="outline"
                    size="sm"
                    fullWidth
                    leftIcon={
                      <Play size={14} color={colors.text} strokeWidth={2.2} />
                    }
                    onPress={startRouteSimulation}
                  />
                </View>
              </>
            ) : (
              <Button
                title="Detener Transmisión GPS"
                variant="danger"
                size="sm"
                fullWidth
                leftIcon={<Square size={14} color="#FFFFFF" strokeWidth={2.2} />}
                onPress={stopTracking}
              />
            )}
          </View>
        </View>

        {activeOrders.length === 0 ? (
          <EmptyState
            icon={Navigation}
            title="No tienes entregas en curso"
            description="Toma un pedido desde la pestaña Disponibles para iniciar tu ruta."
            actionLabel="Ver Pedidos Disponibles"
            onAction={() => router.navigate('/(delivery)')}
          />
        ) : (
          <View style={styles.stack}>
            {activeOrders.map((order) => {
              const shortId = order._id.slice(-6).toUpperCase();
              const isCash = order.paymentMethod === 'CASH_ON_DELIVERY';
              const earning = order.deliveryFee ?? 5000;
              const customer =
                typeof order.userId === 'object' && order.userId !== null
                  ? order.userId
                  : null;
              const phone = customer?.phone?.trim() || '';
              const waDigits = phone.replace(/\D/g, '');
              const fullWa =
                waDigits.length === 10 ? `57${waDigits}` : waDigits;

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
                      Entrega #{shortId}
                    </Text>
                    <Badge variant="secondary">
                      +{formatCurrency(earning)} envío
                    </Badge>
                  </View>

                  {isCash ? (
                    <View
                      style={[
                        styles.cashAlert,
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
                          style={[styles.cashTitle, { color: colors.warning }]}
                        >
                          COBRAR {formatCurrency(order.total)} EN EFECTIVO
                        </Text>
                        {order.cashAmountGiven ? (
                          <Text
                            style={[
                              styles.cashSub,
                              { color: colors.textSecondary },
                            ]}
                          >
                            Recibes {formatCurrency(order.cashAmountGiven)} ·
                            Entregar cambio:{' '}
                            {formatCurrency(order.changeDue ?? 0)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.addrRow}>
                    <MapPin
                      size={16}
                      color={colors.primary}
                      strokeWidth={2.2}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.custName, { color: colors.text }]}>
                        {customer?.name || 'Cliente DeliveryPro'}
                      </Text>
                      <Text
                        style={[
                          styles.addrText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {order.address}
                      </Text>
                    </View>
                  </View>

                  {/* Botones de Acción Rápida Nativa */}
                  <View style={styles.quickGrid}>
                    {phone ? (
                      <>
                        <Pressable
                          onPress={() => void Linking.openURL(`tel:${phone}`)}
                          style={[
                            styles.quickBtn,
                            {
                              backgroundColor: colors.surfaceMuted,
                              borderColor: colors.borderStrong,
                            },
                          ]}
                        >
                          <Phone
                            size={15}
                            color={colors.text}
                            strokeWidth={2.1}
                          />
                          <Text
                            style={[styles.quickText, { color: colors.text }]}
                          >
                            Llamar
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            void Linking.openURL(
                              `https://wa.me/${fullWa}?text=${encodeURIComponent(
                                `Hola ${customer?.name || ''}, soy tu repartidor de DeliveryPro con tu pedido #${shortId}.`,
                              )}`,
                            )
                          }
                          style={[
                            styles.quickBtn,
                            {
                              backgroundColor: colors.successSoft,
                              borderColor: colors.successBorder,
                            },
                          ]}
                        >
                          <MessageCircle
                            size={15}
                            color={colors.success}
                            strokeWidth={2.1}
                          />
                          <Text
                            style={[
                              styles.quickText,
                              { color: colors.success },
                            ]}
                          >
                            WhatsApp
                          </Text>
                        </Pressable>
                      </>
                    ) : null}

                    <Pressable
                      onPress={() =>
                        void Linking.openURL(
                          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            order.address,
                          )}`,
                        )
                      }
                      style={[
                        styles.quickBtn,
                        {
                          backgroundColor: colors.secondarySoft,
                          borderColor: colors.secondaryBorder,
                        },
                      ]}
                    >
                      <Navigation
                        size={15}
                        color={colors.secondary}
                        strokeWidth={2.1}
                      />
                      <Text
                        style={[styles.quickText, { color: colors.secondary }]}
                      >
                        Maps
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        void Linking.openURL(
                          `https://waze.com/ul?q=${encodeURIComponent(
                            order.address,
                          )}&navigate=yes`,
                        )
                      }
                      style={[
                        styles.quickBtn,
                        {
                          backgroundColor: colors.primarySoft,
                          borderColor: colors.primaryBorder,
                        },
                      ]}
                    >
                      <Navigation
                        size={15}
                        color={colors.primary}
                        strokeWidth={2.1}
                      />
                      <Text
                        style={[
                          styles.quickText,
                          { color: colors.primaryText },
                        ]}
                      >
                        Waze
                      </Text>
                    </Pressable>
                  </View>

                  <Button
                    title="Marcar como Entregado"
                    size="lg"
                    fullWidth
                    leftIcon={
                      <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.3} />
                    }
                    onPress={() => {
                      setCashConfirmed(false);
                      setConfirmOrder(order);
                    }}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal de Confirmación de Entrega y Recaudo */}
      <Modal
        visible={Boolean(confirmOrder)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOrder(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Confirmar entrega al cliente
            </Text>

            {confirmOrder?.paymentMethod === 'CASH_ON_DELIVERY' ? (
              <Pressable
                onPress={() => setCashConfirmed((v) => !v)}
                style={[
                  styles.cashCheckBox,
                  {
                    backgroundColor: colors.warningSoft,
                    borderColor: cashConfirmed
                      ? colors.success
                      : colors.warningBorder,
                  },
                ]}
              >
                <CheckCircle2
                  size={21}
                  color={cashConfirmed ? colors.success : colors.textMuted}
                  strokeWidth={2.3}
                />
                <Text style={[styles.cashCheckText, { color: colors.text }]}>
                  Confirmo que recibí {formatCurrency(confirmOrder.total)} en
                  efectivo del cliente.
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                Este pedido ya fue pagado en línea. Confirma que entregaste los
                productos en mano.
              </Text>
            )}

            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancelar"
                  variant="outline"
                  fullWidth
                  onPress={() => setConfirmOrder(null)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Confirmar"
                  fullWidth
                  disabled={
                    confirmOrder?.paymentMethod === 'CASH_ON_DELIVERY' &&
                    !cashConfirmed
                  }
                  loading={deliverMutation.isPending}
                  onPress={() => {
                    if (confirmOrder) {
                      deliverMutation.mutate(confirmOrder._id);
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  gpsCard: {
    borderRadius: 20,
    borderWidth: 1.4,
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
  gpsSub: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    lineHeight: 18,
  },
  gpsButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stack: {
    gap: 12,
  },
  orderCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderCode: {
    fontFamily: FONTS.heading,
    fontSize: 17,
  },
  cashAlert: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  cashTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
  },
  cashSub: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    marginTop: 2,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  custName: {
    fontFamily: FONTS.headingSemi,
    fontSize: 15,
  },
  addrText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13.5,
    marginTop: 2,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.62)',
    padding: 20,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
  },
  modalSub: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 20,
  },
  cashCheckBox: {
    borderRadius: 15,
    borderWidth: 1.5,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cashCheckText: {
    flex: 1,
    fontFamily: FONTS.sansSemi,
    fontSize: 13.5,
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
