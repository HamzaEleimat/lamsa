/**
 * Lamsa Mobile App Colors
 * Unified with the main design system - Sophisticated Plum/Mauve Theme
 * 
 * @see /shared/design-system.ts for the complete design system
 */

export const colors = {
  // Brand Colors - Sophisticated Plum/Mauve Theme (matches design system)
  primary: '#4A3643',      // Deep plum - main brand color
  primaryDark: '#352029',  // Active state (15% darker)
  primaryLight: '#F5E6E6', // Surface/cream blush
  lightPrimary: '#FAF7F6', // Background (warm white)
  
  // Secondary colors
  secondary: '#CC8899',    // Dusty pink - secondary brand color
  secondaryDark: '#A6677C', // Active state (15% darker)
  secondaryLight: '#E8C5C5', // Light secondary
  lightSecondary: '#FAF2F2', // Almost white blush
  
  // Tertiary/Accent
  tertiary: '#D4A5A5',     // Soft rose - accents, badges
  surface: '#F5E6E6',      // Card backgrounds, input fields
  background: '#FAF7F6',   // Main background
  
  // Text Colors - WCAG AA Compliant
  text: '#2D1B28',         // Primary text (4.5:1 contrast)
  textSecondary: '#6B5D65', // Secondary text (4.5:1 contrast)
  textTertiary: '#8A7B83', // Tertiary text (3:1 contrast, large text only)
  textLight: '#6B5D65',    // Legacy alias for textSecondary
  textInverse: '#FFFFFF',  // White text on dark backgrounds
  textDisabled: 'rgba(45, 27, 40, 0.4)', // 40% opacity
  
  // Interactive States
  primaryHover: '#3E2B36', // 10% darker than primary
  primaryActive: '#352029', // 15% darker than primary
  primaryDisabled: 'rgba(74, 54, 67, 0.4)', // 40% opacity
  
  secondaryHover: '#B8758A', // 10% darker than secondary
  secondaryActive: '#A6677C', // 15% darker than secondary
  secondaryDisabled: 'rgba(204, 136, 153, 0.4)', // 40% opacity
  
  // Focus and Ring Colors
  focus: '#4A3643',        // Focus color (same as primary)
  focusRing: 'rgba(74, 54, 67, 0.2)', // Focus ring with transparency
  
  // Semantic Colors - Material Design compliant
  success: '#4CAF50',      // Green - confirmations, success states
  successLight: '#E8F5E8', // Light green background
  warning: '#FF9800',      // Orange - warnings, pending states
  warningLight: '#FFF3E0', // Light orange background
  error: '#F44336',        // Red - errors, destructive actions
  errorLight: '#FFEBEE',   // Light red background
  info: '#2196F3',         // Blue - informational messages
  infoLight: '#E3F2FD',    // Light blue background
  
  // Legacy semantic colors (for backward compatibility)
  lightSuccess: '#E8F5E8', // Alias for successLight
  lightWarning: '#FFF3E0', // Alias for warningLight
  lightError: '#FFEBEE',   // Alias for errorLight
  
  // Neutral Grays - Warm-tinted (matches design system)
  gray: '#A69BA3',         // Medium gray (gray.400)
  lightGray: '#FAF7F6',    // Warm light gray (same as background)
  border: '#E8E2E0',       // Border color (gray.200)
  
  // Gray scale for precise control
  gray50: '#FAF8F7',
  gray100: '#F5F2F1',
  gray200: '#E8E2E0',      // border color
  gray300: '#D1C7C4',
  gray400: '#A69BA3',      // gray color
  gray500: '#7A6F76',
  gray600: '#6B5D65',      // textSecondary
  gray700: '#4A3F45',
  gray800: '#2D1B28',      // text color
  gray900: '#1A0F15',
  
  // Utility Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Overlay Colors
  overlay: 'rgba(45, 27, 40, 0.6)',     // Medium overlay
  overlayLight: 'rgba(250, 247, 246, 0.8)', // Light overlay
  overlayDark: 'rgba(26, 15, 21, 0.8)',  // Dark overlay
  
  // Additional colors for service management (updated to fit theme)
  gold: '#D4AF37',         // Antique gold
  silver: '#B8B8B8',       // Soft silver
  bronze: '#B87333',       // Soft bronze
};