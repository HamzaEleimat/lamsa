// Typography
export * from './typography';
export { getTypography, getResponsiveTypography, commonTextStyles, typographyUtils } from './typography';

// Shadows
export * from './shadows';
export { createShadow, createColoredShadow, createThemedShadow, createInsetShadow, shadowPresets, shadowUtils } from './shadows';

// Spacing
export * from './spacing';
export { spacing, platformSpacing, componentSpacing, layout, getResponsiveSpacing, spacingUtils } from './spacing';

// Theme
export * from './theme';
export { lightTheme, darkTheme, createExtendedTheme, themeUtils } from './theme';
export type { ExtendedTheme } from './theme';

// Animations
export * from './animations';
export { 
  getTimingConfig, 
  getSpringConfig, 
  animations, 
  transitions, 
  gestureAnimations, 
  animationUtils 
} from './animations';

// Re-export commonly used utilities
export { default as themes } from './theme';