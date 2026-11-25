import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';

export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  const colors = useAppTheme();

  if (!current) return null;

  const palette =
    current.type === 'success'
      ? { color: colors.success, bg: colors.surface, border: colors.successBorder, Icon: CheckCircle2 }
      : current.type === 'error'
        ? { color: colors.danger, bg: colors.surface, border: colors.dangerBorder, Icon: XCircle }
        : current.type === 'warning'
          ? { color: colors.warning, bg: colors.surface, border: colors.warningBorder, Icon: AlertTriangle }
          : { color: colors.secondary, bg: colors.surface, border: colors.secondaryBorder, Icon: Info };

  const Icon = palette.Icon;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { top: Math.max(insets.top + 8, 16) }]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
          },
        ]}
      >
        <Icon size={20} color={palette.color} strokeWidth={2.2} />
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.text }]}>
            {current.title}
          </Text>
          {current.description ? (
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              {current.description}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={dismiss} hitSlop={10} style={styles.closeBtn}>
          <X size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.3,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
  },
  desc: {
    marginTop: 2,
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  closeBtn: {
    padding: 4,
  },
});
