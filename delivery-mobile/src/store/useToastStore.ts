import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastState {
  current: ToastMessage | null;
  show: (type: ToastType, title: string, description?: string) => void;
  dismiss: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (type, title, description) => {
    if (hideTimer) clearTimeout(hideTimer);

    if (Platform.OS !== 'web') {
      if (type === 'error') {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => undefined);
      } else if (type === 'success') {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => undefined);
      }
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set({ current: { id, type, title, description } });

    hideTimer = setTimeout(() => {
      set((state) => (state.current?.id === id ? { current: null } : state));
    }, 3600);
  },
  dismiss: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ current: null });
  },
}));

export const toast = {
  success: (title: string, opts?: { description?: string }) =>
    useToastStore.getState().show('success', title, opts?.description),
  error: (title: string, opts?: { description?: string }) =>
    useToastStore.getState().show('error', title, opts?.description),
  info: (title: string, opts?: { description?: string }) =>
    useToastStore.getState().show('info', title, opts?.description),
  warning: (title: string, opts?: { description?: string }) =>
    useToastStore.getState().show('warning', title, opts?.description),
};
