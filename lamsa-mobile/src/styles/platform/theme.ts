import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import { platformSelect, isIOS } from '@utils/platform';
import { createShadow, shadowPresets } from './shadows';
import { getTypography, commonTextStyles } from './typography';
import { spacing, platformSpacing, componentSpacing } from './spacing';
import { BORDER_RADIUS } from '@utils/platform/constants';

// Lamsa brand colors
const brandColors = {
  primary: '#FF8FAB',
  secondary: '#FFC2D1',
  tertiary: '#FFB3C6',
  accent: '#FFE5EC',
  dark: '#50373E',
  
  // Additional colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

// Platform-specific color adjustments
const platformColors = {
  // iOS tends to use more vibrant colors
  ios: {
    primary: brandColors.primary,
    link: '#007AFF',
    separator: 'rgba(60, 60, 67, 0.12)',
    background: {
      primary: '#FFFFFF',
      secondary: '#F2F2F7',
      tertiary: '#FFFFFF',
    },
    label: {
      primary: '#000000',
      secondary: 'rgba(60, 60, 67, 0.6)',
      tertiary: 'rgba(60, 60, 67, 0.3)',
      quaternary: 'rgba(60, 60, 67, 0.18)',
    },
  },
  // Android follows Material Design colors
  android: {
    primary: brandColors.primary,
    link: brandColors.primary,
    separator: 'rgba(0, 0, 0, 0.12)',
    background: {
      primary: '#FFFFFF',
      secondary: '#F5F5F5',
      tertiary: '#FFFFFF',
    },
    label: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.60)',
      tertiary: 'rgba(0, 0, 0, 0.38)',
      quaternary: 'rgba(0, 0, 0, 0.12)',
    },
  },
};

// Create light theme
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
    
    surface: brandColors.white,
    surfaceVariant: brandColors.gray[100],
    surfaceDisabled: brandColors.gray[200],
    
    background: platformSelect({
      ios: platformColors.ios.background.secondary,
      android: platformColors.android.background.secondary,
      default: brandColors.gray[50],
    }) as string,
    
    error: brandColors.error,
    errorContainer: '#FFEBEE',
    
    onPrimary: brandColors.white,
    onPrimaryContainer: brandColors.dark,
    onSecondary: brandColors.dark,
    onSecondaryContainer: brandColors.dark,
    onTertiary: brandColors.dark,
    onTertiaryContainer: brandColors.dark,
    
    onSurface: platformSelect({
      ios: platformColors.ios.label.primary,
      android: platformColors.android.label.primary,
      default: brandColors.gray[900],
    }) as string,
    
    onSurfaceVariant: platformSelect({
      ios: platformColors.ios.label.secondary,
      android: platformColors.android.label.secondary,
      default: brandColors.gray[700],
    }) as string,
    
    onSurfaceDisabled: platformSelect({
      ios: platformColors.ios.label.tertiary,
      android: platformColors.android.label.tertiary,
      default: brandColors.gray[500],
    }) as string,
    
    outline: platformSelect({
      ios: platformColors.ios.separator,
      android: platformColors.android.separator,
      default: brandColors.gray[300],
    }) as string,
    
    outlineVariant: brandColors.gray[200],
    
    inverseSurface: brandColors.gray[900],
    inverseOnSurface: brandColors.white,
    inversePrimary: brandColors.accent,
    
    elevation: {
      level0: 'transparent',
      level1: brandColors.white,
      level2: brandColors.white,
      level3: brandColors.white,
      level4: brandColors.white,
      level5: brandColors.white,
    },
  },
};

// Create dark theme
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
    
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',
    surfaceDisabled: '#383838',
    
    background: platformSelect({
      ios: '#000000',
      android: '#121212',
      default: '#121212',
    }) as string,
    
    error: '#CF6679',
    errorContainer: '#B00020',
    
    onPrimary: brandColors.white,
    onPrimaryContainer: brandColors.accent,
    onSecondary: brandColors.dark,
    onSecondaryContainer: brandColors.accent,
    onTertiary: brandColors.dark,
    onTertiaryContainer: brandColors.accent,
    
    onSurface: '#FFFFFF',
    onSurfaceVariant: 'rgba(255, 255, 255, 0.7)',
    onSurfaceDisabled: 'rgba(255, 255, 255, 0.38)',
    
    outline: 'rgba(255, 255, 255, 0.12)',
    outlineVariant: 'rgba(255, 255, 255, 0.08)',
    
    inverseSurface: brandColors.white,
    inverseOnSurface: brandColors.gray[900],
    inversePrimary: brandColors.primary,
    
    elevation: {
      level0: 'transparent',
      level1: '#1E1E1E',
      level2: '#232323',
      level3: '#252525',
      level4: '#272727',
      level5: '#2C2C2C',
    },
  },
};

// Extended theme with custom properties
export interface ExtendedTheme extends MD3Theme {
  spacing: typeof spacing;
  platformSpacing: typeof platformSpacing;
  componentSpacing: typeof componentSpacing;
  borderRadius: typeof BORDER_RADIUS;
  shadows: typeof shadowPresets;
  typography: {
    variants: typeof getTypography;
    common: typeof commonTextStyles;
  };
  custom: {
    brandColors: typeof brandColors;
    platformColors: typeof platformColors;
  };
}

// Create extended theme
export function createExtendedTheme(isDark: boolean = false): ExtendedTheme {
  const baseTheme = isDark ? darkTheme : lightTheme;
  
  return {
    ...baseTheme,
    spacing,
    platformSpacing,
    componentSpacing,
    borderRadius: BORDER_RADIUS,
    shadows: shadowPresets,
    typography: {
      variants: getTypography,
      common: commonTextStyles,
    },
    custom: {
      brandColors,
      platformColors: platformSelect({
        ios: platformColors.ios,
        android: platformColors.android,
        default: platformColors.ios,
      }) as typeof platformColors.ios,
    },
  };
}

// Theme utilities
export const themeUtils = {
  // Get contrasting text color
  getContrastText: (backgroundColor: string): string => {
    // Simple luminance calculation
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? brandColors.dark : brandColors.white;
  },
  
  // Create color with opacity
  withOpacity: (color: string, opacity: number): string => {
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/g, `${opacity})`);
    }
    // Convert hex to rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  },
  
  // Get platform-specific system colors
  getSystemColor: (color: 'blue' | 'green' | 'red' | 'yellow' | 'gray') => {
    const systemColors = {
      blue: platformSelect({ ios: '#007AFF', android: '#2196F3' }),
      green: platformSelect({ ios: '#34C759', android: '#4CAF50' }),
      red: platformSelect({ ios: '#FF3B30', android: '#F44336' }),
      yellow: platformSelect({ ios: '#FFCC00', android: '#FFC107' }),
      gray: platformSelect({ ios: '#8E8E93', android: '#9E9E9E' }),
    };
    return systemColors[color];
  },
};

// Export default themes
export default {
  light: createExtendedTheme(false),
  dark: createExtendedTheme(true),
};