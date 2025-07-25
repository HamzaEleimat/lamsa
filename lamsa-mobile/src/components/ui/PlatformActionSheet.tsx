import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActionSheetIOS,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PlatformModal } from '@components/navigation';
import {
  isIOS,
  supportsHapticFeedback,
  BORDER_RADIUS,
  isRTL,
} from '@utils/platform';
import {
  getTypography,
  spacing,
  layout,
  shadowPresets,
} from '@styles/platform';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  icon?: string;
  destructive?: boolean;
  disabled?: boolean;
}

interface PlatformActionSheetProps {
  visible: boolean;
  onClose: () => void;
  options: ActionSheetOption[];
  title?: string;
  message?: string;
  cancelLabel?: string;
  destructiveIndex?: number;
}

export default function PlatformActionSheet({
  visible,
  onClose,
  options,
  title,
  message,
  cancelLabel = isRTL ? 'إلغاء' : 'Cancel',
  destructiveIndex,
}: PlatformActionSheetProps) {
  const theme = useTheme();

  const showIOSActionSheet = () => {
    const buttons = options.map(option => option.label);
    buttons.push(cancelLabel);

    const destructiveButtonIndex = options.findIndex(option => option.destructive);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: buttons,
        cancelButtonIndex: buttons.length - 1,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : destructiveIndex,
        title,
        message,
        tintColor: theme.colors.primary,
      },
      async (buttonIndex) => {
        if (buttonIndex < options.length) {
          const option = options[buttonIndex];
          if (!option.disabled) {
            if (supportsHapticFeedback) {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            option.onPress();
          }
        }
        onClose();
      }
    );
  };

  const handleOptionPress = async (option: ActionSheetOption) => {
    if (option.disabled) return;

    if (supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    option.onPress();
    onClose();
  };

  // iOS uses native ActionSheet
  if (isIOS && visible) {
    showIOSActionSheet();
    return null;
  }

  // Android uses custom modal
  return (
    <PlatformModal
      visible={visible}
      onClose={onClose}
      presentationStyle="pageSheet"
      showHandle={false}
      enableSwipeDown={true}
    >
      <View style={styles.container}>
        {(title || message) && (
          <View style={styles.header}>
            {title && (
              <Text style={[styles.title, { color: theme.colors.onBackground }]}>
                {title}
              </Text>
            )}
            {message && (
              <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
                {message}
              </Text>
            )}
          </View>
        )}

        <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleOptionPress(option)}
              disabled={option.disabled}
              style={[
                styles.option,
                option.disabled && styles.optionDisabled,
                index === 0 && styles.optionFirst,
                index === options.length - 1 && styles.optionLast,
              ]}
              activeOpacity={0.7}
            >
              {option.icon && (
                <MaterialCommunityIcons
                  name={option.icon}
                  size={24}
                  color={
                    option.destructive
                      ? theme.colors.error
                      : option.disabled
                      ? theme.colors.onSurfaceDisabled
                      : theme.colors.onSurface
                  }
                  style={styles.optionIcon}
                />
              )}
              <Text
                style={[
                  styles.optionText,
                  {
                    color: option.destructive
                      ? theme.colors.error
                      : option.disabled
                      ? theme.colors.onSurfaceDisabled
                      : theme.colors.onSurface,
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          onPress={onClose}
          style={[
            styles.cancelButton,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: theme.colors.onSurfaceVariant }]}>
            {cancelLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </PlatformModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    ...getTypography('h6'),
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...getTypography('body2'),
    textAlign: 'center',
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  optionFirst: {
    marginTop: spacing.sm,
  },
  optionLast: {
    marginBottom: spacing.sm,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    marginRight: spacing.md,
  },
  optionText: {
    ...getTypography('body1'),
    flex: 1,
  },
  cancelButton: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    height: 56,
    borderRadius: BORDER_RADIUS.medium,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadowPresets.button,
  },
  cancelText: {
    ...getTypography('button'),
  },
});