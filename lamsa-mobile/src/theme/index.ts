import { MD3LightTheme, MD3DarkTheme, configureFonts, MD3Theme } from 'react-native-paper';

// Lamsa brand colors - Sophisticated beauty palette
const brandColors = {
  primary: '#D4A5A5', // Soft rose/mauve - elegant and feminine
  secondary: '#E8C5C5', // Warm blush - lighter complementary tone
  tertiary: '#C89B9B', // Dusty rose - medium tone for variety
  accent: '#F5E6E6', // Cream blush - very light for backgrounds
  dark: '#4A3643', // Deep plum - sophisticated dark tone
  success: '#7FB069', // Softer sage green
  warning: '#E8A87C', // Muted peach
  error: '#CD5C5C', // Indian red - softer than pure red
  info: '#7BA7BC', // Dusty blue
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
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    primary: brandColors.primary,
    primaryContainer: brandColors.accent,
    secondary: brandColors.secondary,
    secondaryContainer: brandColors.accent,
    tertiary: brandColors.tertiary,
    tertiaryContainer: brandColors.accent,
    surface: '#FFFFFF',
    surfaceVariant: '#FAF7F6',     // Warm light gray
    surfaceDisabled: '#E8E2E0',    // Warm disabled
    background: '#FDFBFA',         // Very light warm background
    error: brandColors.error,
    errorContainer: '#F0D0D0',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: brandColors.dark,
    onSecondary: '#FFFFFF',
    onSecondaryContainer: brandColors.dark,
    onTertiary: '#FFFFFF',
    onTertiaryContainer: brandColors.dark,
    onSurface: '#2D2428',         // Warm dark gray for headings
    onSurfaceVariant: '#4A3643',   // Deep plum for body text
    onSurfaceDisabled: '#6B5D65',  // Warm medium gray for disabled
    onError: '#FFFFFF',
    onErrorContainer: '#8B3A3A',  // Darker red for error container
    onBackground: '#2D2428',       // Warm dark gray
    outline: '#E8E2E0',            // Warm border color
    outlineVariant: '#FAF7F6',     // Light warm border
    inverseSurface: '#4A3643',     // Deep plum
    inverseOnSurface: '#FAF7F6',   // Warm light
    inversePrimary: '#E8C5C5',     // Warm blush
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.4)',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FDFBFA',
      level3: '#FAF7F6',
      level4: '#F7F3F1',
      level5: '#F3EEEC',
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
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    primary: brandColors.primary,
    primaryContainer: brandColors.dark,
    secondary: brandColors.secondary,
    secondaryContainer: brandColors.dark,
    tertiary: brandColors.tertiary,
    tertiaryContainer: brandColors.dark,
    surface: '#1A1517',            // Very dark with warm undertone
    surfaceVariant: '#2A2326',     // Dark warm gray
    surfaceDisabled: '#3A3336',    // Disabled dark warm
    background: '#0F0C0E',         // Almost black with warm tint
    error: brandColors.error,
    errorContainer: '#8B3A3A',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: brandColors.accent,
    onSecondary: '#FFFFFF',
    onSecondaryContainer: brandColors.accent,
    onTertiary: '#FFFFFF',
    onTertiaryContainer: brandColors.accent,
    onSurface: '#F5E6E6',          // Cream blush on dark
    onSurfaceVariant: '#D4A5A5',   // Soft rose on dark
    onSurfaceDisabled: '#A69BA3',  // Warm gray on dark
    onError: '#000000',
    onErrorContainer: '#FFFFFF',
    onBackground: '#F5E6E6',       // Cream blush on dark
    outline: '#3A3336',            // Dark warm border
    outlineVariant: '#2A2326',     // Darker warm border
    inverseSurface: '#F5E6E6',     // Cream blush
    inverseOnSurface: '#2A2326',   // Dark warm gray
    inversePrimary: brandColors.primary,
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.6)',
    elevation: {
      level0: 'transparent',
      level1: '#2A2326',
      level2: '#322B2E',
      level3: '#3A3336',
      level4: '#423A3D',
      level5: '#4A4145',
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