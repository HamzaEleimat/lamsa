import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { MD3Type } from 'react-native-paper/lib/typescript/types';

// Lamsa brand colors
const brandColors = {
  primary: '#E91E63', // Pink
  secondary: '#9C27B0', // Purple
  tertiary: '#FF6090', // Light Pink
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
};

// Custom fonts configuration
const fontConfig = {
  displayLarge: {
    fontFamily: 'System',
    fontSize: 57,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: 'System',
    fontSize: 45,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily: 'System',
    fontSize: 36,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 44,
  },
  headlineLarge: {
    fontFamily: 'System',
    fontSize: 32,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 32,
  },
  titleLarge: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelLarge: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  bodyLarge: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
  },
  default: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
};

// Light theme
export const lightTheme: MD3Type = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColors.primary,
    primaryContainer: '#FCE4EC',
    secondary: brandColors.secondary,
    secondaryContainer: '#F3E5F5',
    tertiary: brandColors.tertiary,
    tertiaryContainer: '#FFE0E8',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    surfaceDisabled: '#E0E0E0',
    background: '#FAFAFA',
    error: brandColors.error,
    errorContainer: '#FFEBEE',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#880E4F',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#4A148C',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#C2185B',
    onSurface: '#212121',
    onSurfaceVariant: '#666666',
    onSurfaceDisabled: '#9E9E9E',
    onError: '#FFFFFF',
    onErrorContainer: '#B71C1C',
    onBackground: '#212121',
    outline: '#E0E0E0',
    outlineVariant: '#F5F5F5',
    inverseSurface: '#303030',
    inverseOnSurface: '#F5F5F5',
    inversePrimary: '#FF80AB',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.4)',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FAFAFA',
      level3: '#F5F5F5',
      level4: '#F0F0F0',
      level5: '#EBEBEB',
    },
  },
  fonts: configureFonts({ config: fontConfig }) as MD3Type['fonts'],
  roundness: 12,
};

// Dark theme
export const darkTheme: MD3Type = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brandColors.primary,
    primaryContainer: '#880E4F',
    secondary: brandColors.secondary,
    secondaryContainer: '#4A148C',
    tertiary: brandColors.tertiary,
    tertiaryContainer: '#C2185B',
    surface: '#121212',
    surfaceVariant: '#1E1E1E',
    surfaceDisabled: '#2C2C2C',
    background: '#000000',
    error: brandColors.error,
    errorContainer: '#CF6679',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#FFB3C1',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#CE93D8',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#FFB3C1',
    onSurface: '#E1E1E1',
    onSurfaceVariant: '#AAAAAA',
    onSurfaceDisabled: '#666666',
    onError: '#000000',
    onErrorContainer: '#FFFFFF',
    onBackground: '#E1E1E1',
    outline: '#2C2C2C',
    outlineVariant: '#1E1E1E',
    inverseSurface: '#E1E1E1',
    inverseOnSurface: '#1E1E1E',
    inversePrimary: '#C2185B',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.6)',
    elevation: {
      level0: 'transparent',
      level1: '#1E1E1E',
      level2: '#232323',
      level3: '#282828',
      level4: '#2D2D2D',
      level5: '#323232',
    },
  },
  fonts: configureFonts({ config: fontConfig }) as MD3Type['fonts'],
  roundness: 12,
};

// Export custom colors for use in components
export const customColors = brandColors;

// Helper function to get theme based on user preference
export const getTheme = (isDarkMode: boolean): MD3Type => {
  return isDarkMode ? darkTheme : lightTheme;
};

export default lightTheme;