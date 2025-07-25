import { Animated, Easing } from 'react-native';
import { platformSelect, ANIMATION_DURATION } from '@utils/platform';

// Animation timing configurations
export const timingConfigs = {
  // iOS prefers spring animations
  ios: {
    fast: {
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    },
    medium: {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    },
    slow: {
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    },
  },
  // Android follows Material Design motion
  android: {
    fast: {
      duration: 150,
      easing: Easing.bezier(0.4, 0, 0.2, 1), // Material standard curve
    },
    medium: {
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    },
    slow: {
      duration: 350,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    },
  },
};

// Spring configurations
export const springConfigs = {
  // iOS spring (bouncy)
  ios: {
    gentle: {
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    },
    bouncy: {
      tension: 50,
      friction: 5,
      useNativeDriver: true,
    },
    stiff: {
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    },
  },
  // Android spring (less bouncy)
  android: {
    gentle: {
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    },
    bouncy: {
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    },
    stiff: {
      tension: 120,
      friction: 12,
      useNativeDriver: true,
    },
  },
};

// Get platform-specific timing config
export function getTimingConfig(speed: 'fast' | 'medium' | 'slow' = 'medium') {
  return platformSelect({
    ios: timingConfigs.ios[speed],
    android: timingConfigs.android[speed],
    default: timingConfigs.ios[speed],
  });
}

// Get platform-specific spring config
export function getSpringConfig(type: 'gentle' | 'bouncy' | 'stiff' = 'gentle') {
  return platformSelect({
    ios: springConfigs.ios[type],
    android: springConfigs.android[type],
    default: springConfigs.ios[type],
  });
}

// Common animation creators
export const animations = {
  // Fade animation
  fade: (
    animatedValue: Animated.Value,
    toValue: number,
    options?: { speed?: 'fast' | 'medium' | 'slow'; delay?: number }
  ) => {
    const config = getTimingConfig(options?.speed || 'medium');
    return Animated.timing(animatedValue, {
      toValue,
      ...config,
      delay: options?.delay || 0,
      useNativeDriver: true,
    });
  },

  // Scale animation
  scale: (
    animatedValue: Animated.Value,
    toValue: number,
    options?: { type?: 'gentle' | 'bouncy' | 'stiff'; delay?: number }
  ) => {
    const config = getSpringConfig(options?.type || 'gentle');
    return Animated.spring(animatedValue, {
      toValue,
      ...config,
      delay: options?.delay || 0,
    });
  },

  // Slide animation
  slide: (
    animatedValue: Animated.Value,
    toValue: number,
    options?: { 
      speed?: 'fast' | 'medium' | 'slow'; 
      direction?: 'horizontal' | 'vertical';
      delay?: number;
    }
  ) => {
    const config = getTimingConfig(options?.speed || 'medium');
    return Animated.timing(animatedValue, {
      toValue,
      ...config,
      delay: options?.delay || 0,
      useNativeDriver: true,
    });
  },

  // Rotate animation
  rotate: (
    animatedValue: Animated.Value,
    toValue: number,
    options?: { speed?: 'fast' | 'medium' | 'slow'; delay?: number }
  ) => {
    const config = getTimingConfig(options?.speed || 'medium');
    return Animated.timing(animatedValue, {
      toValue,
      ...config,
      delay: options?.delay || 0,
      useNativeDriver: true,
    });
  },

  // Parallel animations
  parallel: (animations: Animated.CompositeAnimation[], options?: { delay?: number }) => {
    return Animated.parallel(animations, {
      stopTogether: true,
      ...(options?.delay && { delay: options.delay }),
    });
  },

  // Sequence animations
  sequence: (animations: Animated.CompositeAnimation[], options?: { delay?: number }) => {
    if (options?.delay) {
      return Animated.sequence([
        Animated.delay(options.delay),
        ...animations,
      ]);
    }
    return Animated.sequence(animations);
  },

  // Stagger animations
  stagger: (delay: number, animations: Animated.CompositeAnimation[]) => {
    return Animated.stagger(delay, animations);
  },
};

// Platform-specific enter/exit animations
export const transitions = {
  // Enter from bottom (modal-like)
  enterFromBottom: (animatedValue: Animated.Value, screenHeight: number) => {
    animatedValue.setValue(screenHeight);
    return animations.slide(animatedValue, 0, { speed: 'medium' });
  },

  // Exit to bottom
  exitToBottom: (animatedValue: Animated.Value, screenHeight: number) => {
    return animations.slide(animatedValue, screenHeight, { speed: 'fast' });
  },

  // Enter from right (navigation-like)
  enterFromRight: (animatedValue: Animated.Value, screenWidth: number) => {
    animatedValue.setValue(screenWidth);
    return animations.slide(animatedValue, 0, { speed: 'medium' });
  },

  // Exit to right
  exitToRight: (animatedValue: Animated.Value, screenWidth: number) => {
    return animations.slide(animatedValue, screenWidth, { speed: 'fast' });
  },

  // Fade in
  fadeIn: (animatedValue: Animated.Value) => {
    animatedValue.setValue(0);
    return animations.fade(animatedValue, 1, { speed: 'medium' });
  },

  // Fade out
  fadeOut: (animatedValue: Animated.Value) => {
    return animations.fade(animatedValue, 0, { speed: 'fast' });
  },

  // Scale in (pop effect)
  scaleIn: (animatedValue: Animated.Value) => {
    animatedValue.setValue(0.8);
    return animations.scale(animatedValue, 1, { type: 'bouncy' });
  },

  // Scale out
  scaleOut: (animatedValue: Animated.Value) => {
    return animations.scale(animatedValue, 0.8, { type: 'gentle' });
  },
};

// Gesture-based animation helpers
export const gestureAnimations = {
  // Rubber band effect (iOS-like)
  rubberBand: (value: number, min: number, max: number): number => {
    if (value < min) {
      return min - (min - value) * 0.5;
    }
    if (value > max) {
      return max + (value - max) * 0.5;
    }
    return value;
  },

  // Snap to closest point
  snapToClosest: (
    value: number,
    snapPoints: number[],
    velocity: number = 0
  ): number => {
    const velocityBoost = velocity * 0.2;
    const targetValue = value + velocityBoost;
    
    return snapPoints.reduce((prev, curr) =>
      Math.abs(curr - targetValue) < Math.abs(prev - targetValue) ? curr : prev
    );
  },

  // Decay animation config
  getDecayConfig: (velocity: number) => ({
    velocity,
    deceleration: platformSelect({
      ios: 0.997,
      android: 0.985,
      default: 0.997,
    }),
    useNativeDriver: true,
  }),
};

// Animation utilities
export const animationUtils = {
  // Create animated value
  createValue: (initialValue: number = 0) => new Animated.Value(initialValue),

  // Create animated value XY
  createValueXY: (x: number = 0, y: number = 0) => new Animated.ValueXY({ x, y }),

  // Interpolate with common configs
  interpolate: (
    animatedValue: Animated.Value | Animated.AnimatedInterpolation,
    outputRange: number[] | string[],
    options?: {
      inputRange?: number[];
      extrapolate?: 'extend' | 'clamp' | 'identity';
      extrapolateLeft?: 'extend' | 'clamp' | 'identity';
      extrapolateRight?: 'extend' | 'clamp' | 'identity';
    }
  ) => {
    return animatedValue.interpolate({
      inputRange: options?.inputRange || [0, 1],
      outputRange,
      extrapolate: options?.extrapolate || 'clamp',
      extrapolateLeft: options?.extrapolateLeft,
      extrapolateRight: options?.extrapolateRight,
    });
  },

  // Loop animation
  loop: (animation: Animated.CompositeAnimation, iterations: number = -1) => {
    return Animated.loop(animation, {
      iterations,
      resetBeforeIteration: true,
    });
  },
};