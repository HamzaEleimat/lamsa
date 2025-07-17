/**
 * RTL-Aware Button Component
 * Demonstrates proper RTL implementation using RTL utilities
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getButtonStyle, getTextAlign, getFlexDirection, getMarginStart, getMarginEnd } from '../utils/rtl';

interface RTLButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: any;
  textStyle?: any;
  fullWidth?: boolean;
}

const RTLButton: React.FC<RTLButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false
}) => {
  const buttonStyle = getButtonStyle(variant);
  
  const sizeStyles = {
    small: { paddingVertical: 8, paddingHorizontal: 12 },
    medium: { paddingVertical: 12, paddingHorizontal: 16 },
    large: { paddingVertical: 16, paddingHorizontal: 20 }
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#007AFF',
      borderRadius: 8
    },
    secondary: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#007AFF',
      borderRadius: 8
    },
    text: {
      backgroundColor: 'transparent'
    }
  };

  const textVariantStyles = {
    primary: { color: '#FFFFFF' },
    secondary: { color: '#007AFF' },
    text: { color: '#007AFF' }
  };

  const renderIcon = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={textVariantStyles[variant].color}
          style={iconPosition === 'left' ? getMarginEnd(8) : getMarginStart(8)}
        />
      );
    }

    if (icon) {
      return (
        <React.Fragment>
          {iconPosition === 'left' && (
            <React.cloneElement(icon as React.ReactElement, {
              style: [
                (icon as React.ReactElement).props.style,
                getMarginEnd(8)
              ]
            })
          )}
          {iconPosition === 'right' && (
            <React.cloneElement(icon as React.ReactElement, {
              style: [
                (icon as React.ReactElement).props.style,
                getMarginStart(8)
              ]
            })
          )}
        </React.Fragment>
      );
    }

    return null;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonStyle,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {iconPosition === 'left' && renderIcon()}
      <Text
        style={[
          styles.text,
          textVariantStyles[variant],
          { textAlign: getTextAlign('center') },
          textStyle
        ]}
      >
        {title}
      </Text>
      {iconPosition === 'right' && renderIcon()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: getFlexDirection('row'),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  fullWidth: {
    width: '100%'
  },
  disabled: {
    opacity: 0.5
  }
});

export default RTLButton;