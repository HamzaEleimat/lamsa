import { MD3LightTheme, MD3DarkTheme, configureFonts, MD3Theme } from 'react-native-paper';

// Lamsa brand colors - Updated with new palette
const brandColors = {
  primary: '#FF8FAB', // Pink from palette
  secondary: '#FFC2D1', // Light pink from palette
  tertiary: '#FFB3C6', // Medium pink from palette
  accent: '#FFE5EC', // Lightest pink from palette
  dark: '#50373E', // Dark brown from palette
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
};

// Custom fonts configuration based on brand guidelines
const fontConfig = {
  // Display fonts - Cormorant Garamond for main screen titles
  displayLarge: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 57,
    fontWeight: '400' as const,
    letterSpacing: -0.5,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 45,
    fontWeight: '400' as const,
    letterSpacing: -0.5,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 36,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 44,
  },
  // Headlines - Cormorant Garamond for section headers
  headlineLarge: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 32, // Main screen titles
    fontWeight: '400' as const,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 28, // Important headers
    fontWeight: '600' as const,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 24, // Section headers
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 32,
  },
  // Titles - Cormorant Garamond for smaller headings
  titleLarge: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 22, // Call-to-action titles
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20, // Smaller CTAs
    fontWeight: '500' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 18, // Minimum CTA size
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  // Labels - Martel Sans for UI elements
  labelLarge: {
    fontFamily: 'MartelSans_700Bold',
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: 'MartelSans_400Regular',
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: 'MartelSans_400Regular',
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  // Body text - Martel Sans for readability
  bodyLarge: {
    fontFamily: 'MartelSans_400Regular',
    fontSize: 16, // Standard body text
    fontWeight: '400' as const,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'MartelSans_400Regular',
    fontSize: 14, // Standard body text
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'MartelSans_400Regular',
    fontSize: 12, // Legal/ancillary text
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 18,
  },
  default: {
    fontFamily: 'MartelSans_400Regular',
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
};

// Light theme
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColors.primary,
    primaryContainer: brandColors.accent,
    secondary: brandColors.secondary,
    secondaryContainer: brandColors.accent,
    tertiary: brandColors.tertiary,
    tertiaryContainer: brandColors.accent,
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    surfaceDisabled: '#E0E0E0',
    background: '#FAFAFA',
    error: brandColors.error,
    errorContainer: '#FFEBEE',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: brandColors.dark,
    onSecondary: '#FFFFFF',
    onSecondaryContainer: brandColors.dark,
    onTertiary: '#FFFFFF',
    onTertiaryContainer: brandColors.dark,
    onSurface: '#212121', // Primary heading color from guidelines
    onSurfaceVariant: '#424242', // Primary body text color from guidelines
    onSurfaceDisabled: '#757575', // Secondary text color from guidelines
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
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
};

// Dark theme
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brandColors.primary,
    primaryContainer: brandColors.dark,
    secondary: brandColors.secondary,
    secondaryContainer: brandColors.dark,
    tertiary: brandColors.tertiary,
    tertiaryContainer: brandColors.dark,
    surface: '#121212',
    surfaceVariant: '#1E1E1E',
    surfaceDisabled: '#2C2C2C',
    background: '#000000',
    error: brandColors.error,
    errorContainer: '#CF6679',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: brandColors.accent,
    onSecondary: '#FFFFFF',
    onSecondaryContainer: brandColors.accent,
    onTertiary: '#FFFFFF',
    onTertiaryContainer: brandColors.accent,
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
    inversePrimary: brandColors.primary,
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
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
};

// Export custom colors for use in components
export const customColors = brandColors;

// Helper function to get theme based on user preference
export const getTheme = (isDarkMode: boolean): MD3Theme => {
  return isDarkMode ? darkTheme : lightTheme;
};

export default lightTheme;