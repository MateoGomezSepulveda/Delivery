import React from 'react';
import {
  Banknote,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { OrderStatus, UserRole } from '@/types/api.types';
import type { PaymentMethod, PaymentStatus } from '@/types/order.types';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

const badgeStyles: Record<BadgeVariant, string> = {
  primary:
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800/60',
  secondary:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60',
  success:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60',
  warning:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60',
  danger:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800/60',
  neutral:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export function Badge({
  variant = 'neutral',
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        badgeStyles[variant],
        className,
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

const orderStatusConfig: Record<
  OrderStatus,
  { label: string; variant: BadgeVariant; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Pendiente de Pago',
    variant: 'warning',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  PAID: {
    label: 'Pagado',
    variant: 'success',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  FAILED: {
    label: 'Pago Fallido',
    variant: 'danger',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  CONFIRMED: {
    label: 'Confirmado',
    variant: 'secondary',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  PREPARING: {
    label: 'En Cocina',
    variant: 'primary',
    icon: <ChefHat className="w-3.5 h-3.5" />,
  },
  OUT_FOR_DELIVERY: {
    label: 'En Camino',
    variant: 'secondary',
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  DELIVERED: {
    label: 'Entregado',
    variant: 'success',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  CANCELLED: {
    label: 'Cancelado',
    variant: 'danger',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
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
  if (method === 'CASH_ON_DELIVERY') {
    const paid = paymentStatus === 'PAID';
    return (
      <Badge
        variant={paid ? 'success' : 'warning'}
        icon={<Banknote className="w-3.5 h-3.5" />}
      >
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

  const paid = paymentStatus === 'PAID';
  return (
    <Badge
      variant={paid ? 'success' : 'secondary'}
      icon={<CreditCard className="w-3.5 h-3.5" />}
    >
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
