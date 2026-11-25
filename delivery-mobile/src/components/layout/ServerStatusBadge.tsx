import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getServerHealth } from '@/api/endpoints/health.api';
import { API_BASE_URL } from '@/config/env';
import { FONTS, useAppTheme } from '@/theme/colors';

export function ServerStatusBadge() {
  const colors = useAppTheme();

  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['server-health'],
    queryFn: getServerHealth,
    refetchInterval: 30000,
    retry: 1,
  });

  const isHealthy = !isError && data?.status === 'ok';

  const bg = isPending
    ? colors.warningSoft
    : isHealthy
      ? colors.successSoft
      : colors.dangerSoft;

  const border = isPending
    ? colors.warningBorder
    : isHealthy
      ? colors.successBorder
      : colors.dangerBorder;

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.row}>
        <View style={styles.leftRow}>
          {isPending ? (
            <Activity size={20} color={colors.warning} strokeWidth={2} />
          ) : isHealthy ? (
            <CheckCircle2 size={20} color={colors.success} strokeWidth={2} />
          ) : (
            <AlertTriangle size={20} color={colors.danger} strokeWidth={2} />
          )}

          <View style={styles.textWrap}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isPending
                ? 'Verificando conexión con Backend...'
                : isHealthy
                  ? 'Backend NestJS Conectado (Health OK)'
                  : 'Sin conexión con Backend NestJS'}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.url, { color: colors.textSecondary }]}
            >
              {API_BASE_URL}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reintentar verificación del servidor"
          onPress={() => void refetch()}
          disabled={isFetching}
          style={[
            styles.refreshBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderStrong,
              opacity: isFetching ? 0.5 : 1,
            },
          ]}
        >
          <RefreshCw size={16} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>

      {isError ? (
        <Text style={[styles.errorHint, { color: colors.danger }]}>
          Asegúrate de tener encendido delivery-backend en el puerto 3000 y que
          tu celular esté en la misma red Wi-Fi que tu PC.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.headingSemi,
    fontSize: 13.5,
  },
  url: {
    marginTop: 2,
    fontFamily: FONTS.sans,
    fontSize: 11.5,
  },
  refreshBtn: {
    minHeight: 40,
    minWidth: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorHint: {
    marginTop: 8,
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    lineHeight: 17,
  },
});
