import React, { useRef, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  isIOS,
  platformSelect,
} from '@utils/platform';
import {
  getTypography,
  spacing,
  animations,
  animationUtils,
} from '@styles/platform';

interface PlatformLoadingIndicatorProps {
  size?: 'small' | 'large';
  color?: string;
  loading?: boolean;
  message?: string;
  overlay?: boolean;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export default function PlatformLoadingIndicator({
  size = 'large',
  color,
  loading = true,
  message,
  overlay = false,
  fullScreen = false,
  style,
}: PlatformLoadingIndicatorProps) {
  const theme = useTheme();
  const fadeAnim = useRef(animationUtils.createValue(0)).current;
  const rotateAnim = useRef(animationUtils.createValue(0)).current;
  const indicatorColor = color || theme.colors.primary;

  useEffect(() => {
    if (loading) {
      // Fade in
      animations.fade(fadeAnim, 1, { speed: 'fast' }).start();
      
      // Start rotation for custom indicator
      const rotationAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      rotationAnimation.start();

      return () => {
        rotationAnimation.stop();
      };
    } else {
      // Fade out
      animations.fade(fadeAnim, 0, { speed: 'fast' }).start();
    }
  }, [loading, fadeAnim, rotateAnim]);

  if (!loading && !overlay) return null;

  const getSize = () => {
    return size === 'small' ? 20 : 36;
  };

  const renderIndicator = () => {
    if (isIOS) {
      return (
        <ActivityIndicator
          size={size}
          color={indicatorColor}
          animating={loading}
        />
      );
    }

    // Android custom indicator for better styling
    const spin = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={{
          transform: [{ rotate: spin }],
        }}
      >
        <MaterialCommunityIcons
          name="loading"
          size={getSize()}
          color={indicatorColor}
        />
      </Animated.View>
    );
  };

  const content = (
    <View style={[styles.container, style]}>
      {renderIndicator()}
      {message && (
        <Text
          style={[
            styles.message,
            { 
              color: overlay 
                ? theme.colors.onSurface 
                : theme.colors.onSurfaceVariant,
              marginTop: size === 'small' ? spacing.xs : spacing.sm,
            },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <Animated.View
        style={[
          styles.fullScreenContainer,
          {
            backgroundColor: theme.colors.background + 'F0',
            opacity: fadeAnim,
          },
        ]}
        pointerEvents={loading ? 'auto' : 'none'}
      >
        {content}
      </Animated.View>
    );
  }

  if (overlay) {
    return (
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: theme.colors.scrim,
            opacity: fadeAnim,
          },
        ]}
        pointerEvents={loading ? 'auto' : 'none'}
      >
        <View
          style={[
            styles.overlayContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {content}
        </View>
      </Animated.View>
    );
  }

  return <Animated.View style={{ opacity: fadeAnim }}>{content}</Animated.View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  message: {
    ...getTypography('body2'),
    textAlign: 'center',
  },
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
  },
  overlayContent: {
    borderRadius: 12,
    padding: spacing.lg,
    ...platformSelect({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});