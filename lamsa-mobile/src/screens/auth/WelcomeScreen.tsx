import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  I18nManager,
  Image,
} from 'react-native';
import {
  Surface,
  Text,
  useTheme,
  Portal,
  Modal,
  List,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n, { changeLanguage, getCurrentLanguage, isRTL } from '../../i18n';
import { Button } from '../../components/ui';
import { spacing, shadows } from '../../theme';

const { width, height } = Dimensions.get('window');

type AuthStackParamList = {
  Welcome: undefined;
  PhoneAuth: undefined;
  OTPVerification: { phoneNumber: string };
  UserTypeSelection: { phoneNumber: string };
  CustomerOnboarding: { userData: { phone: string; userType: 'customer' } };
  ProviderOnboarding: { userData: { phone: string; userType: 'provider' } };
};

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Welcome'
>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>(getCurrentLanguage());
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    I18nManager.forceRTL(isRTL());
  }, []);

  const handleLanguageChange = async (language: 'ar' | 'en') => {
    await changeLanguage(language);
    setCurrentLanguage(language);
    setShowLanguageModal(false);
    I18nManager.forceRTL(language === 'ar');
  };

  const getLanguageDisplayName = () => {
    return currentLanguage === 'ar' ? i18n.t('common.arabic') : i18n.t('common.english');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.languageSelector}>
          <Button
            variant="text"
            onPress={() => setShowLanguageModal(true)}
            icon={<MaterialCommunityIcons name="web" size={20} color={theme.colors.primary} />}
            style={styles.languageButton}
          >
            {getLanguageDisplayName()}
          </Button>
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            {i18n.t('welcome.title')}
          </Text>

          <Text style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>
            {i18n.t('welcome.tagline')}
          </Text>

          <Button
            variant="primary"
            onPress={() => navigation.navigate('PhoneAuth')}
            style={styles.getStartedButton}
            size="large"
          >
            {i18n.t('welcome.getStarted')}
          </Button>

          <Button
            variant="text"
            onPress={() => navigation.navigate('PhoneAuth')}
            style={styles.providerLink}
          >
            {i18n.t('welcome.providerLink')}
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showLanguageModal}
          onDismiss={() => setShowLanguageModal(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            {i18n.t('common.language')}
          </Text>
          <Divider style={styles.divider} />
          
          <List.Item
            title={i18n.t('common.arabic')}
            onPress={() => handleLanguageChange('ar')}
            left={(props) => <List.Icon {...props} icon="check" />}
            style={currentLanguage === 'ar' ? [styles.selectedLanguage, { backgroundColor: `${theme.colors.primary}15` }] : undefined}
          />
          
          <List.Item
            title={i18n.t('common.english')}
            onPress={() => handleLanguageChange('en')}
            left={(props) => <List.Icon {...props} icon="check" />}
            style={currentLanguage === 'en' ? [styles.selectedLanguage, { backgroundColor: `${theme.colors.primary}15` }] : undefined}
          />
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  languageSelector: {
    alignItems: 'flex-end',
    paddingTop: spacing.md,
  },
  languageButton: {
    flexDirection: isRTL() ? 'row-reverse' : 'row',
  },
  languageButtonText: {
    fontSize: 14,
    fontFamily: 'MartelSans_400Regular',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xxxl,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logo: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 40,
    fontFamily: 'CormorantGaramond_700Bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 20,
    fontFamily: 'MartelSans_400Regular',
    marginBottom: spacing.xxxl,
    textAlign: 'center',
    lineHeight: 28,
  },
  getStartedButton: {
    marginBottom: spacing.lg,
    minWidth: 200,
  },
  getStartedButtonText: {
    fontSize: 16,
    fontFamily: 'MartelSans_600SemiBold',
  },
  getStartedButtonContent: {
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.sm,
  },
  providerLink: {
    marginTop: spacing.sm,
  },
  providerLinkText: {
    fontSize: 14,
    fontFamily: 'MartelSans_400Regular',
  },
  modalContent: {
    backgroundColor: 'transparent',
    margin: spacing.lg,
    borderRadius: 8,
    padding: 0,
    maxWidth: width - (spacing.lg * 2),
    alignSelf: 'center',
  },
  modalTitle: {
    padding: spacing.md,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'CormorantGaramond_600SemiBold',
  },
  divider: {
    marginBottom: spacing.sm,
  },
  selectedLanguage: {
    backgroundColor: 'transparent',
  },
});

export default WelcomeScreen;