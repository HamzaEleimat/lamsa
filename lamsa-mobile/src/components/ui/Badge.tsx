import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { spacing, customColors } from '../../theme';

type BadgeVariant = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'medium',
  children,
  style,
}) => {
  const theme = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return customColors.brand1;
      case 'secondary':
        return customColors.brand2;
      case 'info':
        return customColors.blue3;
      case 'success':
        return customColors.green3;
      case 'warning':
        return customColors.orange3;
      case 'error':
        return customColors.red3;
      default:
        return theme.colors.primary;
    }
  };

  const getBadgeStyle = (): ViewStyle => {
    const sizeStyles: Record<BadgeSize, ViewStyle> = {
      small: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 10,
      },
      medium: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 12,
      },
      large: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 14,
      },
    };

    return {
      backgroundColor: getBackgroundColor(),
      ...sizeStyles[size],
      alignSelf: 'flex-start',
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles: Record<BadgeSize, TextStyle> = {
      small: {
        fontSize: 10,
        lineHeight: 14,
      },
      medium: {
        fontSize: 12,
        lineHeight: 16,
      },
      large: {
        fontSize: 14,
        lineHeight: 20,
      },
    };

    return {
      ...sizeStyles[size],
      fontFamily: 'MartelSans_700Bold',
      color: '#FFFFFF',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    };
  };

  return (
    <View style={[getBadgeStyle(), style]}>
      <Text style={getTextStyle()}>{children}</Text>
    </View>
  );
};

// Chip component (similar to badge but interactive)
interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  size = 'medium',
  style,
}) => {
  const theme = useTheme();

  const getChipStyle = (): ViewStyle => {
    const sizeStyles: Record<'small' | 'medium' | 'large', ViewStyle> = {
      small: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 16,
      },
      medium: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
      },
      large: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 24,
      },
    };

    return {
      ...sizeStyles[size],
      backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: selected ? theme.colors.primary : theme.colors.outline,
    };
  };

  const getChipTextStyle = (): TextStyle => {
    const sizeStyles: Record<'small' | 'medium' | 'large', TextStyle> = {
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

    return {
      ...sizeStyles[size],
      fontFamily: 'MartelSans_400Regular',
      color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
      letterSpacing: 0.25,
    };
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[getChipStyle(), style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={getChipTextStyle()}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getChipStyle(), style]}>
      <Text style={getChipTextStyle()}>{label}</Text>
    </View>
  );
};