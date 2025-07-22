import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Surface,
  Text,
  Switch,
  List,
  useTheme,
  Divider,
  IconButton,
  Button,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import i18n from '../../i18n';

type StackParamList = {
  NotificationSettings: undefined;
};

type NotificationSettingsScreenNavigationProp = NativeStackNavigationProp<
  StackParamList,
  'NotificationSettings'
>;

interface Props {
  navigation: NotificationSettingsScreenNavigationProp;
}

interface NotificationPreferences {
  // Notification Types
  bookingReminders: boolean;
  bookingUpdates: boolean;
  promotions: boolean;
  newServices: boolean;
  reviews: boolean;
  messages: boolean;
  
  // Notification Channels
  push: boolean;
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  
  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const NotificationSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const isRTL = i18n.locale === 'ar';

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    bookingReminders: true,
    bookingUpdates: true,
    promotions: false,
    newServices: false,
    reviews: true,
    messages: true,
    push: true,
    sms: false,
    email: true,
    whatsapp: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePreferences = async () => {
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(
        'notification_preferences',
        JSON.stringify(preferences)
      );

      // Update push notification settings
      if (preferences.push) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          setSnackbarMessage(i18n.t('notifications.permissionRequired'));
          setSnackbarVisible(true);
          return;
        }
      }

      setSnackbarMessage(i18n.t('notifications.preferencesSaved'));
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSnackbarMessage(i18n.t('common.error'));
      setSnackbarVisible(true);
    }
  };

  const handleTestNotification = async () => {
    if (!preferences.push) {
      setSnackbarMessage(i18n.t('notifications.enablePushFirst'));
      setSnackbarVisible(true);
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.testTitle'),
        body: i18n.t('notifications.testBody'),
        data: { type: 'test' },
      },
      trigger: { seconds: 2 },
    });

    setSnackbarMessage(i18n.t('notifications.testSent'));
    setSnackbarVisible(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL ? "arrow-right" : "arrow-left"}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          {i18n.t('notifications.title')}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Types */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('notifications.types.title')}
          </Text>
          
          <Surface style={styles.listContainer} elevation={1}>
            <List.Item
              title={i18n.t('notifications.types.bookingReminders')}
              description={i18n.t('notifications.types.bookingRemindersDesc')}
              left={(props) => <List.Icon {...props} icon="calendar-clock" />}
              right={() => (
                <Switch
                  value={preferences.bookingReminders}
                  onValueChange={(value) => updatePreference('bookingReminders', value)}
                  color={theme.colors.primary}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('notifications.types.bookingUpdates')}
              description={i18n.t('notifications.types.bookingUpdatesDesc')}
              left={(props) => <List.Icon {...props} icon="update" />}
              right={() => (
                <Switch
                  value={preferences.bookingUpdates}
                  onValueChange={(value) => updatePreference('bookingUpdates', value)}
                  color={theme.colors.primary}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('notifications.types.promotions')}
              description={i18n.t('notifications.types.promotionsDesc')}
              left={(props) => <List.Icon {...props} icon="tag" />}
              right={() => (
                <Switch
                  value={preferences.promotions}
                  onValueChange={(value) => updatePreference('promotions', value)}
                  color={theme.colors.primary}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('notifications.types.newServices')}
              description={i18n.t('notifications.types.newServicesDesc')}
              left={(props) => <List.Icon {...props} icon="star" />}
              right={() => (
                <Switch
                  value={preferences.newServices}
                  onValueChange={(value) => updatePreference('newServices', value)}
                  color={theme.colors.primary}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('notifications.types.reviews')}
              description={i18n.t('notifications.types.reviewsDesc')}
              left={(props) => <List.Icon {...props} icon="message-star" />}
              right={() => (
                <Switch
                  value={preferences.reviews}
                  onValueChange={(value) => updatePreference('reviews', value)}
                  color={theme.colors.primary}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('notifications.types.messages')}
              description={i18n.t('notifications.types.messagesDesc')}
              left={(props) => <List.Icon {...props} icon="message" />}
              right={() => (
                <Switch
                  value={preferences.messages}
                  onValueChange={(value) => updatePreference('messages', value)}
                  color={theme.colors.primary}
                />
              )}
            />
          </Surface>
        </View>

        {/* Notification Channels */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('notifications.channels.title')}
          </Text>
          
          <Surface style={styles.listContainer} elevation={1}>
            <List.Item
              title={i18n.t('notifications.channels.push')}
              description={i18n.t('notifications.channels.pushDesc')}
              left={(props) => <List.Icon {...props} icon="cellphone" />}
              right={() => (
                <Switch
                  value={preferences.push}
                  onValueChange={(value) => updatePreference('push', value)}
                  color={theme.colors.primary}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('notifications.channels.sms')}
              description={i18n.t('notifications.channels.smsDesc')}
              left={(props) => <List.Icon {...props} icon="message-text" />}
              right={() => (
                <Switch
                  value={preferences.sms}
                  onValueChange={(value) => updatePreference('sms', value)}
                  color={theme.colors.primary}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('notifications.channels.email')}
              description={i18n.t('notifications.channels.emailDesc')}
              left={(props) => <List.Icon {...props} icon="email" />}
              right={() => (
                <Switch
                  value={preferences.email}
                  onValueChange={(value) => updatePreference('email', value)}
                  color={theme.colors.primary}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('notifications.channels.whatsapp')}
              description={i18n.t('notifications.channels.whatsappDesc')}
              left={(props) => <List.Icon {...props} icon="whatsapp" />}
              right={() => (
                <Switch
                  value={preferences.whatsapp}
                  onValueChange={(value) => updatePreference('whatsapp', value)}
                  color={theme.colors.primary}
                />
              )}
            />
          </Surface>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('notifications.quietHours.title')}
          </Text>
          
          <Surface style={styles.listContainer} elevation={1}>
            <List.Item
              title={i18n.t('notifications.quietHours.enable')}
              description={i18n.t('notifications.quietHours.description')}
              left={(props) => <List.Icon {...props} icon="sleep" />}
              right={() => (
                <Switch
                  value={preferences.quietHoursEnabled}
                  onValueChange={(value) => updatePreference('quietHoursEnabled', value)}
                  color={theme.colors.primary}
                />
              )}
            />
            {preferences.quietHoursEnabled && (
              <>
                <Divider />
                <View style={styles.quietHoursTime}>
                  <Text variant="bodyMedium" style={styles.quietHoursLabel}>
                    {i18n.t('notifications.quietHours.from')} {preferences.quietHoursStart}
                  </Text>
                  <Text variant="bodyMedium" style={styles.quietHoursLabel}>
                    {i18n.t('notifications.quietHours.to')} {preferences.quietHoursEnd}
                  </Text>
                </View>
              </>
            )}
          </Surface>
        </View>

        {/* Test Notification */}
        <View style={styles.section}>
          <Button
            mode="outlined"
            onPress={handleTestNotification}
            style={styles.testButton}
          >
            {i18n.t('notifications.sendTest')}
          </Button>
        </View>

        {/* Save Button */}
        <View style={styles.section}>
          <Button
            mode="contained"
            onPress={handleSavePreferences}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
            contentStyle={styles.saveButtonContent}
          >
            {i18n.t('notifications.savePreferences')}
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.8,
  },
  listContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  quietHoursTime: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quietHoursLabel: {
    opacity: 0.7,
  },
  testButton: {
    borderRadius: 28,
  },
  saveButton: {
    borderRadius: 28,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
});

export default NotificationSettingsScreen;