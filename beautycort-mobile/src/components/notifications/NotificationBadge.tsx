import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../constants/colors';
import { useNotificationBadge } from '../../contexts/NotificationContext';

interface NotificationBadgeProps {
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export default function NotificationBadge({
  style,
  size = 'medium',
  animated = true,
}: NotificationBadgeProps) {
  const { count, visible, displayCount } = useNotificationBadge();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible && animated) {
      // Animate badge appearance
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, count]);

  if (!visible) return null;

  const sizeStyles = {
    small: {
      minWidth: 16,
      height: 16,
      fontSize: 10,
      paddingHorizontal: 4,
    },
    medium: {
      minWidth: 20,
      height: 20,
      fontSize: 12,
      paddingHorizontal: 6,
    },
    large: {
      minWidth: 24,
      height: 24,
      fontSize: 14,
      paddingHorizontal: 8,
    },
  };

  const currentSizeStyle = sizeStyles[size];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          minWidth: currentSizeStyle.minWidth,
          height: currentSizeStyle.height,
          paddingHorizontal: currentSizeStyle.paddingHorizontal,
          transform: animated ? [{ scale: scaleAnim }] : [],
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { fontSize: currentSizeStyle.fontSize },
        ]}
      >
        {displayCount}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.error,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
    borderWidth: 2,
    borderColor: colors.white,
  },
  text: {
    color: colors.white,
    fontWeight: 'bold',
  },
});

// Icon with badge wrapper component
interface IconWithBadgeProps {
  icon: React.ReactNode;
  badgeStyle?: ViewStyle;
  showBadge?: boolean;
  badgeSize?: 'small' | 'medium' | 'large';
}

export function IconWithBadge({
  icon,
  badgeStyle,
  showBadge = true,
  badgeSize = 'small',
}: IconWithBadgeProps) {
  return (
    <View>
      {icon}
      {showBadge && <NotificationBadge style={badgeStyle} size={badgeSize} />}
    </View>
  );
}