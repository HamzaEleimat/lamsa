import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
  ImageBackground,
  Image,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  isIOS,
  platformSelect,
  supportsHapticFeedback,
  BORDER_RADIUS,
} from '@utils/platform';
import {
  getTypography,
  spacing,
  shadowPresets,
  animations,
  animationUtils,
} from '@styles/platform';

interface PlatformCardProps {
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  imagePosition?: 'top' | 'left' | 'background';
  icon?: string;
  iconColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  elevated?: boolean;
  variant?: 'filled' | 'outlined' | 'elevated';
  actions?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export default function PlatformCard({
  title,
  subtitle,
  description,
  image,
  imagePosition = 'top',
  icon,
  iconColor,
  onPress,
  onLongPress,
  elevated = true,
  variant = 'elevated',
  actions,
  children,
  style,
  contentStyle,
  disabled = false,
  testID,
  accessibilityLabel,
}: PlatformCardProps) {
  const theme = useTheme();
  const scaleAnim = useRef(animationUtils.createValue(1)).current;

  const handlePressIn = () => {
    animations.scale(scaleAnim, 0.98, { type: 'gentle' }).start();
  };

  const handlePressOut = () => {
    animations.spring(scaleAnim, 1, { type: 'bouncy' }).start();
  };

  const handlePress = async () => {
    if (!onPress || disabled) return;

    if (supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  const handleLongPress = async () => {
    if (!onLongPress || disabled) return;

    if (supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onLongPress();
  };

  const getCardStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.card];

    switch (variant) {
      case 'filled':
        baseStyle.push({
          backgroundColor: theme.colors.surfaceVariant,
        });
        break;
      case 'outlined':
        baseStyle.push({
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        });
        break;
      case 'elevated':
        baseStyle.push({
          backgroundColor: theme.colors.surface,
          ...shadowPresets.card,
        });
        break;
    }

    if (disabled) {
      baseStyle.push(styles.cardDisabled);
    }

    return baseStyle;
  };

  const renderImage = () => {
    if (!image) return null;

    if (imagePosition === 'background') {
      return null; // Handled in wrapper
    }

    const imageElement = (
      <Image
        source={{ uri: image }}
        style={
          imagePosition === 'top'
            ? styles.imageTop
            : [styles.imageLeft, { backgroundColor: theme.colors.surfaceVariant }]
        }
        resizeMode="cover"
      />
    );

    if (imagePosition === 'left') {
      return <View style={styles.imageLeftContainer}>{imageElement}</View>;
    }

    return imageElement;
  };

  const renderContent = () => (
    <>
      {imagePosition === 'top' && renderImage()}
      
      <View style={[styles.content, contentStyle]}>
        {imagePosition === 'left' && renderImage()}
        
        <View style={styles.textContent}>
          {(icon || title || subtitle) && (
            <View style={styles.header}>
              {icon && (
                <MaterialCommunityIcons
                  name={icon}
                  size={24}
                  color={iconColor || theme.colors.primary}
                  style={styles.icon}
                />
              )}
              
              <View style={styles.headerText}>
                {title && (
                  <Text
                    style={[styles.title, { color: theme.colors.onSurface }]}
                    numberOfLines={2}
                  >
                    {title}
                  </Text>
                )}
                
                {subtitle && (
                  <Text
                    style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
          )}
          
          {description && (
            <Text
              style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={3}
            >
              {description}
            </Text>
          )}
          
          {children}
        </View>
      </View>
      
      {actions && (
        <View style={styles.actions}>
          {actions}
        </View>
      )}
    </>
  );

  const cardContent = (
    <Animated.View
      style={[
        ...getCardStyle(),
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
      testID={testID}
    >
      {image && imagePosition === 'background' ? (
        <ImageBackground
          source={{ uri: image }}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <View style={styles.backgroundOverlay}>
            {renderContent()}
          </View>
        </ImageBackground>
      ) : (
        renderContent()
      )}
    </Animated.View>
  );

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  content: {
    padding: spacing.md,
  },
  imageTop: {
    width: '100%',
    height: 200,
  },
  imageLeftContainer: {
    marginRight: spacing.md,
  },
  imageLeft: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.small,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    borderRadius: BORDER_RADIUS.medium,
  },
  backgroundOverlay: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    flex: 1,
  },
  textContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  icon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...getTypography('h6'),
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...getTypography('body2'),
  },
  description: {
    ...getTypography('body2'),
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: spacing.sm,
    paddingTop: 0,
  },
});