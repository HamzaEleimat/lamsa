import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput as RNTextInput,
  Keyboard,
  Animated,
  Vibration,
  Pressable,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  HelperText,
  useTheme,
  MD3Theme,
  Snackbar,
  IconButton,
  ActivityIndicator,
  Chip,
  Portal,
  Modal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Type for navigation
type RootStackParamList = {
  PhoneAuth: undefined;
  OTPVerify: { phone: string };
  Home: undefined;
  MainTabs: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OTPVerify'>;
type RouteProps = RouteProp<RootStackParamList, 'OTPVerify'>;

// Translations
const translations = {
  ar: {
    title: 'أدخل رمز التحقق',
    subtitle: 'أرسلنا رمز مكون من 6 أرقام إلى',
    verify: 'تحقق',
    resend: 'إعادة إرسال الرمز',
    changeNumber: 'تغيير الرقم',
    invalidOTP: 'رمز غير صالح',
    emptyOTP: 'الرجاء إدخال الرمز الكامل',
    verifying: 'جارٍ التحقق...',
    successMessage: 'تم التحقق بنجاح! 🎉',
    errorPrefix: 'خطأ: ',
    expiredError: 'انتهت صلاحية الرمز',
    invalidError: 'رمز غير صحيح',
    resendSuccess: 'تم إرسال رمز جديد',
    resendIn: 'إعادة الإرسال بعد',
    seconds: 'ثانية',
    didntReceive: 'لم يصلك الرمز؟',
    editNumber: 'تعديل',
  },
  en: {
    title: 'Enter Verification Code',
    subtitle: 'We sent a 6-digit code to',
    verify: 'Verify',
    resend: 'Resend Code',
    changeNumber: 'Change Number',
    invalidOTP: 'Invalid code',
    emptyOTP: 'Please enter the complete code',
    verifying: 'Verifying...',
    successMessage: 'Verified successfully! 🎉',
    errorPrefix: 'Error: ',
    expiredError: 'Code expired',
    invalidError: 'Invalid code',
    resendSuccess: 'New code sent',
    resendIn: 'Resend in',
    seconds: 'seconds',
    didntReceive: "Didn't receive code?",
    editNumber: 'Edit',
  },
};

export const OTPVerifyScreen: React.FC = () => {
  const theme = useTheme<MD3Theme>();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { verifyOTP, sendOTP } = useAuth();
  
  // Get phone from route params
  const phoneNumber = route.params?.phone || '';
  
  // State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Language (hardcoded for now, should come from context)
  const [language] = useState<'ar' | 'en'>('ar');
  const t = translations[language];
  
  // Refs
  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimations = useRef(
    Array(6).fill(0).map(() => new Animated.Value(0))
  ).current;
  const scaleAnimations = useRef(
    Array(6).fill(0).map(() => new Animated.Value(0.8))
  ).current;
  
  // Timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);
  
  // Animate inputs on mount
  useEffect(() => {
    Animated.stagger(50, 
      fadeAnimations.map((anim, index) => 
        Animated.parallel([
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnimations[index], {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ])
      )
    ).start();
    
    // Auto-focus first input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 400);
  }, []);
  
  // Shake animation for error
  const triggerShake = () => {
    Vibration.vibrate(50);
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // Handle OTP input change
  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(''); // Clear error on input
    
    // Animate the input
    if (value) {
      Animated.spring(scaleAnimations[index], {
        toValue: 1.1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }).start(() => {
        Animated.spring(scaleAnimations[index], {
          toValue: 1,
          tension: 50,
          friction: 3,
          useNativeDriver: true,
        }).start();
      });
    }
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit if all digits entered
    if (value && index === 5 && newOtp.every(digit => digit)) {
      setTimeout(() => handleVerifyOTP(newOtp.join('')), 100);
    }
  };
  
  // Handle backspace
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  // Handle paste
  const handlePaste = (e: any) => {
    const pastedText = e.nativeEvent.text;
    if (/^\d{6}$/.test(pastedText)) {
      const digits = pastedText.split('');
      setOtp(digits);
      
      // Animate all inputs
      Animated.stagger(50,
        scaleAnimations.map(anim =>
          Animated.sequence([
            Animated.spring(anim, {
              toValue: 1.1,
              tension: 50,
              friction: 3,
              useNativeDriver: true,
            }),
            Animated.spring(anim, {
              toValue: 1,
              tension: 50,
              friction: 3,
              useNativeDriver: true,
            }),
          ])
        )
      ).start();
      
      inputRefs.current[5]?.focus();
      setTimeout(() => handleVerifyOTP(pastedText), 100);
    }
  };
  
  // Handle verify OTP
  const handleVerifyOTP = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    
    // Validate
    if (!code || code.length !== 6) {
      setError(code ? t.invalidOTP : t.emptyOTP);
      triggerShake();
      return;
    }
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
    // Verify OTP
    setLoading(true);
    setError('');
    
    try {
      const result = await verifyOTP(phoneNumber, code);
      
      if (result.success) {
        // Success animation
        setShowSuccess(true);
        setSnackbarMessage(t.successMessage);
        setShowSnackbar(true);
        
        // Animate inputs out
        Animated.parallel(
          fadeAnimations.map(anim =>
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            })
          )
        ).start();
        
        // Navigate to home after animation
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            })
          );
        }, 1500);
      } else {
        // Handle error
        const errorMessage = result.error || '';
        if (errorMessage.toLowerCase().includes('expired')) {
          setError(t.expiredError);
        } else {
          setError(t.invalidError);
        }
        
        triggerShake();
        
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(t.invalidError);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };
  
  // Handle resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0 || resending) return;
    
    setResending(true);
    setError('');
    
    try {
      const result = await sendOTP(phoneNumber);
      
      if (result.success) {
        setSnackbarMessage(t.resendSuccess);
        setShowSnackbar(true);
        setResendTimer(30);
        
        // Clear and focus
        setOtp(['', '', '', '', '', '']);
        
        // Animate inputs
        Animated.stagger(50,
          scaleAnimations.map(anim =>
            Animated.sequence([
              Animated.spring(anim, {
                toValue: 0.8,
                tension: 50,
                friction: 3,
                useNativeDriver: true,
              }),
              Animated.spring(anim, {
                toValue: 1,
                tension: 50,
                friction: 3,
                useNativeDriver: true,
              }),
            ])
          )
        ).start();
        
        setTimeout(() => inputRefs.current[0]?.focus(), 300);
      } else {
        setError(result.error || 'Failed to resend');
      }
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setResending(false);
    }
  };
  
  // Format phone for display
  const formatPhoneDisplay = (phone: string) => {
    if (phone.startsWith('+962')) {
      const number = phone.slice(4);
      return `${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
    }
    return phone;
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <IconButton
            icon={language === 'ar' ? 'arrow-right' : 'arrow-left'}
            size={24}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          
          {/* Icon with animation */}
          <Animated.View 
            style={[
              styles.iconContainer,
              {
                opacity: fadeAnimations[0],
                transform: [{ scale: scaleAnimations[0] }],
              },
            ]}
          >
            <Surface style={[styles.iconSurface, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
              <IconButton
                icon={showSuccess ? 'check-circle' : 'message-text'}
                size={40}
                iconColor={showSuccess ? theme.colors.primary : theme.colors.primary}
              />
            </Surface>
          </Animated.View>
          
          {/* Title */}
          <View style={styles.headerContainer}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
              {t.title}
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {t.subtitle}
            </Text>
            
            {/* Phone Number Chip */}
            <View style={styles.phoneChipContainer}>
              <Chip
                mode="flat"
                icon="phone"
                style={[styles.phoneChip, { backgroundColor: theme.colors.secondaryContainer }]}
                textStyle={{ color: theme.colors.onSecondaryContainer }}
              >
                +962 {formatPhoneDisplay(phoneNumber)}
              </Chip>
              <Button
                mode="text"
                compact
                onPress={() => navigation.goBack()}
                labelStyle={styles.editButtonLabel}
              >
                {t.editNumber}
              </Button>
            </View>
          </View>
          
          {/* OTP Input with shake animation */}
          <Animated.View
            style={[
              styles.otpContainer,
              {
                transform: [{ translateX: shakeAnimation }],
              },
            ]}
          >
            {otp.map((digit, index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: fadeAnimations[index],
                  transform: [{ scale: scaleAnimations[index] }],
                }}
              >
                <Pressable
                  onPress={() => inputRefs.current[index]?.focus()}
                  style={({ pressed }) => [
                    styles.otpInputWrapper,
                    pressed && styles.otpInputPressed,
                  ]}
                >
                  <Surface
                    style={[
                      styles.otpInput,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: error 
                          ? theme.colors.error 
                          : digit 
                          ? theme.colors.primary 
                          : theme.colors.outline,
                      },
                    ]}
                    elevation={digit ? 2 : 1}
                  >
                    <RNTextInput
                      ref={ref => (inputRefs.current[index] = ref)}
                      value={digit}
                      onChangeText={value => handleOtpChange(value, index)}
                      onKeyPress={e => handleKeyPress(e, index)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      keyboardType="numeric"
                      maxLength={1}
                      style={[styles.otpInputText, { color: theme.colors.onSurface }]}
                      selectionColor={theme.colors.primary}
                      editable={!loading && !showSuccess}
                      caretHidden
                    />
                  </Surface>
                </Pressable>
              </Animated.View>
            ))}
          </Animated.View>
          
          {/* Error Helper Text */}
          <HelperText type="error" visible={!!error} style={styles.helperText}>
            {error}
          </HelperText>
          
          {/* Verify Button */}
          <Button
            mode="contained"
            onPress={() => handleVerifyOTP()}
            loading={loading}
            disabled={loading || otp.some(digit => !digit) || showSuccess}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon={showSuccess ? 'check' : undefined}
          >
            {loading ? t.verifying : showSuccess ? t.successMessage : t.verify}
          </Button>
          
          {/* Resend Section */}
          <View style={styles.resendContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t.didntReceive}
            </Text>
            
            {resendTimer > 0 ? (
              <View style={styles.timerContainer}>
                <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  {t.resendIn} {resendTimer} {t.seconds}
                </Text>
                {/* Progress indicator */}
                <View style={[styles.timerProgress, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Animated.View
                    style={[
                      styles.timerProgressFill,
                      {
                        backgroundColor: theme.colors.primary,
                        width: `${((30 - resendTimer) / 30) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : (
              <Button
                mode="contained-tonal"
                onPress={handleResendOTP}
                loading={resending}
                disabled={resending}
                style={styles.resendButton}
                contentStyle={styles.resendButtonContent}
                icon="refresh"
              >
                {t.resend}
              </Button>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Success Snackbar */}
      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={2000}
        style={{ backgroundColor: theme.colors.primary }}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: -8,
    marginTop: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  iconSurface: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  phoneChipContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  phoneChip: {
    height: 36,
  },
  editButtonLabel: {
    fontSize: 14,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  otpInputWrapper: {
    transform: [{ scale: 1 }],
  },
  otpInputPressed: {
    transform: [{ scale: 0.95 }],
  },
  otpInput: {
    width: 48,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  otpInputText: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  helperText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    borderRadius: 12,
    marginBottom: 32,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    gap: 12,
  },
  timerContainer: {
    alignItems: 'center',
    gap: 8,
  },
  timerProgress: {
    width: 120,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  resendButton: {
    borderRadius: 12,
  },
  resendButtonContent: {
    paddingHorizontal: 16,
  },
});

export default OTPVerifyScreen;