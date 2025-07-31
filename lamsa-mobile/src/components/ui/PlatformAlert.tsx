import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  isIOS,
  isAndroid,
  platformSelect,
  supportsHapticFeedback,
  BORDER_RADIUS,
} from '@utils/platform';
import {
  getTypography,
  spacing,
  shadowPresets,
  animations,
  animationUtils,
  layout,
} from '@styles/platform';

// Alert Dialog Component
interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface PlatformAlertProps {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  cancelable?: boolean;
}

export function showPlatformAlert({
  title,
  message,
  buttons = [{ text: 'OK' }],
  cancelable = true,
}: PlatformAlertProps) {
  if (isIOS) {
    // Use native iOS alert
    Alert.alert(title, message, buttons, { cancelable });
  } else {
    // For Android, we'll use Alert.alert as well, but could implement custom modal
    Alert.alert(title, message, buttons, { cancelable });
  }
}

// Toast/Snackbar Component
interface PlatformToastProps {
  visible: boolean;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: 'short' | 'long' | 'indefinite';
  position?: 'top' | 'bottom';
  type?: 'info' | 'success' | 'warning' | 'error';
  onDismiss?: () => void;
  style?: ViewStyle;
}

export function PlatformToast({
  visible,
  message,
  action,
  duration = 'short',
  position = 'bottom',
  type = 'info',
  onDismiss,
  style,
}: PlatformToastProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(animationUtils.createValue(100)).current;
  const opacity = useRef(animationUtils.createValue(0)).current;
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      
      // Show animation
      Animated.parallel([
        animations.slide(translateY, 0, { speed: 'fast' }),
        animations.fade(opacity, 1, { speed: 'fast' }),
      ]).start();

      // Auto dismiss
      if (duration !== 'indefinite') {
        const timeout = duration === 'short' ? 3000 : 5000;
        const timer = setTimeout(() => {
          dismiss();
        }, timeout);

        return () => clearTimeout(timer);
      }
    } else {
      dismiss();
    }
  }, [visible, duration]);

  const dismiss = () => {
    Animated.parallel([
      animations.slide(translateY, 100, { speed: 'fast' }),
      animations.fade(opacity, 0, { speed: 'fast' }),
    ]).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  };

  const handleActionPress = async () => {
    if (!action) return;

    if (supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    action.onPress();
    dismiss();
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.primaryContainer;
      case 'warning':
        return theme.colors.tertiaryContainer;
      case 'error':
        return theme.colors.errorContainer;
      default:
        return theme.colors.inverseSurface;
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.onPrimaryContainer;
      case 'warning':
        return theme.colors.onTertiaryContainer;
      case 'error':
        return theme.colors.onErrorContainer;
      default:
        return theme.colors.inverseOnSurface;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert';
      case 'error':
        return 'alert-circle';
      default:
        return 'information';
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        position === 'top' ? { top: insets.top + spacing.md } : { bottom: insets.bottom + spacing.md },
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateY }],
          opacity,
        },
        style,
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={dismiss}
        style={styles.toastContent}
      >
        <MaterialCommunityIcons
          name={getIcon()}
          size={20}
          color={getTextColor()}
          style={styles.toastIcon}
        />
        
        <Text
          style={[
            styles.toastMessage,
            { color: getTextColor() },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>
        
        {action && (
          <TouchableOpacity
            onPress={handleActionPress}
            style={styles.toastAction}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={[
                styles.toastActionText,
                { color: theme.colors.primary },
              ]}
            >
              {action.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// In-App Notification Component
interface PlatformNotificationProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  image?: string;
  onPress?: () => void;
  onDismiss?: () => void;
  duration?: number;
  style?: ViewStyle;
}

export function PlatformNotification({
  visible,
  title,
  message,
  icon,
  image,
  onPress,
  onDismiss,
  duration = 4000,
  style,
}: PlatformNotificationProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(animationUtils.createValue(-150)).current;
  const opacity = useRef(animationUtils.createValue(0)).current;
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      
      // Show animation with bounce
      Animated.parallel([
        animations.spring(translateY, 0, { type: 'bouncy' }),
        animations.fade(opacity, 1, { speed: 'fast' }),
      ]).start();

      // Haptic feedback
      if (supportsHapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Auto dismiss
      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      dismiss();
    }
  }, [visible, duration]);

  const dismiss = () => {
    Animated.parallel([
      animations.slide(translateY, -150, { speed: 'fast' }),
      animations.fade(opacity, 0, { speed: 'fast' }),
    ]).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  };

  const handlePress = async () => {
    if (onPress) {
      if (supportsHapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }
    dismiss();
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.notification,
        { top: insets.top + spacing.sm },
        {
          transform: [{ translateY }],
          opacity,
        },
        style,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handlePress}
        style={[
          styles.notificationContent,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        {(icon || image) && (
          <View style={styles.notificationLeft}>
            {icon ? (
              <View
                style={[
                  styles.notificationIconContainer,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
              >
                <MaterialCommunityIcons
                  name={icon}
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
            ) : image ? (
              <Image
                source={{ uri: image }}
                style={styles.notificationImage}
              />
            ) : null}
          </View>
        )}
        
        <View style={styles.notificationText}>
          <Text
            style={[
              styles.notificationTitle,
              { color: theme.colors.onSurface },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.notificationMessage,
              { color: theme.colors.onSurfaceVariant },
            ]}
            numberOfLines={2}
          >
            {message}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={dismiss}
          style={styles.notificationClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name="close"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Toast styles
  toast: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    borderRadius: BORDER_RADIUS.small,
    ...shadowPresets.small,
  },
  toastTop: {
    // top will be set dynamically in the component
  },
  toastBottom: {
    // bottom will be set dynamically in the component
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 48,
  },
  toastIcon: {
    marginRight: spacing.sm,
  },
  toastMessage: {
    ...getTypography('body2'),
    flex: 1,
  },
  toastAction: {
    marginLeft: spacing.md,
  },
  toastActionText: {
    ...getTypography('button'),
    fontSize: 12,
  },
  
  // Notification styles
  notification: {
    position: 'absolute',
    // top will be set dynamically in the component
    left: spacing.sm,
    right: spacing.sm,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: BORDER_RADIUS.medium,
    ...shadowPresets.medium,
  },
  notificationLeft: {
    marginRight: spacing.sm,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    ...getTypography('subtitle2'),
    marginBottom: 2,
  },
  notificationMessage: {
    ...getTypography('body2'),
  },
  notificationClose: {
    marginLeft: spacing.sm,
  },
});