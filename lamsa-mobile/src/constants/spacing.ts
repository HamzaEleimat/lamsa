/**
 * Consistent spacing scale for the Lamsa app
 * Based on 4px/8px grid system for better visual harmony
 */
export const spacing = {
  /** 4px - Minimal spacing for tight layouts */
  xs: 4,
  
  /** 8px - Small spacing for related elements */
  sm: 8,
  
  /** 16px - Medium spacing, default for most use cases */
  md: 16,
  
  /** 24px - Large spacing for section separation */
  lg: 24,
  
  /** 32px - Extra large spacing for major sections */
  xl: 32,
  
  /** 48px - Maximum spacing for special cases */
  xxl: 48,
} as const;

/**
 * Common margin/padding combinations
 */
export const layout = {
  /** Standard card margins */
  cardMargin: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  
  /** Standard card padding */
  cardPadding: {
    padding: spacing.md,
  },
  
  /** Standard screen padding */
  screenPadding: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  
  /** Standard section margin */
  sectionMargin: {
    marginBottom: spacing.lg,
  },
} as const;

/**
 * Consistent icon sizes
 */
export const iconSizes = {
  /** 16px - Extra small icons */
  xs: 16,
  
  /** 20px - Small icons */
  sm: 20,
  
  /** 24px - Medium icons, default size */
  md: 24,
  
  /** 28px - Large icons */
  lg: 28,
  
  /** 32px - Extra large icons */
  xl: 32,
  
  /** 40px - Maximum icon size */
  xxl: 40,
} as const;