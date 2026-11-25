import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const AUTH_STORAGE_KEY = 'deliverypro_auth_tokens_v1';

export interface StoredAuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

const EMPTY_TOKENS: StoredAuthTokens = {
  accessToken: null,
  refreshToken: null,
};

let memoryTokens: StoredAuthTokens = { ...EMPTY_TOKENS };
let hydrated = false;
let hydrationPromise: Promise<StoredAuthTokens> | null = null;

async function readRawFromDevice(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(AUTH_STORAGE_KEY);
  }
  const available = await SecureStore.isAvailableAsync();
  if (!available) {
    return AsyncStorage.getItem(AUTH_STORAGE_KEY);
  }
  return SecureStore.getItemAsync(AUTH_STORAGE_KEY);
}

async function writeRawToDevice(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, value);
    return;
  }
  const available = await SecureStore.isAvailableAsync();
  if (!available) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

async function deleteRawFromDevice(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  const available = await SecureStore.isAvailableAsync();
  if (!available) {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
}

/**
 * Hidrata los tokens cifrados desde Keystore (Android) / Keychain (iOS) hacia memoria.
 */
export async function hydrateStoredTokens(): Promise<StoredAuthTokens> {
  if (hydrated) return memoryTokens;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const raw = await readRawFromDevice();
      if (!raw) {
        memoryTokens = { ...EMPTY_TOKENS };
      } else {
        const parsed = JSON.parse(raw) as Partial<StoredAuthTokens>;
        memoryTokens = {
          accessToken: parsed.accessToken ?? null,
          refreshToken: parsed.refreshToken ?? null,
        };
      }
    } catch {
      memoryTokens = { ...EMPTY_TOKENS };
    } finally {
      hydrated = true;
      hydrationPromise = null;
    }
    return memoryTokens;
  })();

  return hydrationPromise;
}

export function isTokenStorageHydrated(): boolean {
  return hydrated;
}

export function getStoredTokensSync(): StoredAuthTokens {
  return memoryTokens;
}

export async function getStoredTokens(): Promise<StoredAuthTokens> {
  if (!hydrated) {
    return hydrateStoredTokens();
  }
  return memoryTokens;
}

export async function setStoredTokens(tokens: StoredAuthTokens): Promise<void> {
  memoryTokens = {
    accessToken: tokens.accessToken ?? null,
    refreshToken: tokens.refreshToken ?? null,
  };
  hydrated = true;
  await writeRawToDevice(JSON.stringify(memoryTokens));
}

export async function clearStoredTokens(): Promise<void> {
  memoryTokens = { ...EMPTY_TOKENS };
  hydrated = true;
  await deleteRawFromDevice();
}

/**
 * Utilidad exclusiva para tests unitarios (reinicia el estado en memoria).
 */
export function resetTokenStorageForTests(): void {
  memoryTokens = { ...EMPTY_TOKENS };
  hydrated = false;
  hydrationPromise = null;
}
