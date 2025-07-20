import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Example Login Screen using AuthContext
 * This demonstrates how to integrate the auth context with a real login flow
 */
export const LoginScreen: React.FC = () => {
  const { sendOTP, verifyOTP, isLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [localLoading, setLocalLoading] = useState(false);

  // Format phone number for Jordan (add +962 if not present)
  const formatPhoneNumber = (input: string): string => {
    // Remove any non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // If starts with 0, remove it
    const withoutLeadingZero = digits.startsWith('0') ? digits.slice(1) : digits;
    
    // If starts with 962, add +
    if (withoutLeadingZero.startsWith('962')) {
      return `+${withoutLeadingZero}`;
    }
    
    // If starts with 77, 78, or 79 (Jordan mobile), add +962
    if (/^7[789]/.test(withoutLeadingZero)) {
      return `+962${withoutLeadingZero}`;
    }
    
    return input; // Return as is if doesn't match Jordan format
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length < 9) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLocalLoading(true);
    const formattedPhone = formatPhoneNumber(phone);
    
    const result = await sendOTP(formattedPhone);
    
    if (result.success) {
      setStep('otp');
      Alert.alert('Success', 'OTP sent to your phone');
    } else {
      Alert.alert('Error', result.error || 'Failed to send OTP');
    }
    
    setLocalLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit OTP');
      return;
    }

    setLocalLoading(true);
    const formattedPhone = formatPhoneNumber(phone);
    
    const result = await verifyOTP(formattedPhone, otp);
    
    if (result.success) {
      // Navigation will be handled by auth state change in navigation
      Alert.alert('Success', 'Welcome to Lamsa!');
    } else {
      Alert.alert('Error', result.error || 'Invalid OTP');
    }
    
    setLocalLoading(false);
  };

  const handleResendOTP = async () => {
    setOtp('');
    await handleSendOTP();
  };

  const handleChangePhone = () => {
    setStep('phone');
    setOtp('');
  };

  const loading = isLoading || localLoading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Lamsa</Text>
          <Text style={styles.subtitle}>
            {step === 'phone' ? 'Enter your phone number' : 'Enter verification code'}
          </Text>
        </View>

        {step === 'phone' ? (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="77 123 4567"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={15}
                editable={!loading}
              />
              <Text style={styles.hint}>We'll send you a verification code</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Verification Code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="123456"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
                editable={!loading}
                autoFocus
              />
              <Text style={styles.hint}>
                Enter the 6-digit code sent to {formatPhoneNumber(phone)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <View style={styles.otpActions}>
              <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                <Text style={styles.linkText}>Resend Code</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChangePhone} disabled={loading}>
                <Text style={styles.linkText}>Change Number</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E91E63',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  linkText: {
    color: '#E91E63',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginScreen;