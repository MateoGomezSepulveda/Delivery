import { CheckCircle2, Ticket, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { extractErrorMessage } from '@/api/axios.client';
import { applyCouponApi } from '@/api/endpoints/coupons.api';
import { Button } from '@/components/ui/Button';
import { useCartUiStore } from '@/store/useCartUiStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import { formatCurrency } from '@/utils/formatters';

export interface CouponBoxProps {
  orderTotal: number;
}

export function CouponBox({ orderTotal }: CouponBoxProps) {
  const colors = useAppTheme();
  const { appliedCoupon, setAppliedCoupon } = useCartUiStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      toast.warning('Ingresa un código de cupón');
      return;
    }
    if (orderTotal <= 0) {
      toast.warning('Agrega productos antes de aplicar un cupón');
      return;
    }

    setLoading(true);
    try {
      const result = await applyCouponApi(clean, orderTotal);
      setAppliedCoupon(result);
      setCode('');
      toast.success(`Cupón ${result.code} aplicado`, {
        description: `Ahorras ${formatCurrency(result.discountAmount)}`,
      });
    } catch (error) {
      toast.error('Cupón no válido', {
        description: extractErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  if (appliedCoupon) {
    return (
      <View
        style={[
          styles.appliedCard,
          {
            backgroundColor: colors.successSoft,
            borderColor: colors.successBorder,
          },
        ]}
      >
        <View style={styles.appliedLeft}>
          <CheckCircle2 size={18} color={colors.success} strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.appliedTitle, { color: colors.success }]}>
              Cupón {appliedCoupon.code} activo
            </Text>
            <Text
              style={[styles.appliedSub, { color: colors.textSecondary }]}
            >
              Descuento de {formatCurrency(appliedCoupon.discountAmount)}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitar cupón"
          onPress={() => {
            setAppliedCoupon(null);
            toast.info('Cupón removido');
          }}
          style={styles.removeBtn}
        >
          <X size={17} color={colors.textSecondary} strokeWidth={2.2} />
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.inputWrap,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Ticket size={15} color={colors.primary} strokeWidth={2.1} />
        <Text style={[styles.headerLabel, { color: colors.text }]}>
          ¿Tienes un cupón de descuento?
        </Text>
      </View>

      <View style={styles.formRow}>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="Ej. BIENVENIDO10"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.borderStrong,
              color: colors.text,
            },
          ]}
        />
        <Button
          title="Aplicar"
          size="md"
          variant="outline"
          loading={loading}
          onPress={() => void handleApply()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    letterSpacing: 0.6,
  },
  appliedCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  appliedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  appliedTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
  },
  appliedSub: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
  removeBtn: {
    padding: 6,
  },
});
