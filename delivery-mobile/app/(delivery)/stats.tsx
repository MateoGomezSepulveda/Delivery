import { useQuery } from '@tanstack/react-query';
import {
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getDeliveryHistoryApi,
  getDeliveryStatsApi,
} from '@/api/endpoints/delivery.api';
import { Badge, PaymentMethodBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { FONTS, useAppTheme } from '@/theme/colors';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

export default function RiderStatsScreen() {
  const colors = useAppTheme();
  const [page, setPage] = useState(1);

  const {
    data: stats,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: getDeliveryStatsApi,
  });

  const {
    data: historyRes,
    isLoading: loadingHistory,
    isRefetching,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['delivery-history', page],
    queryFn: () => getDeliveryHistoryApi(page, 10),
  });

  const history = historyRes?.data ?? [];
  const meta = historyRes?.meta ?? { total: 0, page: 1, lastPage: 1 };

  const handleRefresh = () => {
    void refetchStats();
    void refetchHistory();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor={colors.secondary}
          colors={[colors.secondary]}
        />
      }
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>
        Mis Ganancias por Envíos
      </Text>

      {/* 4 Tarjetas KPI idénticas al Portal Rider Web */}
      {loadingStats ? (
        <Skeleton height={160} borderRadius={22} />
      ) : (
        <View style={styles.kpiGrid}>
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.successSoft,
                borderColor: colors.successBorder,
              },
            ]}
          >
            <Wallet size={19} color={colors.success} strokeWidth={2.2} />
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Ganancia Hoy
            </Text>
            <Text style={[styles.kpiValue, { color: colors.success }]}>
              {formatCurrency(stats?.todayEarnings ?? 0)}
            </Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.secondarySoft,
                borderColor: colors.secondaryBorder,
              },
            ]}
          >
            <TrendingUp size={19} color={colors.secondary} strokeWidth={2.2} />
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Acumulado Total
            </Text>
            <Text style={[styles.kpiValue, { color: colors.secondary }]}>
              {formatCurrency(stats?.estimatedEarnings ?? 0)}
            </Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <CalendarCheck size={19} color={colors.primary} strokeWidth={2.2} />
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Entregas Hoy
            </Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {stats?.deliveredToday ?? 0}
            </Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <CheckCircle2 size={19} color={colors.success} strokeWidth={2.2} />
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Total Completadas
            </Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {stats?.delivered ?? 0}
            </Text>
          </View>
        </View>
      )}

      {/* Historial de Entregas */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Historial de entregas ({meta.total})
      </Text>

      {loadingHistory ? (
        <Skeleton height={130} borderRadius={20} />
      ) : history.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Aún no tienes entregas finalizadas"
          description="Cada domicilio que entregues sumará su tarifa íntegra de envío aquí."
        />
      ) : (
        <View style={styles.stack}>
          {history.map((item) => {
            const earning = item.riderEarning ?? item.deliveryFee ?? 5000;
            return (
              <View
                key={item._id}
                style={[
                  styles.histCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.histTop}>
                  <View>
                    <Text style={[styles.histId, { color: colors.text }]}>
                      Entrega #{item._id.slice(-6).toUpperCase()}
                    </Text>
                    {item.updatedAt || item.createdAt ? (
                      <Text
                        style={[styles.histDate, { color: colors.textMuted }]}
                      >
                        {formatDateTime(item.updatedAt || item.createdAt || '')}
                      </Text>
                    ) : null}
                  </View>
                  <Badge variant="success">+{formatCurrency(earning)}</Badge>
                </View>

                <Text
                  numberOfLines={1}
                  style={[styles.histAddr, { color: colors.textSecondary }]}
                >
                  {item.address}
                </Text>

                <PaymentMethodBadge
                  method={item.paymentMethod}
                  paymentStatus={item.paymentStatus}
                  compact
                />
              </View>
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
          <Text style={[styles.pageLabel, { color: colors.textSecondary }]}>
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 5,
  },
  kpiLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12,
  },
  kpiValue: {
    fontFamily: FONTS.heading,
    fontSize: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16.5,
    marginTop: 4,
  },
  stack: {
    gap: 10,
  },
  histCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 7,
  },
  histTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  histId: {
    fontFamily: FONTS.headingSemi,
    fontSize: 14.5,
  },
  histDate: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
  },
  histAddr: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  pageLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
  },
});
