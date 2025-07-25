import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Battery from 'expo-battery';
import NetInfo from '@react-native-community/netinfo';
import { DeviceEventEmitter } from 'react-native';
import { isIOS, isAndroid } from './core';

export interface DeviceInfo {
  brand: string | null;
  modelName: string | null;
  osVersion: string | null;
  deviceId: string | null;
  isEmulator: boolean;
  appVersion: string | null;
  buildNumber: string | null;
  totalMemory: number | null;
}

export interface NetworkInfo {
  isConnected: boolean;
  type: string | null;
  isWifi: boolean;
  isCellular: boolean;
}

// Get comprehensive device information
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const [deviceId, totalMemory] = await Promise.all([
    getDeviceId(),
    Device.getTotalMemoryAsync?.() || Promise.resolve(null),
  ]);

  return {
    brand: Device.brand,
    modelName: Device.modelName,
    osVersion: Device.osVersion,
    deviceId,
    isEmulator: !Device.isDevice,
    appVersion: Application.nativeApplicationVersion,
    buildNumber: Application.nativeBuildVersion,
    totalMemory,
  };
}

// Get unique device identifier
async function getDeviceId(): Promise<string | null> {
  try {
    if (isIOS) {
      return await Application.getIosIdForVendorAsync();
    }
    if (isAndroid) {
      return Application.androidId;
    }
    return null;
  } catch {
    return null;
  }
}

// Network connectivity
export async function getNetworkInfo(): Promise<NetworkInfo> {
  const netInfo = await NetInfo.fetch();
  
  return {
    isConnected: netInfo.isConnected ?? false,
    type: netInfo.type,
    isWifi: netInfo.type === 'wifi',
    isCellular: netInfo.type === 'cellular',
  };
}

export async function isConnected(): Promise<boolean> {
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected ?? false;
}

// Subscribe to connectivity changes
export function subscribeToConnectivity(
  callback: (isConnected: boolean) => void
): () => void {
  const unsubscribe = NetInfo.addEventListener(state => {
    callback(state.isConnected ?? false);
  });
  return unsubscribe;
}

// Battery level (useful for power-intensive operations)
export async function getBatteryInfo(): Promise<{
  level: number | null;
  isCharging: boolean;
  lowPowerMode: boolean;
}> {
  try {
    const [level, state, lowPowerMode] = await Promise.all([
      Battery.getBatteryLevelAsync(),
      Battery.getBatteryStateAsync(),
      Battery.isLowPowerModeEnabledAsync(),
    ]);

    return {
      level,
      isCharging: state === Battery.BatteryState.CHARGING || 
                  state === Battery.BatteryState.FULL,
      lowPowerMode,
    };
  } catch {
    return {
      level: null,
      isCharging: false,
      lowPowerMode: false,
    };
  }
}

// Subscribe to battery level changes
export function subscribeToBatteryLevel(
  callback: (level: number) => void
): () => void {
  const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
    callback(batteryLevel);
  });
  
  return subscription.remove;
}

// Memory warnings (iOS only)
export function addMemoryWarningListener(callback: () => void): () => void {
  if (isIOS) {
    DeviceEventEmitter.addListener('memoryWarning', callback);
    return () => DeviceEventEmitter.removeListener('memoryWarning', callback);
  }
  // Android doesn't have a direct equivalent
  return () => {};
}

// Check if device has enough storage
export async function hasEnoughStorage(requiredMB: number = 100): Promise<boolean> {
  try {
    const diskInfo = await Device.getAvailableInternalMemoryAsync?.();
    if (diskInfo) {
      const availableMB = diskInfo / (1024 * 1024);
      return availableMB >= requiredMB;
    }
  } catch {
    // If we can't check, assume it's ok
  }
  return true;
}

// Device capabilities
export function getDeviceCapabilities() {
  return {
    hasCamera: Device.isDevice, // Simulators don't have cameras
    hasTouchID: isIOS && Device.modelName?.includes('iPhone') && !Device.modelName.includes('X'),
    hasFaceID: isIOS && (Device.modelName?.includes('iPhone X') || 
                         Device.modelName?.includes('iPhone 1')), // iPhone 11, 12, 13, 14, 15
    hasNFC: isIOS || (isAndroid && Device.platformApiLevel && Device.platformApiLevel >= 19),
    supportsPictureInPicture: isIOS && Device.osVersion && parseFloat(Device.osVersion) >= 14,
  };
}

// Performance monitoring helpers
export function isLowEndDevice(): boolean {
  // Check total memory (less than 2GB is considered low-end)
  const totalMemory = Device.totalMemory;
  if (totalMemory && totalMemory < 2 * 1024 * 1024 * 1024) {
    return true;
  }
  
  // Check specific device models known to be low-end
  const modelName = Device.modelName?.toLowerCase() || '';
  const lowEndModels = ['iphone 6', 'iphone 7', 'iphone se'];
  
  return lowEndModels.some(model => modelName.includes(model));
}