import { Platform, Dimensions, StatusBar, I18nManager } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { PlatformValue } from './types';

// Platform detection
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

// Platform version helpers
export const iosVersion = isIOS ? parseInt(Platform.Version.toString(), 10) : 0;
export const androidVersion = isAndroid ? (typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10)) : 0;

// Type-safe platform selector
export function platformSelect<T>(options: PlatformValue<T>): T | undefined {
  if (isIOS && options.ios !== undefined) return options.ios;
  if (isAndroid && options.android !== undefined) return options.android;
  if (isWeb && options.web !== undefined) return options.web;
  return options.default;
}

// Screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
export { screenWidth, screenHeight };

// Safe area and status bar
export function getStatusBarHeight(): number {
  if (isIOS) {
    return Constants.statusBarHeight || 44;
  }
  if (isAndroid) {
    return StatusBar.currentHeight || 24;
  }
  return 0;
}

// Device type detection based on screen dimensions
// Generally tablets have a diagonal of 7 inches or more
function getDeviceType(): { isTablet: boolean; isPhone: boolean } {
  const { width, height } = Dimensions.get('window');
  const aspectRatio = height / width;
  const diagonal = Math.sqrt(width * width + height * height);
  
  // Rough heuristic: tablets typically have larger diagonal and different aspect ratio
  const isTablet = diagonal >= 600 || (aspectRatio < 1.5 && diagonal > 500);
  
  return {
    isTablet,
    isPhone: !isTablet
  };
}

const deviceType = getDeviceType();
export const isTablet = deviceType.isTablet;
export const isPhone = deviceType.isPhone;

// Orientation helpers
export function isLandscape(): boolean {
  const { width, height } = Dimensions.get('window');
  return width > height;
}

// Platform-specific feature detection
export const supportsFaceID = isIOS && Device.isDevice && iosVersion >= 11;
export const supportsFingerprint = (isIOS && iosVersion >= 8) || (isAndroid && androidVersion >= 23);
export const supportsHapticFeedback = isIOS || (isAndroid && androidVersion >= 26);

// RTL detection (important for Arabic support)
export const isRTL = I18nManager.isRTL;

// Helper for platform-specific file imports
export function requirePlatformModule<T>(
  iosModule: () => T,
  androidModule: () => T,
  defaultModule?: () => T
): T {
  if (isIOS) return iosModule();
  if (isAndroid) return androidModule();
  if (defaultModule) return defaultModule();
  throw new Error('No module available for current platform');
}

// Check if device has a notch (iPhone X and later)
export function hasNotch(): boolean {
  if (isIOS) {
    const statusBarHeight = getStatusBarHeight();
    return statusBarHeight > 40;
  }
  return false;
}

// Get safe area insets
export function getSafeAreaInsets() {
  const statusBarHeight = getStatusBarHeight();
  return {
    top: statusBarHeight,
    bottom: hasNotch() ? 34 : 0,
    left: 0,
    right: 0,
  };
}

// Platform-specific keyboard behavior
export const keyboardBehavior = platformSelect({
  ios: 'padding' as const,
  android: 'height' as const,
  default: 'padding' as const,
});

// Check if running in Expo Go
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Get platform-specific file extension
export function getPlatformExtension(): string {
  if (isIOS) return '.ios';
  if (isAndroid) return '.android';
  return '';
}