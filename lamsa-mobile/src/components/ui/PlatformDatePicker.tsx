import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { PlatformModal } from '@components/navigation';
import {
  isIOS,
  isAndroid,
  supportsHapticFeedback,
  BORDER_RADIUS,
  isRTL,
} from '@utils/platform';
import {
  getTypography,
  spacing,
  shadowPresets,
} from '@styles/platform';

interface PlatformDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  format?: string;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export default function PlatformDatePicker({
  value,
  onChange,
  mode = 'date',
  label,
  placeholder,
  minimumDate,
  maximumDate,
  disabled = false,
  error = false,
  errorMessage,
  format: customFormat,
  style,
  testID,
  accessibilityLabel,
}: PlatformDatePickerProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const locale = isRTL ? ar : enUS;

  const getDisplayFormat = () => {
    if (customFormat) return customFormat;
    
    switch (mode) {
      case 'date':
        return isRTL ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
      case 'time':
        return 'h:mm a';
      case 'datetime':
        return isRTL ? 'dd/MM/yyyy h:mm a' : 'MM/dd/yyyy h:mm a';
      default:
        return 'MM/dd/yyyy';
    }
  };

  const displayValue = value
    ? format(value, getDisplayFormat(), { locale })
    : placeholder || 'Select ' + mode;

  const handlePress = async () => {
    if (disabled) return;

    if (supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setShowPicker(true);
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (isAndroid) {
      setShowPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
    }
  };

  const renderIOSPicker = () => (
    <>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.touchable,
          error && styles.touchableError,
          disabled && styles.touchableDisabled,
          { borderColor: error ? theme.colors.error : theme.colors.outline },
          style,
        ]}
        testID={testID}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={mode === 'time' ? 'clock-outline' : 'calendar'}
            size={20}
            color={disabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurfaceVariant}
          />
        </View>
        <Text
          style={[
            styles.displayText,
            {
              color: value
                ? theme.colors.onSurface
                : theme.colors.onSurfaceVariant,
            },
            disabled && { color: theme.colors.onSurfaceDisabled },
          ]}
          numberOfLines={1}
        >
          {displayValue}
        </Text>
      </TouchableOpacity>

      <PlatformModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        title={label || `Select ${mode}`}
        presentationStyle="formSheet"
      >
        <View style={styles.iosPickerContainer}>
          <DateTimePicker
            value={value || new Date()}
            mode={mode}
            display="spinner"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            locale={isRTL ? 'ar' : 'en'}
            style={styles.iosPicker}
            textColor={theme.colors.onSurface}
          />
          <View style={styles.iosPickerActions}>
            <TouchableOpacity
              style={[styles.iosButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowPicker(false)}
            >
              <Text style={[styles.iosButtonText, { color: theme.colors.onPrimary }]}>
                {isRTL ? 'تم' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </PlatformModal>
    </>
  );

  const renderAndroidPicker = () => (
    <>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.touchable,
          error && styles.touchableError,
          disabled && styles.touchableDisabled,
          { borderColor: error ? theme.colors.error : theme.colors.outline },
          style,
        ]}
        testID={testID}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={mode === 'time' ? 'clock-outline' : 'calendar'}
            size={20}
            color={disabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurfaceVariant}
          />
        </View>
        <Text
          style={[
            styles.displayText,
            {
              color: value
                ? theme.colors.onSurface
                : theme.colors.onSurfaceVariant,
            },
            disabled && { color: theme.colors.onSurfaceDisabled },
          ]}
          numberOfLines={1}
        >
          {displayValue}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display={mode === 'time' ? 'clock' : 'calendar'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </>
  );

  return (
    <View>
      {label && (
        <Text
          style={[
            styles.label,
            { color: error ? theme.colors.error : theme.colors.onSurfaceVariant },
          ]}
        >
          {label}
        </Text>
      )}
      
      {isIOS ? renderIOSPicker() : renderAndroidPicker()}
      
      {error && errorMessage && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...getTypography('body2'),
    marginBottom: spacing.xs,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    height: 56,
    paddingHorizontal: spacing.md,
  },
  touchableError: {
    borderWidth: 2,
  },
  touchableDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  displayText: {
    ...getTypography('body1'),
    flex: 1,
  },
  iosPickerContainer: {
    paddingBottom: spacing.lg,
  },
  iosPicker: {
    height: 216,
  },
  iosPickerActions: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  iosButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: BORDER_RADIUS.medium,
    ...shadowPresets.button,
  },
  iosButtonText: {
    ...getTypography('button'),
  },
  errorText: {
    ...getTypography('caption'),
    marginTop: spacing.xs,
  },
});