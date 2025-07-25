import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInputProps,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  isIOS,
  platformSelect,
  BORDER_RADIUS,
  isRTL,
} from '@utils/platform';
import {
  getTypography,
  spacing,
  animations,
  animationUtils,
} from '@styles/platform';

interface PlatformTextInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  variant?: 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
}

export default function PlatformTextInput({
  label,
  error = false,
  errorMessage,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  variant = 'outlined',
  size = 'medium',
  onFocus,
  onBlur,
  editable = true,
  ...textInputProps
}: PlatformTextInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const labelAnim = useRef(animationUtils.createValue(0)).current;
  const borderAnim = useRef(animationUtils.createValue(0)).current;

  const hasValue = Boolean(textInputProps.value);
  const shouldFloatLabel = hasValue || isFocused;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    
    Animated.parallel([
      animations.fade(labelAnim, 1, { speed: 'fast' }),
      animations.fade(borderAnim, 1, { speed: 'fast' }),
    ]).start();

    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    
    Animated.parallel([
      animations.fade(labelAnim, 0, { speed: 'fast' }),
      animations.fade(borderAnim, 0, { speed: 'fast' }),
    ]).start();

    onBlur?.(e);
  };

  const getInputHeight = () => {
    const heights = {
      small: 40,
      medium: 56,
      large: 64,
    };
    return heights[size];
  };

  const getInputPadding = () => {
    const paddings = {
      small: spacing.sm,
      medium: spacing.md,
      large: spacing.lg,
    };
    return paddings[size];
  };

  const inputHeight = getInputHeight();
  const inputPadding = getInputPadding();

  const getBorderColor = () => {
    if (error) return theme.colors.error;
    if (isFocused) return theme.colors.primary;
    return theme.colors.outline;
  };

  const getBackgroundColor = () => {
    if (variant === 'filled') {
      return editable ? theme.colors.surfaceVariant : theme.colors.surfaceDisabled;
    }
    return 'transparent';
  };

  const labelStyle = label && shouldFloatLabel ? {
    transform: [
      {
        translateY: platformSelect({
          ios: -inputHeight / 2 + 10,
          android: -inputHeight / 2 + 8,
        }),
      },
      {
        scale: 0.75,
      },
    ],
    color: error ? theme.colors.error : theme.colors.primary,
    backgroundColor: theme.colors.background,
    paddingHorizontal: spacing.xs,
  } : {};

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.inputContainer,
          {
            height: inputHeight,
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: variant === 'outlined' ? 1 : 0,
            borderBottomWidth: variant === 'filled' ? 2 : 1,
          },
          !editable && styles.inputDisabled,
        ]}
      >
        {leftIcon && (
          <MaterialCommunityIcons
            name={leftIcon}
            size={20}
            color={error ? theme.colors.error : theme.colors.onSurfaceVariant}
            style={[styles.leftIcon, { marginLeft: inputPadding }]}
          />
        )}

        <View style={styles.inputWrapper}>
          {label && (
            <Animated.Text
              style={[
                styles.label,
                {
                  color: error 
                    ? theme.colors.error 
                    : isFocused 
                    ? theme.colors.primary 
                    : theme.colors.onSurfaceVariant,
                  top: inputHeight / 2 - 10,
                },
                labelStyle,
              ]}
              numberOfLines={1}
            >
              {label}
            </Animated.Text>
          )}

          <TextInput
            {...textInputProps}
            style={[
              styles.input,
              {
                paddingHorizontal: inputPadding,
                paddingTop: label ? inputPadding + 8 : inputPadding,
                paddingBottom: label ? inputPadding - 8 : inputPadding,
                color: theme.colors.onSurface,
                textAlign: isRTL ? 'right' : 'left',
              },
              inputStyle,
            ]}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            selectionColor={theme.colors.primary}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={editable}
          />
        </View>

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={[styles.rightIcon, { marginRight: inputPadding }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={rightIcon}
              size={20}
              color={error ? theme.colors.error : theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        )}
      </View>

      {(helperText || errorMessage) && (
        <Text
          style={[
            styles.helperText,
            {
              color: error ? theme.colors.error : theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {error && errorMessage ? errorMessage : helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.small,
    overflow: 'hidden',
    position: 'relative',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: spacing.md,
    ...getTypography('body2'),
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    ...getTypography('body1'),
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
  rightIcon: {
    marginLeft: spacing.xs,
  },
  helperText: {
    ...getTypography('caption'),
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
});