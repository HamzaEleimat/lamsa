import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { 
  isIOS, 
  platformSelect, 
  supportsHapticFeedback,
  isRTL,
  FONTS,
  SPACING,
} from '@utils/platform';

interface PlatformBackButtonProps {
  onPress?: () => void;
  label?: string;
  color?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  hapticFeedback?: boolean;
}

export default function PlatformBackButton({
  onPress,
  label,
  color,
  showLabel = true,
  size = 'medium',
  hapticFeedback = true,
}: PlatformBackButtonProps) {
  const navigation = useNavigation();
  const theme = useTheme();
  
  const buttonColor = color || theme.colors.primary;
  
  const handlePress = async () => {
    if (hapticFeedback && supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (onPress) {
      onPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const iconSize = platformSelect({
    ios: {
      small: 24,
      medium: 28,
      large: 32,
    }[size],
    android: {
      small: 20,
      medium: 24,
      large: 28,
    }[size],
    default: 24,
  }) as number;

  const iconName = platformSelect({
    ios: isRTL ? 'chevron-right' : 'chevron-left',
    android: isRTL ? 'arrow-right' : 'arrow-left',
    default: 'arrow-left',
  }) as string;

  const defaultLabel = platformSelect({
    ios: isRTL ? 'التالي' : 'Back',
    android: '',
    default: '',
  }) as string;

  const renderIOSButton = () => (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.iosButton, styles[`${size}Padding`]]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialCommunityIcons
        name={iconName}
        size={iconSize}
        color={buttonColor}
      />
      {showLabel && (
        <Text 
          style={[
            styles.iosLabel, 
            { color: buttonColor },
            size === 'small' && styles.smallLabel,
            size === 'large' && styles.largeLabel,
          ]}
        >
          {label || defaultLabel}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderAndroidButton = () => (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.androidButton, styles[`${size}Padding`]]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={styles.androidIconContainer}>
        <MaterialCommunityIcons
          name={iconName}
          size={iconSize}
          color={buttonColor}
        />
      </View>
      {showLabel && label && (
        <Text 
          style={[
            styles.androidLabel, 
            { color: buttonColor },
            size === 'small' && styles.smallLabel,
            size === 'large' && styles.largeLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );

  return isIOS ? renderIOSButton() : renderAndroidButton();
}

const styles = StyleSheet.create({
  // iOS Styles
  iosButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iosLabel: {
    fontSize: 17,
    marginStart: -4,
    fontFamily: FONTS.regular,
  },
  
  // Android Styles
  androidButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  androidIconContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  androidLabel: {
    fontSize: 16,
    marginStart: SPACING.xs,
    fontFamily: FONTS.regular,
  },
  
  // Size variations
  smallPadding: {
    padding: SPACING.xs,
  },
  mediumPadding: {
    padding: SPACING.sm,
  },
  largePadding: {
    padding: SPACING.md,
  },
  smallLabel: {
    fontSize: 14,
  },
  largeLabel: {
    fontSize: 19,
  },
});