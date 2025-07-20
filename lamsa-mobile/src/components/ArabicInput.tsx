/**
 * Arabic-Aware Input Component
 * Enhanced input component with comprehensive Arabic text validation and RTL support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputChangeEventData
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { isRTL } from '../i18n';
import { 
  validateArabicText, 
  shouldUseRTL, 
  getTextDirection, 
  createArabicInputValidator,
  ArabicInputUtils
} from '../utils/arabic-input-validation';
import { getTextAlign, getFlexDirection, getMarginStart, getMarginEnd } from '../utils/rtl';

interface ArabicInputProps extends Omit<TextInputProps, 'onChangeText'> {
  // Basic props
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  
  // Validation props
  validationType?: 'name' | 'businessName' | 'description' | 'address' | 'notes' | 'phone' | 'email' | 'custom';
  customValidation?: (text: string) => { isValid: boolean; errors: string[]; warnings: string[] };
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  showValidation?: boolean;
  validateOnChange?: boolean;
  
  // Arabic-specific props
  autoDetectRTL?: boolean;
  forceRTL?: boolean;
  allowMixed?: boolean;
  normalizeText?: boolean;
  arabicNumerals?: boolean;
  
  // UI props
  leftIcon?: string;
  rightIcon?: string;
  onLeftIconPress?: () => void;
  onRightIconPress?: () => void;
  showCharacterCount?: boolean;
  errorColor?: string;
  warningColor?: string;
  
  // Enhanced props
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  spellCheck?: boolean;
  
  // Event props
  onBlur?: () => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  
  // Style props
  containerStyle?: any;
  inputStyle?: any;
  labelStyle?: any;
  errorStyle?: any;
  
  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const ArabicInput: React.FC<ArabicInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  validationType = 'custom',
  customValidation,
  required = false,
  minLength,
  maxLength,
  showValidation = true,
  validateOnChange = true,
  autoDetectRTL = true,
  forceRTL = false,
  allowMixed = false,
  normalizeText = false,
  arabicNumerals = false,
  leftIcon,
  rightIcon,
  onLeftIconPress,
  onRightIconPress,
  showCharacterCount = false,
  errorColor = '#FF3B30',
  warningColor = '#FF9500',
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  spellCheck = true,
  onBlur,
  onFocus,
  onSubmitEditing,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
  ...restProps
}) => {
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>({ isValid: true, errors: [], warnings: [] });
  
  const [isFocused, setIsFocused] = useState(false);
  const [textDirection, setTextDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  // Create validator based on type
  const validator = customValidation || createArabicInputValidator({
    type: validationType,
    customOptions: {
      required,
      minLength,
      maxLength,
      allowMixed,
      normalize: normalizeText
    }
  });
  
  // Update text direction based on content
  useEffect(() => {
    if (forceRTL) {
      setTextDirection('rtl');
    } else if (autoDetectRTL) {
      setTextDirection(getTextDirection(value));
    } else {
      setTextDirection(isRTL() ? 'rtl' : 'ltr');
    }
  }, [value, forceRTL, autoDetectRTL]);
  
  // Validate text on change
  useEffect(() => {
    if (validateOnChange && showValidation) {
      const result = validator(value);
      setValidation(result);
    }
  }, [value, validateOnChange, showValidation, validator]);
  
  // Handle text change
  const handleTextChange = (text: string) => {
    let processedText = text;
    
    // Convert Arabic numerals if needed
    if (arabicNumerals && /[0-9]/.test(text)) {
      processedText = text.replace(/[0-9]/g, (digit) => {
        return String.fromCharCode(digit.charCodeAt(0) - 48 + 0x0660);
      });
    }
    
    // Normalize text if requested
    if (normalizeText) {
      processedText = ArabicInputUtils.normalizeText(processedText);
    }
    
    onChangeText(processedText);
  };
  
  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };
  
  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);
    
    // Validate on blur if not validating on change
    if (!validateOnChange && showValidation) {
      const result = validator(value);
      setValidation(result);
    }
    
    onBlur?.();
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Get icon for current validation state
  const getValidationIcon = () => {
    if (!showValidation || (!validation.errors.length && !validation.warnings.length)) {
      return null;
    }
    
    if (validation.errors.length > 0) {
      return (
        <MaterialIcons 
          name="error" 
          size={20} 
          color={errorColor}
          style={textDirection === 'rtl' ? { marginRight: 8 } : { marginLeft: 8 }}
        />
      );
    }
    
    if (validation.warnings.length > 0) {
      return (
        <MaterialIcons 
          name="warning" 
          size={20} 
          color={warningColor}
          style={textDirection === 'rtl' ? { marginRight: 8 } : { marginLeft: 8 }}
        />
      );
    }
    
    return null;
  };
  
  // Get placeholder text with RTL support
  const getPlaceholder = () => {
    if (!placeholder) return '';
    
    // Add RTL mark if needed
    if (textDirection === 'rtl' && !placeholder.includes('\u200F')) {
      return '\u200F' + placeholder;
    }
    
    return placeholder;
  };
  
  // Calculate character count
  const characterCount = value.length;
  const characterLimit = maxLength || 0;
  const isOverLimit = characterLimit > 0 && characterCount > characterLimit;
  
  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {/* Label */}
      {label && (
        <Text style={[
          styles.label,
          textDirection === 'rtl' && styles.labelRTL,
          labelStyle
        ]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        validation.errors.length > 0 && styles.inputContainerError,
        validation.warnings.length > 0 && styles.inputContainerWarning,
        { flexDirection: getFlexDirection('row') }
      ]}>
        {/* Left Icon */}
        {leftIcon && (
          <TouchableOpacity
            onPress={onLeftIconPress}
            style={[
              styles.iconContainer,
              textDirection === 'rtl' ? styles.iconRight : styles.iconLeft
            ]}
          >
            <MaterialIcons name={leftIcon as any} size={20} color="#666" />
          </TouchableOpacity>
        )}
        
        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              textAlign: getTextAlign(textDirection === 'rtl' ? 'right' : 'left'),
              writingDirection: textDirection,
              ...getMarginStart(leftIcon ? 8 : 0),
              ...getMarginEnd(rightIcon || secureTextEntry ? 8 : 0),
            },
            multiline && styles.multilineInput,
            inputStyle
          ]}
          value={value}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          placeholder={getPlaceholder()}
          placeholderTextColor="#999"
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          spellCheck={spellCheck}
          maxLength={maxLength}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          {...restProps}
        />
        
        {/* Right Icon / Password Toggle / Validation Icon */}
        <View style={[
          styles.rightIconContainer,
          textDirection === 'rtl' ? styles.iconLeft : styles.iconRight
        ]}>
          {secureTextEntry && (
            <TouchableOpacity
              onPress={togglePasswordVisibility}
              style={styles.passwordToggle}
            >
              <MaterialIcons 
                name={showPassword ? 'visibility-off' : 'visibility'} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          )}
          
          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.iconContainer}
            >
              <MaterialIcons name={rightIcon as any} size={20} color="#666" />
            </TouchableOpacity>
          )}
          
          {getValidationIcon()}
        </View>
      </View>
      
      {/* Character Count */}
      {showCharacterCount && (
        <View style={[
          styles.characterCount,
          textDirection === 'rtl' && styles.characterCountRTL
        ]}>
          <Text style={[
            styles.characterCountText,
            isOverLimit && { color: errorColor }
          ]}>
            {arabicNumerals 
              ? `${characterCount.toString().replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 48 + 0x0660))}`
              : characterCount
            }
            {characterLimit > 0 && (
              <>
                {arabicNumerals ? ' / ' : ' / '}
                {arabicNumerals 
                  ? characterLimit.toString().replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 48 + 0x0660))
                  : characterLimit
                }
              </>
            )}
          </Text>
        </View>
      )}
      
      {/* Validation Messages */}
      {showValidation && (
        <View style={styles.validationContainer}>
          {/* Errors */}
          {validation.errors.map((error, index) => (
            <Text
              key={`error-${index}`}
              style={[
                styles.validationText,
                styles.errorText,
                { color: errorColor },
                textDirection === 'rtl' && styles.validationTextRTL,
                errorStyle
              ]}
            >
              {error}
            </Text>
          ))}
          
          {/* Warnings */}
          {validation.warnings.map((warning, index) => (
            <Text
              key={`warning-${index}`}
              style={[
                styles.validationText,
                styles.warningText,
                { color: warningColor },
                textDirection === 'rtl' && styles.validationTextRTL
              ]}
            >
              {warning}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  labelRTL: {
    textAlign: 'right',
  },
  required: {
    color: '#FF3B30',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  inputContainerFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  inputContainerWarning: {
    borderColor: '#FF9500',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#333',
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  iconContainer: {
    padding: 8,
  },
  iconLeft: {
    marginLeft: 8,
  },
  iconRight: {
    marginRight: 8,
  },
  rightIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordToggle: {
    padding: 8,
  },
  characterCount: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  characterCountRTL: {
    alignItems: 'flex-start',
  },
  characterCountText: {
    fontSize: 12,
    color: '#666',
  },
  validationContainer: {
    marginTop: 4,
  },
  validationText: {
    fontSize: 12,
    marginTop: 2,
  },
  validationTextRTL: {
    textAlign: 'right',
  },
  errorText: {
    fontWeight: '500',
  },
  warningText: {
    fontWeight: '400',
  },
});

export default ArabicInput;