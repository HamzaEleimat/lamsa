import { Platform, Linking, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as Contacts from 'expo-contacts';
import * as Calendar from 'expo-calendar';
import { isIOS, isAndroid } from './core';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PermissionResult {
  status: PermissionStatus;
  canAskAgain: boolean;
}

export type PermissionType = 
  | 'location' 
  | 'camera' 
  | 'photos' 
  | 'notifications' 
  | 'contacts' 
  | 'calendar';

// Unified permission checking
export async function checkPermission(type: PermissionType): Promise<PermissionResult> {
  switch (type) {
    case 'location':
      return checkLocationPermission();
    case 'camera':
      return checkCameraPermission();
    case 'photos':
      return checkPhotosPermission();
    case 'notifications':
      return checkNotificationPermission();
    case 'contacts':
      return checkContactsPermission();
    case 'calendar':
      return checkCalendarPermission();
  }
}

// Request permission with proper handling
export async function requestPermission(
  type: PermissionType,
  options?: {
    title?: string;
    message?: string;
    showRationale?: boolean;
  }
): Promise<PermissionResult> {
  // Check current status first
  const currentStatus = await checkPermission(type);
  
  if (currentStatus.status === 'granted') {
    return currentStatus;
  }
  
  // Show rationale if needed
  if (options?.showRationale && currentStatus.status === 'denied' && !currentStatus.canAskAgain) {
    showPermissionRationale(type, options.title, options.message);
    return currentStatus;
  }
  
  // Request the permission
  switch (type) {
    case 'location':
      return requestLocationPermission();
    case 'camera':
      return requestCameraPermission();
    case 'photos':
      return requestPhotosPermission();
    case 'notifications':
      return requestNotificationPermission();
    case 'contacts':
      return requestContactsPermission();
    case 'calendar':
      return requestCalendarPermission();
  }
}

// Location permissions
async function checkLocationPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

async function requestLocationPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

// Camera permissions
async function checkCameraPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

async function requestCameraPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

// Photos permissions
async function checkPhotosPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

async function requestPhotosPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

// Notification permissions
async function checkNotificationPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

async function requestNotificationPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

// Contacts permissions
async function checkContactsPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Contacts.getPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

async function requestContactsPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

// Calendar permissions
async function checkCalendarPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Calendar.getCalendarPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

async function requestCalendarPermission(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();
  return {
    status: mapExpoStatus(status),
    canAskAgain: canAskAgain ?? true,
  };
}

// Helper to map Expo permission status
function mapExpoStatus(status: string): PermissionStatus {
  switch (status) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    default:
      return 'undetermined';
  }
}

// Show permission rationale and guide to settings
function showPermissionRationale(
  type: PermissionType,
  title?: string,
  message?: string
): void {
  const defaultMessages: Record<PermissionType, { title: string; message: string }> = {
    location: {
      title: 'Location Access Required',
      message: 'Lamsa needs access to your location to find nearby beauty service providers.',
    },
    camera: {
      title: 'Camera Access Required',
      message: 'Lamsa needs access to your camera to take photos for your profile and services.',
    },
    photos: {
      title: 'Photo Library Access Required',
      message: 'Lamsa needs access to your photos to select images for your profile.',
    },
    notifications: {
      title: 'Notifications Required',
      message: 'Lamsa needs to send you notifications about your bookings and appointments.',
    },
    contacts: {
      title: 'Contacts Access Required',
      message: 'Lamsa needs access to your contacts to help you share services with friends.',
    },
    calendar: {
      title: 'Calendar Access Required',
      message: 'Lamsa needs access to your calendar to schedule your beauty appointments.',
    },
  };
  
  const { title: defaultTitle, message: defaultMessage } = defaultMessages[type];
  
  Alert.alert(
    title || defaultTitle,
    `${message || defaultMessage}\n\nPlease go to Settings to enable this permission.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: openAppSettings },
    ]
  );
}

// Open app settings
export function openAppSettings(): void {
  if (isIOS) {
    Linking.openURL('app-settings:');
  } else if (isAndroid) {
    Linking.openSettings();
  }
}

// Check if we can open settings
export function canOpenSettings(): boolean {
  return isIOS || (isAndroid && Platform.Version >= 26);
}

// Batch permission checking
export async function checkMultiplePermissions(
  permissions: PermissionType[]
): Promise<Record<PermissionType, PermissionResult>> {
  const results = await Promise.all(
    permissions.map(async (type) => ({
      type,
      result: await checkPermission(type),
    }))
  );
  
  return results.reduce((acc, { type, result }) => {
    acc[type] = result;
    return acc;
  }, {} as Record<PermissionType, PermissionResult>);
}

// Check if all required permissions are granted
export async function hasAllPermissions(permissions: PermissionType[]): Promise<boolean> {
  const results = await checkMultiplePermissions(permissions);
  return Object.values(results).every(result => result.status === 'granted');
}