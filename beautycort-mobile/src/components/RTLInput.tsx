/**
 * RTL-Aware Input Component
 * Demonstrates proper RTL input handling with proper text alignment and icons
 */

import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  getInputStyle, 
  getTextAlign, 
  getFlexDirection, 
  getMarginStart, 
  getMarginEnd,
  getPaddingHorizontal,
  getBorderStart,
  getAlignItems,
  isRTL
} from '../utils/rtl';

interface RTLInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
  secureTextEntry?: boolean;
  editable?: boolean;
  style?: any;
  inputStyle?: any;
  containerStyle?: any;
  onFocus?: () => void;
  onBlur?: () => void;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  required?: boolean;
  disabled?: boolean;
}

const RTLInput: React.FC<RTLInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  leftIcon,
  rightIcon,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  secureTextEntry = false,
  editable = true,
  style,
  inputStyle,
  containerStyle,
  onFocus,
  onBlur,
  maxLength,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  returnKeyType = 'done',
  onSubmitEditing,
  required = false,
  disabled = false
}) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => {
    setFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setFocused(false);
    onBlur?.();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const renderLabel = () => {
    if (!label) return null;
    
    return (
      <Text style={[styles.label, { textAlign: getTextAlign('left') }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
    );
  };

  const renderLeftIcon = () => {
    if (!leftIcon) return null;
    
    return (
      <View style={[styles.iconContainer, getMarginEnd(8)]}>
        {leftIcon}
      </View>
    );
  };

  const renderRightIcon = () => {
    // Handle password visibility toggle
    if (secureTextEntry) {
      return (
        <TouchableOpacity
          style={[styles.iconContainer, getMarginStart(8)]}
          onPress={togglePasswordVisibility}
        >
          <Text style={styles.passwordToggle}>
            {showPassword ? '🙈' : '👁️'}
          </Text>
        </TouchableOpacity>
      );
    }
    
    if (!rightIcon) return null;
    
    return (
      <View style={[styles.iconContainer, getMarginStart(8)]}>
        {rightIcon}
      </View>
    );
  };

  const renderError = () => {
    if (!error) return null;
    
    return (
      <Text style={[styles.error, { textAlign: getTextAlign('left') }]}>
        {error}
      </Text>
    );
  };

  const renderCharacterCount = () => {
    if (!maxLength) return null;
    
    return (
      <Text style={[styles.characterCount, { textAlign: getTextAlign('right') }]}>
        {value.length}/{maxLength}
      </Text>
    );
  };

  const inputContainerStyle = [
    styles.inputContainer,
    { flexDirection: getFlexDirection('row') },
    getInputStyle(focused),
    getPaddingHorizontal(12, 12),
    focused && styles.focused,
    error && styles.errorBorder,
    disabled && styles.disabled
  ];

  const textInputStyle = [
    styles.textInput,
    { textAlign: getTextAlign('left') },
    multiline && { textAlignVertical: 'top' },
    inputStyle
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {renderLabel()}
      
      <View style={inputContainerStyle}>
        {/* In RTL, left icon appears on the right side */}
        {isRTL() ? renderRightIcon() : renderLeftIcon()}
        
        <TextInput
          style={textInputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !showPassword}
          editable={editable && !disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          textAlign={getTextAlign('left')}
          writingDirection={isRTL() ? 'rtl' : 'ltr'}
        />
        
        {/* In RTL, right icon appears on the left side */}
        {isRTL() ? renderLeftIcon() : renderRightIcon()}
      </View>
      
      <View style={[styles.footer, { flexDirection: getFlexDirection('row') }]}>
        <View style={styles.errorContainer}>
          {renderError()}
        </View>
        <View style={styles.characterCountContainer}>
          {renderCharacterCount()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6
  },
  required: {
    color: '#FF3B30'
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    minHeight: 48
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 0
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24
  },
  passwordToggle: {
    fontSize: 16
  },
  focused: {
    borderColor: '#007AFF',
    borderWidth: 2
  },
  errorBorder: {
    borderColor: '#FF3B30'
  },
  disabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6
  },
  footer: {
    marginTop: 4,
    alignItems: getAlignItems('flex-start')
  },
  errorContainer: {
    flex: 1
  },
  error: {
    fontSize: 12,
    color: '#FF3B30'
  },
  characterCountContainer: {
    alignItems: getAlignItems('flex-end')
  },
  characterCount: {
    fontSize: 12,
    color: '#666666'
  }
});

export default RTLInput;