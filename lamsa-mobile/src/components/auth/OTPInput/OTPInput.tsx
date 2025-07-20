import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Clipboard } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import OTPDigitBox from './OTPDigitBox';

interface OTPInputProps {
  length?: number;
  value: string;
  onChangeText: (text: string) => void;
  onComplete?: (text: string) => void;
  isError?: boolean;
  errorMessage?: string;
  isRTL?: boolean;
  autoFocus?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChangeText,
  onComplete,
  isError = false,
  errorMessage,
  isRTL = false,
  autoFocus = true,
}) => {
  const theme = useTheme();
  const [focusedIndex, setFocusedIndex] = useState(autoFocus ? 0 : -1);
  const digits = value.split('').slice(0, length);

  // Pad with empty strings if value is shorter than length
  while (digits.length < length) {
    digits.push('');
  }

  useEffect(() => {
    // Auto-focus first empty box when component mounts
    if (autoFocus && value.length === 0) {
      setFocusedIndex(0);
    }
  }, [autoFocus]);

  useEffect(() => {
    // Call onComplete when all digits are filled
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  // Handle clipboard paste
  useEffect(() => {
    const handleClipboard = async () => {
      try {
        const clipboardContent = await Clipboard.getString();
        const digitsFromClipboard = clipboardContent.replace(/[^0-9]/g, '');
        
        if (digitsFromClipboard.length === length) {
          onChangeText(digitsFromClipboard);
          setFocusedIndex(length - 1);
        }
      } catch (error) {
        // Silently handle clipboard errors
      }
    };

    if (focusedIndex === 0 && value.length === 0) {
      handleClipboard();
    }
  }, [focusedIndex, value.length, length, onChangeText]);

  const handleChangeText = (text: string, index: number) => {
    const newDigits = [...digits];
    newDigits[index] = text;
    
    const newValue = newDigits.join('');
    onChangeText(newValue);

    // Auto-advance to next box if digit entered
    if (text && index < length - 1) {
      setFocusedIndex(index + 1);
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      const newDigits = [...digits];
      
      if (digits[index]) {
        // Clear current box
        newDigits[index] = '';
      } else if (index > 0) {
        // Move to previous box and clear it
        newDigits[index - 1] = '';
        setFocusedIndex(index - 1);
      }
      
      const newValue = newDigits.join('');
      onChangeText(newValue);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, isRTL && styles.rtlContainer]}>
        {digits.map((digit, index) => (
          <OTPDigitBox
            key={index}
            value={digit}
            index={index}
            isFocused={focusedIndex === index}
            isError={isError}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onKeyPress={handleKeyPress}
            isRTL={isRTL}
          />
        ))}
      </View>
      
      {isError && errorMessage && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  rtlContainer: {
    flexDirection: 'row-reverse',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default OTPInput;
