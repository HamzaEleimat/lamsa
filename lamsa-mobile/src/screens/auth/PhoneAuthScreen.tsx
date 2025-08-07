import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Checkbox,
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
import { Button, Input } from '../../components/ui';
import { spacing, shadows } from '../../theme/index';

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
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <MaterialCommunityIcons
                name={isRTL() ? 'chevron-right' : 'chevron-left'}
                size={24}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              {i18n.t('phoneAuth.title')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
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
                  <View style={styles.phoneInputContainer}>
                    <View style={styles.countryCodeContainer}>
                      <Text style={[styles.countryCode, { color: theme.colors.onSurfaceVariant }]}>
                        +962
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        label={i18n.t('phoneAuth.phoneLabel')}
                        value={value}
                        onChangeText={(text) => onChange(formatPhoneNumber(text))}
                        onBlur={onBlur}
                        placeholder={i18n.t('phoneAuth.phonePlaceholder')}
                        keyboardType="phone-pad"
                        maxLength={11}
                        error={errors.phoneNumber?.message}
                        style={[isRTL() && styles.rtlInput]}
                      />
                    </View>
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
                    {errors.acceptTerms && (
                      <Text style={[styles.errorText, { color: theme.colors.error }]}>
                        {errors.acceptTerms?.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Button
                variant="primary"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                disabled={loading || !acceptTerms}
                style={styles.submitButton}
                fullWidth
              >
                {loading ? i18n.t('common.loading') : i18n.t('phoneAuth.sendOTP')}
              </Button>

              {/* Email Signup Option */}
              <View style={styles.emailSignupContainer}>
                <Text style={[styles.emailSignupText, { color: theme.colors.onSurfaceVariant }]}>
                  {i18n.t('phoneAuth.preferEmail')}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('CustomerSignup' as any)}>
                  <Text style={[styles.emailSignupLink, { color: theme.colors.primary }]}>
                    {i18n.t('phoneAuth.signupWithEmail')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Development-only Admin Login Button */}
              {isDevelopment && (
                <View style={styles.devContainer}>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>DEVELOPMENT ONLY</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  
                  <Button
                    variant="secondary"
                    onPress={handleDevLogin}
                    loading={devLoading}
                    disabled={devLoading}
                    style={styles.devButton}
                    fullWidth
                    icon={<MaterialCommunityIcons name="test-tube" size={20} color="#FFFFFF" />}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  content: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontFamily: 'CormorantGaramond_600SemiBold',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'MartelSans_400Regular',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  form: {
    marginTop: spacing.md,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  countryCodeContainer: {
    paddingBottom: spacing.lg,
  },
  countryCode: {
    fontSize: 16,
    fontFamily: 'MartelSans_600SemiBold',
  },
  rtlInput: {
    textAlign: 'right',
  },
  termsContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -spacing.sm,
  },
  termsText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    fontFamily: 'MartelSans_400Regular',
    lineHeight: 20,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontFamily: 'MartelSans_600SemiBold',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'MartelSans_400Regular',
    marginTop: spacing.xs,
    marginLeft: spacing.xxl,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  emailSignupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  emailSignupText: {
    fontSize: 14,
    fontFamily: 'MartelSans_400Regular',
  },
  emailSignupLink: {
    fontSize: 14,
    fontFamily: 'MartelSans_600SemiBold',
    textDecorationLine: 'underline',
  },
  snackbar: {
  },
  errorSnackbar: {
  },
  devContainer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: 12,
    fontFamily: 'MartelSans_600SemiBold',
    color: '#FF6B6B',
  },
  devButton: {
    marginTop: spacing.sm,
  },
  devButtonContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  devButtonText: {
    fontSize: 16,
    fontFamily: 'MartelSans_600SemiBold',
    lineHeight: 20,
    color: '#FFFFFF',
  },
  devWarning: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontFamily: 'MartelSans_400Regular',
    color: '#666666',
    textAlign: 'center',
  },
});

export default PhoneAuthScreen;