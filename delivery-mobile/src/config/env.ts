import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

function extractHostFromAnyExpoSource(): string | null {
  const candidates: Array<string | undefined | null> = [
    Constants.expoConfig?.hostUri,
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } })
      .expoGoConfig?.debuggerHost,
    (
      Constants as unknown as {
        manifest2?: { extra?: { expoGo?: { debuggerHost?: string }; expoClient?: { hostUri?: string } } };
      }
    ).manifest2?.extra?.expoGo?.debuggerHost,
    (
      Constants as unknown as {
        manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
      }
    ).manifest2?.extra?.expoClient?.hostUri,
    (NativeModules as { SourceCode?: { scriptURL?: string } })?.SourceCode
      ?.scriptURL,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const withoutProto = raw.replace(/^[a-zA-Z]+:\/\//, '');
    const hostPort = withoutProto.split('/')[0] ?? '';
    const host = hostPort.split(':')[0]?.trim();
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  return null;
}

export function resolveApiBaseUrl(): string {
  // Prioridad 1: IP LAN detectada en tiempo real desde el servidor Metro conectado al teléfono
  const liveHost = extractHostFromAnyExpoSource();
  if (liveHost && /^\d+\.\d+\.\d+\.\d+$/.test(liveHost)) {
    return `http://${liveHost}:3000/api/v1`;
  }

  // Prioridad 2: Variable explícita de entorno (.env)
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '');
  }

  if (liveHost) {
    return `http://${liveHost}:3000/api/v1`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  }

  return 'http://localhost:3000/api/v1';
}

export function resolveWsBaseUrl(): string {
  const apiBase = resolveApiBaseUrl();
  const explicitWs = process.env.EXPO_PUBLIC_WS_URL?.trim();
  if (explicitWs && !apiBase.includes('192.168.')) {
    return explicitWs.replace(/\/+$/, '');
  }
  return apiBase.replace(/\/api\/v\d+\/?$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();
export const WS_BASE_URL = resolveWsBaseUrl();
