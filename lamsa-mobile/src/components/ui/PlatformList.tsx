import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableHighlight,
  TouchableOpacity,
  ViewStyle,
  SectionList,
  FlatList,
  SectionListData,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  isIOS,
  platformSelect,
  supportsHapticFeedback,
  BORDER_RADIUS,
  isRTL,
} from '@utils/platform';
import {
  getTypography,
  spacing,
} from '@styles/platform';

// List Item Component
interface PlatformListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  rightText?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  showDivider?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export function PlatformListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon = isIOS ? 'chevron-right' : undefined,
  rightText,
  onPress,
  onLongPress,
  disabled = false,
  selected = false,
  showDivider = true,
  style,
  testID,
  accessibilityLabel,
}: PlatformListItemProps) {
  const theme = useTheme();

  const handlePress = async () => {
    if (!onPress || disabled) return;

    if (supportsHapticFeedback) {
      await Haptics.selectionAsync();
    }

    onPress();
  };

  const content = (
    <View
      style={[
        styles.listItem,
        selected && { backgroundColor: theme.colors.primaryContainer },
        disabled && styles.listItemDisabled,
        style,
      ]}
    >
      {leftIcon && (
        <MaterialCommunityIcons
          name={leftIcon}
          size={24}
          color={
            disabled
              ? theme.colors.onSurfaceDisabled
              : selected
              ? theme.colors.onPrimaryContainer
              : theme.colors.onSurfaceVariant
          }
          style={styles.leftIcon}
        />
      )}

      <View style={styles.listItemContent}>
        <Text
          style={[
            styles.listItemTitle,
            {
              color: disabled
                ? theme.colors.onSurfaceDisabled
                : selected
                ? theme.colors.onPrimaryContainer
                : theme.colors.onSurface,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        
        {subtitle && (
          <Text
            style={[
              styles.listItemSubtitle,
              {
                color: disabled
                  ? theme.colors.onSurfaceDisabled
                  : theme.colors.onSurfaceVariant,
              },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {rightText && (
        <Text
          style={[
            styles.rightText,
            {
              color: disabled
                ? theme.colors.onSurfaceDisabled
                : theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {rightText}
        </Text>
      )}

      {rightIcon && (
        <MaterialCommunityIcons
          name={rightIcon}
          size={20}
          color={theme.colors.onSurfaceVariant}
          style={styles.rightIcon}
        />
      )}
    </View>
  );

  if (onPress || onLongPress) {
    const TouchableComponent = isIOS ? TouchableHighlight : TouchableOpacity;
    
    return (
      <>
        <TouchableComponent
          onPress={handlePress}
          onLongPress={onLongPress}
          disabled={disabled}
          underlayColor={theme.colors.surfaceVariant}
          activeOpacity={0.7}
          testID={testID}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityRole="button"
          accessibilityState={{ disabled, selected }}
        >
          {content}
        </TouchableComponent>
        {showDivider && <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />}
      </>
    );
  }

  return (
    <>
      {content}
      {showDivider && <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />}
    </>
  );
}

// Section Header Component
interface PlatformListSectionProps {
  title: string;
  style?: ViewStyle;
}

export function PlatformListSection({ title, style }: PlatformListSectionProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.sectionHeader,
        { backgroundColor: theme.colors.surface },
        style,
      ]}
    >
      <Text
        style={[
          styles.sectionTitle,
          { color: theme.colors.onSurfaceVariant },
        ]}
      >
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

// List Container Component
interface PlatformListProps {
  children: React.ReactNode;
  style?: ViewStyle;
  inset?: boolean;
}

export function PlatformList({ children, style, inset = false }: PlatformListProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.listContainer,
        inset && styles.listInset,
        { backgroundColor: theme.colors.surface },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Flat List Component
interface PlatformFlatListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor?: (item: T, index: number) => string;
  ItemSeparatorComponent?: React.ComponentType<any>;
  ListHeaderComponent?: React.ComponentType<any>;
  ListFooterComponent?: React.ComponentType<any>;
  ListEmptyComponent?: React.ComponentType<any>;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export function PlatformFlatList<T>({
  data,
  renderItem,
  keyExtractor,
  ItemSeparatorComponent,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  refreshing,
  onRefresh,
  onEndReached,
  onEndReachedThreshold = 0.5,
  style,
  contentContainerStyle,
}: PlatformFlatListProps<T>) {
  const theme = useTheme();

  return (
    <FlatList
      data={data}
      renderItem={({ item, index }) => renderItem(item, index)}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={ItemSeparatorComponent || (() => (
        <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
      ))}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      style={[{ backgroundColor: theme.colors.background }, style]}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={!isIOS}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
  },
  listInset: {
    marginHorizontal: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: platformSelect({
      ios: 44,
      android: 56,
    }),
  },
  listItemDisabled: {
    opacity: 0.5,
  },
  leftIcon: {
    marginRight: spacing.md,
  },
  listItemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  listItemTitle: {
    ...getTypography('body1'),
  },
  listItemSubtitle: {
    ...getTypography('body2'),
    marginTop: spacing.xxs,
  },
  rightText: {
    ...getTypography('body2'),
    marginRight: spacing.xs,
  },
  rightIcon: {
    marginLeft: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...platformSelect({
      ios: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
      },
      android: {
        paddingVertical: spacing.sm,
      },
    }),
  },
  sectionTitle: {
    ...platformSelect({
      ios: {
        ...getTypography('caption'),
        letterSpacing: 0.5,
      },
      android: {
        ...getTypography('overline'),
      },
    }),
  },
});