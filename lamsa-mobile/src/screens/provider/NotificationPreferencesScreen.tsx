import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Text, Switch, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationPreferencesManager } from '../../services/notifications/NotificationPreferencesManager';
import {
  NotificationChannel,
  NotificationType,
  NotificationPreferences,
} from '../../services/notifications/types';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function NotificationPreferencesScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const theme = useTheme();
  
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const preferencesManager = NotificationPreferencesManager.getInstance();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const prefs = await preferencesManager.getPreferences(user.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert(t('error'), t('failedToLoadPreferences'));
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user?.id || !preferences) return;
    
    try {
      setSaving(true);
      await preferencesManager.savePreferences(user.id, preferences);
      Alert.alert(t('success'), t('preferencesUpdated'));
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert(t('error'), t('failedToSavePreferences'));
    } finally {
      setSaving(false);
    }
  };

  const updateChannelPreference = (channel: NotificationChannel, enabled: boolean) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: enabled,
      },
    });
  };

  const updateTypePreference = (type: NotificationType, enabled: boolean) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      types: {
        ...preferences.types,
        [type]: {
          ...preferences.types[type],
          enabled,
        },
      },
    });
  };

  const updateQuietHours = (field: 'enabled' | 'start' | 'end', value: any) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      timing: {
        ...preferences.timing,
        quietHours: {
          ...preferences.timing.quietHours,
          [field]: value,
        },
      },
    });
  };

  const updateBatchingPreference = (value: string) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      timing: {
        ...preferences.timing,
        batchingPreference: value as any,
      },
    });
  };

  const updateSMSSettings = (field: string, value: any) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      smsSettings: {
        ...preferences.smsSettings,
        [field]: value,
      },
    });
  };

  const styles = createStyles(theme);

  const resetToDefaults = async () => {
    Alert.alert(
      t('resetToDefaults'),
      t('resetToDefaultsConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('reset'),
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            await preferencesManager.resetToDefaults(user.id);
            await loadPreferences();
          },
        },
      ]
    );
  };

  const renderChannelSection = () => {
    if (!preferences) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notificationChannels')}</Text>
        <Text style={styles.sectionDescription}>
          {t('chooseHowToReceiveNotifications')}
        </Text>

        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait" size={24} color={theme.colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('pushNotifications')}</Text>
                <Text style={styles.settingSubtitle}>{t('freeAndInstant')}</Text>
              </View>
            </View>
            <Switch
              value={preferences.channels[NotificationChannel.PUSH]}
              onValueChange={(value) => updateChannelPreference(NotificationChannel.PUSH, value)}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('whatsApp')}</Text>
                <Text style={styles.settingSubtitle}>{t('preferredInJordan')}</Text>
              </View>
            </View>
            <Switch
              value={preferences.channels[NotificationChannel.WHATSAPP]}
              onValueChange={(value) => updateChannelPreference(NotificationChannel.WHATSAPP, value)}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="chatbox" size={24} color={theme.colors.secondary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('sms')}</Text>
                <Text style={styles.settingSubtitle}>
                  {t('limitedTo')} {preferences.smsSettings.monthlyLimit} {t('perMonth')}
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.channels[NotificationChannel.SMS]}
              onValueChange={(value) => updateChannelPreference(NotificationChannel.SMS, value)}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="mail" size={24} color={theme.colors.tertiary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('email')}</Text>
                <Text style={styles.settingSubtitle}>{t('weeklyDigests')}</Text>
              </View>
            </View>
            <Switch
              value={preferences.channels[NotificationChannel.EMAIL]}
              onValueChange={(value) => updateChannelPreference(NotificationChannel.EMAIL, value)}
              color={theme.colors.primary}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderNotificationTypes = () => {
    if (!preferences) return null;

    const criticalTypes = [
      { type: NotificationType.NEW_BOOKING, icon: 'calendar', color: theme.colors.primary },
      { type: NotificationType.BOOKING_CANCELLED, icon: 'calendar-clear', color: theme.colors.error },
      { type: NotificationType.PAYMENT_FAILED, icon: 'cash', color: theme.colors.error },
    ];

    const importantTypes = [
      { type: NotificationType.BOOKING_MODIFIED, icon: 'calendar', color: theme.colors.tertiary },
      { type: NotificationType.PAYMENT_RECEIVED, icon: 'cash', color: theme.colors.primary },
      { type: NotificationType.NEW_REVIEW, icon: 'star', color: theme.colors.tertiary },
      { type: NotificationType.DAILY_SCHEDULE, icon: 'today', color: theme.colors.primary },
    ];

    const renderTypeGroup = (types: any[], title: string) => (
      <>
        <Text style={styles.subsectionTitle}>{title}</Text>
        {types.map(({ type, icon, color }) => {
          const pref = preferences.types[type];
          if (!pref) return null;

          return (
            <View key={type} style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name={icon} size={24} color={color} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>{t(type.toLowerCase())}</Text>
                </View>
              </View>
              <Switch
                value={pref.enabled}
                onValueChange={(value) => updateTypePreference(type, value)}
                color={theme.colors.primary}
              />
            </View>
          );
        })}
      </>
    );

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notificationTypes')}</Text>
        <Text style={styles.sectionDescription}>
          {t('chooseWhatNotificationsToReceive')}
        </Text>

        <View style={styles.settingsList}>
          {renderTypeGroup(criticalTypes, t('criticalNotifications'))}
          <View style={styles.divider} />
          {renderTypeGroup(importantTypes, t('importantNotifications'))}
        </View>
      </View>
    );
  };

  const renderTimingSection = () => {
    if (!preferences) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('timingAndDelivery')}</Text>

        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon" size={24} color={theme.colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('quietHours')}</Text>
                <Text style={styles.settingSubtitle}>
                  {preferences.timing.quietHours.start} - {preferences.timing.quietHours.end}
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.timing.quietHours.enabled}
              onValueChange={(value) => updateQuietHours('enabled', value)}
              color={theme.colors.primary}
            />
          </View>

          {preferences.timing.quietHours.enabled && (
            <View style={styles.timePickerRow}>
              <TouchableOpacity
                style={styles.timePicker}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.timePickerLabel}>{t('from')}</Text>
                <Text style={styles.timePickerValue}>
                  {preferences.timing.quietHours.start}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timePicker}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.timePickerLabel}>{t('to')}</Text>
                <Text style={styles.timePickerValue}>
                  {preferences.timing.quietHours.end}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="layers" size={24} color={theme.colors.secondary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('notificationBatching')}</Text>
                <Text style={styles.settingSubtitle}>{t('reducesInterruptions')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.batchingOptions}>
            {['immediate', 'hourly', 'daily', 'weekly'].map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.batchingOption,
                  preferences.timing.batchingPreference === option && styles.activeBatchingOption,
                ]}
                onPress={() => updateBatchingPreference(option)}
              >
                <Text
                  style={[
                    styles.batchingOptionText,
                    preferences.timing.batchingPreference === option && styles.activeBatchingOptionText,
                  ]}
                >
                  {t(option)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderSMSSection = () => {
    if (!preferences) return null;

    const remainingQuota = preferences.smsSettings.monthlyLimit - preferences.smsSettings.currentUsage;
    const percentageUsed = (preferences.smsSettings.currentUsage / preferences.smsSettings.monthlyLimit) * 100;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('smsSettings')}</Text>

        <View style={styles.smsQuotaCard}>
          <View style={styles.smsQuotaHeader}>
            <Text style={styles.smsQuotaTitle}>{t('monthlyQuota')}</Text>
            <Text style={styles.smsQuotaValue}>
              {remainingQuota} {t('remaining')}
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${percentageUsed}%` },
                percentageUsed > 80 && styles.progressFillWarning,
              ]}
            />
          </View>

          <Text style={styles.smsQuotaSubtext}>
            {preferences.smsSettings.currentUsage} / {preferences.smsSettings.monthlyLimit} {t('used')}
          </Text>
        </View>

        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="alert-circle" size={24} color={theme.colors.tertiary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('criticalOnly')}</Text>
                <Text style={styles.settingSubtitle}>
                  {t('smsOnlyForCriticalAlerts')}
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.smsSettings.criticalOnly}
              onValueChange={(value) => updateSMSSettings('criticalOnly', value)}
              color={theme.colors.primary}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.upgradeButton}>
          <Ionicons name="rocket" size={20} color={theme.colors.primary} />
          <Text style={styles.upgradeButtonText}>{t('upgradeSMSPlan')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading || !preferences) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderChannelSection()}
        {renderNotificationTypes()}
        {renderTimingSection()}
        {renderSMSSection()}

        <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
          <Text style={styles.resetButtonText}>{t('resetToDefaults')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={savePreferences}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? t('saving') : t('saveChanges')}
          </Text>
        </TouchableOpacity>
      </View>

      {showStartTimePicker && (
        <DateTimePicker
          value={new Date(`2000-01-01T${preferences.timing.quietHours.start}`)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, date) => {
            setShowStartTimePicker(false);
            if (date) {
              const hours = date.getHours().toString().padStart(2, '0');
              const minutes = date.getMinutes().toString().padStart(2, '0');
              updateQuietHours('start', `${hours}:${minutes}`);
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={new Date(`2000-01-01T${preferences.timing.quietHours.end}`)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, date) => {
            setShowEndTimePicker(false);
            if (date) {
              const hours = date.getHours().toString().padStart(2, '0');
              const minutes = date.getMinutes().toString().padStart(2, '0');
              updateQuietHours('end', `${hours}:${minutes}`);
            }
          }}
        />
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginTop: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  settingsList: {
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  settingSubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginVertical: 8,
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  timePicker: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  timePickerValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  batchingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  batchingOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeBatchingOption: {
    backgroundColor: theme.colors.primary,
    borderColor: colors.primary,
  },
  batchingOptionText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  activeBatchingOptionText: {
    color: theme.colors.onPrimary,
    fontWeight: '500',
  },
  smsQuotaCard: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
    marginBottom: 16,
  },
  smsQuotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  smsQuotaTitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  smsQuotaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.outlineVariant,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressFillWarning: {
    backgroundColor: theme.colors.tertiary,
  },
  smsQuotaSubtext: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 32,
  },
  resetButtonText: {
    fontSize: 14,
    color: theme.colors.error,
  },
  bottomPadding: {
    height: 100,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
});