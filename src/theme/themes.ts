// Multi-theme color definitions for BMS-OPD
// Themes: Light, Dark, Pro Golden Dark, Pro Golden Light

export type ThemeMode = 'light' | 'dark' | 'pro-dark' | 'pro-light';

export interface ThemeColors {
  mode: ThemeMode;
  isDark: boolean;

  // Primary
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySky: string;
  primarySoft: string;
  primaryMuted: string;

  // Gold Accents
  gold: string;
  goldLight: string;
  goldBright: string;
  goldDark: string;
  goldSoft: string;
  goldMuted: string;
  goldBorder: string;

  // Backgrounds & Surfaces
  background: string;
  cardBg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderLight: string;
  divider: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textWhite: string;
  textGold: string;
  textBlue: string;

  // Headers & Tab bar
  headerBg: string;
  headerText: string;
  headerTint: string;
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;
  tabBarBorder: string;

  // Status
  success: string;
  successSoft: string;
  successBorder: string;
  warning: string;
  warningSoft: string;
  warningBorder: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
  info: string;
  infoSoft: string;
  infoBorder: string;
}

export const lightTheme: ThemeColors = {
  mode: 'light',
  isDark: false,
  primary: '#0284c7',
  primaryDark: '#0369a1',
  primaryLight: '#38bdf8',
  primarySky: '#0284c7',
  primarySoft: '#e0f2fe',
  primaryMuted: '#bae6fd',

  gold: '#d97706',
  goldLight: '#f59e0b',
  goldBright: '#fbbf24',
  goldDark: '#92400e',
  goldSoft: '#fffbeb',
  goldMuted: '#fde68a',
  goldBorder: '#fcd34d',

  background: '#f8fafc',
  cardBg: '#ffffff',
  surface: '#ffffff',
  surfaceElevated: '#f1f5f9',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  divider: '#f1f5f9',

  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textWhite: '#ffffff',
  textGold: '#b45309',
  textBlue: '#0284c7',

  headerBg: '#0369a1',
  headerText: '#ffffff',
  headerTint: '#f8fafc',
  tabBarBg: '#ffffff',
  tabBarActive: '#0284c7',
  tabBarInactive: '#64748b',
  tabBarBorder: '#e2e8f0',

  success: '#059669',
  successSoft: '#ecfdf5',
  successBorder: '#a7f3d0',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  warningBorder: '#fde68a',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  dangerBorder: '#fecaca',
  info: '#0284c7',
  infoSoft: '#e0f2fe',
  infoBorder: '#bae6fd',
};

export const darkTheme: ThemeColors = {
  mode: 'dark',
  isDark: true,
  primary: '#38bdf8',
  primaryDark: '#0284c7',
  primaryLight: '#7dd3fc',
  primarySky: '#38bdf8',
  primarySoft: '#1e293b',
  primaryMuted: '#334155',

  gold: '#f59e0b',
  goldLight: '#fbbf24',
  goldBright: '#fde047',
  goldDark: '#d97706',
  goldSoft: '#292524',
  goldMuted: '#78350f',
  goldBorder: '#b45309',

  background: '#0b1120',
  cardBg: '#131d33',
  surface: '#1e293b',
  surfaceElevated: '#24324d',
  border: '#1e293b',
  borderLight: '#263554',
  divider: '#1e293b',

  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textWhite: '#ffffff',
  textGold: '#fbbf24',
  textBlue: '#38bdf8',

  headerBg: '#0b1120',
  headerText: '#f8fafc',
  headerTint: '#38bdf8',
  tabBarBg: '#0b1120',
  tabBarActive: '#38bdf8',
  tabBarInactive: '#64748b',
  tabBarBorder: '#1e293b',

  success: '#10b981',
  successSoft: '#064e3b',
  successBorder: '#059669',
  warning: '#f59e0b',
  warningSoft: '#451a03',
  warningBorder: '#b45309',
  danger: '#ef4444',
  dangerSoft: '#450a0a',
  dangerBorder: '#dc2626',
  info: '#38bdf8',
  infoSoft: '#082f49',
  infoBorder: '#0284c7',
};

export const proDarkTheme: ThemeColors = {
  mode: 'pro-dark',
  isDark: true,
  primary: '#f59e0b',
  primaryDark: '#b45309',
  primaryLight: '#fbbf24',
  primarySky: '#60a5fa',
  primarySoft: '#1c1917',
  primaryMuted: '#292524',

  gold: '#f59e0b',
  goldLight: '#fbbf24',
  goldBright: '#fde047',
  goldDark: '#d97706',
  goldSoft: '#291e0a',
  goldMuted: '#78350f',
  goldBorder: '#d97706',

  background: '#090d16',
  cardBg: '#121826',
  surface: '#182238',
  surfaceElevated: '#1f2c4a',
  border: '#2a3b5c',
  borderLight: '#1e293b',
  divider: '#1a2336',

  textPrimary: '#ffffff',
  textSecondary: '#cbd5e1',
  textMuted: '#788ca8',
  textWhite: '#ffffff',
  textGold: '#fbbf24',
  textBlue: '#60a5fa',

  headerBg: '#070a12',
  headerText: '#ffffff',
  headerTint: '#fbbf24',
  tabBarBg: '#070a12',
  tabBarActive: '#fbbf24',
  tabBarInactive: '#64748b',
  tabBarBorder: '#d97706',

  success: '#10b981',
  successSoft: '#064e3b',
  successBorder: '#059669',
  warning: '#fbbf24',
  warningSoft: '#451a03',
  warningBorder: '#d97706',
  danger: '#f87171',
  dangerSoft: '#450a0a',
  dangerBorder: '#dc2626',
  info: '#60a5fa',
  infoSoft: '#1e3a8a',
  infoBorder: '#3b82f6',
};

export const proLightTheme: ThemeColors = {
  mode: 'pro-light',
  isDark: false,
  primary: '#0f205c',
  primaryDark: '#081236',
  primaryLight: '#1e40af',
  primarySky: '#0284c7',
  primarySoft: '#eff6ff',
  primaryMuted: '#dbeafe',

  gold: '#d97706',
  goldLight: '#f59e0b',
  goldBright: '#fbbf24',
  goldDark: '#92400e',
  goldSoft: '#fffbeb',
  goldMuted: '#fde68a',
  goldBorder: '#fcd34d',

  background: '#fdfbf7',
  cardBg: '#ffffff',
  surface: '#ffffff',
  surfaceElevated: '#f7f4ed',
  border: '#e8e2d5',
  borderLight: '#f3eee4',
  divider: '#f0ebe0',

  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#8c8273',
  textWhite: '#ffffff',
  textGold: '#b45309',
  textBlue: '#0f205c',

  headerBg: '#0f205c',
  headerText: '#ffffff',
  headerTint: '#fbbf24',
  tabBarBg: '#ffffff',
  tabBarActive: '#b45309',
  tabBarInactive: '#64748b',
  tabBarBorder: '#fde68a',

  success: '#059669',
  successSoft: '#ecfdf5',
  successBorder: '#a7f3d0',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  warningBorder: '#fde68a',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  dangerBorder: '#fecaca',
  info: '#0284c7',
  infoSoft: '#e0f2fe',
  infoBorder: '#bae6fd',
};

export const THEMES: Record<ThemeMode, ThemeColors> = {
  'light': lightTheme,
  'dark': darkTheme,
  'pro-dark': proDarkTheme,
  'pro-light': proLightTheme,
};
