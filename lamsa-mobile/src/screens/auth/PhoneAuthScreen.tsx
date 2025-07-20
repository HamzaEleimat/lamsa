import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Checkbox,
  HelperText,
  ActivityIndicator,
  useTheme,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import i18n, { isRTL } from '../../i18n';
import { validateJordanianPhone, formatPhoneNumber, getFullPhoneNumber } from '../../utils/validation';

type AuthStackParamList = {
  Welcome: undefined;
  PhoneAuth: undefined;
  OTPVerification: { phoneNumber: string };
  ProviderOnboarding: undefined;
};

type PhoneAuthScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'PhoneAuth'
>;

interface Props {
  navigation: PhoneAuthScreenNavigationProp;
}

interface FormData {
  phoneNumber: string;
  acceptTerms: boolean;
}

const PhoneAuthScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    defaultValues: {
      phoneNumber: '',
      acceptTerms: false,
    },
  });

  const acceptTerms = watch('acceptTerms');

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      
      // TODO: Implement actual OTP sending logic with Supabase
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fullPhoneNumber = getFullPhoneNumber(data.phoneNumber);
      
      // Navigate to OTP verification screen
      navigation.navigate('OTPVerification', { phoneNumber: fullPhoneNumber });
      
      showSnackbar(i18n.t('phoneAuth.otpSent'), 'success');
    } catch (error) {
      showSnackbar(i18n.t('phoneAuth.otpError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () => {
    // TODO: Replace with actual terms URL
    Linking.openURL('https://lamsa.com/terms');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              icon={isRTL() ? 'chevron-right' : 'chevron-left'}
              style={styles.backButton}
            >
              {''}
            </Button>
          </View>

          <View style={styles.content}>
            <Text variant="headlineMedium" style={styles.title}>
              {i18n.t('phoneAuth.title')}
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {i18n.t('phoneAuth.subtitle')}
            </Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="phoneNumber"
                rules={{
                  required: i18n.t('phoneAuth.phoneRequired'),
                  validate: (value) =>
                    validateJordanianPhone(value) || i18n.t('phoneAuth.phoneInvalid'),
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput
                      label={i18n.t('phoneAuth.phoneLabel')}
                      value={value}
                      onChangeText={(text) => onChange(formatPhoneNumber(text))}
                      onBlur={onBlur}
                      placeholder={i18n.t('phoneAuth.phonePlaceholder')}
                      keyboardType="phone-pad"
                      maxLength={11}
                      error={!!errors.phoneNumber}
                      mode="outlined"
                      left={
                        <TextInput.Affix
                          text="+962"
                          textStyle={styles.countryCode}
                        />
                      }
                      style={[styles.input, isRTL() && styles.rtlInput]}
                    />
                    <HelperText type="error" visible={!!errors.phoneNumber}>
                      {errors.phoneNumber?.message}
                    </HelperText>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="acceptTerms"
                rules={{
                  required: i18n.t('phoneAuth.termsRequired'),
                }}
                render={({ field: { onChange, value } }) => (
                  <View style={styles.termsContainer}>
                    <View style={styles.checkboxRow}>
                      <Checkbox
                        status={value ? 'checked' : 'unchecked'}
                        onPress={() => onChange(!value)}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.termsText}>
                        {i18n.t('phoneAuth.termsPrefix')}{' '}
                        <Text
                          style={styles.termsLink}
                          onPress={openTerms}
                        >
                          {i18n.t('phoneAuth.termsLink')}
                        </Text>
                      </Text>
                    </View>
                    <HelperText type="error" visible={!!errors.acceptTerms}>
                      {errors.acceptTerms?.message}
                    </HelperText>
                  </View>
                )}
              />

              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                disabled={loading || !acceptTerms}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
                labelStyle={styles.submitButtonText}
              >
                {loading ? i18n.t('common.loading') : i18n.t('phoneAuth.sendOTP')}
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[
          styles.snackbar,
          snackbarType === 'error' && styles.errorSnackbar,
        ]}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    marginLeft: -8,
  },
  content: {
    flex: 1,
    paddingTop: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
  },
  form: {
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  rtlInput: {
    textAlign: 'right',
  },
  countryCode: {
    fontWeight: '600',
    fontSize: 16,
  },
  termsContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
  },
  termsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  termsLink: {
    color: '#6750A4',
    textDecorationLine: 'underline',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 28,
  },
  submitButtonContent: {
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: '#4CAF50',
  },
  errorSnackbar: {
    backgroundColor: '#F44336',
  },
});

export default PhoneAuthScreen;