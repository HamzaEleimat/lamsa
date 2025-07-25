import React, { useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {
  Surface,
  Text,
  List,
  Switch,
  useTheme,
  Divider,
  Button,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n, { changeLanguage, getCurrentLanguage } from '../../i18n';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import LanguageSelector from '../../components/LanguageSelector';

type MainStackParamList = {
  Settings: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
  PaymentMethods: undefined;
  About: undefined;
  Support: undefined;
  SignIn: undefined;
};

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  MainStackParamList,
  'Settings'
>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { user, signOut } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const isRTL = i18n.locale === 'ar';

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);

  const handleLanguageChange = async (language: 'ar' | 'en') => {
    // Force app restart for RTL changes
    Alert.alert(
      i18n.t('settings.languageChanged'),
      i18n.t('settings.restartRequired'),
      [{ text: i18n.t('common.ok') }]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      i18n.t('settings.signOut'),
      i18n.t('settings.signOutConfirmation'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'SignIn' }],
            });
          },
        },
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      i18n.t('settings.clearCache'),
      i18n.t('settings.clearCacheConfirmation'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert(
                i18n.t('common.success'),
                i18n.t('settings.cacheCleared')
              );
            } catch (error) {
              console.error('Error clearing cache:', error);
            }
          },
        },
      ]
    );
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  const renderHeader = () => (
    <Surface style={styles.headerCard} elevation={1}>
      <View style={styles.profileSection}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onPrimary }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text variant="titleLarge" style={styles.userName}>
            {user?.name || i18n.t('settings.guest')}
          </Text>
          <Text variant="bodyMedium" style={styles.userPhone}>
            {user?.phone || ''}
          </Text>
        </View>
      </View>
      <Button
        mode="contained-tonal"
        onPress={() => navigation.navigate('EditProfile')}
        style={styles.editButton}
      >
        {i18n.t('settings.editProfile')}
      </Button>
    </Surface>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}

        {/* Account Settings */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('settings.account')}
          </Text>
          
          <Surface style={styles.listContainer} elevation={1}>
            <List.Item
              title={i18n.t('settings.profile')}
              description={i18n.t('settings.profileDescription')}
              left={(props) => <List.Icon {...props} icon="account" />}
              right={(props) => <List.Icon {...props} icon={isRTL ? "chevron-left" : "chevron-right"} />}
              onPress={() => navigation.navigate('EditProfile')}
            />
            <Divider />
            <List.Item
              title={i18n.t('settings.paymentMethods')}
              description={i18n.t('settings.paymentMethodsDescription')}
              left={(props) => <List.Icon {...props} icon="credit-card" />}
              right={(props) => <List.Icon {...props} icon={isRTL ? "chevron-left" : "chevron-right"} />}
              onPress={() => navigation.navigate('PaymentMethods')}
            />
            <Divider />
            <List.Item
              title={i18n.t('settings.notifications')}
              description={i18n.t('settings.notificationsDescription')}
              left={(props) => <List.Icon {...props} icon="bell" />}
              right={(props) => <List.Icon {...props} icon={isRTL ? "chevron-left" : "chevron-right"} />}
              onPress={() => navigation.navigate('NotificationSettings')}
            />
          </Surface>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('settings.appSettings')}
          </Text>
          
          <Surface style={styles.listContainer} elevation={1}>
            <List.Item
              title={i18n.t('settings.language')}
              left={(props) => <List.Icon {...props} icon="web" />}
              right={() => (
                <LanguageSelector 
                  mode="text"
                  onLanguageChange={handleLanguageChange}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('settings.darkMode')}
              description={i18n.t('settings.darkModeDescription')}
              left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  color={theme.colors.primary}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('settings.biometric')}
              description={i18n.t('settings.biometricDescription')}
              left={(props) => <List.Icon {...props} icon="fingerprint" />}
              right={() => (
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  color={theme.colors.primary}
                />
              )}
            />
            <Divider />
            <List.Item
              title={i18n.t('settings.autoBackup')}
              description={i18n.t('settings.autoBackupDescription')}
              left={(props) => <List.Icon {...props} icon="cloud-upload" />}
              right={() => (
                <Switch
                  value={autoBackupEnabled}
                  onValueChange={setAutoBackupEnabled}
                  color={theme.colors.primary}
                />
              )}
            />
          </Surface>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('settings.support')}
          </Text>
          
          <Surface style={styles.listContainer} elevation={1}>
            <List.Item
              title={i18n.t('settings.helpCenter')}
              left={(props) => <List.Icon {...props} icon="help-circle" />}
              right={(props) => <List.Icon {...props} icon={isRTL ? "chevron-left" : "chevron-right"} />}
              onPress={() => handleOpenLink('https://lamsa.jo/help')}
            />
            <Divider />
            <List.Item
              title={i18n.t('settings.contactUs')}
              left={(props) => <List.Icon {...props} icon="email" />}
              right={(props) => <List.Icon {...props} icon={isRTL ? "chevron-left" : "chevron-right"} />}
              onPress={() => handleOpenLink('mailto:support@lamsa.jo')}
            />
            <Divider />
            <List.Item
              title={i18n.t('settings.reportProblem')}
              left={(props) => <List.Icon {...props} icon="alert-circle" />}
              right={(props) => <List.Icon {...props} icon={isRTL ? "chevron-left" : "chevron-right"} />}
              onPress={() => navigation.navigate('Support')}
            />
          </Surface>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('settings.legal')}
          </Text>
          
          <Surface style={styles.listContainer} elevation={1}>
            <List.Item
              title={i18n.t('settings.termsOfService')}
              left={(props) => <List.Icon {...props} icon="file-document" />}
              right={(props) => <List.Icon {...props} icon={isRTL ? "chevron-left" : "chevron-right"} />}
              onPress={() => handleOpenLink('https://lamsa.jo/terms')}
            />
            <Divider />
            <List.Item
              title={i18n.t('settings.privacyPolicy')}
              left={(props) => <List.Icon {...props} icon="shield-check" />}
              right={(props) => <List.Icon {...props} icon={isRTL ? "chevron-left" : "chevron-right"} />}
              onPress={() => handleOpenLink('https://lamsa.jo/privacy')}
            />
            <Divider />
            <List.Item
              title={i18n.t('settings.about')}
              left={(props) => <List.Icon {...props} icon="information" />}
              right={(props) => <List.Icon {...props} icon={isRTL ? "chevron-left" : "chevron-right"} />}
              onPress={() => navigation.navigate('About')}
            />
          </Surface>
        </View>

        {/* Other Actions */}
        <View style={styles.section}>
          <Surface style={styles.listContainer} elevation={1}>
            <List.Item
              title={i18n.t('settings.clearCache')}
              titleStyle={{ color: theme.colors.error }}
              left={(props) => <List.Icon {...props} icon="delete" color={theme.colors.error} />}
              onPress={handleClearCache}
            />
            <Divider />
            <List.Item
              title={i18n.t('settings.signOut')}
              titleStyle={{ color: theme.colors.error }}
              left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
              onPress={handleSignOut}
            />
          </Surface>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text variant="bodySmall" style={styles.versionText}>
            {i18n.t('settings.version')} {Application.nativeApplicationVersion || '1.0.0'}
          </Text>
          <Text variant="bodySmall" style={styles.versionText}>
            {i18n.t('settings.build')} {Application.nativeBuildVersion || '1'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontWeight: '600',
  },
  userPhone: {
    opacity: 0.7,
    marginTop: 4,
  },
  editButton: {
    borderRadius: 28,
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
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 48,
  },
  versionText: {
    opacity: 0.5,
  },
  modalContent: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
  },
  modalTitle: {
    fontWeight: '600',
    marginBottom: 20,
  },
});

export default SettingsScreen;