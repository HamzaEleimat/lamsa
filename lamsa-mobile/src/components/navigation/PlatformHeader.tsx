import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { 
  isIOS, 
  isAndroid, 
  platformSelect, 
  HEADER_HEIGHT,
  SHADOW_STYLES,
  FONTS,
  SPACING,
  isRTL,
} from '@utils/platform';

interface PlatformHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
  transparent?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  largeTitle?: boolean; // iOS-style large title
}

export default function PlatformHeader({
  title,
  subtitle,
  showBackButton = true,
  onBackPress,
  rightAction,
  transparent = false,
  style,
  titleStyle,
  largeTitle = false,
}: PlatformHeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const headerHeight = platformSelect({
    ios: largeTitle ? 96 : HEADER_HEIGHT,
    android: HEADER_HEIGHT,
    default: HEADER_HEIGHT,
  }) as number;

  const headerStyle: ViewStyle = {
    ...platformSelect({
      ios: {
        backgroundColor: transparent ? 'transparent' : theme.colors.background,
        borderBottomWidth: transparent ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.surfaceVariant,
      },
      android: {
        backgroundColor: transparent ? 'transparent' : theme.colors.primary,
        ...(!transparent && SHADOW_STYLES.small),
      },
    }),
    paddingTop: insets.top,
    height: headerHeight + insets.top,
  };

  const titleStyles: TextStyle[] = [
    styles.title,
    platformSelect({
      ios: {
        fontSize: largeTitle ? 34 : 17,
        fontWeight: largeTitle ? '700' : '600',
        color: theme.colors.onBackground,
      },
      android: {
        fontSize: 20,
        fontWeight: '500',
        color: transparent ? theme.colors.onBackground : theme.colors.onPrimary,
      },
    }) as TextStyle,
    { fontFamily: isRTL ? FONTS.arabic : FONTS.regular },
    titleStyle,
  ];

  const backButtonIcon = platformSelect({
    ios: isRTL ? 'chevron-right' : 'chevron-left',
    android: isRTL ? 'arrow-right' : 'arrow-left',
    default: 'arrow-left',
  });

  const renderIOSHeader = () => (
    <View style={[headerStyle, style]}>
      <View style={styles.iosContainer}>
        {showBackButton && navigation.canGoBack() && (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.iosBackButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={backButtonIcon}
              size={28}
              color={theme.colors.primary}
            />
            {!largeTitle && (
              <Text style={[styles.iosBackText, { color: theme.colors.primary }]}>
                {isRTL ? 'التالي' : 'Back'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        
        {!largeTitle && (
          <View style={styles.iosTitleContainer}>
            <Text style={titleStyles} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                {subtitle}
              </Text>
            )}
          </View>
        )}
        
        {rightAction && (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.rightAction}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={rightAction.icon}
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {largeTitle && (
        <View style={styles.largeTitleContainer}>
          <Text style={titleStyles}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const renderAndroidHeader = () => (
    <View style={[headerStyle, style]}>
      <View style={styles.androidContainer}>
        {showBackButton && navigation.canGoBack() && (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.androidBackButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={backButtonIcon}
              size={24}
              color={transparent ? theme.colors.onBackground : 'white'}
            />
          </TouchableOpacity>
        )}
        
        <View style={styles.androidTitleContainer}>
          <Text style={titleStyles} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text 
              style={[
                styles.subtitle, 
                { color: transparent ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.8)' }
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
        
        {rightAction && (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.rightAction}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={rightAction.icon}
              size={24}
              color={transparent ? theme.colors.onBackground : 'white'}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return isIOS ? renderIOSHeader() : renderAndroidHeader();
}

const styles = StyleSheet.create({
  // iOS Styles
  iosContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  iosBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: -SPACING.sm,
  },
  iosBackText: {
    fontSize: 17,
    marginStart: -4,
  },
  iosTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeTitleContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  
  // Android Styles
  androidContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  androidBackButton: {
    padding: SPACING.sm,
  },
  androidTitleContainer: {
    flex: 1,
    marginStart: SPACING.sm,
  },
  
  // Common Styles
  title: {
    textAlign: platformSelect({
      ios: 'center',
      android: 'left',
      default: 'left',
    }) as 'center' | 'left',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: platformSelect({
      ios: 'center',
      android: 'left',
      default: 'left',
    }) as 'center' | 'left',
  },
  rightAction: {
    padding: SPACING.sm,
    marginEnd: -SPACING.sm,
  },
});