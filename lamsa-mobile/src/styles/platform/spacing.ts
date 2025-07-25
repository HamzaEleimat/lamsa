import { platformSelect } from '@utils/platform';

// Base spacing unit
const BASE_UNIT = 8;

// Spacing scale (following 8-point grid system)
export const spacing = {
  // Base values
  xxs: BASE_UNIT * 0.5,  // 4
  xs: BASE_UNIT * 1,      // 8
  sm: BASE_UNIT * 1.5,    // 12
  md: BASE_UNIT * 2,      // 16
  lg: BASE_UNIT * 3,      // 24
  xl: BASE_UNIT * 4,      // 32
  xxl: BASE_UNIT * 5,     // 40
  xxxl: BASE_UNIT * 6,    // 48
} as const;

// Platform-specific spacing adjustments
export const platformSpacing = {
  // Screen padding
  screenPadding: platformSelect({
    ios: spacing.md,
    android: spacing.md,
    default: spacing.lg,
  }),
  
  // Safe area additional padding
  safeAreaPadding: platformSelect({
    ios: spacing.xs,
    android: 0,
    default: 0,
  }),
  
  // List item padding
  listItemPadding: platformSelect({
    ios: {
      horizontal: spacing.md,
      vertical: spacing.sm,
    },
    android: {
      horizontal: spacing.md,
      vertical: spacing.md,
    },
    default: {
      horizontal: spacing.md,
      vertical: spacing.sm,
    },
  }),
  
  // Card padding
  cardPadding: platformSelect({
    ios: spacing.md,
    android: spacing.md,
    default: spacing.lg,
  }),
  
  // Button padding
  buttonPadding: {
    small: platformSelect({
      ios: {
        horizontal: spacing.sm,
        vertical: spacing.xs,
      },
      android: {
        horizontal: spacing.sm,
        vertical: spacing.xs,
      },
    }),
    medium: platformSelect({
      ios: {
        horizontal: spacing.md,
        vertical: spacing.sm,
      },
      android: {
        horizontal: spacing.lg,
        vertical: spacing.sm,
      },
    }),
    large: platformSelect({
      ios: {
        horizontal: spacing.lg,
        vertical: spacing.md,
      },
      android: {
        horizontal: spacing.xl,
        vertical: spacing.md,
      },
    }),
  },
  
  // Input field padding
  inputPadding: platformSelect({
    ios: {
      horizontal: spacing.sm,
      vertical: spacing.sm,
    },
    android: {
      horizontal: spacing.sm,
      vertical: spacing.md,
    },
  }),
  
  // Icon spacing
  iconSpacing: platformSelect({
    ios: spacing.xs,
    android: spacing.sm,
    default: spacing.xs,
  }),
};

// Layout spacing helpers
export const layout = {
  // Margins
  margin: (value: keyof typeof spacing) => ({
    margin: spacing[value],
  }),
  marginVertical: (value: keyof typeof spacing) => ({
    marginVertical: spacing[value],
  }),
  marginHorizontal: (value: keyof typeof spacing) => ({
    marginHorizontal: spacing[value],
  }),
  marginTop: (value: keyof typeof spacing) => ({
    marginTop: spacing[value],
  }),
  marginBottom: (value: keyof typeof spacing) => ({
    marginBottom: spacing[value],
  }),
  marginLeft: (value: keyof typeof spacing) => ({
    marginLeft: spacing[value],
  }),
  marginRight: (value: keyof typeof spacing) => ({
    marginRight: spacing[value],
  }),
  
  // Padding
  padding: (value: keyof typeof spacing) => ({
    padding: spacing[value],
  }),
  paddingVertical: (value: keyof typeof spacing) => ({
    paddingVertical: spacing[value],
  }),
  paddingHorizontal: (value: keyof typeof spacing) => ({
    paddingHorizontal: spacing[value],
  }),
  paddingTop: (value: keyof typeof spacing) => ({
    paddingTop: spacing[value],
  }),
  paddingBottom: (value: keyof typeof spacing) => ({
    paddingBottom: spacing[value],
  }),
  paddingLeft: (value: keyof typeof spacing) => ({
    paddingLeft: spacing[value],
  }),
  paddingRight: (value: keyof typeof spacing) => ({
    paddingRight: spacing[value],
  }),
  
  // Gap (for flexbox)
  gap: (value: keyof typeof spacing) => ({
    gap: spacing[value],
  }),
  rowGap: (value: keyof typeof spacing) => ({
    rowGap: spacing[value],
  }),
  columnGap: (value: keyof typeof spacing) => ({
    columnGap: spacing[value],
  }),
};

// Component-specific spacing
export const componentSpacing = {
  // Form spacing
  form: {
    fieldSpacing: spacing.md,
    sectionSpacing: spacing.xl,
    labelSpacing: spacing.xs,
  },
  
  // List spacing
  list: {
    itemSpacing: platformSelect({
      ios: 0, // iOS uses separators
      android: spacing.xs,
      default: spacing.xs,
    }),
    sectionSpacing: spacing.lg,
    headerPadding: spacing.md,
  },
  
  // Grid spacing
  grid: {
    gap: spacing.md,
    columnGap: spacing.md,
    rowGap: spacing.md,
  },
  
  // Modal spacing
  modal: {
    padding: spacing.lg,
    headerSpacing: spacing.md,
    contentSpacing: spacing.lg,
    footerSpacing: spacing.md,
  },
  
  // Tab spacing
  tab: {
    padding: platformSelect({
      ios: spacing.sm,
      android: spacing.md,
    }),
    iconTextGap: spacing.xs,
  },
};

// Responsive spacing based on screen size
export function getResponsiveSpacing(
  baseSpacing: keyof typeof spacing,
  screenWidth: number
): number {
  const scaleFactor = platformSelect({
    ios: screenWidth < 375 ? 0.9 : screenWidth > 414 ? 1.1 : 1,
    android: screenWidth < 360 ? 0.9 : screenWidth > 411 ? 1.1 : 1,
    default: 1,
  }) as number;
  
  return spacing[baseSpacing] * scaleFactor;
}

// Spacing utilities
export const spacingUtils = {
  // Create custom spacing
  custom: (multiplier: number) => BASE_UNIT * multiplier,
  
  // Get spacing value
  get: (value: keyof typeof spacing) => spacing[value],
  
  // Combine spacing values
  combine: (...values: (keyof typeof spacing)[]) => 
    values.reduce((acc, val) => acc + spacing[val], 0),
  
  // Negative spacing (for overlapping elements)
  negative: (value: keyof typeof spacing) => -spacing[value],
  
  // Percentage-based spacing
  percentage: (percent: number) => `${percent}%`,
  
  // Aspect ratio spacing (for maintaining proportions)
  aspectRatio: (ratio: number) => ({
    aspectRatio: ratio,
  }),
};