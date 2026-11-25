import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { OrderStatus, UserRole } from '@/types/api.types';
import type { PaymentMethod, PaymentStatus } from '@/types/order.types';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  children,
  variant = 'neutral',
  icon: Icon,
  style,
}: BadgeProps) {
  const colors = useAppTheme();

  const map: Record<BadgeVariant, { bg: string; border: string; fg: string }> = {
    primary: {
      bg: colors.primarySoft,
      border: colors.primaryBorder,
      fg: colors.primaryText,
    },
    secondary: {
      bg: colors.secondarySoft,
      border: colors.secondaryBorder,
      fg: colors.secondary,
    },
    success: {
      bg: colors.successSoft,
      border: colors.successBorder,
      fg: colors.success,
    },
    warning: {
      bg: colors.warningSoft,
      border: colors.warningBorder,
      fg: colors.warning,
    },
    danger: {
      bg: colors.dangerSoft,
      border: colors.dangerBorder,
      fg: colors.danger,
    },
    neutral: {
      bg: colors.surfaceMuted,
      border: colors.border,
      fg: colors.textSecondary,
    },
  };

  const palette = map[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
    >
      {Icon ? <Icon size={12} color={palette.fg} strokeWidth={2.2} /> : null}
      <Text style={[styles.text, { color: palette.fg }]}>{children}</Text>
    </View>
  );
}

const orderStatusConfig: Record<
  OrderStatus,
  { label: string; variant: BadgeVariant; icon: LucideIcon }
> = {
  PENDING: { label: 'Pendiente de Pago', variant: 'warning', icon: Clock },
  PAID: { label: 'Pagado', variant: 'success', icon: CheckCircle2 },
  FAILED: { label: 'Pago Fallido', variant: 'danger', icon: XCircle },
  CONFIRMED: { label: 'Confirmado', variant: 'secondary', icon: ShieldCheck },
  PREPARING: {
    label: 'Listo para Envío',
    variant: 'primary',
    icon: PackageCheck,
  },
  OUT_FOR_DELIVERY: { label: 'En Camino', variant: 'secondary', icon: Truck },
  DELIVERED: { label: 'Entregado', variant: 'success', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelado', variant: 'danger', icon: XCircle },
};

export function OrderStatusBadge({
  status,
  paymentMethod,
}: {
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
}) {
  const cfg = orderStatusConfig[status] ?? orderStatusConfig.PENDING;
  const label =
    status === 'PENDING' && paymentMethod === 'CASH_ON_DELIVERY'
      ? 'Pendiente de Confirmación'
      : cfg.label;

  return (
    <Badge variant={cfg.variant} icon={cfg.icon}>
      {label}
    </Badge>
  );
}

export function PaymentMethodBadge({
  method = 'MERCADOPAGO',
  paymentStatus,
  compact = false,
}: {
  method?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  compact?: boolean;
}) {
  const paid = paymentStatus === 'PAID';

  if (method === 'CASH_ON_DELIVERY') {
    return (
      <Badge variant={paid ? 'success' : 'warning'} icon={Banknote}>
        {compact
          ? paid
            ? 'Efectivo · Cobrado'
            : 'Efectivo'
          : paid
            ? 'Efectivo Contraentrega · Cobrado'
            : 'Efectivo Contraentrega'}
      </Badge>
    );
  }

  return (
    <Badge variant={paid ? 'success' : 'secondary'} icon={CreditCard}>
      {compact
        ? paid
          ? 'Online · Pagado'
          : 'MercadoPago'
        : paid
          ? 'Pago en Línea · Pagado'
          : 'Pago en Línea (MercadoPago)'}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, { label: string; variant: BadgeVariant }> = {
    CLIENT: { label: 'Cliente', variant: 'primary' },
    DELIVERY: { label: 'Repartidor', variant: 'secondary' },
    ADMIN: { label: 'Administrador', variant: 'success' },
  };
  const cfg = map[role];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  text: {
    fontFamily: FONTS.sansSemi,
    fontSize: 11.5,
  },
});
