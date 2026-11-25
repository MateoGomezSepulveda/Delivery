import { Stack } from 'expo-router';
import React from 'react';
import { useAppTheme } from '@/theme/colors';

export default function OrdersStackLayout() {
  const colors = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
