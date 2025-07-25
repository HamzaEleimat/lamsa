import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import {
  isIOS,
  platformSelect,
  supportsHapticFeedback,
  keyboardBehavior,
  BORDER_RADIUS,
  SHADOW_STYLES,
  FONTS,
  SPACING,
  ANIMATION_DURATION,
  isRTL,
} from '@utils/platform';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;

interface PlatformModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  presentationStyle?: 'pageSheet' | 'formSheet' | 'fullScreen' | 'overFullScreen';
  showCloseButton?: boolean;
  showHandle?: boolean;
  enableSwipeDown?: boolean;
  avoidKeyboard?: boolean;
}

export default function PlatformModal({
  visible,
  onClose,
  title,
  children,
  presentationStyle = 'pageSheet',
  showCloseButton = true,
  showHandle = true,
  enableSwipeDown = true,
  avoidKeyboard = true,
}: PlatformModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return enableSwipeDown && gestureState.dy > 0 && Math.abs(gestureState.dx) < 50;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: async (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD) {
          if (supportsHapticFeedback) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = async () => {
    if (supportsHapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const getModalHeight = () => {
    switch (presentationStyle) {
      case 'fullScreen':
        return SCREEN_HEIGHT;
      case 'pageSheet':
        return SCREEN_HEIGHT * 0.9;
      case 'formSheet':
        return SCREEN_HEIGHT * 0.7;
      default:
        return SCREEN_HEIGHT;
    }
  };

  const modalHeight = getModalHeight();

  const renderIOSModal = () => (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View 
          style={[
            styles.backdrop,
            { opacity: backdropAnim },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.iosModalContainer,
          {
            height: modalHeight,
            transform: [
              { translateY: slideAnim },
              { translateY: translateY },
            ],
          },
        ]}
        {...(enableSwipeDown ? panResponder.panHandlers : {})}
      >
        <View 
          style={[
            styles.iosModal,
            { 
              backgroundColor: theme.colors.background,
              paddingTop: presentationStyle === 'fullScreen' ? insets.top : 0,
            }
          ]}
        >
          {showHandle && presentationStyle !== 'fullScreen' && (
            <View style={styles.handle} />
          )}

          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && (
                <Text style={[styles.title, { color: theme.colors.onBackground }]}>
                  {title}
                </Text>
              )}
              {showCloseButton && (
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          <KeyboardAvoidingView
            behavior={keyboardBehavior}
            style={styles.content}
            enabled={avoidKeyboard}
          >
            {children}
          </KeyboardAvoidingView>
        </View>
      </Animated.View>
    </Modal>
  );

  const renderAndroidModal = () => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={presentationStyle !== 'fullScreen'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {presentationStyle !== 'fullScreen' && (
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

      <View
        style={[
          styles.androidModalContainer,
          presentationStyle === 'fullScreen' && styles.fullScreen,
          {
            height: modalHeight,
            backgroundColor: theme.colors.background,
            paddingTop: presentationStyle === 'fullScreen' ? insets.top : 0,
          },
        ]}
      >
        {(title || showCloseButton) && (
          <View style={[styles.header, SHADOW_STYLES.small]}>
            {showCloseButton && (
              <TouchableOpacity
                onPress={handleClose}
                style={styles.androidBackButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={isRTL ? "arrow-right" : "arrow-left"}
                  size={24}
                  color={theme.colors.onBackground}
                />
              </TouchableOpacity>
            )}
            {title && (
              <Text style={[styles.androidTitle, { color: theme.colors.onBackground }]}>
                {title}
              </Text>
            )}
          </View>
        )}

        <KeyboardAvoidingView
          behavior={keyboardBehavior}
          style={styles.content}
          enabled={avoidKeyboard}
        >
          {children}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  return isIOS ? renderIOSModal() : renderAndroidModal();
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  // iOS Styles
  iosModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  iosModal: {
    flex: 1,
    borderTopLeftRadius: BORDER_RADIUS.large,
    borderTopRightRadius: BORDER_RADIUS.large,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  
  // Android Styles
  androidModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BORDER_RADIUS.large,
    borderTopRightRadius: BORDER_RADIUS.large,
    overflow: 'hidden',
  },
  fullScreen: {
    borderRadius: 0,
  },
  androidBackButton: {
    padding: SPACING.sm,
  },
  androidTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    marginStart: SPACING.sm,
  },
  
  // Common Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 56,
  },
  title: {
    fontSize: platformSelect({
      ios: 17,
      android: 20,
      default: 18,
    }) as number,
    fontWeight: platformSelect({
      ios: '600',
      android: '500',
      default: '600',
    }) as '600' | '500',
    fontFamily: isRTL ? FONTS.arabic : FONTS.regular,
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.md,
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
  },
});