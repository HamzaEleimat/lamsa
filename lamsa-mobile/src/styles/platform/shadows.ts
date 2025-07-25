import { ViewStyle, Platform } from 'react-native';
import { platformSelect, isIOS } from '@utils/platform';

// Shadow intensity levels
export type ShadowLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12 | 16 | 24;

// iOS shadow properties
interface IOSShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
}

// Android shadow properties
interface AndroidShadow {
  elevation: number;
}

// Web shadow properties
interface WebShadow {
  boxShadow: string;
}

// Platform-specific shadow creator
export function createShadow(level: ShadowLevel): ViewStyle {
  if (level === 0) {
    return platformSelect({
      ios: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: 'none',
      },
    }) as ViewStyle;
  }

  // iOS shadows (more subtle and diffused)
  const iosShadows: Record<ShadowLevel, IOSShadow> = {
    0: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
    3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    4: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 5,
    },
    5: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.14,
      shadowRadius: 6,
    },
    6: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 8,
    },
    8: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
    },
    12: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
    },
    16: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.22,
      shadowRadius: 18,
    },
    24: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
    },
  };

  // Android elevations (Material Design spec)
  const androidShadows: Record<ShadowLevel, AndroidShadow> = {
    0: { elevation: 0 },
    1: { elevation: 1 },
    2: { elevation: 2 },
    3: { elevation: 3 },
    4: { elevation: 4 },
    5: { elevation: 5 },
    6: { elevation: 6 },
    8: { elevation: 8 },
    12: { elevation: 12 },
    16: { elevation: 16 },
    24: { elevation: 24 },
  };

  // Web box shadows (CSS)
  const webShadows: Record<ShadowLevel, WebShadow> = {
    0: { boxShadow: 'none' },
    1: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)' },
    2: { boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)' },
    3: { boxShadow: '0 4px 8px rgba(0, 0, 0, 0.16), 0 4px 8px rgba(0, 0, 0, 0.23)' },
    4: { boxShadow: '0 6px 12px rgba(0, 0, 0, 0.16), 0 6px 12px rgba(0, 0, 0, 0.23)' },
    5: { boxShadow: '0 8px 16px rgba(0, 0, 0, 0.16), 0 8px 16px rgba(0, 0, 0, 0.23)' },
    6: { boxShadow: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)' },
    8: { boxShadow: '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)' },
    12: { boxShadow: '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)' },
    16: { boxShadow: '0 24px 48px rgba(0, 0, 0, 0.30), 0 20px 16px rgba(0, 0, 0, 0.22)' },
    24: { boxShadow: '0 32px 64px rgba(0, 0, 0, 0.35), 0 28px 24px rgba(0, 0, 0, 0.22)' },
  };

  return platformSelect({
    ios: iosShadows[level],
    android: androidShadows[level],
    web: webShadows[level],
  }) as ViewStyle;
}

// Colored shadows (primarily for iOS)
export function createColoredShadow(color: string, level: ShadowLevel = 4): ViewStyle {
  const baseShadow = createShadow(level);
  
  if (isIOS) {
    return {
      ...baseShadow,
      shadowColor: color,
    };
  }
  
  // Android doesn't support colored shadows natively
  // Web can use colored box shadows
  return baseShadow;
}

// Dynamic shadow based on theme
export function createThemedShadow(
  level: ShadowLevel,
  isDarkMode: boolean
): ViewStyle {
  if (isDarkMode) {
    // Darker shadows for dark mode
    const shadow = createShadow(level);
    
    if (isIOS && shadow.shadowOpacity) {
      return {
        ...shadow,
        shadowOpacity: shadow.shadowOpacity * 1.5,
      };
    }
    
    return shadow;
  }
  
  return createShadow(level);
}

// Inset shadows (for pressed states, etc.)
export function createInsetShadow(depth: 'shallow' | 'medium' | 'deep' = 'medium'): ViewStyle {
  const insetShadows = {
    shallow: {
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
      },
      android: {
        // Android doesn't support inset shadows natively
        // Use border or background color change instead
      },
      web: {
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
      },
    },
    medium: {
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {},
      web: {
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15)',
      },
    },
    deep: {
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
      android: {},
      web: {
        boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.2)',
      },
    },
  };

  return platformSelect({
    ios: insetShadows[depth].ios,
    android: insetShadows[depth].android,
    web: insetShadows[depth].web,
  }) as ViewStyle;
}

// Common shadow presets
export const shadowPresets = {
  card: createShadow(2),
  cardHover: createShadow(4),
  modal: createShadow(8),
  navigation: createShadow(4),
  button: createShadow(2),
  buttonPressed: createInsetShadow('shallow'),
  fab: createShadow(6),
  fabPressed: createShadow(8),
  menu: createShadow(8),
  dialog: createShadow(24),
  none: createShadow(0),
};

// Shadow utilities
export const shadowUtils = {
  // Remove shadow
  none: (): ViewStyle => createShadow(0),
  
  // Combine multiple shadows (for complex effects)
  combine: (...shadows: ViewStyle[]): ViewStyle => {
    return Object.assign({}, ...shadows);
  },
  
  // Animate shadow (returns style for different states)
  animatable: (from: ShadowLevel, to: ShadowLevel) => ({
    from: createShadow(from),
    to: createShadow(to),
  }),
  
  // Get shadow by theme component
  forComponent: (component: 'card' | 'button' | 'modal' | 'fab' | 'menu') => {
    const componentShadows = {
      card: 2,
      button: 1,
      modal: 8,
      fab: 6,
      menu: 8,
    };
    return createShadow(componentShadows[component] as ShadowLevel);
  },
};