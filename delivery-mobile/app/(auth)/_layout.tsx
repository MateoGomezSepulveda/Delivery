import { Stack } from 'expo-router';
import React from 'react';
import { useAppTheme } from '@/theme/colors';

export default function AuthGroupLayout() {
  const colors = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
