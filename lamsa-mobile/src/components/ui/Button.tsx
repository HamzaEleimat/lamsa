import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { spacing, shadows } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  fullWidth = false,
  disabled = false,
  children,
  style,
  ...props
}) => {
  const theme = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      ...shadows.sm,
    };

    // Size styles
    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      small: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 36,
      },
      medium: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        minHeight: 48,
      },
      large: {
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.lg,
        minHeight: 56,
      },
    };

    // Variant styles
    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: disabled ? theme.colors.surfaceDisabled : theme.colors.primary,
      },
      secondary: {
        backgroundColor: disabled ? theme.colors.surfaceDisabled : theme.colors.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: disabled ? theme.colors.surfaceDisabled : theme.colors.primary,
        shadowOpacity: 0,
        elevation: 0,
      },
      text: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      opacity: disabled ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontFamily: 'MartelSans_700Bold',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    };

    // Size text styles
    const sizeStyles: Record<ButtonSize, TextStyle> = {
      small: {
        fontSize: 12,
        lineHeight: 16,
      },
      medium: {
        fontSize: 14,
        lineHeight: 20,
      },
      large: {
        fontSize: 16,
        lineHeight: 24,
      },
    };

    // Variant text colors
    const getTextColor = () => {
      if (disabled) {
        return variant === 'outline' || variant === 'text' 
          ? theme.colors.onSurfaceDisabled 
          : theme.colors.onPrimary;
      }

      switch (variant) {
        case 'primary':
          return theme.colors.onPrimary;
        case 'secondary':
          return theme.colors.onSecondary;
        case 'outline':
        case 'text':
          return theme.colors.primary;
        default:
          return theme.colors.onPrimary;
      }
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      color: getTextColor(),
      marginLeft: icon ? spacing.sm : 0,
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'text' ? theme.colors.primary : theme.colors.onPrimary}
        />
      ) : (
        <>
          {icon}
          <Text style={getTextStyle()}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// Icon button variant
interface IconButtonProps extends TouchableOpacityProps {
  icon: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 'medium',
  variant = 'outline',
  disabled = false,
  style,
  ...props
}) => {
  const theme = useTheme();

  const sizeMap = {
    small: 36,
    medium: 44,
    large: 52,
  };

  const buttonStyle: ViewStyle = {
    width: sizeMap[size],
    height: sizeMap[size],
    borderRadius: sizeMap[size] / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: variant === 'outline' ? 'transparent' : theme.colors[variant],
    borderWidth: variant === 'outline' ? 2 : 0,
    borderColor: theme.colors.primary,
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      {icon}
    </TouchableOpacity>
  );
};