import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PlatformModal } from '@components/navigation';
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

interface PermissionFlowProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  permissions: PermissionConfig[];
  title?: string;
  description?: string;
}

interface PermissionConfig {
  type: PermissionType;
  title: string;
  description: string;
  icon: string;
  required?: boolean;
  image?: any; // For illustration images
}

export default function PermissionFlow({
  visible,
  onClose,
  onComplete,
  permissions,
  title,
  description,
}: PermissionFlowProps) {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedPermissions, setCompletedPermissions] = useState<Set<PermissionType>>(new Set());
  
  const currentPermission = permissions[currentIndex];
  const progress = (currentIndex + 1) / permissions.length;

  const { status, isRequesting, request } = usePermission(currentPermission?.type || 'camera', {
    autoCheck: false,
  });

  const handleRequestPermission = async () => {
    if (!currentPermission) return;

    const result = await request({
      title: currentPermission.title,
      message: currentPermission.description,
    });

    if (result.status === 'granted') {
      setCompletedPermissions(new Set([...completedPermissions, currentPermission.type]));
    }

    // Move to next permission or complete
    if (currentIndex < permissions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    if (currentPermission?.required) {
      // Can't skip required permissions
      return;
    }

    if (currentIndex < permissions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const renderPermissionStep = () => {
    if (!currentPermission) return null;

    return (
      <View style={styles.permissionStep}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons
            name={currentPermission.icon}
            size={48}
            color={theme.colors.primary}
          />
        </View>

        <Text style={[styles.permissionTitle, { color: theme.colors.onBackground }]}>
          {currentPermission.title}
        </Text>

        <Text style={[styles.permissionDescription, { color: theme.colors.onSurfaceVariant }]}>
          {currentPermission.description}
        </Text>

        {currentPermission.image && (
          <Image source={currentPermission.image} style={styles.permissionImage} />
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleRequestPermission}
            disabled={isRequesting}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.onPrimary }]}>
              {isRTL ? 'السماح بالوصول' : 'Allow Access'}
            </Text>
          </TouchableOpacity>

          {!currentPermission.required && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSkip}
              disabled={isRequesting}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                {isRTL ? 'ليس الآن' : 'Not Now'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.primary,
              width: `${progress * 100}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
        {currentIndex + 1} {isRTL ? 'من' : 'of'} {permissions.length}
      </Text>
    </View>
  );

  return (
    <PlatformModal
      visible={visible}
      onClose={onClose}
      presentationStyle="formSheet"
      showHandle={false}
      enableSwipeDown={false}
    >
      <View style={styles.container}>
        {renderProgressIndicator()}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {title && (
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>
              {title}
            </Text>
          )}

          {description && (
            <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              {description}
            </Text>
          )}

          {renderPermissionStep()}
        </ScrollView>
      </View>
    </PlatformModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    ...layout.padding('md'),
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    ...getTypography('caption'),
  },
  content: {
    flex: 1,
    ...layout.paddingHorizontal('lg'),
  },
  title: {
    ...getTypography('h4'),
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...getTypography('body1'),
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionStep: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    ...getTypography('h5'),
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  permissionDescription: {
    ...getTypography('body1'),
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  permissionImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
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
  primaryButtonText: {
    ...getTypography('button'),
  },
  secondaryButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...getTypography('button'),
  },
});