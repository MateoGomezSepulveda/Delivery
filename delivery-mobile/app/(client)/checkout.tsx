import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  Banknote,
  Bike,
  CheckCircle2,
  CreditCard,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { extractErrorMessage } from '@/api/axios.client';
import { getMyAddressesApi } from '@/api/endpoints/addresses.api';
import { getCartApi } from '@/api/endpoints/cart.api';
import { createOrderApi, payOrderApi } from '@/api/endpoints/orders.api';
import { updateUserApi } from '@/api/endpoints/users.api';
import { CouponBox } from '@/components/cart/CouponBox';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useDeliveryFee } from '@/hooks/useDeliveryFee';
import { useRiderDiscountQuota } from '@/hooks/useRiderDiscountQuota';
import { useAuthStore } from '@/store/useAuthStore';
import {
  DEFAULT_ADDRESS_LABEL,
  useCartUiStore,
} from '@/store/useCartUiStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { Address, PaymentMethod } from '@/types/order.types';
import { formatCurrency } from '@/utils/formatters';
import { validatePhoneNumber } from '@/utils/phone';

function formatAddressString(addr: Address): string {
  const parts = [
    `${addr.title}: ${addr.street}`,
    addr.city,
    addr.state,
    addr.deliveryInstructions ? `(${addr.deliveryInstructions})` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

function getQuickCashDenominations(total: number): number[] {
  if (total <= 0) return [];
  const candidates = [
    total,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 20000) * 20000,
    Math.ceil(total / 50000) * 50000,
    50000,
    100000,
    200000,
  ].filter((v) => v >= total);

  return Array.from(new Set(candidates))
    .sort((a, b) => a - b)
    .slice(0, 4);
}

export default function CheckoutScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, updateUserState } = useAuthStore();
  const {
    activeAddressLabel,
    setSelectedAddress,
    appliedCoupon,
    setAppliedCoupon,
  } = useCartUiStore();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [customAddress, setCustomAddress] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('MERCADOPAGO');
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [inlinePhone, setInlinePhone] = useState(user?.phone ?? '');
  const [inlinePhoneError, setInlinePhoneError] = useState<string | undefined>();
  const [savingPhone, setSavingPhone] = useState(false);
  const [processingMp, setProcessingMp] = useState(false);

  const hasValidPhone = Boolean(user?.phone?.trim());

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: getMyAddressesApi,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedAddressId(def._id);
      setCustomAddress(formatAddressString(def));
      setSelectedAddress(def);
    } else if (
      addresses.length === 0 &&
      !customAddress &&
      activeAddressLabel &&
      activeAddressLabel !== DEFAULT_ADDRESS_LABEL
    ) {
      setCustomAddress(activeAddressLabel);
    }
  }, [
    activeAddressLabel,
    addresses,
    customAddress,
    selectedAddressId,
    setSelectedAddress,
  ]);

  const items = cart?.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const { deliveryFee } = useDeliveryFee({
    address: customAddress || activeAddressLabel,
    subtotal,
    enabled: isAuthenticated && items.length > 0,
  });

  const { data: riderQuota } = useRiderDiscountQuota();
  const riderDiscount =
    riderQuota?.eligible && subtotal > 0
      ? Math.round((subtotal * (riderQuota.discountPercent || 10)) / 100)
      : 0;

  const couponDiscount = appliedCoupon
    ? Math.min(appliedCoupon.discountAmount, Math.max(0, subtotal - riderDiscount))
    : 0;

  const finalTotal = Math.max(
    0,
    subtotal - riderDiscount - couponDiscount + (items.length > 0 ? deliveryFee : 0),
  );

  const quickDenominations = useMemo(
    () => getQuickCashDenominations(finalTotal),
    [finalTotal],
  );

  const parsedCash = Number(cashAmountInput.replace(/\D/g, '')) || 0;
  const changeDue = Math.max(0, parsedCash - finalTotal);

  const handleSaveInlinePhone = async () => {
    if (!user) return;
    const err = validatePhoneNumber(inlinePhone);
    if (err) {
      setInlinePhoneError(err);
      return;
    }
    setInlinePhoneError(undefined);
    setSavingPhone(true);
    try {
      const updated = await updateUserApi(user._id, {
        phone: inlinePhone.trim(),
      });
      updateUserState({ phone: updated.phone || inlinePhone.trim() });
      toast.success('Celular guardado en tu perfil');
    } catch (error) {
      toast.error('No se pudo guardar el celular', {
        description: extractErrorMessage(error),
      });
    } finally {
      setSavingPhone(false);
    }
  };

  const orderMutation = useMutation({
    mutationFn: () =>
      createOrderApi({
        address: customAddress.trim(),
        couponCode: appliedCoupon?.code || undefined,
        paymentMethod,
        cashAmountGiven:
          paymentMethod === 'CASH_ON_DELIVERY' ? parsedCash : undefined,
      }),
    onSuccess: async (order) => {
      setAppliedCoupon(null);
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['my-orders'] });

      if (paymentMethod === 'MERCADOPAGO') {
        setProcessingMp(true);
        try {
          const payRes = await payOrderApi(order._id);
          if (payRes.paymentUrl) {
            await WebBrowser.openBrowserAsync(payRes.paymentUrl);
          }
          toast.info('Revisa el estado de tu pago en el detalle del pedido');
        } catch (err) {
          toast.warning('Pedido creado. Puedes completar el pago desde el detalle.', {
            description: extractErrorMessage(err),
          });
        } finally {
          setProcessingMp(false);
        }
      } else {
        toast.success('¡Pedido confirmado contraentrega!', {
          description: 'Prepara el efectivo para cuando llegue tu repartidor.',
        });
      }

      router.replace({
        pathname: '/(client)/orders/[id]',
        params: { id: order._id },
      });
    },
    onError: (err) => {
      toast.error('No pudimos procesar tu pedido', {
        description: extractErrorMessage(err),
      });
    },
  });

  const handleConfirmOrder = () => {
    if (!hasValidPhone) {
      toast.warning('Guarda tu número de celular antes de continuar');
      return;
    }
    if (!customAddress.trim() || customAddress.trim().length < 6) {
      toast.warning('Selecciona o escribe una dirección de entrega válida');
      return;
    }
    if (paymentMethod === 'CASH_ON_DELIVERY' && parsedCash < finalTotal) {
      toast.warning(
        `Ingresa un monto en efectivo igual o mayor a ${formatCurrency(finalTotal)}`,
      );
      return;
    }
    orderMutation.mutate();
  };

  if (!isAuthenticated || items.length === 0) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.bg }]}>
        <EmptyState
          icon={ShoppingBag}
          title="No tienes productos para pagar"
          description="Agrega productos desde el catálogo antes de ir al checkout."
          actionLabel="Volver al Catálogo"
          onAction={() => router.navigate('/(client)')}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            Finalizar Pedido
          </Text>
        </View>

        {/* Alerta de celular obligatorio igual que en Web */}
        {!hasValidPhone ? (
          <View
            style={[
              styles.phoneBanner,
              {
                backgroundColor: colors.warningSoft,
                borderColor: colors.warningBorder,
              },
            ]}
          >
            <View style={styles.phoneHeader}>
              <Phone size={17} color={colors.warning} strokeWidth={2.2} />
              <Text style={[styles.phoneTitle, { color: colors.text }]}>
                Confirma tu celular de contacto
              </Text>
            </View>
            <Text style={[styles.phoneDesc, { color: colors.textSecondary }]}>
              El repartidor lo usará para llamarte o escribirte al llegar a tu
              puerta.
            </Text>
            <Input
              value={inlinePhone}
              onChangeText={setInlinePhone}
              keyboardType="phone-pad"
              placeholder="Ej. 300 123 4567"
              error={inlinePhoneError}
            />
            <Button
              title="Guardar celular"
              size="md"
              loading={savingPhone}
              onPress={() => void handleSaveInlinePhone()}
            />
          </View>
        ) : null}

        {/* 1. Dirección de entrega */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <MapPin size={17} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                1. Dirección de entrega
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/(client)/addresses')}
              style={styles.manageBtn}
            >
              <Plus size={14} color={colors.primary} strokeWidth={2.4} />
              <Text style={[styles.manageText, { color: colors.primary }]}>
                Gestionar
              </Text>
            </Pressable>
          </View>

          {addresses.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.addrChips}
            >
              {addresses.map((addr) => {
                const active = selectedAddressId === addr._id;
                return (
                  <Pressable
                    key={addr._id}
                    onPress={() => {
                      setSelectedAddressId(addr._id);
                      setCustomAddress(formatAddressString(addr));
                      setSelectedAddress(addr);
                    }}
                    style={[
                      styles.addrChip,
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
                    <Text
                      style={[
                        styles.addrChipTitle,
                        { color: active ? colors.primaryText : colors.text },
                      ]}
                    >
                      {addr.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.addrChipSub,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {addr.street}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <Input
            label="Dirección completa e indicaciones"
            value={customAddress}
            onChangeText={setCustomAddress}
            placeholder="Calle, número, apartamento y punto de referencia"
          />
        </View>

        {/* 2. Método de Pago Dual */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardTitleRow}>
            <CreditCard size={17} color={colors.primary} strokeWidth={2.2} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              2. Método de pago
            </Text>
          </View>

          {/* Opción MercadoPago */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: paymentMethod === 'MERCADOPAGO' }}
            onPress={() => setPaymentMethod('MERCADOPAGO')}
            style={[
              styles.methodOption,
              {
                backgroundColor:
                  paymentMethod === 'MERCADOPAGO'
                    ? colors.secondarySoft
                    : colors.surfaceMuted,
                borderColor:
                  paymentMethod === 'MERCADOPAGO'
                    ? colors.secondary
                    : colors.borderStrong,
              },
            ]}
          >
            <CreditCard
              size={22}
              color={
                paymentMethod === 'MERCADOPAGO'
                  ? colors.secondary
                  : colors.textSecondary
              }
              strokeWidth={2.1}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodTitle, { color: colors.text }]}>
                Pago en Línea (MercadoPago)
              </Text>
              <Text
                style={[styles.methodSub, { color: colors.textSecondary }]}
              >
                PSE, Nequi, Daviplata, Tarjeta débito o crédito
              </Text>
            </View>
            {paymentMethod === 'MERCADOPAGO' ? (
              <CheckCircle2
                size={20}
                color={colors.secondary}
                strokeWidth={2.3}
              />
            ) : null}
          </Pressable>

          {/* Opción Efectivo Contraentrega */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{
              checked: paymentMethod === 'CASH_ON_DELIVERY',
            }}
            onPress={() => {
              setPaymentMethod('CASH_ON_DELIVERY');
              if (!cashAmountInput && finalTotal > 0) {
                setCashAmountInput(String(finalTotal));
              }
            }}
            style={[
              styles.methodOption,
              {
                backgroundColor:
                  paymentMethod === 'CASH_ON_DELIVERY'
                    ? colors.successSoft
                    : colors.surfaceMuted,
                borderColor:
                  paymentMethod === 'CASH_ON_DELIVERY'
                    ? colors.success
                    : colors.borderStrong,
              },
            ]}
          >
            <Banknote
              size={22}
              color={
                paymentMethod === 'CASH_ON_DELIVERY'
                  ? colors.success
                  : colors.textSecondary
              }
              strokeWidth={2.1}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodTitle, { color: colors.text }]}>
                Efectivo Contraentrega
              </Text>
              <Text
                style={[styles.methodSub, { color: colors.textSecondary }]}
              >
                Pagas directamente al repartidor al recibir tu pedido
              </Text>
            </View>
            {paymentMethod === 'CASH_ON_DELIVERY' ? (
              <CheckCircle2
                size={20}
                color={colors.success}
                strokeWidth={2.3}
              />
            ) : null}
          </Pressable>

          {/* Calculadora de Cambio en Efectivo */}
          {paymentMethod === 'CASH_ON_DELIVERY' ? (
            <View
              style={[
                styles.cashBox,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <Text style={[styles.cashLabel, { color: colors.text }]}>
                ¿Con cuánto vas a pagar?
              </Text>

              <View style={styles.denomRow}>
                {quickDenominations.map((amt) => {
                  const active = parsedCash === amt;
                  return (
                    <Pressable
                      key={amt}
                      onPress={() => setCashAmountInput(String(amt))}
                      style={[
                        styles.denomChip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.surface,
                          borderColor: active
                            ? colors.primary
                            : colors.borderStrong,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.denomText,
                          { color: active ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {amt === finalTotal
                          ? 'Exacto'
                          : formatCurrency(amt)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Input
                value={cashAmountInput}
                onChangeText={(txt) =>
                  setCashAmountInput(txt.replace(/\D/g, ''))
                }
                keyboardType="numeric"
                placeholder={`Mínimo ${finalTotal}`}
                helperText={
                  parsedCash >= finalTotal
                    ? `Cambio a recibir del repartidor: ${formatCurrency(changeDue)}`
                    : `Faltan ${formatCurrency(finalTotal - parsedCash)} para cubrir el total`
                }
              />
            </View>
          ) : null}
        </View>

        {/* 3. Cupón */}
        <CouponBox orderTotal={subtotal} />

        {/* 4. Resumen y Confirmación */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Resumen final ({items.reduce((s, i) => s + i.quantity, 0)} uds)
          </Text>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
              Subtotal
            </Text>
            <Text style={[styles.rowVal, { color: colors.text }]}>
              {formatCurrency(subtotal)}
            </Text>
          </View>

          {riderDiscount > 0 ? (
            <View style={styles.row}>
              <View style={styles.inlineIcon}>
                <Bike size={14} color={colors.secondary} strokeWidth={2.2} />
                <Text style={[styles.rowLabel, { color: colors.secondary }]}>
                  Descuento Mensajero (-{riderQuota?.discountPercent ?? 10}%)
                </Text>
              </View>
              <Text style={[styles.rowVal, { color: colors.secondary }]}>
                -{formatCurrency(riderDiscount)}
              </Text>
            </View>
          ) : null}

          {couponDiscount > 0 ? (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.success }]}>
                Cupón ({appliedCoupon?.code})
              </Text>
              <Text style={[styles.rowVal, { color: colors.success }]}>
                -{formatCurrency(couponDiscount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
              Costo de envío
            </Text>
            <Text style={[styles.rowVal, { color: colors.text }]}>
              {formatCurrency(deliveryFee)}
            </Text>
          </View>

          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Total a pagar
            </Text>
            <Text style={[styles.totalVal, { color: colors.primary }]}>
              {formatCurrency(finalTotal)}
            </Text>
          </View>

          <Button
            title={
              paymentMethod === 'MERCADOPAGO'
                ? `Pagar con MercadoPago · ${formatCurrency(finalTotal)}`
                : `Confirmar Contraentrega · ${formatCurrency(finalTotal)}`
            }
            size="lg"
            fullWidth
            loading={orderMutation.isPending || processingMp}
            leftIcon={
              <ShieldCheck size={19} color="#FFFFFF" strokeWidth={2.2} />
            }
            onPress={handleConfirmOrder}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
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
    fontSize: 21,
  },
  phoneBanner: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 10,
  },
  phoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 15,
  },
  phoneDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    lineHeight: 18,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cardTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
  },
  addrChips: {
    gap: 8,
  },
  addrChip: {
    width: 165,
    borderRadius: 14,
    borderWidth: 1.4,
    padding: 10,
    gap: 2,
  },
  addrChipTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
  },
  addrChipSub: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
  },
  methodOption: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 14.5,
  },
  methodSub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    marginTop: 2,
  },
  cashBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 10,
  },
  cashLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13.5,
  },
  denomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  denomChip: {
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  denomText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13.5,
  },
  rowVal: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13.5,
  },
  totalRow: {
    paddingTop: 12,
    marginBottom: 4,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontFamily: FONTS.heading,
    fontSize: 16.5,
  },
  totalVal: {
    fontFamily: FONTS.heading,
    fontSize: 21,
  },
});
