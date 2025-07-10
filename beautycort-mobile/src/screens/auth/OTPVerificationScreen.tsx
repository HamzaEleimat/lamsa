import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

type AuthStackParamList = {
  Welcome: undefined;
  PhoneAuth: undefined;
  OTPVerification: { phoneNumber: string };
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

const OTPVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { signIn } = useAuth();
  const { phoneNumber } = route.params;

  const handleVerify = async () => {
    // TODO: Implement actual OTP verification
    // For now, simulate successful verification
    await signIn({
      id: '1',
      name: 'Test User',
      phone: phoneNumber,
      role: UserRole.CUSTOMER,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium">OTP Verification</Text>
        <Text variant="bodyMedium" style={styles.placeholder}>
          Enter OTP sent to {phoneNumber}
        </Text>
        <Button
          mode="contained"
          onPress={handleVerify}
          style={styles.verifyButton}
        >
          Verify & Continue
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholder: {
    marginTop: 8,
    opacity: 0.6,
    textAlign: 'center',
  },
  verifyButton: {
    marginTop: 24,
  },
});

export default OTPVerificationScreen;