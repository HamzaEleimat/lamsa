import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, shadows } from '../../theme';
import { isRTL } from '../../i18n';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...props
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return theme.colors.error;
    if (isFocused) return theme.colors.primary;
    return theme.colors.outline;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {label}
        </Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: getBorderColor(),
            borderWidth: isFocused ? 2 : 1,
          },
          isFocused && shadows.sm,
        ]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            color={theme.colors.onSurfaceVariant}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.onSurface,
              textAlign: isRTL() ? 'right' : 'left',
            },
            style,
          ]}
          placeholderTextColor={theme.colors.onSurfaceDisabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconButton}
          >
            <MaterialCommunityIcons
              name={rightIcon as any}
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {(error || helper) && (
        <Text
          style={[
            styles.helperText,
            { color: error ? theme.colors.error : theme.colors.onSurfaceVariant },
          ]}
        >
          {error || helper}
        </Text>
      )}
    </View>
  );
};

// Search Input component
interface SearchInputProps extends Omit<InputProps, 'icon' | 'rightIcon'> {
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeText,
  onClear,
  ...props
}) => {
  const theme = useTheme();

  return (
    <Input
      icon="magnify"
      rightIcon={value ? "close-circle" : undefined}
      onRightIconPress={onClear}
      value={value}
      onChangeText={onChangeText}
      placeholder="Search..."
      {...props}
    />
  );
};

// Select Input component (dropdown)
interface SelectInputProps {
  label?: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  error?: string;
  helper?: string;
  containerStyle?: ViewStyle;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  placeholder,
  onPress,
  error,
  helper,
  containerStyle,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.selectContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.outline,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.selectText,
            {
              color: value ? theme.colors.onSurface : theme.colors.onSurfaceDisabled,
            },
          ]}
        >
          {value || placeholder}
        </Text>
        
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>
      
      {(error || helper) && (
        <Text
          style={[
            styles.helperText,
            { color: error ? theme.colors.error : theme.colors.onSurfaceVariant },
          ]}
        >
          {error || helper}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: 'MartelSans_600SemiBold',
    marginBottom: spacing.xs,
    letterSpacing: 0.25,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'MartelSans_400Regular',
    paddingVertical: spacing.md,
  },
  rightIconButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'MartelSans_400Regular',
    marginTop: spacing.xs,
    marginLeft: spacing.md,
    letterSpacing: 0.4,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  selectText: {
    fontSize: 16,
    fontFamily: 'MartelSans_400Regular',
    flex: 1,
  },
});