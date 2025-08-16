import { MD3LightTheme, MD3DarkTheme, configureFonts, MD3Theme } from 'react-native-paper';

// Lamsa brand colors - Unified with design system (Sophisticated Plum/Mauve Theme)
const brandColors = {
  primary: '#4A3643', // Deep plum - main brand color
  secondary: '#CC8899', // Dusty pink - secondary brand color
  tertiary: '#D4A5A5', // Soft rose - tertiary brand color
  accent: '#F5E6E6', // Cream blush - surface color
  surface: '#F5E6E6', // Card backgrounds, input fields
  background: '#FAF7F6', // Main background (warm white)
  
  // Interactive States
  primaryHover: '#3E2B36', // 10% darker
  primaryActive: '#352029', // 15% darker
  secondaryHover: '#B8758A', // 10% darker
  secondaryActive: '#A6677C', // 15% darker
  
  // Text Colors - WCAG AA Compliant
  textPrimary: '#2D1B28', // Main text (4.5:1 contrast)
  textSecondary: '#6B5D65', // Secondary text (4.5:1 contrast)
  textTertiary: '#8A7B83', // Tertiary text (3:1 contrast)
  textInverse: '#FFFFFF', // White text on dark backgrounds
  
  // Neutral Grays - Warm-tinted
  gray50: '#FAF8F7',
  gray100: '#F5F2F1',
  gray200: '#E8E2E0', // Border color
  gray300: '#D1C7C4',
  gray400: '#A69BA3',
  gray500: '#7A6F76',
  gray600: '#6B5D65',
  gray700: '#4A3F45',
  gray800: '#2D1B28',
  gray900: '#1A0F15',
  
  // Semantic Colors - Material Design compliant
  success: '#4CAF50', // Green for success
  warning: '#FF9800', // Orange for warning
  error: '#F44336', // Red for error
  info: '#2196F3', // Blue for info
  
  // Semantic Light Backgrounds
  successLight: '#E8F5E8',
  warningLight: '#FFF3E0',
  errorLight: '#FFEBEE',
  infoLight: '#E3F2FD',
  
  // Legacy aliases for backward compatibility
  dark: '#2D1B28', // Changed to match textPrimary
  base1: '#E8E2E0', // gray200
  base2: '#A69BA3', // gray400
  base3: '#6B5D65', // gray600
  base4: '#4A3F45', // gray700
  base5: '#2D1B28', // gray800
  base6: '#F5F2F1', // gray100
  base7: '#FAF7F6', // background
};

// Custom fonts configuration - Inter for readability and accessibility
const fontConfig = {
  // Display fonts - Inter for main screen titles
  displayLarge: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 48, // Reduced from 56px for mobile
    fontWeight: '600' as const,
    letterSpacing: -0.02,
    lineHeight: 56,
  },
  displayMedium: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 36,
    fontWeight: '600' as const,
    letterSpacing: -0.01,
    lineHeight: 44,
  },
  displaySmall: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 30,
    fontWeight: '600' as const,
    letterSpacing: -0.01,
    lineHeight: 36,
  },
  // Headlines - Inter for section headers
  headlineLarge: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24, // Main screen titles
    fontWeight: '600' as const,
    letterSpacing: -0.01,
    lineHeight: 32,
  },
  headlineMedium: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20, // Important headers
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  headlineSmall: {
    fontFamily: 'Inter_500Medium',
    fontSize: 18, // Section headers
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  // Titles - Inter for smaller headings
  titleLarge: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18, // Call-to-action titles
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  titleMedium: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16, // Smaller CTAs
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  titleSmall: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14, // Minimum CTA size
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  // Labels - Inter for UI elements
  labelLarge: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  // Body text - Inter for maximum readability
  bodyLarge: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16, // Standard body text
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14, // Standard body text
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12, // Legal/ancillary text
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  default: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
};

// Light theme
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Semantic colors
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    
    // Brand colors
    primary: brandColors.primary,          // #4A3643 - Deep plum
    primaryContainer: brandColors.surface, // #F5E6E6 - Cream blush
    secondary: brandColors.secondary,      // #CC8899 - Dusty pink
    secondaryContainer: brandColors.accent, // #F5E6E6 - Surface
    tertiary: brandColors.tertiary,        // #D4A5A5 - Soft rose
    tertiaryContainer: brandColors.surface, // #F5E6E6 - Surface
    
    // Surface colors
    surface: '#FFFFFF',                    // White cards
    surfaceVariant: brandColors.surface,   // #F5E6E6 - Card backgrounds
    surfaceDisabled: brandColors.gray200,  // #E8E2E0 - Disabled surfaces
    background: brandColors.background,    // #FAF7F6 - Main background
    
    // Error colors
    error: brandColors.error,              // #F44336
    errorContainer: brandColors.errorLight, // #FFEBEE
    
    // Text colors (on surfaces)
    onPrimary: brandColors.textInverse,    // White text on primary
    onPrimaryContainer: brandColors.textPrimary, // Dark text on primary container
    onSecondary: brandColors.textInverse,  // White text on secondary
    onSecondaryContainer: brandColors.textPrimary, // Dark text on secondary container
    onTertiary: brandColors.textInverse,   // White text on tertiary
    onTertiaryContainer: brandColors.textPrimary, // Dark text on tertiary container
    onSurface: brandColors.textPrimary,    // #2D1B28 - Main text on white
    onSurfaceVariant: brandColors.textSecondary, // #6B5D65 - Secondary text
    onSurfaceDisabled: brandColors.gray400, // #A69BA3 - Disabled text
    onError: brandColors.textInverse,      // White text on error
    onErrorContainer: brandColors.textPrimary, // Dark text on error container
    onBackground: brandColors.textPrimary, // #2D1B28 - Text on background
    
    // Outline/Border colors
    outline: brandColors.gray200,          // #E8E2E0 - Border color
    outlineVariant: brandColors.gray100,   // #F5F2F1 - Light border
    
    // Inverse colors (for dark elements in light theme)
    inverseSurface: brandColors.primary,   // #4A3643 - Dark surfaces
    inverseOnSurface: brandColors.textInverse, // White text on dark
    inversePrimary: brandColors.secondary, // #CC8899 - Inverse primary
    
    // System colors
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(45, 27, 40, 0.4)',    // Dark overlay with brand tint
    
    // Elevation surfaces
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',                   // Pure white
      level2: brandColors.surface,         // #F5E6E6
      level3: brandColors.gray100,         // #F5F2F1
      level4: brandColors.background,      // #FAF7F6
      level5: brandColors.gray50,          // #FAF8F7
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 8, // Updated to match design system (8px default)
};

// Dark theme
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // Semantic colors
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    
    // Brand colors (adjusted for dark mode)
    primary: brandColors.secondary,        // #CC8899 - Dusty pink as primary in dark
    primaryContainer: brandColors.gray700, // #4A3F45 - Dark container
    secondary: brandColors.tertiary,       // #D4A5A5 - Soft rose as secondary
    secondaryContainer: brandColors.gray700, // #4A3F45 - Dark container
    tertiary: brandColors.accent,          // #F5E6E6 - Light tertiary for contrast
    tertiaryContainer: brandColors.gray700, // #4A3F45 - Dark container
    
    // Surface colors
    surface: brandColors.gray800,          // #2D1B28 - Dark surfaces
    surfaceVariant: brandColors.gray700,   // #4A3F45 - Card backgrounds
    surfaceDisabled: brandColors.gray600,  // #6B5D65 - Disabled surfaces
    background: brandColors.gray900,       // #1A0F15 - Very dark background
    
    // Error colors
    error: brandColors.error,              // #F44336
    errorContainer: brandColors.gray700,   // Dark error container
    
    // Text colors (on dark surfaces)
    onPrimary: brandColors.textInverse,    // White text on primary
    onPrimaryContainer: brandColors.textInverse, // White text on dark container
    onSecondary: brandColors.textInverse,  // White text on secondary
    onSecondaryContainer: brandColors.textInverse, // White text on dark container
    onTertiary: brandColors.textPrimary,   // Dark text on light tertiary
    onTertiaryContainer: brandColors.textInverse, // White text on dark container
    onSurface: brandColors.textInverse,    // White text on dark surface
    onSurfaceVariant: brandColors.gray300, // #D1C7C4 - Light secondary text
    onSurfaceDisabled: brandColors.gray500, // #7A6F76 - Disabled text
    onError: brandColors.textInverse,      // White text on error
    onErrorContainer: brandColors.textInverse, // White text on error container
    onBackground: brandColors.textInverse, // White text on dark background
    
    // Outline/Border colors
    outline: brandColors.gray600,          // #6B5D65 - Border color
    outlineVariant: brandColors.gray700,   // #4A3F45 - Light border
    
    // Inverse colors (for light elements in dark theme)
    inverseSurface: brandColors.surface,   // #F5E6E6 - Light surfaces
    inverseOnSurface: brandColors.textPrimary, // Dark text on light
    inversePrimary: brandColors.primary,   // #4A3643 - Original primary
    
    // System colors
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.6)',       // Dark overlay
    
    // Elevation surfaces (darker tones)
    elevation: {
      level0: 'transparent',
      level1: brandColors.gray800,         // #2D1B28
      level2: brandColors.gray700,         // #4A3F45
      level3: brandColors.gray600,         // #6B5D65
      level4: brandColors.gray500,         // #7A6F76
      level5: brandColors.gray400,         // #A69BA3
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 8, // Updated to match design system (8px default)
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