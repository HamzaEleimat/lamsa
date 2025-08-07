import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  HelperText,
  Surface,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { authService } from '../../services';
import { showMessage } from 'react-native-flash-message';

interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

const CustomerSignupScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupData, setSignupData] = useState<SignupData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const validateForm = () => {
    const newErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
    };

    // Name validation
    if (!signupData.name.trim()) {
      newErrors.name = t('customer.signup.nameRequired');
    } else if (signupData.name.trim().length < 2) {
      newErrors.name = t('customer.signup.nameTooShort');
    }

    // Email validation
    if (!signupData.email.trim()) {
      newErrors.email = t('customer.signup.emailRequired');
    } else if (!isValidEmail(signupData.email)) {
      newErrors.email = t('customer.signup.invalidEmail');
    }

    // Password validation
    if (!signupData.password) {
      newErrors.password = t('customer.signup.passwordRequired');
    } else if (signupData.password.length < 8) {
      newErrors.password = t('customer.signup.passwordTooShort');
    } else if (!isStrongPassword(signupData.password)) {
      newErrors.password = t('customer.signup.passwordWeak');
    }

    // Confirm password validation
    if (!signupData.confirmPassword) {
      newErrors.confirmPassword = t('customer.signup.confirmPasswordRequired');
    } else if (signupData.password !== signupData.confirmPassword) {
      newErrors.confirmPassword = t('customer.signup.passwordMismatch');
    }

    // Phone validation
    if (!signupData.phone.trim()) {
      newErrors.phone = t('customer.signup.phoneRequired');
    } else if (!isValidJordanPhone(signupData.phone)) {
      newErrors.phone = t('customer.signup.invalidPhone');
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isStrongPassword = (password: string) => {
    // Must contain uppercase, lowercase, and number
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
  };

  const isValidJordanPhone = (phone: string) => {
    // Jordan phone validation
    const cleaned = phone.replace(/\D/g, '');
    return /^(962|0)?7[0-9]{8}$/.test(cleaned);
  };

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('962')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('07')) {
      return '+962' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      return '+962' + cleaned;
    }
    
    return phone;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const formattedPhone = formatPhoneNumber(signupData.phone);

      const response = await authService.customerSignup({
        name: signupData.name.trim(),
        email: signupData.email.trim().toLowerCase(),
        password: signupData.password,
        phone: formattedPhone,
      });

      showMessage({
        message: t('customer.signup.success'),
        type: 'success',
      });

      // Navigate to onboarding with user data
      navigation.navigate('CustomerOnboarding', {
        userData: response.data.user,
      });
    } catch (error: any) {
      showMessage({
        message: error.response?.data?.message || t('customer.signup.error'),
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>
              {t('customer.signup.title')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {t('customer.signup.subtitle')}
            </Text>
          </View>

          <Surface style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              label={t('customer.signup.fullName')}
              value={signupData.name}
              onChangeText={(text) => {
                setSignupData({ ...signupData, name: text });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              mode="outlined"
              error={!!errors.name}
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />
            <HelperText type="error" visible={!!errors.name}>
              {errors.name}
            </HelperText>

            <TextInput
              label={t('customer.signup.email')}
              value={signupData.email}
              onChangeText={(text) => {
                setSignupData({ ...signupData, email: text });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              mode="outlined"
              error={!!errors.email}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email" />}
            />
            <HelperText type="error" visible={!!errors.email}>
              {errors.email}
            </HelperText>

            <TextInput
              label={t('customer.signup.phone')}
              value={signupData.phone}
              onChangeText={(text) => {
                setSignupData({ ...signupData, phone: text });
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              mode="outlined"
              error={!!errors.phone}
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="07XXXXXXXX"
              left={<TextInput.Icon icon="phone" />}
            />
            <HelperText type="error" visible={!!errors.phone}>
              {errors.phone}
            </HelperText>

            <TextInput
              label={t('customer.signup.password')}
              value={signupData.password}
              onChangeText={(text) => {
                setSignupData({ ...signupData, password: text });
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              mode="outlined"
              error={!!errors.password}
              style={styles.input}
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
            <HelperText type="error" visible={!!errors.password}>
              {errors.password}
            </HelperText>

            <TextInput
              label={t('customer.signup.confirmPassword')}
              value={signupData.confirmPassword}
              onChangeText={(text) => {
                setSignupData({ ...signupData, confirmPassword: text });
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              mode="outlined"
              error={!!errors.confirmPassword}
              style={styles.input}
              secureTextEntry={!showConfirmPassword}
              left={<TextInput.Icon icon="lock-check" />}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
            />
            <HelperText type="error" visible={!!errors.confirmPassword}>
              {errors.confirmPassword}
            </HelperText>

            <Button
              mode="contained"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
              style={styles.signupButton}
              contentStyle={styles.buttonContent}
            >
              {t('customer.signup.createAccount')}
            </Button>

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
              <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>
                {t('common.or')}
              </Text>
              <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            </View>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('PhoneAuth')}
              style={styles.phoneButton}
              icon="phone"
            >
              {t('customer.signup.usePhone')}
            </Button>

            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: theme.colors.onSurfaceVariant }]}>
                {t('customer.signup.alreadyHaveAccount')}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('PhoneAuth')}>
                <Text style={[styles.loginLink, { color: theme.colors.primary }]}>
                  {t('customer.signup.login')}
                </Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginLeft: -8,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  formContainer: {
    padding: 24,
    borderRadius: 16,
    elevation: 2,
  },
  input: {
    marginBottom: 4,
  },
  signupButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  phoneButton: {
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default CustomerSignupScreen;