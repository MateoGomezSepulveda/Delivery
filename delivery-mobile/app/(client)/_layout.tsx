import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import {
  ClipboardList,
  ShoppingBag,
  Store,
  User,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { getMyAddressesApi } from '@/api/endpoints/addresses.api';
import { getCartApi } from '@/api/endpoints/cart.api';
import { ClientHeader } from '@/components/layout/ClientHeader';
import { useAuthStore } from '@/store/useAuthStore';
import {
  DEFAULT_ADDRESS_LABEL,
  useCartUiStore,
} from '@/store/useCartUiStore';
import { FONTS, useAppTheme } from '@/theme/colors';

export default function ClientTabsLayout() {
  const colors = useAppTheme();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { activeAddressLabel, setSelectedAddress } = useCartUiStore();

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
  });

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: getMyAddressesApi,
    enabled: isAuthenticated,
  });

  // Sincroniza dirección por defecto igual que en ClientLayout.tsx de Web
  useEffect(() => {
    if (
      isAuthenticated &&
      addresses &&
      addresses.length > 0 &&
      activeAddressLabel === DEFAULT_ADDRESS_LABEL
    ) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedAddress(def);
    }
  }, [activeAddressLabel, addresses, isAuthenticated, setSelectedAddress]);

  const cartCount = isAuthenticated
    ? (cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0)
    : 0;

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, { backgroundColor: colors.bg }]}
    >
      <ClientHeader />

      <View style={styles.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
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
              title: 'Catálogo',
              tabBarIcon: ({ color, size }) => (
                <Store size={size - 2} color={color} strokeWidth={2.1} />
              ),
            }}
          />

          <Tabs.Screen
            name="orders"
            options={{
              title: 'Pedidos',
              tabBarIcon: ({ color, size }) => (
                <ClipboardList
                  size={size - 2}
                  color={color}
                  strokeWidth={2.1}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="cart"
            options={{
              title: 'Carrito',
              tabBarBadge: cartCount > 0 ? cartCount : undefined,
              tabBarBadgeStyle: {
                backgroundColor: colors.primary,
                color: '#FFFFFF',
                fontFamily: FONTS.sansBold,
                fontSize: 10.5,
              },
              tabBarIcon: ({ color, size }) => (
                <ShoppingBag size={size - 2} color={color} strokeWidth={2.1} />
              ),
            }}
          />

          <Tabs.Screen
            name="profile"
            options={{
              title: 'Perfil',
              tabBarIcon: ({ color, size }) => (
                <User size={size - 2} color={color} strokeWidth={2.1} />
              ),
            }}
          />

          <Tabs.Screen
            name="addresses"
            options={{
              href: null,
            }}
          />

          <Tabs.Screen
            name="checkout"
            options={{
              href: null,
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
  content: {
    flex: 1,
  },
});
