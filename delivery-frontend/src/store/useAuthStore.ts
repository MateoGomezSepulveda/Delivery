import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from '@/api/axios.client';
import { logoutApi } from '@/api/endpoints/auth.api';
import { getUserByIdApi } from '@/api/endpoints/users.api';
import type { User } from '@/types/auth.types';
import { decodeJwtPayload } from '@/utils/jwt';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  avatarsByUserId: Record<string, string>;
  setSession: (
    tokens: { access_token: string; refresh_token: string },
    user: User,
  ) => void;
  updateUserState: (user: Partial<User>) => void;
  setUserAvatar: (userId: string, url: string) => void;
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
      avatarsByUserId: {},

      setSession: (tokens, user) => {
        setStoredTokens({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
        const savedAvatar = get().avatarsByUserId[user._id];
        set({
          user: savedAvatar ? { ...user, avatarUrl: savedAvatar } : user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        });
      },

      updateUserState: (partialUser) => {
        const current = get().user;
        if (!current) return;
        set({
          user: { ...current, ...partialUser },
        });
      },

      setUserAvatar: (userId, url) => {
        const currentAvatars = { ...get().avatarsByUserId, [userId]: url };
        const currentUser = get().user;
        set({
          avatarsByUserId: currentAvatars,
          user:
            currentUser && currentUser._id === userId
              ? { ...currentUser, avatarUrl: url }
              : currentUser,
        });
      },

      hydrateSession: async () => {
        const { accessToken } = getStoredTokens();
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
          clearStoredTokens();
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
          const latestTokens = getStoredTokens();
          const savedAvatar = get().avatarsByUserId[freshUser._id];
          set({
            user: savedAvatar
              ? { ...freshUser, avatarUrl: savedAvatar }
              : freshUser,
            accessToken: latestTokens.accessToken,
            refreshToken: latestTokens.refreshToken,
            isAuthenticated: true,
            isHydrating: false,
          });
        } catch {
          clearStoredTokens();
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
        const currentRefresh =
          get().refreshToken ?? getStoredTokens().refreshToken;
        try {
          if (currentRefresh) {
            await logoutApi(currentRefresh);
          }
        } catch {
          // Incluso si el servidor ya invalidó el token, limpiamos el estado local
        } finally {
          clearStoredTokens();
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
      name: 'delivery_auth_store_v1',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        avatarsByUserId: state.avatarsByUserId,
      }),
    },
  ),
);
