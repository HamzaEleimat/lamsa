import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Button,
  Portal,
  Modal,
  Text,
  List,
  Divider,
  useTheme,
} from 'react-native-paper';
import { I18nManager } from 'react-native';
import i18n, { changeLanguage, getCurrentLanguage } from '../i18n';

interface LanguageSelectorProps {
  mode?: 'text' | 'contained' | 'outlined';
  style?: any;
  onLanguageChange?: (language: 'ar' | 'en') => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  mode = 'text',
  style,
  onLanguageChange,
}) => {
  const theme = useTheme();
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>(getCurrentLanguage());
  const [showModal, setShowModal] = useState(false);

  const handleLanguageChange = async (language: 'ar' | 'en') => {
    await changeLanguage(language);
    setCurrentLanguage(language);
    setShowModal(false);
    I18nManager.forceRTL(language === 'ar');
    
    if (onLanguageChange) {
      onLanguageChange(language);
    }
  };

  const getLanguageDisplayName = () => {
    return currentLanguage === 'ar' ? i18n.t('common.arabic') : i18n.t('common.english');
  };

  return (
    <>
      <Button
        mode={mode}
        onPress={() => setShowModal(true)}
        icon="web"
        style={style}
      >
        {getLanguageDisplayName()}
      </Button>

      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            {i18n.t('common.language')}
          </Text>
          <Divider style={styles.divider} />
          
          <List.Item
            title={i18n.t('common.arabic')}
            onPress={() => handleLanguageChange('ar')}
            left={(props) => 
              currentLanguage === 'ar' ? (
                <List.Icon {...props} icon="check" color={theme.colors.primary} />
              ) : (
                <List.Icon {...props} icon="" />
              )
            }
            style={currentLanguage === 'ar' ? styles.selectedLanguage : undefined}
          />
          
          <List.Item
            title={i18n.t('common.english')}
            onPress={() => handleLanguageChange('en')}
            left={(props) => 
              currentLanguage === 'en' ? (
                <List.Icon {...props} icon="check" color={theme.colors.primary} />
              ) : (
                <List.Icon {...props} icon="" />
              )
            }
            style={currentLanguage === 'en' ? styles.selectedLanguage : undefined}
          />
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: 0,
    maxWidth: 400,
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

export default LanguageSelector;