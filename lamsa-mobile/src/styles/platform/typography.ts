import { TextStyle, Platform } from 'react-native';
import { 
  platformSelect, 
  isIOS, 
  isAndroid,
  FONTS,
  isRTL,
} from '@utils/platform';

// Type definitions
export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';
export type TextVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'button'
  | 'caption'
  | 'overline';

// Platform-specific font weights
const fontWeights: Record<FontWeight, TextStyle['fontWeight']> = {
  regular: platformSelect({
    ios: '400',
    android: 'normal',
    default: '400',
  }) as TextStyle['fontWeight'],
  medium: platformSelect({
    ios: '500',
    android: '500',
    default: '500',
  }) as TextStyle['fontWeight'],
  semibold: platformSelect({
    ios: '600',
    android: '600',
    default: '600',
  }) as TextStyle['fontWeight'],
  bold: platformSelect({
    ios: '700',
    android: 'bold',
    default: '700',
  }) as TextStyle['fontWeight'],
};

// Base typography styles
const baseTypography: Record<TextVariant, TextStyle> = {
  h1: {
    fontSize: platformSelect({ ios: 34, android: 32, default: 32 }),
    lineHeight: platformSelect({ ios: 41, android: 40, default: 40 }),
    fontWeight: fontWeights.bold,
    letterSpacing: platformSelect({ ios: 0.37, android: 0, default: 0 }),
  },
  h2: {
    fontSize: platformSelect({ ios: 28, android: 28, default: 28 }),
    lineHeight: platformSelect({ ios: 34, android: 36, default: 36 }),
    fontWeight: fontWeights.bold,
    letterSpacing: platformSelect({ ios: 0.36, android: 0, default: 0 }),
  },
  h3: {
    fontSize: platformSelect({ ios: 22, android: 24, default: 24 }),
    lineHeight: platformSelect({ ios: 28, android: 32, default: 32 }),
    fontWeight: fontWeights.semibold,
    letterSpacing: platformSelect({ ios: 0.35, android: 0, default: 0 }),
  },
  h4: {
    fontSize: platformSelect({ ios: 20, android: 20, default: 20 }),
    lineHeight: platformSelect({ ios: 25, android: 28, default: 28 }),
    fontWeight: fontWeights.semibold,
    letterSpacing: platformSelect({ ios: 0.38, android: 0.15, default: 0.15 }),
  },
  h5: {
    fontSize: platformSelect({ ios: 18, android: 18, default: 18 }),
    lineHeight: platformSelect({ ios: 22, android: 24, default: 24 }),
    fontWeight: fontWeights.semibold,
    letterSpacing: platformSelect({ ios: -0.24, android: 0.15, default: 0.15 }),
  },
  h6: {
    fontSize: platformSelect({ ios: 16, android: 16, default: 16 }),
    lineHeight: platformSelect({ ios: 20, android: 24, default: 24 }),
    fontWeight: fontWeights.semibold,
    letterSpacing: platformSelect({ ios: -0.24, android: 0.15, default: 0.15 }),
  },
  subtitle1: {
    fontSize: platformSelect({ ios: 16, android: 16, default: 16 }),
    lineHeight: platformSelect({ ios: 22, android: 24, default: 24 }),
    fontWeight: fontWeights.medium,
    letterSpacing: platformSelect({ ios: -0.24, android: 0.15, default: 0.15 }),
  },
  subtitle2: {
    fontSize: platformSelect({ ios: 14, android: 14, default: 14 }),
    lineHeight: platformSelect({ ios: 18, android: 20, default: 20 }),
    fontWeight: fontWeights.medium,
    letterSpacing: platformSelect({ ios: -0.15, android: 0.1, default: 0.1 }),
  },
  body1: {
    fontSize: platformSelect({ ios: 17, android: 16, default: 16 }),
    lineHeight: platformSelect({ ios: 22, android: 24, default: 24 }),
    fontWeight: fontWeights.regular,
    letterSpacing: platformSelect({ ios: -0.41, android: 0.5, default: 0.5 }),
  },
  body2: {
    fontSize: platformSelect({ ios: 15, android: 14, default: 14 }),
    lineHeight: platformSelect({ ios: 20, android: 20, default: 20 }),
    fontWeight: fontWeights.regular,
    letterSpacing: platformSelect({ ios: -0.24, android: 0.25, default: 0.25 }),
  },
  button: {
    fontSize: platformSelect({ ios: 17, android: 14, default: 14 }),
    lineHeight: platformSelect({ ios: 22, android: 20, default: 20 }),
    fontWeight: fontWeights.semibold,
    letterSpacing: platformSelect({ ios: -0.41, android: 1.25, default: 1.25 }),
    textTransform: platformSelect({ ios: 'none', android: 'uppercase', default: 'uppercase' }) as TextStyle['textTransform'],
  },
  caption: {
    fontSize: platformSelect({ ios: 12, android: 12, default: 12 }),
    lineHeight: platformSelect({ ios: 16, android: 16, default: 16 }),
    fontWeight: fontWeights.regular,
    letterSpacing: platformSelect({ ios: 0, android: 0.4, default: 0.4 }),
  },
  overline: {
    fontSize: platformSelect({ ios: 10, android: 10, default: 10 }),
    lineHeight: platformSelect({ ios: 13, android: 16, default: 16 }),
    fontWeight: fontWeights.regular,
    letterSpacing: platformSelect({ ios: 0.12, android: 1.5, default: 1.5 }),
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
};

// Get typography style with platform-specific adjustments
export function getTypography(variant: TextVariant, options?: {
  weight?: FontWeight;
  color?: string;
  align?: TextStyle['textAlign'];
  arabic?: boolean;
}): TextStyle {
  const baseStyle = baseTypography[variant];
  const useArabic = options?.arabic ?? isRTL;
  
  return {
    ...baseStyle,
    fontFamily: useArabic ? FONTS.arabic : FONTS.regular,
    fontWeight: options?.weight ? fontWeights[options.weight] : baseStyle.fontWeight,
    color: options?.color,
    textAlign: options?.align || (useArabic ? 'right' : 'left'),
    // Arabic-specific adjustments
    ...(useArabic && {
      lineHeight: (baseStyle.lineHeight as number) * 1.2, // Arabic needs more line height
      letterSpacing: 0, // Arabic doesn't use letter spacing
    }),
  };
}

// Responsive typography based on screen size
export function getResponsiveTypography(
  variant: TextVariant,
  screenWidth: number,
  options?: Parameters<typeof getTypography>[1]
): TextStyle {
  const baseStyle = getTypography(variant, options);
  
  // Scale factor based on screen width
  const scaleFactor = platformSelect({
    ios: screenWidth < 375 ? 0.9 : screenWidth > 414 ? 1.1 : 1,
    android: screenWidth < 360 ? 0.9 : screenWidth > 411 ? 1.1 : 1,
    default: 1,
  }) as number;
  
  return {
    ...baseStyle,
    fontSize: (baseStyle.fontSize as number) * scaleFactor,
    lineHeight: (baseStyle.lineHeight as number) * scaleFactor,
  };
}

// Platform-specific text adjustments
export const textAdjustments = {
  // iOS text is generally lighter, Android text is bolder
  opacity: platformSelect({
    ios: 1,
    android: 0.87,
    default: 1,
  }),
  
  // Platform-specific selection color
  selectionColor: platformSelect({
    ios: 'rgba(0, 122, 255, 0.3)',
    android: 'rgba(255, 143, 171, 0.3)', // Using primary color
    default: 'rgba(0, 122, 255, 0.3)',
  }),
};

// Common text styles
export const commonTextStyles = {
  // Error text
  error: {
    ...getTypography('caption'),
    color: '#F44336',
  },
  
  // Helper text
  helper: {
    ...getTypography('caption'),
    color: 'rgba(0, 0, 0, 0.6)',
  },
  
  // Link text
  link: {
    ...getTypography('body2'),
    color: platformSelect({
      ios: '#007AFF',
      android: '#FF8FAB', // Using primary color
      default: '#007AFF',
    }),
    textDecorationLine: 'underline' as TextStyle['textDecorationLine'],
  },
  
  // Disabled text
  disabled: {
    opacity: 0.38,
  },
};

// Typography utilities
export const typographyUtils = {
  // Truncate text with ellipsis
  truncate: (lines: number = 1): TextStyle => ({
    numberOfLines: lines,
    ellipsizeMode: 'tail',
  } as any),
  
  // Center text
  center: (): TextStyle => ({
    textAlign: 'center',
  }),
  
  // Uppercase text (respecting platform conventions)
  uppercase: (): TextStyle => ({
    textTransform: platformSelect({
      ios: 'uppercase',
      android: 'uppercase',
      default: 'uppercase',
    }) as TextStyle['textTransform'],
  }),
  
  // Platform-specific text shadow
  textShadow: (type: 'light' | 'medium' | 'strong' = 'medium'): TextStyle => {
    const shadows = {
      light: {
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      medium: {
        textShadowColor: 'rgba(0, 0, 0, 0.35)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
      strong: {
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 6,
      },
    };
    
    return platformSelect({
      ios: shadows[type],
      android: {}, // Android doesn't support text shadows well
      default: shadows[type],
    }) as TextStyle;
  },
};