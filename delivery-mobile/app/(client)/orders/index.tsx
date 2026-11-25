import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LogIn,
  MapPin,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getMyOrdersApi } from '@/api/endpoints/orders.api';
import { OrderStatusBadge, PaymentMethodBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/useAuthStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { OrderStatus } from '@/types/api.types';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

const STATUS_FILTERS: { label: string; value?: OrderStatus }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Pagados', value: 'PAID' },
  { label: 'Confirmados', value: 'CONFIRMED' },
  { label: 'En Camino', value: 'OUT_FOR_DELIVERY' },
  { label: 'Entregados', value: 'DELIVERED' },
  { label: 'Cancelados', value: 'CANCELLED' },
];

export default function MyOrdersScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['my-orders', { page, status: statusFilter }],
    queryFn: () =>
      getMyOrdersApi({
        page,
        limit: 10,
        status: statusFilter,
      }),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.bg }]}>
        <EmptyState
          icon={LogIn}
          title="Inicia sesión para ver tus pedidos"
          description="Consulta tu historial, sigue a tu repartidor en tiempo real y califica tus productos."
          actionLabel="Iniciar Sesión"
          onAction={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  const orders = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, lastPage: 1 };

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
        <Text style={[styles.screenTitle, { color: colors.text }]}>
          Mis Pedidos
        </Text>

        {/* Píldoras de estado */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <Pressable
                key={f.label}
                onPress={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.borderStrong,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <View style={styles.listStack}>
            {[1, 2, 3].map((k) => (
              <Skeleton key={k} height={148} borderRadius={20} />
            ))}
          </View>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aún no tienes pedidos en esta vista"
            description="Haz tu primer pedido en el catálogo y sigue cada etapa de entrega en tiempo real."
            actionLabel="Explorar Catálogo"
            onAction={() => router.navigate('/(client)')}
          />
        ) : (
          <View style={styles.listStack}>
            {orders.map((order) => {
              const shortId = order._id.slice(-6).toUpperCase();
              const itemsPreview = order.items
                .map((i) => `${i.quantity}x ${i.name}`)
                .join(' · ');

              return (
                <Pressable
                  key={order._id}
                  onPress={() =>
                    router.push({
                      pathname: '/(client)/orders/[id]',
                      params: { id: order._id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.orderCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.94 : 1,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={[styles.orderCode, { color: colors.text }]}>
                        Pedido #{shortId}
                      </Text>
                      {order.createdAt ? (
                        <Text
                          style={[
                            styles.orderDate,
                            { color: colors.textMuted },
                          ]}
                        >
                          {formatDateTime(order.createdAt)}
                        </Text>
                      ) : null}
                    </View>

                    <OrderStatusBadge
                      status={order.status}
                      paymentMethod={order.paymentMethod}
                    />
                  </View>

                  <Text
                    numberOfLines={2}
                    style={[
                      styles.itemsSummary,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {itemsPreview}
                  </Text>

                  <View style={styles.addressRow}>
                    <MapPin
                      size={13}
                      color={colors.textMuted}
                      strokeWidth={2}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.addressText, { color: colors.textMuted }]}
                    >
                      {order.address}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.cardFooter,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <PaymentMethodBadge
                      method={order.paymentMethod}
                      paymentStatus={order.paymentStatus}
                      compact
                    />

                    <View style={styles.totalRow}>
                      <Text
                        style={[styles.orderTotal, { color: colors.primary }]}
                      >
                        {formatCurrency(order.total)}
                      </Text>
                      <ChevronRight
                        size={17}
                        color={colors.primary}
                        strokeWidth={2.3}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {meta.lastPage > 1 ? (
          <View style={styles.paginationRow}>
            <Button
              title="Anterior"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              leftIcon={
                <ChevronLeft size={15} color={colors.text} strokeWidth={2.2} />
              }
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            />
            <Text style={[styles.pageText, { color: colors.textSecondary }]}>
              Página {meta.page} de {meta.lastPage}
            </Text>
            <Button
              title="Siguiente"
              size="sm"
              variant="outline"
              disabled={page >= meta.lastPage}
              rightIcon={
                <ChevronRight size={15} color={colors.text} strokeWidth={2.2} />
              }
              onPress={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
            />
          </View>
        ) : null}
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
  screenTitle: {
    fontFamily: FONTS.heading,
    fontSize: 21,
  },
  filtersRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12.5,
  },
  listStack: {
    gap: 12,
  },
  orderCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderCode: {
    fontFamily: FONTS.headingSemi,
    fontSize: 15.5,
  },
  orderDate: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
    marginTop: 1,
  },
  itemsSummary: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    lineHeight: 18.5,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addressText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 12,
  },
  cardFooter: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderTotal: {
    fontFamily: FONTS.heading,
    fontSize: 16.5,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  pageText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
  },
});
