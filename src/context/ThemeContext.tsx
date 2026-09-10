import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ThemeColors, THEMES, proLightTheme } from '../theme/themes';

const THEME_STORAGE_KEY = '@bms_opd_theme_mode';

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'pro-light',
  colors: proLightTheme,
  setTheme: async () => {},
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('pro-light');
  const [colors, setColors] = useState<ThemeColors>(proLightTheme);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && (stored === 'light' || stored === 'dark' || stored === 'pro-dark' || stored === 'pro-light')) {
          setThemeState(stored as ThemeMode);
          setColors(THEMES[stored as ThemeMode]);
        }
      } catch (e) {
        console.warn('Failed to load theme preference:', e);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (mode: ThemeMode) => {
    try {
      setThemeState(mode);
      setColors(THEMES[mode]);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, isDark: colors.isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
