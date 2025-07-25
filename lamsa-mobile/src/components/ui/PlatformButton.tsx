import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  TouchableNativeFeedback,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  isIOS,
  isAndroid,
  platformSelect,
  supportsHapticFeedback,
  BORDER_RADIUS,
} from '@utils/platform';
import {
  getTypography,
  createShadow,
  shadowPresets,
  spacing,
  animations,
  animationUtils,
} from '@styles/platform';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outlined' | 'text';
type ButtonSize = 'small' | 'medium' | 'large';

interface PlatformButtonProps {
  onPress: () => void;
  onLongPress?: () => void;
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  hapticFeedback?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
  children?: React.ReactNode;
}

export default function PlatformButton({
  onPress,
  onLongPress,
  title,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  hapticFeedback = true,
  style,
  textStyle,
  testID,
  accessibilityLabel,
  children,
}: PlatformButtonProps) {
  const theme = useTheme();
  const scaleAnim = useRef(animationUtils.createValue(1)).current;
  const opacityAnim = useRef(animationUtils.createValue(1)).current;

  // Handle press animations
  const handlePressIn = () => {
    if (disabled || loading) return;
    
    Animated.parallel([
      animations.scale(scaleAnim, 0.96, { type: 'gentle' }),
      animations.fade(opacityAnim, 0.8, { speed: 'fast' }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    
    Animated.parallel([
      animations.scale(scaleAnim, 1, { type: 'bouncy' }),
      animations.fade(opacityAnim, 1, { speed: 'fast' }),
    ]).start();
  };

  const handlePress = async () => {
    if (disabled || loading) return;
    
    if (hapticFeedback && supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    onPress();
  };

  // Get button styles based on variant and size
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: platformSelect({
        ios: BORDER_RADIUS.medium,
        android: size === 'small' ? BORDER_RADIUS.small : BORDER_RADIUS.medium,
      }),
    };

    // Size styles
    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      small: {
        height: 32,
        paddingHorizontal: spacing.sm,
        minWidth: 64,
      },
      medium: {
        height: 44,
        paddingHorizontal: spacing.md,
        minWidth: 100,
      },
      large: {
        height: 56,
        paddingHorizontal: spacing.lg,
        minWidth: 120,
      },
    };

    // Variant styles
    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: disabled 
          ? theme.colors.surfaceDisabled 
          : theme.colors.primary,
        ...shadowPresets.button,
      },
      secondary: {
        backgroundColor: disabled
          ? theme.colors.surfaceDisabled
          : theme.colors.secondary,
        ...shadowPresets.button,
      },
      tertiary: {
        backgroundColor: disabled
          ? theme.colors.surfaceDisabled
          : theme.colors.tertiary,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled
          ? theme.colors.surfaceDisabled
          : theme.colors.primary,
      },
      text: {
        backgroundColor: 'transparent',
        minWidth: 'auto',
        paddingHorizontal: spacing.xs,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: 0.5 }),
    };
  };

  // Get text styles based on variant and size
  const getTextStyle = (): TextStyle => {
    const sizeStyles: Record<ButtonSize, TextStyle> = {
      small: getTypography('caption'),
      medium: getTypography('button'),
      large: {
        ...getTypography('button'),
        fontSize: 16,
      },
    };

    const variantColors = {
      primary: theme.colors.onPrimary,
      secondary: theme.colors.onSecondary,
      tertiary: theme.colors.onTertiary,
      outlined: disabled ? theme.colors.onSurfaceDisabled : theme.colors.primary,
      text: disabled ? theme.colors.onSurfaceDisabled : theme.colors.primary,
    };

    return {
      ...sizeStyles[size],
      color: variantColors[variant],
      ...(isAndroid && variant !== 'text' && { textTransform: 'uppercase' }),
    };
  };

  const buttonStyle = [
    getButtonStyle(),
    style,
  ];

  const textStyles = [
    getTextStyle(),
    textStyle,
  ];

  const iconSize = platformSelect({
    small: 16,
    medium: 20,
    large: 24,
  }[size]);

  const iconColor = textStyles[0].color;

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          size={size === 'small' ? 'small' : 'small'}
          color={iconColor}
          style={styles.loader}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <MaterialCommunityIcons
              name={icon}
              size={iconSize}
              color={iconColor}
              style={[styles.icon, styles.iconLeft]}
            />
          )}
          
          {children || (title && (
            <Text style={textStyles} numberOfLines={1}>
              {title}
            </Text>
          ))}
          
          {icon && iconPosition === 'right' && (
            <MaterialCommunityIcons
              name={icon}
              size={iconSize}
              color={iconColor}
              style={[styles.icon, styles.iconRight]}
            />
          )}
        </>
      )}
    </>
  );

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  // iOS uses TouchableOpacity
  if (isIOS) {
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          style={buttonStyle}
          activeOpacity={0.8}
          testID={testID}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || loading }}
        >
          {renderContent()}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Android uses TouchableNativeFeedback for ripple effect
  if (isAndroid && variant !== 'text') {
    return (
      <Animated.View style={[animatedStyle, fullWidth && { width: '100%' }]}>
        <TouchableNativeFeedback
          onPress={handlePress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          background={TouchableNativeFeedback.Ripple(
            theme.colors.onPrimary + '30',
            false
          )}
          testID={testID}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || loading }}
        >
          <View style={buttonStyle}>
            {renderContent()}
          </View>
        </TouchableNativeFeedback>
      </Animated.View>
    );
  }

  // Fallback for web or text variant on Android
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={buttonStyle}
        activeOpacity={0.7}
        testID={testID}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  icon: {
    marginHorizontal: spacing.xxs,
  },
  iconLeft: {
    marginRight: spacing.xs,
    marginLeft: 0,
  },
  iconRight: {
    marginLeft: spacing.xs,
    marginRight: 0,
  },
  loader: {
    marginHorizontal: spacing.xs,
  },
});