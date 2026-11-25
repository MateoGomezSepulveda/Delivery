import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { FONTS, useAppTheme } from '@/theme/colors';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const colors = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
        <Icon size={26} color={colors.primary} strokeWidth={1.9} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <View style={styles.actionWrap}>
          <Button
            title={actionLabel}
            variant="primary"
            size="md"
            fullWidth
            onPress={onAction}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 17,
    textAlign: 'center',
  },
  description: {
    marginTop: 6,
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionWrap: {
    marginTop: 16,
    width: '100%',
  },
});
