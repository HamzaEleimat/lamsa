import { MD3LightTheme, MD3DarkTheme, configureFonts, MD3Theme } from 'react-native-paper';

// Lamsa brand colors - Based on style-guide.tsx
const brandColors = {
  primary: '#4A3643', // Deep plum - main brand color
  secondary: '#CC8899', // Pink - secondary brand color
  tertiary: '#D4A5A5', // Soft rose - tertiary brand color
  accent: '#F5E6E6', // Cream blush - lightest brand color
  dark: '#181828', // Dark base color
  
  // Brand palette
  brand1: '#4A3643',
  brand2: '#CC8899',
  brand3: '#D4A5A5',
  brand4: '#E8C5C5',
  brand5: '#F5E6E6',
  
  // Base colors
  base1: '#e8e8ed',
  base2: '#9898a0',
  base3: '#585870',
  base4: '#383850',
  base5: '#181828',
  base6: '#f0f0f5',
  base7: '#f8f8fc',
  
  // System colors
  orange1: '#ffc880',
  orange2: '#ff9c33',
  orange3: '#ff8000',
  orange4: '#e66300',
  
  blue1: '#99ccff',
  blue2: '#4da6ff',
  blue3: '#0080ff',
  blue4: '#0066cc',
  
  yellow1: '#ffe680',
  yellow2: '#ffdb33',
  yellow3: '#ffd000',
  yellow4: '#e6b800',
  
  green1: '#80e6b3',
  green2: '#33cc88',
  green3: '#00b366',
  green4: '#009955',
  
  red1: '#ffb3ba',
  red2: '#ff6680',
  red3: '#ff3355',
  red4: '#e60033',
  
  // Status colors
  success: '#00b366', // Green for success
  warning: '#ff8000', // Orange for warning
  error: '#ff3355', // Red for error
  info: '#0080ff', // Blue for info
};

// Custom fonts configuration based on brand guidelines
const fontConfig = {
  // Display fonts - Cormorant Garamond for main screen titles (from style guide)
  displayLarge: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 56,
    fontWeight: '300' as const,
    letterSpacing: -0.02,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 48,
    fontWeight: '400' as const,
    letterSpacing: -0.01,
    lineHeight: 56,
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
    primaryContainer: brandColors.brand5,
    secondary: brandColors.secondary,
    secondaryContainer: brandColors.brand4,
    tertiary: brandColors.tertiary,
    tertiaryContainer: brandColors.brand5,
    surface: '#FFFFFF',
    surfaceVariant: brandColors.base6,     // #f0f0f5
    surfaceDisabled: brandColors.base1,    // #e8e8ed
    background: brandColors.base7,         // #f8f8fc
    error: brandColors.error,
    errorContainer: brandColors.red1,
    onPrimary: '#FFFFFF',
    onPrimaryContainer: brandColors.primary,
    onSecondary: '#FFFFFF',
    onSecondaryContainer: brandColors.primary,
    onTertiary: '#FFFFFF',
    onTertiaryContainer: brandColors.primary,
    onSurface: brandColors.base5,         // #181828 - main text
    onSurfaceVariant: brandColors.base3,   // #585870 - secondary text
    onSurfaceDisabled: brandColors.base2,  // #9898a0 - disabled text
    onError: '#FFFFFF',
    onErrorContainer: brandColors.red4,
    onBackground: brandColors.base5,       // #181828
    outline: brandColors.base1,            // #e8e8ed - border color
    outlineVariant: brandColors.base6,     // #f0f0f5 - light border
    inverseSurface: brandColors.primary,   // #4A3643
    inverseOnSurface: brandColors.base7,   // #f8f8fc
    inversePrimary: brandColors.secondary, // #CC8899
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.4)',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: brandColors.base7,
      level3: brandColors.base6,
      level4: '#FAF7F6',
      level5: '#F7F3F1',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 16, // Updated to match style guide
};

// Dark theme
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    primary: brandColors.secondary,    // Use pink as primary in dark mode
    primaryContainer: brandColors.brand1,
    secondary: brandColors.tertiary,
    secondaryContainer: brandColors.brand1,
    tertiary: brandColors.brand4,
    tertiaryContainer: brandColors.brand1,
    surface: '#181828',            // From base5
    surfaceVariant: '#282838',     // Dark variant
    surfaceDisabled: brandColors.base4,    // #383850
    background: '#0a0a0f',         // Very dark background
    error: brandColors.error,
    errorContainer: brandColors.red4,
    onPrimary: '#FFFFFF',
    onPrimaryContainer: brandColors.brand5,
    onSecondary: '#FFFFFF',
    onSecondaryContainer: brandColors.brand5,
    onTertiary: '#FFFFFF',
    onTertiaryContainer: brandColors.brand5,
    onSurface: brandColors.base7,          // #f8f8fc - text on dark
    onSurfaceVariant: '#b8b8bc',   // Light gray text
    onSurfaceDisabled: '#7878a0',  // Disabled text on dark
    onError: '#FFFFFF',
    onErrorContainer: '#FFFFFF',
    onBackground: brandColors.base7,       // #f8f8fc
    outline: brandColors.base4,            // #383850 - border
    outlineVariant: '#282838',     // Darker border
    inverseSurface: brandColors.base7,     // #f8f8fc
    inverseOnSurface: brandColors.base5,   // #181828
    inversePrimary: brandColors.primary,
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.6)',
    elevation: {
      level0: 'transparent',
      level1: '#181828',
      level2: '#282838',
      level3: brandColors.base4,
      level4: '#403850',
      level5: '#484058',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 16, // Updated to match style guide
};

// Shadow styles from style guide
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
};

// Spacing system (8px grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 64,
};

// Export custom colors for use in components
export const customColors = brandColors;

// Helper function to get theme based on user preference
export const getTheme = (isDarkMode: boolean): MD3Theme => {
  return isDarkMode ? darkTheme : lightTheme;
};

export default lightTheme;