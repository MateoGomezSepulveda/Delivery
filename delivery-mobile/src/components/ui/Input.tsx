import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { FONTS, useAppTheme } from '@/theme/colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  isPassword = false,
  secureTextEntry,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const colors = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const shouldObscure = isPassword ? !passwordVisible : secureTextEntry;

  const borderColor = error
    ? colors.danger
    : focused
      ? colors.primary
      : colors.borderStrong;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderColor,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <TextInput
          placeholderTextColor={colors.textMuted}
          secureTextEntry={shouldObscure}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }, style]}
          {...props}
        />

        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            hitSlop={10}
            onPress={() => setPasswordVisible((prev) => !prev)}
            style={styles.eyeButton}
          >
            {passwordVisible ? (
              <EyeOff size={19} color={colors.textSecondary} strokeWidth={1.8} />
            ) : (
              <Eye size={19} color={colors.textSecondary} strokeWidth={1.8} />
            )}
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.helper, { color: colors.danger }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: colors.textSecondary }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
    marginBottom: 6,
  },
  inputRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  leftIcon: {
    marginRight: 9,
  },
  rightIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontFamily: FONTS.sans,
    fontSize: 15,
  },
  eyeButton: {
    marginLeft: 6,
    padding: 4,
  },
  helper: {
    marginTop: 5,
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
});
