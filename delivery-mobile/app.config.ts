import './scripts/node-compat.cjs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'DeliveryPro',
  slug: 'delivery-mobile',
  version: '0.1.0',
  scheme: 'deliverypro',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.deliverypro.app',
  },
  android: {
    package: 'com.deliverypro.app',
    adaptiveIcon: {
      backgroundColor: '#020617',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'INTERNET',
      'VIBRATE',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
    ],
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-web-browser',
    'expo-location',
    'expo-image-picker',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#020617',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
