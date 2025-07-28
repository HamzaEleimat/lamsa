import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMultiplePermissions } from '@hooks/usePermissions';
import PermissionFlow from '@components/permissions/PermissionFlow';
import PermissionGate from '@components/permissions/PermissionGate';
import {
  getTypography,
  spacing,
  layout,
  shadowPresets,
} from '@styles/platform';
import { BORDER_RADIUS } from '@utils/platform/constants';
import { isRTL } from '@utils/platform';
import { PermissionType } from '@services/permissions/PermissionManager';

const ALL_PERMISSIONS: PermissionType[] = [
  'location',
  'camera',
  'photos',
  'notifications',
  'contacts',
  'calendar',
  'microphone',
  'mediaLibrary',
];

export default function PermissionsDemo() {
  const theme = useTheme();
  const [showPermissionFlow, setShowPermissionFlow] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [gatePermission, setGatePermission] = useState<PermissionType>('camera');

  const {
    permissions,
    isChecking,
    checkAll,
    openSettings,
  } = useMultiplePermissions(ALL_PERMISSIONS);

  const renderSection = (title: string, content: React.ReactNode) => (
    <View style={[styles.section, shadowPresets.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      {content}
    </View>
  );

  const renderPermissionItem = (type: PermissionType) => {
    const permission = permissions[type];
    const status = permission?.status || 'undetermined';
    const canAskAgain = permission?.canAskAgain ?? true;

    const getStatusColor = () => {
      switch (status) {
        case 'granted':
          return theme.colors.primary;
        case 'denied':
          return theme.colors.error;
        case 'restricted':
          return theme.colors.warning || theme.colors.error;
        default:
          return theme.colors.onSurfaceVariant;
      }
    };

    const getStatusIcon = () => {
      switch (status) {
        case 'granted':
          return 'check-circle';
        case 'denied':
          return 'close-circle';
        case 'restricted':
          return 'alert-circle';
        default:
          return 'help-circle';
      }
    };

    return (
      <View key={type} style={styles.permissionItem}>
        <View style={styles.permissionInfo}>
          <Text style={[styles.permissionName, { color: theme.colors.onSurface }]}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons
              name={getStatusIcon()}
              size={20}
              color={getStatusColor()}
            />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {status}
            </Text>
            {status === 'denied' && !canAskAgain && (
              <Text style={[styles.cantAskText, { color: theme.colors.error }]}>
                (Can't ask again)
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const permissionFlowConfig = [
    {
      type: 'location' as PermissionType,
      title: isRTL ? 'الوصول إلى الموقع' : 'Location Access',
      description: isRTL
        ? 'نحتاج إلى موقعك للعثور على مقدمي الخدمات القريبين'
        : 'We need your location to find nearby service providers',
      icon: 'map-marker',
      required: true,
    },
    {
      type: 'notifications' as PermissionType,
      title: isRTL ? 'الإشعارات' : 'Notifications',
      description: isRTL
        ? 'احصل على تحديثات حول حجوزاتك ومواعيدك'
        : 'Get updates about your bookings and appointments',
      icon: 'bell',
    },
    {
      type: 'camera' as PermissionType,
      title: isRTL ? 'الكاميرا' : 'Camera',
      description: isRTL
        ? 'التقط صورًا لملفك الشخصي وخدماتك'
        : 'Take photos for your profile and services',
      icon: 'camera',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]} edges={['bottom', 'left', 'right']}>
      <ScrollView>
        <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          Permissions Demo
        </Text>
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: theme.colors.primaryContainer }]}
          onPress={openSettings}
        >
          <MaterialCommunityIcons
            name="cog"
            size={24}
            color={theme.colors.onPrimaryContainer}
          />
        </TouchableOpacity>
      </View>

      {renderSection('Permission Status', (
        <View style={styles.permissionsList}>
          {ALL_PERMISSIONS.map(renderPermissionItem)}
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: theme.colors.primary }]}
            onPress={checkAll}
            disabled={isChecking}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.refreshText, { color: theme.colors.primary }]}>
              {isRTL ? 'تحديث الحالة' : 'Refresh Status'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      {renderSection('Permission Flow', (
        <View style={styles.demoSection}>
          <Text style={[styles.demoDescription, { color: theme.colors.onSurfaceVariant }]}>
            {isRTL
              ? 'اختبر تدفق طلب الأذونات المتعددة'
              : 'Test the multi-permission request flow'}
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowPermissionFlow(true)}
          >
            <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
              {isRTL ? 'بدء تدفق الأذونات' : 'Start Permission Flow'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      {renderSection('Permission Gate', (
        <View style={styles.demoSection}>
          <Text style={[styles.demoDescription, { color: theme.colors.onSurfaceVariant }]}>
            {isRTL
              ? 'اختبر بوابة الأذونات التي تحجب المحتوى'
              : 'Test permission gate that blocks content'}
          </Text>
          <View style={styles.gateControls}>
            <Text style={[styles.label, { color: theme.colors.onSurface }]}>
              Permission:
            </Text>
            <View style={styles.picker}>
              {['camera', 'location', 'notifications'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.pickerOption,
                    gatePermission === type && { backgroundColor: theme.colors.primaryContainer },
                  ]}
                  onPress={() => setGatePermission(type as PermissionType)}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      { color: gatePermission === type ? theme.colors.onPrimaryContainer : theme.colors.onSurface },
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: theme.colors.onSurface }]}>
              Show Gate:
            </Text>
            <Switch
              value={showGate}
              onValueChange={setShowGate}
              trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
              thumbColor={showGate ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
            />
          </View>
        </View>
      ))}

      {showGate && (
        <View style={styles.gateContainer}>
          <PermissionGate permission={gatePermission}>
            <View style={[styles.gatedContent, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name="check-circle"
                size={48}
                color={theme.colors.primary}
              />
              <Text style={[styles.gatedText, { color: theme.colors.onPrimaryContainer }]}>
                {isRTL
                  ? 'تم منح الإذن! يمكنك رؤية هذا المحتوى.'
                  : 'Permission granted! You can see this content.'}
              </Text>
            </View>
          </PermissionGate>
        </View>
      )}

      <PermissionFlow
        visible={showPermissionFlow}
        onClose={() => setShowPermissionFlow(false)}
        onComplete={() => {
          setShowPermissionFlow(false);
          checkAll();
        }}
        permissions={permissionFlowConfig}
        title={isRTL ? 'مرحبًا بك في لمسة' : 'Welcome to Lamsa'}
        description={isRTL
          ? 'نحتاج إلى بعض الأذونات لتوفير أفضل تجربة'
          : 'We need a few permissions to provide the best experience'}
      />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...layout.padding('lg'),
  },
  title: {
    ...getTypography('h4'),
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    borderRadius: BORDER_RADIUS.medium,
    ...layout.padding('md'),
    ...layout.marginHorizontal('md'),
    ...layout.marginBottom('md'),
  },
  sectionTitle: {
    ...getTypography('h6'),
    marginBottom: spacing.md,
  },
  permissionsList: {
    gap: spacing.sm,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    ...getTypography('body1'),
    marginBottom: spacing.xxs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    ...getTypography('caption'),
  },
  cantAskText: {
    ...getTypography('caption'),
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    marginTop: spacing.sm,
  },
  refreshText: {
    ...getTypography('button'),
  },
  demoSection: {
    gap: spacing.md,
  },
  demoDescription: {
    ...getTypography('body2'),
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
  gateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    ...getTypography('body2'),
  },
  picker: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pickerOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: BORDER_RADIUS.small,
  },
  pickerText: {
    ...getTypography('caption'),
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gateContainer: {
    minHeight: 300,
    ...layout.marginHorizontal('md'),
    ...layout.marginBottom('md'),
  },
  gatedContent: {
    borderRadius: BORDER_RADIUS.medium,
    ...layout.padding('xl'),
    alignItems: 'center',
    gap: spacing.md,
  },
  gatedText: {
    ...getTypography('body1'),
    textAlign: 'center',
  },
});