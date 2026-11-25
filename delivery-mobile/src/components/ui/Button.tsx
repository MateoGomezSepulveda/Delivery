import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { FONTS, useAppTheme } from '@/theme/colors';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  haptic = true,
  leftIcon,
  rightIcon,
  disabled,
  onPress,
  style,
  textStyle,
  ...props
}: ButtonProps) {
  const colors = useAppTheme();
  const isDisabled = Boolean(disabled || loading);

  const handlePress = (event: GestureResponderEvent) => {
    if (isDisabled) return;
    if (haptic && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => undefined,
      );
    }
    onPress?.(event);
  };

  const bgByVariant: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.secondary,
    outline: colors.surface,
    ghost: 'transparent',
    danger: colors.danger,
  };

  const borderByVariant: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.secondary,
    outline: colors.borderStrong,
    ghost: 'transparent',
    danger: colors.danger,
  };

  const textByVariant: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    outline: colors.text,
    ghost: colors.textSecondary,
    danger: '#FFFFFF',
  };

  const sizeStyle =
    size === 'sm'
      ? styles.sizeSm
      : size === 'lg'
        ? styles.sizeLg
        : size === 'icon'
          ? styles.sizeIcon
          : styles.sizeMd;

  const fontSize = size === 'sm' ? 12.5 : size === 'lg' ? 15.5 : 14;
  const spinnerColor = textByVariant[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        {
          backgroundColor: bgByVariant[variant],
          borderColor: borderByVariant[variant],
          opacity: isDisabled ? 0.5 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        leftIcon && <View style={styles.iconWrap}>{leftIcon}</View>
      )}
      {title ? (
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { color: textByVariant[variant], fontSize },
            textStyle,
          ]}
        >
          {title}
        </Text>
      ) : null}
      {!loading && rightIcon ? (
        <View style={styles.iconWrap}>{rightIcon}</View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 7,
  },
  fullWidth: {
    width: '100%',
  },
  sizeSm: {
    minHeight: 38,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
  },
  sizeMd: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  sizeLg: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 16,
  },
  sizeIcon: {
    minHeight: 40,
    minWidth: 40,
    paddingHorizontal: 9,
    paddingVertical: 9,
    borderRadius: 12,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.sansSemi,
  },
});
