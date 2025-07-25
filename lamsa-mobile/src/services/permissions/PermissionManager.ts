import { Platform, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as Contacts from 'expo-contacts';
import * as Calendar from 'expo-calendar';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isIOS, isAndroid, isRTL } from '@utils/platform';

// Permission types
export type PermissionType = 
  | 'location' 
  | 'locationBackground'
  | 'camera' 
  | 'photos' 
  | 'notifications' 
  | 'contacts' 
  | 'calendar'
  | 'microphone'
  | 'mediaLibrary';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

export interface PermissionResult {
  status: PermissionStatus;
  canAskAgain: boolean;
  lastAsked?: Date;
}

export interface PermissionRequest {
  type: PermissionType;
  title?: string;
  message?: string;
  buttonPositive?: string;
  buttonNegative?: string;
  showRationale?: boolean;
}

// Storage keys for tracking permission requests
const PERMISSION_STORAGE_PREFIX = '@lamsa/permission/';

class PermissionManager {
  private static instance: PermissionManager;

  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  // Check permission status
  async check(type: PermissionType): Promise<PermissionResult> {
    try {
      switch (type) {
        case 'location':
          return this.checkLocation();
        case 'locationBackground':
          return this.checkLocationBackground();
        case 'camera':
          return this.checkCamera();
        case 'photos':
          return this.checkPhotos();
        case 'notifications':
          return this.checkNotifications();
        case 'contacts':
          return this.checkContacts();
        case 'calendar':
          return this.checkCalendar();
        case 'microphone':
          return this.checkMicrophone();
        case 'mediaLibrary':
          return this.checkMediaLibrary();
        default:
          throw new Error(`Unknown permission type: ${type}`);
      }
    } catch (error) {
      console.error(`Error checking permission ${type}:`, error);
      return { status: 'undetermined', canAskAgain: true };
    }
  }

  // Request permission
  async request(request: PermissionRequest): Promise<PermissionResult> {
    const { type, showRationale = true } = request;
    
    // Check current status
    const currentStatus = await this.check(type);
    
    if (currentStatus.status === 'granted') {
      return currentStatus;
    }
    
    // Check if we've asked before and can't ask again
    if (currentStatus.status === 'denied' && !currentStatus.canAskAgain) {
      if (showRationale) {
        await this.showPermissionRationale(request);
      }
      return currentStatus;
    }
    
    // Track that we're asking for this permission
    await this.trackPermissionRequest(type);
    
    // Request the permission
    try {
      switch (type) {
        case 'location':
          return this.requestLocation();
        case 'locationBackground':
          return this.requestLocationBackground();
        case 'camera':
          return this.requestCamera();
        case 'photos':
          return this.requestPhotos();
        case 'notifications':
          return this.requestNotifications();
        case 'contacts':
          return this.requestContacts();
        case 'calendar':
          return this.requestCalendar();
        case 'microphone':
          return this.requestMicrophone();
        case 'mediaLibrary':
          return this.requestMediaLibrary();
        default:
          throw new Error(`Unknown permission type: ${type}`);
      }
    } catch (error) {
      console.error(`Error requesting permission ${type}:`, error);
      return { status: 'denied', canAskAgain: false };
    }
  }

  // Request multiple permissions
  async requestMultiple(
    permissions: PermissionRequest[]
  ): Promise<Record<PermissionType, PermissionResult>> {
    const results: Record<string, PermissionResult> = {};
    
    for (const permission of permissions) {
      results[permission.type] = await this.request(permission);
    }
    
    return results;
  }

  // Check if all permissions are granted
  async hasAll(types: PermissionType[]): Promise<boolean> {
    const results = await Promise.all(types.map(type => this.check(type)));
    return results.every(result => result.status === 'granted');
  }

  // Check if any permission is granted
  async hasAny(types: PermissionType[]): Promise<boolean> {
    const results = await Promise.all(types.map(type => this.check(type)));
    return results.some(result => result.status === 'granted');
  }

  // Open app settings
  openSettings(): void {
    if (isIOS) {
      Linking.openURL('app-settings:');
    } else if (isAndroid) {
      Linking.openSettings();
    }
  }

  // Private methods for each permission type

  private async checkLocation(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async requestLocation(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async checkLocationBackground(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Location.getBackgroundPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async requestLocationBackground(): Promise<PermissionResult> {
    // Must have foreground location first
    const foreground = await this.checkLocation();
    if (foreground.status !== 'granted') {
      return { status: 'denied', canAskAgain: false };
    }
    
    const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async checkCamera(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async requestCamera(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async checkPhotos(): Promise<PermissionResult> {
    const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async requestPhotos(): Promise<PermissionResult> {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async checkNotifications(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async requestNotifications(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async checkContacts(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Contacts.getPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async requestContacts(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async checkCalendar(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Calendar.getCalendarPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async requestCalendar(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async checkMicrophone(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Camera.getMicrophonePermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async requestMicrophone(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Camera.requestMicrophonePermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async checkMediaLibrary(): Promise<PermissionResult> {
    const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  private async requestMediaLibrary(): Promise<PermissionResult> {
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
    return {
      status: this.mapExpoStatus(status),
      canAskAgain: canAskAgain ?? true,
    };
  }

  // Helper methods

  private mapExpoStatus(status: string): PermissionStatus {
    switch (status) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'restricted':
        return 'restricted';
      default:
        return 'undetermined';
    }
  }

  private async trackPermissionRequest(type: PermissionType): Promise<void> {
    const key = `${PERMISSION_STORAGE_PREFIX}${type}`;
    const data = {
      lastAsked: new Date().toISOString(),
      count: 1,
    };
    
    try {
      const existing = await AsyncStorage.getItem(key);
      if (existing) {
        const parsed = JSON.parse(existing);
        data.count = (parsed.count || 0) + 1;
      }
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error tracking permission request:', error);
    }
  }

  private async showPermissionRationale(request: PermissionRequest): Promise<void> {
    const { type, title, message, buttonPositive, buttonNegative } = request;
    
    const defaultMessages = this.getDefaultMessages(type);
    
    Alert.alert(
      title || defaultMessages.title,
      `${message || defaultMessages.message}\n\n${
        isRTL 
          ? 'يرجى الذهاب إلى الإعدادات لتمكين هذا الإذن.'
          : 'Please go to Settings to enable this permission.'
      }`,
      [
        {
          text: buttonNegative || (isRTL ? 'إلغاء' : 'Cancel'),
          style: 'cancel',
        },
        {
          text: buttonPositive || (isRTL ? 'فتح الإعدادات' : 'Open Settings'),
          onPress: () => this.openSettings(),
        },
      ]
    );
  }

  private getDefaultMessages(type: PermissionType): { title: string; message: string } {
    const messages: Record<PermissionType, { title: string; message: string }> = {
      location: {
        title: isRTL ? 'الوصول إلى الموقع مطلوب' : 'Location Access Required',
        message: isRTL 
          ? 'تحتاج لمسة إلى الوصول إلى موقعك للعثور على مقدمي خدمات التجميل القريبين.'
          : 'Lamsa needs access to your location to find nearby beauty service providers.',
      },
      locationBackground: {
        title: isRTL ? 'الوصول إلى الموقع في الخلفية' : 'Background Location Access',
        message: isRTL
          ? 'تحتاج لمسة إلى الوصول إلى موقعك في الخلفية لتقديم تحديثات الموقع.'
          : 'Lamsa needs background location access to provide location updates.',
      },
      camera: {
        title: isRTL ? 'الوصول إلى الكاميرا مطلوب' : 'Camera Access Required',
        message: isRTL
          ? 'تحتاج لمسة إلى الوصول إلى الكاميرا لالتقاط الصور لملفك الشخصي وخدماتك.'
          : 'Lamsa needs access to your camera to take photos for your profile and services.',
      },
      photos: {
        title: isRTL ? 'الوصول إلى الصور مطلوب' : 'Photo Library Access Required',
        message: isRTL
          ? 'تحتاج لمسة إلى الوصول إلى صورك لاختيار الصور لملفك الشخصي.'
          : 'Lamsa needs access to your photos to select images for your profile.',
      },
      notifications: {
        title: isRTL ? 'الإشعارات مطلوبة' : 'Notifications Required',
        message: isRTL
          ? 'تحتاج لمسة إلى إرسال إشعارات حول حجوزاتك ومواعيدك.'
          : 'Lamsa needs to send you notifications about your bookings and appointments.',
      },
      contacts: {
        title: isRTL ? 'الوصول إلى جهات الاتصال مطلوب' : 'Contacts Access Required',
        message: isRTL
          ? 'تحتاج لمسة إلى الوصول إلى جهات الاتصال لمساعدتك في مشاركة الخدمات مع الأصدقاء.'
          : 'Lamsa needs access to your contacts to help you share services with friends.',
      },
      calendar: {
        title: isRTL ? 'الوصول إلى التقويم مطلوب' : 'Calendar Access Required',
        message: isRTL
          ? 'تحتاج لمسة إلى الوصول إلى التقويم لجدولة مواعيد التجميل الخاصة بك.'
          : 'Lamsa needs access to your calendar to schedule your beauty appointments.',
      },
      microphone: {
        title: isRTL ? 'الوصول إلى الميكروفون مطلوب' : 'Microphone Access Required',
        message: isRTL
          ? 'تحتاج لمسة إلى الوصول إلى الميكروفون للرسائل الصوتية ومكالمات الفيديو.'
          : 'Lamsa needs access to your microphone for voice messages and video calls.',
      },
      mediaLibrary: {
        title: isRTL ? 'الوصول إلى مكتبة الوسائط مطلوب' : 'Media Library Access Required',
        message: isRTL
          ? 'تحتاج لمسة إلى الوصول إلى مكتبة الوسائط لحفظ وإدارة الصور.'
          : 'Lamsa needs access to your media library to save and manage photos.',
      },
    };
    
    return messages[type];
  }
}

// Export singleton instance
export const permissionManager = PermissionManager.getInstance();