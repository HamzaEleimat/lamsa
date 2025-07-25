import React, { useRef, useEffect } from 'react';
import {
  Switch,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import {
  isIOS,
  platformSelect,
  supportsHapticFeedback,
} from '@utils/platform';
import {
  getTypography,
  spacing,
  animations,
  animationUtils,
} from '@styles/platform';

interface PlatformSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  hapticFeedback?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export default function PlatformSwitch({
  value,
  onValueChange,
  label,
  disabled = false,
  hapticFeedback = true,
  size = 'medium',
  style,
  testID,
  accessibilityLabel,
}: PlatformSwitchProps) {
  const theme = useTheme();
  const scaleAnim = useRef(animationUtils.createValue(1)).current;

  const handleValueChange = async (newValue: boolean) => {
    if (disabled) return;

    if (hapticFeedback && supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Animate scale
    animations.sequence([
      animations.scale(scaleAnim, 0.95, { type: 'gentle' }),
      animations.scale(scaleAnim, 1, { type: 'bouncy' }),
    ]).start();

    onValueChange(newValue);
  };

  const getSwitchScale = () => {
    const scales = {
      small: 0.8,
      medium: 1,
      large: 1.2,
    };
    return scales[size];
  };

  const renderSwitch = () => {
    const switchScale = getSwitchScale();

    return (
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim },
            { scale: switchScale },
          ],
        }}
      >
        <Switch
          value={value}
          onValueChange={handleValueChange}
          disabled={disabled}
          trackColor={{
            false: platformSelect({
              ios: '#E5E5EA',
              android: theme.colors.surfaceVariant,
            }),
            true: platformSelect({
              ios: theme.colors.primary,
              android: theme.colors.primary + '80',
            }),
          }}
          thumbColor={platformSelect({
            ios: '#FFFFFF',
            android: value ? theme.colors.primary : '#FAFAFA',
          })}
          ios_backgroundColor="#E5E5EA"
          testID={testID}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityRole="switch"
          accessibilityState={{
            checked: value,
            disabled,
          }}
        />
      </Animated.View>
    );
  };

  if (label) {
    return (
      <TouchableOpacity
        onPress={() => handleValueChange(!value)}
        disabled={disabled}
        style={[styles.container, style]}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.label,
            { color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurface },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {renderSwitch()}
      </TouchableOpacity>
    );
  }

  return <View style={style}>{renderSwitch()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  label: {
    ...getTypography('body1'),
    flex: 1,
    marginRight: spacing.md,
  },
});