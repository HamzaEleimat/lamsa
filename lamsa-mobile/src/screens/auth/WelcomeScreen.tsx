import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  I18nManager,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
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

const { width, height } = Dimensions.get('window');

type AuthStackParamList = {
  Welcome: undefined;
  PhoneAuth: undefined;
  ProviderOnboarding: undefined;
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.languageSelector}>
          <Button
            mode="text"
            onPress={() => setShowLanguageModal(true)}
            icon="web"
            contentStyle={styles.languageButton}
            labelStyle={styles.languageButtonText}
          >
            {getLanguageDisplayName()}
          </Button>
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Surface style={styles.logoPlaceholder} elevation={2}>
              <MaterialCommunityIcons
                name="flower-tulip"
                size={64}
                color={theme.colors.primary}
              />
            </Surface>
          </View>

          <Text variant="headlineLarge" style={styles.title}>
            {i18n.t('welcome.title')}
          </Text>

          <Text variant="titleLarge" style={styles.tagline}>
            {i18n.t('welcome.tagline')}
          </Text>

          <Button
            mode="contained"
            onPress={() => navigation.navigate('PhoneAuth')}
            style={styles.getStartedButton}
            labelStyle={styles.getStartedButtonText}
            contentStyle={styles.getStartedButtonContent}
          >
            {i18n.t('welcome.getStarted')}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('ProviderOnboarding')}
            style={styles.providerLink}
            labelStyle={styles.providerLinkText}
          >
            {i18n.t('welcome.providerLink')}
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showLanguageModal}
          onDismiss={() => setShowLanguageModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            {i18n.t('common.language')}
          </Text>
          <Divider style={styles.divider} />
          
          <List.Item
            title={i18n.t('common.arabic')}
            onPress={() => handleLanguageChange('ar')}
            left={(props) => <List.Icon {...props} icon="check" />}
            style={currentLanguage === 'ar' ? styles.selectedLanguage : undefined}
          />
          
          <List.Item
            title={i18n.t('common.english')}
            onPress={() => handleLanguageChange('en')}
            left={(props) => <List.Icon {...props} icon="check" />}
            style={currentLanguage === 'en' ? styles.selectedLanguage : undefined}
          />
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  languageSelector: {
    alignItems: 'flex-end',
    paddingTop: 16,
  },
  languageButton: {
    flexDirection: isRTL() ? 'row-reverse' : 'row',
  },
  languageButtonText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 48,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  tagline: {
    marginBottom: 48,
    textAlign: 'center',
    opacity: 0.7,
  },
  getStartedButton: {
    marginBottom: 24,
    borderRadius: 28,
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  getStartedButtonContent: {
    paddingHorizontal: 48,
    paddingVertical: 8,
  },
  providerLink: {
    marginTop: 8,
  },
  providerLinkText: {
    fontSize: 14,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: 0,
    maxWidth: width - 40,
    alignSelf: 'center',
  },
  modalTitle: {
    padding: 16,
    textAlign: 'center',
  },
  divider: {
    marginBottom: 8,
  },
  selectedLanguage: {
    backgroundColor: 'rgba(103, 80, 164, 0.08)',
  },
});

export default WelcomeScreen;