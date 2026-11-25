import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';

export interface AppColors {
  isDark: boolean;
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  primarySoft: string;
  primaryBorder: string;
  secondary: string;
  secondarySoft: string;
  secondaryBorder: string;
  success: string;
  successSoft: string;
  successBorder: string;
  warning: string;
  warningSoft: string;
  warningBorder: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
}

export const LIGHT_COLORS: AppColors = {
  isDark: false,
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#EA580C',
  primaryText: '#C2410C',
  primarySoft: '#FFF7ED',
  primaryBorder: '#FED7AA',
  secondary: '#2563EB',
  secondarySoft: '#EFF6FF',
  secondaryBorder: '#BFDBFE',
  success: '#16A34A',
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',
};

export const DARK_COLORS: AppColors = {
  isDark: true,
  bg: '#020617',
  surface: '#0F172A',
  surfaceMuted: '#1E293B',
  border: '#1E293B',
  borderStrong: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#F97316',
  primaryText: '#FB923C',
  primarySoft: 'rgba(154, 52, 18, 0.32)',
  primaryBorder: 'rgba(194, 65, 12, 0.55)',
  secondary: '#3B82F6',
  secondarySoft: 'rgba(30, 58, 138, 0.35)',
  secondaryBorder: 'rgba(59, 130, 246, 0.45)',
  success: '#22C55E',
  successSoft: 'rgba(6, 78, 59, 0.38)',
  successBorder: 'rgba(34, 197, 94, 0.45)',
  warning: '#F59E0B',
  warningSoft: 'rgba(120, 53, 15, 0.38)',
  warningBorder: 'rgba(245, 158, 11, 0.45)',
  danger: '#EF4444',
  dangerSoft: 'rgba(127, 29, 29, 0.38)',
  dangerBorder: 'rgba(239, 68, 68, 0.45)',
};

export const FONTS = {
  heading: 'Outfit_700Bold',
  headingSemi: 'Outfit_600SemiBold',
  sans: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemi: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
} as const;

export function useAppTheme(): AppColors {
  const systemScheme = useRNColorScheme();
  const preference = useThemeStore((s) => s.preference);

  const resolvedDark =
    preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  return resolvedDark ? DARK_COLORS : LIGHT_COLORS;
}
