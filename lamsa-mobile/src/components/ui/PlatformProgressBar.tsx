import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import {
  platformSelect,
  BORDER_RADIUS,
} from '@utils/platform';
import {
  getTypography,
  spacing,
  animations,
  animationUtils,
} from '@styles/platform';

interface PlatformProgressBarProps {
  progress: number; // 0 to 1
  height?: 'thin' | 'medium' | 'thick';
  showLabel?: boolean;
  label?: string;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
  indeterminate?: boolean;
  style?: ViewStyle;
}

export default function PlatformProgressBar({
  progress,
  height = 'medium',
  showLabel = false,
  label,
  color,
  backgroundColor,
  animated = true,
  indeterminate = false,
  style,
}: PlatformProgressBarProps) {
  const theme = useTheme();
  const progressAnim = useRef(animationUtils.createValue(0)).current;
  const indeterminateAnim = useRef(animationUtils.createValue(0)).current;

  useEffect(() => {
    if (indeterminate) {
      // Create indeterminate animation
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(indeterminateAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(indeterminateAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();

      return () => {
        animation.stop();
      };
    } else if (animated) {
      // Animate to progress value
      animations.spring(progressAnim, progress, { speed: 'medium' }).start();
    } else {
      // Set immediately
      progressAnim.setValue(progress);
    }
  }, [progress, animated, indeterminate, progressAnim, indeterminateAnim]);

  const getHeight = () => {
    const heights = {
      thin: 2,
      medium: 4,
      thick: 8,
    };
    return heights[height];
  };

  const barHeight = getHeight();
  const progressColor = color || theme.colors.primary;
  const trackColor = backgroundColor || theme.colors.surfaceVariant;

  const renderIndeterminateBar = () => {
    const translateX = indeterminateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 100],
    });

    return (
      <View
        style={[
          styles.progressTrack,
          {
            height: barHeight,
            backgroundColor: trackColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.indeterminateBar,
            {
              height: barHeight,
              backgroundColor: progressColor,
              transform: [{ translateX }],
            },
          ]}
        />
      </View>
    );
  };

  const renderDeterminateBar = () => {
    const width = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View
        style={[
          styles.progressTrack,
          {
            height: barHeight,
            backgroundColor: trackColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressBar,
            {
              width,
              height: barHeight,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>
    );
  };

  const getProgressText = () => {
    if (label) return label;
    if (indeterminate) return 'Loading...';
    return `${Math.round(progress * 100)}%`;
  };

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {getProgressText()}
          </Text>
        </View>
      )}
      
      {indeterminate ? renderIndeterminateBar() : renderDeterminateBar()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    marginBottom: spacing.xs,
  },
  label: {
    ...getTypography('caption'),
  },
  progressTrack: {
    width: '100%',
    borderRadius: BORDER_RADIUS.small,
    overflow: 'hidden',
    ...platformSelect({
      ios: {
        backgroundColor: 'rgba(0,0,0,0.1)',
      },
      android: {
        backgroundColor: 'rgba(0,0,0,0.12)',
      },
    }),
  },
  progressBar: {
    borderRadius: BORDER_RADIUS.small,
  },
  indeterminateBar: {
    width: '30%',
    borderRadius: BORDER_RADIUS.small,
  },
});