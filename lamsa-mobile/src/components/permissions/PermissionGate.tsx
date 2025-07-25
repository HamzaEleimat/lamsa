import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePermission } from '@hooks/usePermissions';
import {
  getTypography,
  spacing,
  layout,
  shadowPresets,
} from '@styles/platform';
import { BORDER_RADIUS } from '@utils/platform/constants';
import { isRTL } from '@utils/platform';
import { PermissionType } from '@services/permissions/PermissionManager';

interface PermissionGateProps {
  permission: PermissionType;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  message?: string;
  icon?: string;
  showSettingsButton?: boolean;
}

export default function PermissionGate({
  permission,
  fallback,
  children,
  title,
  message,
  icon,
  showSettingsButton = true,
}: PermissionGateProps) {
  const theme = useTheme();
  const {
    status,
    canAskAgain,
    isChecking,
    isRequesting,
    request,
    openSettings,
  } = usePermission(permission);

  const [hasRequestedOnce, setHasRequestedOnce] = useState(false);

  // Auto-request permission on first mount if undetermined
  useEffect(() => {
    if (status === 'undetermined' && !hasRequestedOnce && !isRequesting) {
      setHasRequestedOnce(true);
      request({ title, message });
    }
  }, [status, hasRequestedOnce, isRequesting, request, title, message]);

  // If permission is granted, render children
  if (status === 'granted') {
    return <>{children}</>;
  }

  // If checking, show loading
  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default permission request UI
  const getDefaultContent = () => {
    const contents: Record<PermissionType, { title: string; message: string; icon: string }> = {
      location: {
        title: isRTL ? 'الوصول إلى الموقع مطلوب' : 'Location Access Required',
        message: isRTL
          ? 'نحتاج إلى موقعك للعثور على مقدمي الخدمات القريبين منك'
          : 'We need your location to find service providers near you',
        icon: 'map-marker',
      },
      locationBackground: {
        title: isRTL ? 'موقع الخلفية مطلوب' : 'Background Location Required',
        message: isRTL
          ? 'نحتاج إلى موقعك في الخلفية لتحديثات الموقع'
          : 'We need background location for location updates',
        icon: 'map-marker-radius',
      },
      camera: {
        title: isRTL ? 'الوصول إلى الكاميرا مطلوب' : 'Camera Access Required',
        message: isRTL
          ? 'نحتاج إلى الكاميرا لالتقاط الصور'
          : 'We need camera access to take photos',
        icon: 'camera',
      },
      photos: {
        title: isRTL ? 'الوصول إلى الصور مطلوب' : 'Photo Access Required',
        message: isRTL
          ? 'نحتاج إلى الوصول إلى صورك'
          : 'We need access to your photos',
        icon: 'image-multiple',
      },
      notifications: {
        title: isRTL ? 'الإشعارات مطلوبة' : 'Notifications Required',
        message: isRTL
          ? 'نحتاج إلى إرسال إشعارات حول حجوزاتك'
          : 'We need to send notifications about your bookings',
        icon: 'bell',
      },
      contacts: {
        title: isRTL ? 'الوصول إلى جهات الاتصال' : 'Contacts Access Required',
        message: isRTL
          ? 'نحتاج إلى الوصول إلى جهات الاتصال للمشاركة'
          : 'We need contacts access for sharing',
        icon: 'account-group',
      },
      calendar: {
        title: isRTL ? 'الوصول إلى التقويم' : 'Calendar Access Required',
        message: isRTL
          ? 'نحتاج إلى الوصول إلى التقويم للمواعيد'
          : 'We need calendar access for appointments',
        icon: 'calendar',
      },
      microphone: {
        title: isRTL ? 'الوصول إلى الميكروفون' : 'Microphone Access Required',
        message: isRTL
          ? 'نحتاج إلى الميكروفون للرسائل الصوتية'
          : 'We need microphone for voice messages',
        icon: 'microphone',
      },
      mediaLibrary: {
        title: isRTL ? 'الوصول إلى المكتبة' : 'Media Library Access Required',
        message: isRTL
          ? 'نحتاج إلى الوصول إلى مكتبة الوسائط'
          : 'We need media library access',
        icon: 'folder-image',
      },
    };

    return contents[permission];
  };

  const defaultContent = getDefaultContent();
  const displayTitle = title || defaultContent.title;
  const displayMessage = message || defaultContent.message;
  const displayIcon = icon || defaultContent.icon;

  return (
    <View style={styles.container}>
      <View style={[styles.content, shadowPresets.card, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons
            name={displayIcon}
            size={48}
            color={theme.colors.primary}
          />
        </View>

        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          {displayTitle}
        </Text>

        <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
          {displayMessage}
        </Text>

        <View style={styles.actions}>
          {canAskAgain ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => request({ title: displayTitle, message: displayMessage })}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
                  {isRTL ? 'السماح بالوصول' : 'Allow Access'}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <Text style={[styles.deniedText, { color: theme.colors.error }]}>
                {isRTL
                  ? 'تم رفض الإذن. يرجى تمكينه من الإعدادات.'
                  : 'Permission denied. Please enable it from Settings.'}
              </Text>
              {showSettingsButton && (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={openSettings}
                >
                  <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
                    {isRTL ? 'فتح الإعدادات' : 'Open Settings'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...layout.padding('lg'),
  },
  content: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BORDER_RADIUS.large,
    ...layout.padding('xl'),
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...getTypography('h5'),
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...getTypography('body1'),
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    height: 48,
    borderRadius: BORDER_RADIUS.medium,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadowPresets.button,
  },
  buttonText: {
    ...getTypography('button'),
  },
  deniedText: {
    ...getTypography('body2'),
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});