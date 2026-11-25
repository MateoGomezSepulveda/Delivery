import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { onSessionExpired } from '@/api/axios.client';
import { logoutApi } from '@/api/endpoints/auth.api';
import { getUserByIdApi } from '@/api/endpoints/users.api';
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from '@/storage/tokenStorage';
import { useCartUiStore } from '@/store/useCartUiStore';
import type { User } from '@/types/auth.types';
import { decodeJwtPayload } from '@/utils/jwt';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  setSession: (
    tokens: { access_token: string; refresh_token: string },
    user: User,
  ) => Promise<void>;
  updateUserState: (partialUser: Partial<User>) => void;
  hydrateSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrating: false,

      setSession: async (tokens, user) => {
        const previousUserId = get().user?._id;
        const selectedAddressUserId =
          useCartUiStore.getState().selectedAddress?.userId;

        if (
          (previousUserId && previousUserId !== user._id) ||
          (selectedAddressUserId && selectedAddressUserId !== user._id)
        ) {
          useCartUiStore.getState().resetCartUi();
        }

        await setStoredTokens({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });

        set({
          user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        });
      },

      updateUserState: (partialUser) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...partialUser } });
      },

      hydrateSession: async () => {
        const { accessToken } = await getStoredTokens();
        if (!accessToken) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isHydrating: false,
          });
          return;
        }

        const payload = decodeJwtPayload(accessToken);
        if (!payload?.sub) {
          await clearStoredTokens();
          useCartUiStore.getState().resetCartUi();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isHydrating: false,
          });
          return;
        }

        set({ isHydrating: true });
        try {
          const freshUser = await getUserByIdApi(payload.sub);
          const latestTokens = await getStoredTokens();
          set({
            user: freshUser,
            accessToken: latestTokens.accessToken,
            refreshToken: latestTokens.refreshToken,
            isAuthenticated: true,
            isHydrating: false,
          });
        } catch {
          await clearStoredTokens();
          useCartUiStore.getState().resetCartUi();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isHydrating: false,
          });
        }
      },

      logout: async () => {
        const stored = await getStoredTokens();
        const currentRefresh = get().refreshToken ?? stored.refreshToken;
        try {
          if (currentRefresh) {
            await logoutApi(currentRefresh);
          }
        } catch {
          // Limpiamos la sesión local aun si el token ya estaba revocado
        } finally {
          await clearStoredTokens();
          useCartUiStore.getState().resetCartUi();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },
    }),
    {
      name: 'deliverypro_auth_store_v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

onSessionExpired(() => {
  useCartUiStore.getState().resetCartUi();
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  });
});
