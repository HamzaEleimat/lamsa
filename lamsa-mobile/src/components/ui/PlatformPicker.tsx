import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PlatformModal } from '@components/navigation';
import {
  isIOS,
  isAndroid,
  platformSelect,
  supportsHapticFeedback,
  BORDER_RADIUS,
} from '@utils/platform';
import {
  getTypography,
  spacing,
  layout,
  shadowPresets,
} from '@styles/platform';

export interface PickerItem<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

interface PlatformPickerProps<T = string> {
  value: T;
  onValueChange: (value: T) => void;
  items: PickerItem<T>[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export default function PlatformPicker<T = string>({
  value,
  onValueChange,
  items,
  placeholder = 'Select an option',
  label,
  disabled = false,
  error = false,
  errorMessage,
  style,
  testID,
  accessibilityLabel,
}: PlatformPickerProps<T>) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedItem = items.find(item => item.value === value);
  const displayValue = selectedItem?.label || placeholder;

  const handleValueChange = async (newValue: T) => {
    if (disabled) return;

    if (supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onValueChange(newValue);
    
    if (isIOS) {
      // iOS doesn't close modal automatically
      setModalVisible(false);
    }
  };

  const handlePress = () => {
    if (disabled) return;
    setModalVisible(true);
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
        <Text
          style={[
            styles.displayText,
            {
              color: selectedItem
                ? theme.colors.onSurface
                : theme.colors.onSurfaceVariant,
            },
            disabled && { color: theme.colors.onSurfaceDisabled },
          ]}
          numberOfLines={1}
        >
          {displayValue}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={24}
          color={disabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      <PlatformModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={label || 'Select Option'}
        presentationStyle="formSheet"
      >
        <View style={styles.iosPickerContainer}>
          <Picker
            selectedValue={value}
            onValueChange={handleValueChange}
            style={styles.iosPicker}
            itemStyle={[styles.iosPickerItem, { color: theme.colors.onSurface }]}
          >
            {items.map((item) => (
              <Picker.Item
                key={String(item.value)}
                label={item.label}
                value={item.value}
                enabled={!item.disabled}
              />
            ))}
          </Picker>
        </View>
      </PlatformModal>
    </>
  );

  const renderAndroidPicker = () => (
    <View
      style={[
        styles.androidContainer,
        error && styles.touchableError,
        disabled && styles.touchableDisabled,
        { borderColor: error ? theme.colors.error : theme.colors.outline },
        style,
      ]}
    >
      <Picker
        selectedValue={value}
        onValueChange={handleValueChange}
        enabled={!disabled}
        style={[
          styles.androidPicker,
          { color: theme.colors.onSurface },
        ]}
        dropdownIconColor={theme.colors.onSurfaceVariant}
        testID={testID}
        accessibilityLabel={accessibilityLabel || label}
      >
        {!selectedItem && (
          <Picker.Item
            label={placeholder}
            value=""
            color={theme.colors.onSurfaceVariant}
          />
        )}
        {items.map((item) => (
          <Picker.Item
            key={String(item.value)}
            label={item.label}
            value={item.value}
            enabled={!item.disabled}
            color={item.disabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurface}
          />
        ))}
      </Picker>
    </View>
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
    justifyContent: 'space-between',
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
  displayText: {
    ...getTypography('body1'),
    flex: 1,
  },
  androidContainer: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  androidPicker: {
    height: 56,
    ...layout.paddingHorizontal('sm'),
  },
  iosPickerContainer: {
    paddingBottom: spacing.lg,
  },
  iosPicker: {
    height: 216,
  },
  iosPickerItem: {
    ...getTypography('body1'),
  },
  errorText: {
    ...getTypography('caption'),
    marginTop: spacing.xs,
  },
});