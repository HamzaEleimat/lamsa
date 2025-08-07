import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  useTheme,
  Snackbar,
  ActivityIndicator,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import OTPInput from '../../components/auth/OTPInput/OTPInput';
import ResendTimer from '../../components/auth/OTPInput/ResendTimer';
import i18n, { isRTL } from '../../i18n';
import { Button } from '../../components/ui';
import { spacing, shadows } from '../../theme/index';

type AuthStackParamList = {
  Welcome: undefined;
  PhoneAuth: undefined;
  OTPVerification: { phoneNumber: string };
  UserTypeSelection: { phoneNumber: string };
  ProviderOnboarding: undefined;
};

type OTPVerificationScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'OTPVerification'
>;

type OTPVerificationScreenRouteProp = RouteProp<
  AuthStackParamList,
  'OTPVerification'
>;

interface Props {
  navigation: OTPVerificationScreenNavigationProp;
  route: OTPVerificationScreenRouteProp;
}

interface AuthError {
  type: 'network' | 'validation' | 'server' | 'otp' | 'timeout' | 'rate_limit';
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

const OTPVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { signIn } = useAuth();
  const { phoneNumber } = route.params;
  
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isVerifying) {
        return true; // Prevent going back while verifying
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isVerifying]);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const formatPhoneForDisplay = (phone: string) => {
    // Format +962771234567 as +962 77 123 4567
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('962') && cleaned.length === 12) {
      return `+962 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    return phone;
  };

  const handleOTPComplete = async (otp: string) => {
    await verifyOTP(otp);
  };

  const verifyOTP = async (otp: string) => {
    if (otp.length !== 6) return;

    setIsVerifying(true);
    setError(null);

    try {
      // TODO: Implement actual API call to verify OTP
      // Simulate API call for now
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate different scenarios
          if (otp === '123456') {
            resolve(true);
          } else if (otp === '000000') {
            reject(new Error('RATE_LIMITED'));
          } else if (otp === '111111') {
            reject(new Error('NETWORK_ERROR'));
          } else {
            reject(new Error('INVALID_OTP'));
          }
        }, 2000);
      });

      // Navigate to user type selection instead of signing in directly
      navigation.navigate('UserTypeSelection', { phoneNumber });
      showSnackbar(i18n.t('otp.success'));

    } catch (error: any) {
      handleVerificationError(error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerificationError = (error: any) => {
    const errorCode = error.message || 'UNKNOWN_ERROR';
    
    let authError: AuthError;
    
    switch (errorCode) {
      case 'INVALID_OTP':
        authError = {
          type: 'otp',
          code: 'INVALID_OTP',
          message: i18n.t('otp.errors.invalid'),
          retryable: true,
        };
        setOtpValue(''); // Clear OTP for retry
        break;
        
      case 'EXPIRED_OTP':
        authError = {
          type: 'otp',
          code: 'EXPIRED_OTP', 
          message: i18n.t('otp.errors.expired'),
          retryable: false,
        };
        break;
        
      case 'RATE_LIMITED':
        authError = {
          type: 'rate_limit',
          code: 'RATE_LIMITED',
          message: i18n.t('otp.errors.rateLimited'),
          retryable: false,
          retryAfter: 300, // 5 minutes
        };
        break;
        
      case 'NETWORK_ERROR':
        authError = {
          type: 'network',
          code: 'NETWORK_ERROR',
          message: i18n.t('otp.errors.network'),
          retryable: true,
        };
        break;
        
      default:
        authError = {
          type: 'server',
          code: 'SERVER_ERROR',
          message: i18n.t('otp.errors.server'),
          retryable: true,
        };
    }
    
    setError(authError);
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    setError(null);

    try {
      // TODO: Implement actual API call to resend OTP
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setResendAttempts(prev => prev + 1);
      setOtpValue(''); // Clear current OTP
      showSnackbar(i18n.t('otp.resent'));
      
    } catch (error) {
      setError({
        type: 'network',
        code: 'RESEND_FAILED',
        message: i18n.t('otp.errors.resendFailed'),
        retryable: true,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setOtpValue('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              disabled={isVerifying}
            >
              <MaterialCommunityIcons
                name={isRTL() ? 'chevron-right' : 'chevron-left'}
                size={24}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer || `${theme.colors.primary}20` }]}>
              <MaterialCommunityIcons
                name="message-text"
                size={64}
                color={theme.colors.primary}
              />
            </View>

            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              {i18n.t('otp.title')}
            </Text>

            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {i18n.t('otp.subtitle', { phone: formatPhoneForDisplay(phoneNumber) })}
            </Text>

            <OTPInput
              value={otpValue}
              onChangeText={setOtpValue}
              onComplete={handleOTPComplete}
              isError={error?.type === 'otp'}
              errorMessage={error?.type === 'otp' ? error.message : undefined}
              isRTL={isRTL()}
              autoFocus={!isVerifying}
            />

            {isVerifying && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
                  {i18n.t('otp.verifying')}
                </Text>
              </View>
            )}

            {error && error.type !== 'otp' && (
              <View style={[styles.errorContainer, { backgroundColor: `${theme.colors.error}20` }]}>
                <MaterialCommunityIcons
                  name={error.type === 'network' ? 'wifi-off' : 'alert-circle'}
                  size={24}
                  color={theme.colors.error}
                />
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {error.message}
                </Text>
                {error.retryable && (
                  <Button
                    variant="outline"
                    onPress={handleRetry}
                    style={styles.retryButton}
                    icon={<MaterialCommunityIcons name="refresh" size={20} color={theme.colors.primary} />}
                  >
                    {i18n.t('common.retry')}
                  </Button>
                )}
              </View>
            )}

            <Button
              variant="primary"
              onPress={() => verifyOTP(otpValue)}
              loading={isVerifying}
              disabled={isVerifying || otpValue.length !== 6}
              style={styles.verifyButton}
              fullWidth
            >
              {isVerifying ? i18n.t('otp.verifying') : i18n.t('otp.verify')}
            </Button>

            <ResendTimer
              initialCountdown={30}
              onResend={handleResendOTP}
              isLoading={isResending}
              maxAttempts={3}
              currentAttempts={resendAttempts}
              isRTL={isRTL()}
            />

            <View style={styles.helpContainer}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
                {i18n.t('otp.help')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[styles.snackbar, { backgroundColor: theme.colors.primary }]}
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
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 32,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
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
    paddingHorizontal: spacing.md,
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontFamily: 'MartelSans_400Regular',
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.md,
    marginHorizontal: spacing.sm,
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontFamily: 'MartelSans_500Medium',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.sm,
  },
  verifyButton: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    minWidth: 200,
  },
  verifyButtonContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  verifyButtonText: {
    fontSize: 16,
    fontFamily: 'MartelSans_600SemiBold',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  helpText: {
    marginLeft: spacing.sm,
    fontSize: 12,
    fontFamily: 'MartelSans_400Regular',
    textAlign: 'center',
    flex: 1,
  },
  snackbar: {
  },
});

export default OTPVerificationScreen;
