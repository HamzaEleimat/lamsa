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
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import Constants from 'expo-constants';

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
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
  
  // Check if we're in development mode - always true for Expo Go
  const isDevelopment = __DEV__ || Constants.expoConfig?.extra?.eas?.projectId || process.env.EXPO_PUBLIC_ENV === 'development';

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

  // Development-only admin login
  const handleDevLogin = async () => {
    try {
      setDevLoading(true);
      
      // Create mock admin user
      const mockAdminUser = {
        id: 'dev-admin-001',
        phone: '+962777777777',
        name: 'Dev Admin',
        email: 'admin@lamsa.dev',
        role: UserRole.PROVIDER, // Provider role to access all screens
        languagePreference: 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Sign in with mock user
      await signIn(mockAdminUser);
      
      showSnackbar('Logged in as Dev Admin', 'success');
    } catch (error) {
      showSnackbar('Dev login failed', 'error');
      console.error('Dev login error:', error);
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
                          style={[styles.termsLink, { color: theme.colors.primary }]}
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
                uppercase={false}
                touchSoundDisabled={false}
              >
                {loading ? i18n.t('common.loading') : i18n.t('phoneAuth.sendOTP')}
              </Button>

              {/* Development-only Admin Login Button */}
              {isDevelopment && (
                <View style={styles.devContainer}>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>DEVELOPMENT ONLY</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  
                  <Button
                    mode="contained"
                    onPress={handleDevLogin}
                    loading={devLoading}
                    disabled={devLoading}
                    style={[styles.devButton, { backgroundColor: '#FF6B6B' }]}
                    contentStyle={styles.devButtonContent}
                    labelStyle={styles.devButtonText}
                    icon="test-tube"
                    uppercase={false}
                    touchSoundDisabled={false}
                  >
                    {devLoading ? 'Loading...' : 'Dev Admin Login'}
                  </Button>
                  
                  <Text style={styles.devWarning}>
                    ⚠️ This button is for development only and will not appear in production
                  </Text>
                </View>
              )}
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
          { backgroundColor: snackbarType === 'error' ? theme.colors.error : theme.colors.primary },
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
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40, // Add bottom padding for better scrolling
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
    backgroundColor: 'transparent',
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
    textDecorationLine: 'underline',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 28,
    elevation: 0, // Remove elevation for iOS
  },
  submitButtonContent: {
    paddingHorizontal: 32,
    paddingVertical: 12, // Increased padding for better text display
    minHeight: 48, // Ensure minimum height
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20, // Add line height to prevent text cutoff
  },
  snackbar: {
  },
  errorSnackbar: {
  },
  devContainer: {
    marginTop: 32,
    paddingTop: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  devButton: {
    marginTop: 8,
    borderRadius: 28,
    elevation: 0, // Remove elevation for iOS
  },
  devButtonContent: {
    paddingHorizontal: 32,
    paddingVertical: 12, // Increased padding
    minHeight: 48, // Ensure minimum height
  },
  devButtonText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20, // Add line height
    color: '#FFFFFF', // Ensure white text
  },
  devWarning: {
    marginTop: 12,
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

export default PhoneAuthScreen;