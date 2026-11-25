import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'deliverypro_theme_pref_v1';

interface ThemeState {
  preference: ThemePreference;
  hydrated: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
  hydrateTheme: () => Promise<ThemePreference>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'light',
  hydrated: false,

  setPreference: async (preference) => {
    set({ preference });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Ignora error de almacenamiento no crítico
    }
  },

  hydrateTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        set({ preference: saved, hydrated: true });
        return saved;
      }
    } catch {
      // Mantiene light por defecto (igual al frontend web)
    }
    set({ hydrated: true });
    return 'light';
  },
}));
