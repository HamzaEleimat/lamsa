import { platformSelect } from './core';
import type { PlatformStyles } from './types';

// Navigation constants
export const HEADER_HEIGHT = platformSelect({
  ios: 44,
  android: 56,
  default: 60,
}) as number;

export const TAB_BAR_HEIGHT = platformSelect({
  ios: 49,
  android: 56,
  default: 60,
}) as number;

// Animation durations
export const ANIMATION_DURATION = platformSelect({
  ios: 300,
  android: 350,
  default: 300,
}) as number;

// Shadow styles
export const SHADOW_STYLES: Record<'small' | 'medium' | 'large', PlatformStyles> = {
  small: platformSelect({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
    default: {
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  }) as PlatformStyles,
  medium: platformSelect({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
    default: {
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
    },
  }) as PlatformStyles,
  large: platformSelect({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
    default: {
      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    },
  }) as PlatformStyles,
};

// Font families
export const FONTS = {
  regular: platformSelect({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }) as string,
  arabic: platformSelect({
    ios: 'Tajawal-Regular',
    android: 'Tajawal-Regular',
    default: 'Tajawal-Regular',
  }) as string,
  bold: platformSelect({
    ios: 'System-Bold',
    android: 'Roboto-Bold',
    default: 'System-Bold',
  }) as string,
  arabicBold: platformSelect({
    ios: 'Tajawal-Bold',
    android: 'Tajawal-Bold',
    default: 'Tajawal-Bold',
  }) as string,
};

// Haptic feedback types
export const HAPTIC_FEEDBACK = {
  light: 'impactLight',
  medium: 'impactMedium',
  heavy: 'impactHeavy',
  selection: 'selection',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
  error: 'notificationError',
} as const;

// Border radius values
export const BORDER_RADIUS = {
  small: platformSelect({
    ios: 6,
    android: 4,
    default: 4,
  }) as number,
  medium: platformSelect({
    ios: 12,
    android: 8,
    default: 8,
  }) as number,
  large: platformSelect({
    ios: 18,
    android: 12,
    default: 12,
  }) as number,
  round: 9999,
};

// Spacing values (following platform guidelines)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Icon sizes
export const ICON_SIZES = {
  small: platformSelect({
    ios: 20,
    android: 18,
    default: 18,
  }) as number,
  medium: platformSelect({
    ios: 24,
    android: 24,
    default: 24,
  }) as number,
  large: platformSelect({
    ios: 32,
    android: 32,
    default: 32,
  }) as number,
};

// Touch feedback
export const TOUCH_FEEDBACK = {
  opacity: platformSelect({
    ios: 0.7,
    android: 0.9,
    default: 0.8,
  }) as number,
  duration: platformSelect({
    ios: 100,
    android: 50,
    default: 100,
  }) as number,
};