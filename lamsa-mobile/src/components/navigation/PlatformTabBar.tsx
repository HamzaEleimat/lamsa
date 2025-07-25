import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  Platform,
  ViewStyle,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { 
  isIOS,
  isAndroid,
  platformSelect,
  supportsHapticFeedback,
  TAB_BAR_HEIGHT,
  SHADOW_STYLES,
  FONTS,
  SPACING,
  ANIMATION_DURATION,
  isRTL,
} from '@utils/platform';

interface TabItemProps {
  route: any;
  index: number;
  isFocused: boolean;
  options: any;
  onPress: () => void;
  onLongPress: () => void;
  color: string;
}

const TabItem: React.FC<TabItemProps> = ({
  route,
  index,
  isFocused,
  options,
  onPress,
  onLongPress,
  color,
}) => {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.05 : 1,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: isFocused ? 1 : 0.7,
        duration: ANIMATION_DURATION / 2,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const handlePress = async () => {
    if (supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const label = options.tabBarLabel !== undefined
    ? options.tabBarLabel
    : options.title !== undefined
    ? options.title
    : route.name;

  const iconSize = platformSelect({
    ios: 25,
    android: 24,
    default: 24,
  }) as number;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {options.tabBarIcon && options.tabBarIcon({
          focused: isFocused,
          color: isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant,
          size: iconSize,
        })}
        
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant,
              fontFamily: isRTL ? FONTS.arabic : FONTS.regular,
              fontWeight: isFocused ? '600' : '400',
            },
          ]}
        >
          {label}
        </Text>
        
        {isFocused && isIOS && (
          <View style={[styles.iosIndicator, { backgroundColor: theme.colors.primary }]} />
        )}
      </Animated.View>
      
      {isFocused && isAndroid && (
        <View style={[styles.androidIndicator, { backgroundColor: theme.colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

export default function PlatformTabBar({ 
  state, 
  descriptors, 
  navigation,
  ...props 
}: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const tabBarStyle: ViewStyle = {
    ...platformSelect({
      ios: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
      },
      android: {
        backgroundColor: theme.colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.surfaceVariant,
        ...SHADOW_STYLES.medium,
      },
    }),
    height: TAB_BAR_HEIGHT + insets.bottom,
    paddingBottom: insets.bottom,
  };

  const renderIOSTabBar = () => (
    <BlurView 
      intensity={100} 
      tint="light"
      style={[styles.container, tabBarStyle]}
    >
      <View style={styles.tabsContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              route={route}
              index={index}
              isFocused={isFocused}
              options={options}
              onPress={onPress}
              onLongPress={onLongPress}
              color={theme.colors.primary}
            />
          );
        })}
      </View>
    </BlurView>
  );

  const renderAndroidTabBar = () => (
    <View style={[styles.container, tabBarStyle]}>
      <View style={styles.tabsContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              route={route}
              index={index}
              isFocused={isFocused}
              options={options}
              onPress={onPress}
              onLongPress={onLongPress}
              color={theme.colors.primary}
            />
          );
        })}
      </View>
    </View>
  );

  return isIOS ? renderIOSTabBar() : renderAndroidTabBar();
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: platformSelect({
      ios: 10,
      android: 12,
      default: 12,
    }) as number,
    marginTop: SPACING.xs / 2,
  },
  iosIndicator: {
    position: 'absolute',
    top: -8,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  androidIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});