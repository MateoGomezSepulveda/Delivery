import {
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/ui/ToastHost';
import { hydrateStoredTokens } from '@/storage/tokenStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useAppTheme } from '@/theme/colors';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ThemedRootStack() {
  const colors = useAppTheme();

  return (
    <>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const hydrateTheme = useThemeStore((s) => s.hydrateTheme);
  const hydrateSession = useAuthStore((s) => s.hydrateSession);
  const [storageReady, setStorageReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        await Promise.all([hydrateStoredTokens(), hydrateTheme()]);
        await hydrateSession();
      } finally {
        if (mounted) {
          setStorageReady(true);
        }
      }
    }

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [hydrateSession, hydrateTheme]);

  const appReady = (fontsLoaded || Boolean(fontError)) && storageReady;

  useEffect(() => {
    if (appReady) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemedRootStack />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
