import React, { useRef, useEffect } from 'react';
import { TextInput, StyleSheet, Animated } from 'react-native';
import { useTheme } from 'react-native-paper';

interface OTPDigitBoxProps {
  value: string;
  index: number;
  isFocused: boolean;
  isError: boolean;
  onChangeText: (text: string, index: number) => void;
  onFocus: (index: number) => void;
  onKeyPress: (key: string, index: number) => void;
  isRTL?: boolean;
}

const OTPDigitBox: React.FC<OTPDigitBoxProps> = ({
  value,
  index,
  isFocused,
  isError,
  onChangeText,
  onFocus,
  onKeyPress,
  isRTL = false,
}) => {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      inputRef.current?.focus();
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }).start();
    }
  }, [isFocused, scaleAnim]);

  useEffect(() => {
    if (isError) {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isError, shakeAnim]);

  const handleChangeText = (text: string) => {
    // Only allow single digit
    const sanitizedText = text.replace(/[^0-9]/g, '').slice(0, 1);
    onChangeText(sanitizedText, index);
  };

  const handleKeyPress = ({ nativeEvent }: any) => {
    onKeyPress(nativeEvent.key, index);
  };

  const getBoxStyle = () => {
    let borderColor = theme.colors.outline;
    let backgroundColor = theme.colors.surface;

    if (isError) {
      borderColor = theme.colors.error;
      backgroundColor = `${theme.colors.error}10`;
    } else if (isFocused) {
      borderColor = theme.colors.primary;
      backgroundColor = `${theme.colors.primary}08`;
    } else if (value) {
      borderColor = theme.colors.primary;
      backgroundColor = `${theme.colors.primary}05`;
    }

    return {
      ...styles.box,
      borderColor,
      backgroundColor,
    };
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            { translateX: shakeAnim },
          ],
        },
      ]}
    >
      <TextInput
        ref={inputRef}
        style={[
          getBoxStyle(),
          {
            color: theme.colors.onSurface,
            textAlign: 'center',
          },
          isRTL && styles.rtlText,
        ]}
        value={value}
        onChangeText={handleChangeText}
        onFocus={() => onFocus(index)}
        onKeyPress={handleKeyPress}
        keyboardType="number-pad"
        maxLength={1}
        selectTextOnFocus
        contextMenuHidden
        textContentType="oneTimeCode"
        accessibilityLabel={`OTP digit ${index + 1} of 6`}
        accessibilityHint={value ? `Entered ${value}` : 'Enter digit'}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 4,
  },
  box: {
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    paddingHorizontal: 0,
  },
  rtlText: {
    writingDirection: 'rtl',
  },
});

export default OTPDigitBox;
