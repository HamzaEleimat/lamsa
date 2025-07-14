import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import {
  Text,
  Button,
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
    <SafeAreaView style={styles.container}>
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
            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              icon={isRTL() ? 'chevron-right' : 'chevron-left'}
              style={styles.backButton}
              disabled={isVerifying}
            >
              {''}
            </Button>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="message-text"
                size={64}
                color={theme.colors.primary}
              />
            </View>

            <Text variant="headlineMedium" style={styles.title}>
              {i18n.t('otp.title')}
            </Text>

            <Text variant="bodyLarge" style={styles.subtitle}>
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
                <Text style={styles.loadingText}>
                  {i18n.t('otp.verifying')}
                </Text>
              </View>
            )}

            {error && error.type !== 'otp' && (
              <View style={styles.errorContainer}>
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
                    mode="outlined"
                    onPress={handleRetry}
                    style={styles.retryButton}
                    icon="refresh"
                  >
                    {i18n.t('common.retry')}
                  </Button>
                )}
              </View>
            )}

            <Button
              mode="contained"
              onPress={() => verifyOTP(otpValue)}
              loading={isVerifying}
              disabled={isVerifying || otpValue.length !== 6}
              style={styles.verifyButton}
              contentStyle={styles.verifyButtonContent}
              labelStyle={styles.verifyButtonText}
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
        style={styles.snackbar}
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
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 32,
    backgroundColor: 'rgba(103, 80, 164, 0.1)',
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
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    marginHorizontal: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 12,
  },
  verifyButton: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 28,
    minWidth: 200,
  },
  verifyButtonContent: {
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  helpText: {
    marginLeft: 8,
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
  },
  snackbar: {
    backgroundColor: '#4CAF50',
  },
});

export default OTPVerificationScreen;
