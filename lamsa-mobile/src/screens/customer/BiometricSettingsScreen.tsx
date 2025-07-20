/**
 * @file BiometricSettingsScreen.tsx
 * @description Biometric authentication settings screen
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { biometricAuth, BiometricType } from '../../services/auth/biometricAuth';
import { useTranslation } from '../../hooks/useTranslation';
import RTLLayout from '../../components/RTLLayout';

export default function BiometricSettingsScreen() {
  const { t, isRTL } = useTranslation();
  const { isBiometricEnabled, enableBiometric, disableBiometric } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState({
    available: false,
    types: [] as BiometricType[],
  });

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const status = await biometricAuth.getStatus();
    setBiometricStatus({
      available: status.available,
      types: status.types,
    });
  };

  const handleToggleBiometric = async (value: boolean) => {
    setIsLoading(true);

    try {
      if (value) {
        // Enable biometric
        const success = await enableBiometric();
        if (success) {
          Alert.alert(
            t('settings.biometric.enabled_title'),
            t('settings.biometric.enabled_message'),
            [{ text: t('common.ok') }]
          );
        } else {
          Alert.alert(
            t('settings.biometric.error_title'),
            t('settings.biometric.enable_error'),
            [{ text: t('common.ok') }]
          );
        }
      } else {
        // Disable biometric
        await disableBiometric();
        Alert.alert(
          t('settings.biometric.disabled_title'),
          t('settings.biometric.disabled_message'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error) {
      console.error('Error toggling biometric:', error);
      Alert.alert(
        t('common.error'),
        t('settings.biometric.toggle_error'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricStatus.types.includes(BiometricType.FACE_ID)) {
      return 'face';
    }
    return 'fingerprint';
  };

  const getBiometricName = () => {
    if (biometricStatus.types.includes(BiometricType.FACE_ID)) {
      return Platform.OS === 'ios' ? 'Face ID' : t('settings.biometric.face_recognition');
    }
    return Platform.OS === 'ios' ? 'Touch ID' : t('settings.biometric.fingerprint');
  };

  return (
    <SafeAreaView style={styles.container}>
      <RTLLayout>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.biometric.title')}</Text>
        </View>

        <View style={styles.content}>
          {biometricStatus.available ? (
            <>
              <View style={styles.iconContainer}>
                <MaterialIcons
                  name={getBiometricIcon()}
                  size={80}
                  color="#E91E63"
                />
              </View>

              <Text style={styles.description}>
                {t('settings.biometric.description', {
                  method: getBiometricName(),
                })}
              </Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {t('settings.biometric.use_for_login')}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {t('settings.biometric.use_for_login_description')}
                  </Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#E91E63" />
                ) : (
                  <Switch
                    value={isBiometricEnabled}
                    onValueChange={handleToggleBiometric}
                    trackColor={{ false: '#767577', true: '#FCE4EC' }}
                    thumbColor={isBiometricEnabled ? '#E91E63' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                  />
                )}
              </View>

              <View style={styles.infoBox}>
                <MaterialIcons
                  name="info-outline"
                  size={20}
                  color="#666"
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>
                  {t('settings.biometric.security_info')}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.unavailableContainer}>
              <MaterialIcons
                name="block"
                size={60}
                color="#999"
                style={styles.unavailableIcon}
              />
              <Text style={styles.unavailableTitle}>
                {t('settings.biometric.not_available')}
              </Text>
              <Text style={styles.unavailableDescription}>
                {t('settings.biometric.not_available_description')}
              </Text>
            </View>
          )}
        </View>
      </RTLLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unavailableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableIcon: {
    marginBottom: 20,
  },
  unavailableTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  unavailableDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
});