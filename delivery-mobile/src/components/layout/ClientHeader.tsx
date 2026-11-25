import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Bike,
  LogIn,
  MapPin,
  ShoppingBag,
  Wine,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getCartApi } from '@/api/endpoints/cart.api';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartUiStore } from '@/store/useCartUiStore';
import { FONTS, useAppTheme } from '@/theme/colors';

export function ClientHeader() {
  const router = useRouter();
  const colors = useAppTheme();
  const { user, isAuthenticated } = useAuthStore();
  const activeAddressLabel = useCartUiStore((s) => s.activeAddressLabel);
  const { connected: socketConnected } = useSocket({ playRiderAlerts: false });

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
  });

  const cartItemCount = isAuthenticated
    ? (cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0)
    : 0;

  return (
    <View style={styles.outerWrap}>
      <View
        style={[
          styles.navbar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Logo DeliveryPro idéntico al Frontend Web */}
        <Pressable
          onPress={() => router.navigate('/(client)')}
          style={styles.brandRow}
        >
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Wine size={19} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={[styles.brandText, { color: colors.text }]}>
            Delivery<Text style={{ color: colors.primary }}>Pro</Text>
          </Text>
        </Pressable>

        {/* Acciones Derecha */}
        <View style={styles.rightRow}>
          {isAuthenticated ? (
            <View
              style={[
                styles.socketDot,
                {
                  backgroundColor: socketConnected ? '#10B981' : '#94A3B8',
                },
              ]}
            />
          ) : null}

          {isAuthenticated && user?.role === 'DELIVERY' ? (
            <Pressable
              onPress={() => router.push('/(delivery)')}
              style={[
                styles.riderBtn,
                {
                  backgroundColor: colors.secondarySoft,
                  borderColor: colors.secondaryBorder,
                },
              ]}
            >
              <Bike size={14} color={colors.secondary} strokeWidth={2.2} />
              <Text style={[styles.riderText, { color: colors.secondary }]}>
                Rider
              </Text>
            </Pressable>
          ) : null}

          {!isAuthenticated ? (
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              style={[
                styles.loginBtn,
                {
                  borderColor: colors.borderStrong,
                  backgroundColor: colors.surfaceMuted,
                },
              ]}
            >
              <LogIn size={14} color={colors.text} strokeWidth={2} />
              <Text style={[styles.loginText, { color: colors.text }]}>
                Ingresar
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.navigate('/(client)/cart')}
            style={[styles.cartBtn, { backgroundColor: colors.primary }]}
          >
            <ShoppingBag size={15} color="#FFFFFF" strokeWidth={2.2} />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Barra compacta clicable de Dirección Activa */}
      <Pressable
        onPress={() =>
          isAuthenticated
            ? router.push('/(client)/addresses')
            : router.push('/(auth)/login')
        }
        style={[
          styles.addressPill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <MapPin size={14} color={colors.primary} strokeWidth={2.2} />
        <Text
          numberOfLines={1}
          style={[styles.addressText, { color: colors.textSecondary }]}
        >
          {activeAddressLabel}
        </Text>
        <Text style={[styles.changeText, { color: colors.primary }]}>
          Cambiar
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 7,
  },
  navbar: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontFamily: FONTS.heading,
    fontSize: 17.5,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  socketDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  riderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1,
  },
  riderText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1,
  },
  loginText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12,
  },
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 11,
    borderRadius: 12,
  },
  cartBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontFamily: FONTS.sansBold,
    fontSize: 11,
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addressText: {
    flex: 1,
    fontFamily: FONTS.sansMedium,
    fontSize: 12.5,
  },
  changeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
  },
});
