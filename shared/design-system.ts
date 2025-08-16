/**
 * Lamsa Design System
 * Unified design tokens for web and mobile platforms
 * 
 * Color Palette: Sophisticated Plum/Mauve theme
 * Typography: Inter for Latin text, Cairo for Arabic text
 * Accessibility: WCAG AA compliant (4.5:1 contrast ratio)
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Brand Colors - Sophisticated Plum/Mauve Theme
  brand: {
    primary: '#4A3643',      // Deep plum - CTA buttons, links, focus states
    secondary: '#CC8899',    // Dusty pink - secondary actions, highlights  
    tertiary: '#D4A5A5',     // Soft rose - accents, badges, light backgrounds
    surface: '#F5E6E6',      // Cream blush - card backgrounds, input fields
    background: '#FAF7F6',   // Warm white - main background
  },

  // Text Colors - WCAG AA Compliant
  text: {
    primary: '#2D1B28',      // Main text - 4.5:1 contrast on light bg
    secondary: '#6B5D65',    // Secondary text - 4.5:1 contrast
    tertiary: '#8A7B83',     // Tertiary text - 3:1 contrast (large text only)
    inverse: '#FFFFFF',      // White text on dark backgrounds
    disabled: 'rgba(45, 27, 40, 0.4)', // 40% opacity primary text
  },

  // Interactive States
  interactive: {
    primaryHover: '#3E2B36',     // 10% darker than primary
    primaryActive: '#352029',    // 15% darker than primary
    primaryDisabled: 'rgba(74, 54, 67, 0.4)', // 40% opacity
    
    secondaryHover: '#B8758A',   // 10% darker than secondary
    secondaryActive: '#A6677C',  // 15% darker than secondary
    secondaryDisabled: 'rgba(204, 136, 153, 0.4)', // 40% opacity
    
    focus: '#4A3643',            // Focus ring color (same as primary)
    focusRing: 'rgba(74, 54, 67, 0.2)', // Focus ring with transparency
  },

  // Semantic Colors
  semantic: {
    success: '#4CAF50',      // Green - confirmations, success states
    successLight: '#E8F5E8', // Light green background
    warning: '#FF9800',      // Orange - warnings, pending states
    warningLight: '#FFF3E0', // Light orange background
    error: '#F44336',        // Red - errors, destructive actions
    errorLight: '#FFEBEE',   // Light red background
    info: '#2196F3',         // Blue - informational messages
    infoLight: '#E3F2FD',    // Light blue background
  },

  // Neutral Grays - Warm-tinted
  gray: {
    50: '#FAF8F7',          // Lightest gray with warm tint
    100: '#F5F2F1',         // Very light gray
    200: '#E8E2E0',         // Light border color
    300: '#D1C7C4',         // Medium light gray
    400: '#A69BA3',         // Medium gray
    500: '#7A6F76',         // Balanced gray
    600: '#6B5D65',         // Dark gray (same as text.secondary)
    700: '#4A3F45',         // Very dark gray
    800: '#2D1B28',         // Almost black (same as text.primary)
    900: '#1A0F15',         // True black with warm tint
  },

  // Utility Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Overlay Colors
  overlay: {
    light: 'rgba(250, 247, 246, 0.8)',     // Light overlay
    medium: 'rgba(45, 27, 40, 0.6)',       // Medium overlay
    dark: 'rgba(26, 15, 21, 0.8)',         // Dark overlay
  },
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font Families
  fontFamily: {
    primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    arabic: 'Cairo, "Noto Sans Arabic", sans-serif',
    mono: '"SF Mono", Monaco, Inconsolata, "Roboto Mono", "Source Code Pro", monospace',
  },

  // Font Weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Font Sizes (Mobile-first, responsive)
  fontSize: {
    xs: '12px',     // Captions, small labels
    sm: '14px',     // Secondary text, form labels
    base: '16px',   // Body text (mobile base)
    lg: '18px',     // Large body text
    xl: '20px',     // Small headings
    '2xl': '24px',  // Medium headings
    '3xl': '30px',  // Large headings
    '4xl': '36px',  // Extra large headings
    '5xl': '48px',  // Display text
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,    // Headings
    normal: 1.5,    // Body text
    relaxed: 1.625, // Large text blocks
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.02em',
    tight: '-0.01em',
    normal: '0em',
    wide: '0.01em',
    wider: '0.02em',
  },

  // Text Styles (Pre-configured combinations)
  textStyles: {
    // Display Text
    displayLarge: {
      fontSize: '48px',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    displayMedium: {
      fontSize: '36px',
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.01em',
    },
    displaySmall: {
      fontSize: '30px',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },

    // Headings
    headingLarge: {
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: 1.25,
    },
    headingMedium: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    headingSmall: {
      fontSize: '18px',
      fontWeight: 600,
      lineHeight: 1.4,
    },

    // Body Text
    bodyLarge: {
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    bodyMedium: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: 1.4,
    },

    // Labels
    labelLarge: {
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    labelMedium: {
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    labelSmall: {
      fontSize: '11px',
      fontWeight: 500,
      lineHeight: 1.3,
    },
  },
};

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  // Base unit: 4px
  0: '0px',
  1: '4px',    // xs
  2: '8px',    // sm
  3: '12px',   
  4: '16px',   // md (base)
  5: '20px',   
  6: '24px',   // lg
  8: '32px',   // xl
  10: '40px',  // 2xl
  12: '48px',  // 3xl
  16: '64px',  // 4xl
  20: '80px',  // 5xl
  24: '96px',  // 6xl
  32: '128px', // 7xl
  40: '160px', // 8xl
  48: '192px', // 9xl
  56: '224px', // 10xl
  64: '256px', // 11xl
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0px',
  sm: '4px',
  base: '8px',    // Default
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px', // Pills/circles
};

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  // Subtle, warm-tinted shadows
  sm: {
    shadowColor: 'rgba(45, 27, 40, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 1,
    elevation: 1, // Android
  },
  base: {
    shadowColor: 'rgba(45, 27, 40, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 1,
    elevation: 2,
  },
  md: {
    shadowColor: 'rgba(45, 27, 40, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 1,
    elevation: 4,
  },
  lg: {
    shadowColor: 'rgba(45, 27, 40, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 1,
    elevation: 8,
  },
  xl: {
    shadowColor: 'rgba(45, 27, 40, 0.2)',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    shadowOpacity: 1,
    elevation: 12,
  },
};

// ============================================================================
// COMPONENT TOKENS
// ============================================================================

export const components = {
  // Button Heights
  button: {
    sm: '32px',
    base: '40px',   // Desktop default
    lg: '44px',     // Mobile default (touch-friendly)
    xl: '48px',
  },

  // Input Heights
  input: {
    sm: '32px',
    base: '40px',
    lg: '44px',
  },

  // Border Widths
  borderWidth: {
    thin: '1px',
    base: '2px',
    thick: '3px',
  },

  // Z-Index Scale
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    popover: 50,
    tooltip: 60,
    toast: 70,
  },

  // Animation Durations
  animation: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Animation Curves
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  xs: '480px',   // Small mobile
  sm: '640px',   // Large mobile
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large desktop
};

// ============================================================================
// EXPORTS FOR PLATFORM-SPECIFIC USE
// ============================================================================

// For React Native (StyleSheet format)
export const reactNativeColors = {
  primary: colors.brand.primary,
  primaryDark: colors.interactive.primaryHover,
  primaryLight: colors.brand.surface,
  secondary: colors.brand.secondary,
  tertiary: colors.brand.tertiary,
  background: colors.brand.background,
  surface: colors.brand.surface,
  text: colors.text.primary,
  textSecondary: colors.text.secondary,
  white: colors.white,
  black: colors.black,
  success: colors.semantic.success,
  warning: colors.semantic.warning,
  error: colors.semantic.error,
  info: colors.semantic.info,
  transparent: colors.transparent,
};

// For Web/CSS (CSS custom properties format)
export const cssVariables = {
  // Brand colors
  '--color-primary': colors.brand.primary,
  '--color-secondary': colors.brand.secondary,
  '--color-tertiary': colors.brand.tertiary,
  '--color-surface': colors.brand.surface,
  '--color-background': colors.brand.background,
  
  // Text colors
  '--color-text-primary': colors.text.primary,
  '--color-text-secondary': colors.text.secondary,
  '--color-text-tertiary': colors.text.tertiary,
  '--color-text-inverse': colors.text.inverse,
  
  // Interactive states
  '--color-primary-hover': colors.interactive.primaryHover,
  '--color-primary-active': colors.interactive.primaryActive,
  '--color-focus': colors.interactive.focus,
  
  // Semantic colors
  '--color-success': colors.semantic.success,
  '--color-warning': colors.semantic.warning,
  '--color-error': colors.semantic.error,
  '--color-info': colors.semantic.info,
  
  // Typography
  '--font-family-primary': typography.fontFamily.primary,
  '--font-family-arabic': typography.fontFamily.arabic,
  
  // Spacing
  '--spacing-xs': spacing[1],
  '--spacing-sm': spacing[2],
  '--spacing-md': spacing[4],
  '--spacing-lg': spacing[6],
  '--spacing-xl': spacing[8],
  
  // Border radius
  '--border-radius-sm': borderRadius.sm,
  '--border-radius-base': borderRadius.base,
  '--border-radius-md': borderRadius.md,
  '--border-radius-lg': borderRadius.lg,
};

// Default export
export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  components,
  breakpoints,
  reactNativeColors,
  cssVariables,
};