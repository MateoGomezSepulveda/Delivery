import { Moon, Smartphone, Sun, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  useThemeStore,
  type ThemePreference,
} from '@/store/useThemeStore';
import { FONTS, useAppTheme } from '@/theme/colors';

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Smartphone },
];

export function ThemeToggle() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const colors = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
        },
      ]}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        const fg = active ? '#FFFFFF' : colors.textSecondary;

        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => void setPreference(value)}
            style={[
              styles.tab,
              active && { backgroundColor: colors.primary },
            ]}
          >
            <Icon size={14} color={fg} strokeWidth={2} />
            <Text style={[styles.label, { color: fg }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  label: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12,
  },
});
