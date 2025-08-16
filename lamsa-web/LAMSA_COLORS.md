# Lamsa Brand Colors - Tailwind CSS Reference

## Overview
Lamsa uses a sophisticated plum/mauve color palette that conveys elegance and trust for the beauty industry.

## Brand Colors

### Primary Brand Colors
```css
/* Deep Plum - Main brand color */
bg-lamsa-primary      /* #4A3643 */
text-lamsa-primary    /* #4A3643 */
border-lamsa-primary  /* #4A3643 */

/* Dusty Pink - Secondary brand color */
bg-lamsa-secondary    /* #CC8899 */
text-lamsa-secondary  /* #CC8899 */

/* Soft Rose - Tertiary/accent color */
bg-lamsa-tertiary     /* #D4A5A5 */
text-lamsa-tertiary   /* #D4A5A5 */

/* Cream Blush - Surface/card backgrounds */
bg-lamsa-surface      /* #F5E6E6 */

/* Warm White - Main background */
bg-lamsa-background   /* #FAF7F6 */
```

### Semantic Colors (CSS Variables)
```css
/* These work with dark mode automatically */
bg-primary           /* Primary brand color */
text-primary         /* Primary text on backgrounds */
bg-primary-foreground /* Text color for primary backgrounds */

bg-secondary         /* Secondary brand color */
text-secondary       /* Secondary text */

bg-muted            /* Muted backgrounds */
text-muted-foreground /* Muted text */

bg-accent           /* Accent backgrounds */
text-accent-foreground /* Accent text */
```

### Text Colors
```css
text-text-primary    /* #2D1B28 - Main text (4.5:1 contrast) */
text-text-secondary  /* #6B5D65 - Secondary text (4.5:1 contrast) */
text-text-tertiary   /* #8A7B83 - Tertiary text (3:1 contrast) */
text-text-inverse    /* #FFFFFF - White text on dark backgrounds */
```

### Gray Scale (Warm-tinted)
```css
bg-gray-50          /* #FAF8F7 - Lightest */
bg-gray-100         /* #F5F2F1 */
bg-gray-200         /* #E8E2E0 - Borders */
bg-gray-300         /* #D1C7C4 */
bg-gray-400         /* #A69BA3 - Medium gray */
bg-gray-500         /* #7A6F76 */
bg-gray-600         /* #6B5D65 - Secondary text */
bg-gray-700         /* #4A3F45 */
bg-gray-800         /* #2D1B28 - Dark text */
bg-gray-900         /* #1A0F15 - Darkest */
```

### Status Colors
```css
/* Success */
bg-success           /* #4CAF50 */
bg-success-light     /* #E8F5E8 */

/* Warning */
bg-warning           /* #FF9800 */
bg-warning-light     /* #FFF3E0 */

/* Error */
bg-destructive       /* #F44336 */
bg-error-light       /* #FFEBEE */

/* Info */
bg-info              /* #2196F3 */
bg-info-light        /* #E3F2FD */
```

## Shadows
```css
shadow-lamsa-sm      /* Subtle shadow */
shadow-lamsa         /* Standard shadow */
shadow-lamsa-md      /* Medium shadow */
shadow-lamsa-lg      /* Large shadow */
shadow-lamsa-xl      /* Extra large shadow */
```

## Usage Examples

### Buttons
```jsx
{/* Primary button */}
<button className="bg-lamsa-primary text-white hover:bg-lamsa-primary/90 px-4 py-2 rounded-lg">
  Primary Action
</button>

{/* Secondary button */}
<button className="bg-lamsa-secondary text-white hover:bg-lamsa-secondary/90 px-4 py-2 rounded-lg">
  Secondary Action
</button>

{/* Outline button */}
<button className="border border-lamsa-primary text-lamsa-primary hover:bg-lamsa-primary/10 px-4 py-2 rounded-lg">
  Outline Button
</button>
```

### Cards
```jsx
{/* Surface card */}
<div className="bg-lamsa-surface rounded-lg p-6 shadow-lamsa">
  <h3 className="text-text-primary font-semibold">Card Title</h3>
  <p className="text-text-secondary mt-2">Card content</p>
</div>

{/* White card */}
<div className="bg-white rounded-lg p-6 shadow-lamsa border border-gray-200">
  <h3 className="text-text-primary font-semibold">Card Title</h3>
</div>
```

### Text Hierarchy
```jsx
<div>
  <h1 className="text-3xl font-bold text-lamsa-primary">Main Heading</h1>
  <h2 className="text-xl font-semibold text-text-primary">Section Heading</h2>
  <p className="text-text-secondary">Body text with good contrast</p>
  <small className="text-text-tertiary">Helper text or captions</small>
</div>
```

### Status Indicators
```jsx
{/* Success badge */}
<span className="bg-success/10 text-success px-2 py-1 rounded-full text-sm">
  Confirmed
</span>

{/* Warning badge */}
<span className="bg-warning/10 text-warning px-2 py-1 rounded-full text-sm">
  Pending
</span>

{/* Error badge */}
<span className="bg-destructive/10 text-destructive px-2 py-1 rounded-full text-sm">
  Cancelled
</span>
```

## Accessibility Notes

- All text colors meet WCAG AA contrast requirements (4.5:1 minimum)
- `text-text-tertiary` should only be used for large text (3:1 contrast)
- Always test with both Arabic (RTL) and English (LTR) layouts
- Dark mode variants are automatically handled via CSS variables

## Pre-built Component Classes

### Buttons
```css
.btn-lamsa-primary      /* Primary button with hover states */
.btn-lamsa-secondary    /* Secondary button with hover states */
.btn-lamsa-outline      /* Outline button */
.btn-lamsa-ghost        /* Ghost button */

/* Button sizes */
.btn-sm                 /* Small button */
.btn-lg                 /* Large button */
.btn-xl                 /* Extra large button */
```

### Cards
```css
.card-lamsa-surface     /* Surface colored card */
.card-lamsa-white       /* White card */
.card-lamsa-primary     /* Primary colored card */
.card-hover             /* Hover effect card */

/* Status cards */
.card-success           /* Success state card */
.card-warning           /* Warning state card */
.card-error             /* Error state card */
.card-info              /* Info state card */
```

### Badges
```css
.badge                  /* Base badge */
.badge-success          /* Success badge */
.badge-warning          /* Warning badge */
.badge-error            /* Error badge */
.badge-info             /* Info badge */
.badge-lamsa-primary    /* Primary brand badge */
.badge-lamsa-secondary  /* Secondary brand badge */
.badge-gray             /* Gray badge */
```

### Alerts
```css
.alert-success          /* Success alert */
.alert-warning          /* Warning alert */
.alert-error            /* Error alert */
.alert-info             /* Info alert */
.alert-lamsa            /* Lamsa branded alert */
```

## Testing

Visit `/colors` to see all colors and components in action.

## Best Practices

1. **Use semantic colors** (`primary`, `secondary`) over direct colors when possible
2. **Test in both light and dark modes** 
3. **Use opacity modifiers** for hover states: `bg-lamsa-primary/90`
4. **Maintain visual hierarchy** with proper text color combinations
5. **Use surface colors** for card backgrounds: `bg-lamsa-surface`
6. **Apply consistent shadows** with `shadow-lamsa-*` classes
7. **Use pre-built component classes** for consistent styling