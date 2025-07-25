import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createExtendedTheme, ExtendedTheme } from '@styles/platform';

interface ThemeContextType {
  theme: ExtendedTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@lamsa/theme';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'system' 
}: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(
    defaultTheme === 'system' 
      ? systemColorScheme === 'dark'
      : defaultTheme === 'dark'
  );

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when system preference changes
  useEffect(() => {
    if (defaultTheme === 'system') {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, defaultTheme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (dark: boolean) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    saveThemePreference(newTheme);
  };

  const setTheme = (dark: boolean) => {
    setIsDark(dark);
    saveThemePreference(dark);
  };

  const theme = createExtendedTheme(isDark);

  const contextValue: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <PaperProvider theme={theme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

// Custom hook to use theme
export function useExtendedTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useExtendedTheme must be used within a ThemeProvider');
  }
  return context;
}

// Convenience hooks
export function useThemeColors() {
  const { theme } = useExtendedTheme();
  return theme.colors;
}

export function useThemeSpacing() {
  const { theme } = useExtendedTheme();
  return theme.spacing;
}

export function useThemeShadows() {
  const { theme } = useExtendedTheme();
  return theme.shadows;
}

export function useThemeTypography() {
  const { theme } = useExtendedTheme();
  return theme.typography;
}