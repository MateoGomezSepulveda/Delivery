import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Bike,
  LogIn,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react-native';
import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getCartApi } from '@/api/endpoints/cart.api';
import { CouponBox } from '@/components/cart/CouponBox';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCartMutations } from '@/hooks/useCartMutations';
import { useDeliveryFee } from '@/hooks/useDeliveryFee';
import { useRiderDiscountQuota } from '@/hooks/useRiderDiscountQuota';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartUiStore } from '@/store/useCartUiStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { Product } from '@/types/catalog.types';
import { formatCurrency } from '@/utils/formatters';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400&q=80';

export default function CartScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const { isAuthenticated } = useAuthStore();
  const { activeAddressLabel, appliedCoupon, setAppliedCoupon } =
    useCartUiStore();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
  });

  const { updateQuantityMutation, removeMutation, clearMutation } =
    useCartMutations();

  const items = cart?.items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const { deliveryFee } = useDeliveryFee({
    address: activeAddressLabel,
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

  if (!isAuthenticated) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.bg }]}>
        <EmptyState
          icon={LogIn}
          title="Inicia sesión para ver tu carrito"
          description="Guarda tus productos favoritos, aplica cupones de descuento y paga en segundos."
          actionLabel="Iniciar Sesión"
          onAction={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.bg }]}>
        <Skeleton height={92} style={{ marginBottom: 12 }} />
        <Skeleton height={92} style={{ marginBottom: 12 }} />
        <Skeleton height={160} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.bg }]}>
        <EmptyState
          icon={ShoppingBag}
          title="Tu carrito está vacío"
          description="Explora nuestro catálogo de licores, cervezas, cigarrillos y quesos selectos para armar tu pedido."
          actionLabel="Ir al Catálogo"
          onAction={() => router.navigate('/(client)')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cabecera */}
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            Tu Bolsa ({items.reduce((s, i) => s + i.quantity, 0)})
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAppliedCoupon(null);
              clearMutation.mutate();
            }}
            style={styles.clearBtn}
          >
            <Trash2 size={14} color={colors.danger} strokeWidth={2} />
            <Text style={[styles.clearText, { color: colors.danger }]}>
              Vaciar
            </Text>
          </Pressable>
        </View>

        {/* Dirección activa */}
        <Pressable
          onPress={() => router.push('/(client)/addresses')}
          style={[
            styles.addressBanner,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primaryBorder,
            },
          ]}
        >
          <MapPin size={18} color={colors.primary} strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.addressTitle, { color: colors.primaryText }]}>
              Dirección de entrega
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.addressValue, { color: colors.text }]}
            >
              {activeAddressLabel}
            </Text>
          </View>
          <Text style={[styles.changeLink, { color: colors.primary }]}>
            Cambiar
          </Text>
        </Pressable>

        {/* Items del carrito */}
        <View style={styles.itemsList}>
          {items.map((item) => {
            const prod: Product | null =
              typeof item.productId === 'object' && item.productId !== null
                ? item.productId
                : null;
            const productId = prod ? prod._id : String(item.productId);
            const name = prod?.name ?? 'Producto';
            const imageUri = prod?.image?.trim() || FALLBACK_IMAGE;
            const maxStock =
              typeof prod?.stock === 'number' ? Math.max(1, prod.stock) : 99;

            return (
              <View
                key={productId}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Image source={{ uri: imageUri }} style={styles.itemImg} />

                <View style={styles.itemBody}>
                  <View style={styles.itemTopRow}>
                    <Text
                      numberOfLines={1}
                      style={[styles.itemName, { color: colors.text }]}
                    >
                      {name}
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${name}`}
                      onPress={() => removeMutation.mutate(productId)}
                      hitSlop={8}
                    >
                      <Trash2
                        size={16}
                        color={colors.textMuted}
                        strokeWidth={2}
                      />
                    </Pressable>
                  </View>

                  <Text
                    style={[styles.unitPrice, { color: colors.textSecondary }]}
                  >
                    {formatCurrency(item.price)} c/u
                  </Text>

                  <View style={styles.itemBottomRow}>
                    <View
                      style={[
                        styles.qtyBox,
                        {
                          backgroundColor: colors.surfaceMuted,
                          borderColor: colors.borderStrong,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() =>
                          updateQuantityMutation.mutate({
                            productId,
                            quantity: item.quantity - 1,
                          })
                        }
                        style={styles.qtyBtn}
                      >
                        <Minus size={14} color={colors.text} strokeWidth={2.2} />
                      </Pressable>

                      <Text style={[styles.qtyNum, { color: colors.text }]}>
                        {item.quantity}
                      </Text>

                      <Pressable
                        disabled={item.quantity >= maxStock}
                        onPress={() =>
                          updateQuantityMutation.mutate({
                            productId,
                            quantity: item.quantity + 1,
                          })
                        }
                        style={styles.qtyBtn}
                      >
                        <Plus
                          size={14}
                          color={
                            item.quantity >= maxStock
                              ? colors.textMuted
                              : colors.text
                          }
                          strokeWidth={2.2}
                        />
                      </Pressable>
                    </View>

                    <Text style={[styles.lineTotal, { color: colors.text }]}>
                      {formatCurrency(item.price * item.quantity)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Cupón de descuento */}
        <CouponBox orderTotal={subtotal} />

        {/* Resumen Financiero */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Resumen de tu pedido
          </Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Subtotal productos
            </Text>
            <Text style={[styles.summaryVal, { color: colors.text }]}>
              {formatCurrency(subtotal)}
            </Text>
          </View>

          {riderDiscount > 0 ? (
            <View style={styles.summaryRow}>
              <View style={styles.discountLabelRow}>
                <Bike size={14} color={colors.secondary} strokeWidth={2.2} />
                <Text
                  style={[styles.summaryLabel, { color: colors.secondary }]}
                >
                  Beneficio Mensajero (-{riderQuota?.discountPercent ?? 10}%)
                </Text>
              </View>
              <Text style={[styles.summaryVal, { color: colors.secondary }]}>
                -{formatCurrency(riderDiscount)}
              </Text>
            </View>
          ) : null}

          {couponDiscount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.success }]}>
                Cupón ({appliedCoupon?.code})
              </Text>
              <Text style={[styles.summaryVal, { color: colors.success }]}>
                -{formatCurrency(couponDiscount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Domicilio estimado
            </Text>
            <Text style={[styles.summaryVal, { color: colors.text }]}>
              {formatCurrency(deliveryFee)}
            </Text>
          </View>

          <View
            style={[styles.totalDivider, { borderTopColor: colors.border }]}
          >
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Total a pagar
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {formatCurrency(finalTotal)}
            </Text>
          </View>

          <Button
            title={`Ir a Pagar · ${formatCurrency(finalTotal)}`}
            size="lg"
            fullWidth
            rightIcon={
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.3} />
            }
            onPress={() => router.push('/(client)/checkout')}
          />
        </View>
      </ScrollView>
    </View>
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
    paddingBottom: 28,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontFamily: FONTS.heading,
    fontSize: 21,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
  },
  addressBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addressTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 11.5,
  },
  addressValue: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    marginTop: 1,
  },
  changeLink: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  itemImg: {
    width: 74,
    height: 74,
    borderRadius: 13,
  },
  itemBody: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 4,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontFamily: FONTS.headingSemi,
    fontSize: 15,
  },
  unitPrice: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
  },
  itemBottomRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyBox: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNum: {
    minWidth: 22,
    textAlign: 'center',
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
  },
  lineTotal: {
    fontFamily: FONTS.heading,
    fontSize: 15.5,
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  summaryTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  discountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13.5,
  },
  summaryVal: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13.5,
  },
  totalDivider: {
    marginTop: 4,
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
  totalValue: {
    fontFamily: FONTS.heading,
    fontSize: 21,
  },
});
