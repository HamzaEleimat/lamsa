import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { auth, isAuthenticated, AuthErrorType, categorizeAuthError } from './supabase';
import type { Session } from './supabase';

/**
 * Example: OTP Authentication Flow
 */
export const OTPAuthExample: React.FC = () => {
  const [phone, setPhone] = useState('+962777123456');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth();

    // Listen to auth state changes
    const unsubscribe = auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      setSession(session);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    const { session } = await auth.getSession();
    setSession(session);
  };

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      const result = await auth.sendOTP(phone);
      
      if (result.success) {
        setOtpSent(true);
        Alert.alert('Success', 'OTP sent to your phone');
      } else {
        const errorType = categorizeAuthError({ message: result.error });
        
        switch (errorType) {
          case AuthErrorType.NETWORK_ERROR:
            Alert.alert('Network Error', 'Please check your internet connection');
            break;
          case AuthErrorType.RATE_LIMITED:
            Alert.alert('Too Many Attempts', 'Please wait before trying again');
            break;
          default:
            Alert.alert('Error', result.error || 'Failed to send OTP');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      const result = await auth.verifyOTP(phone, otp);
      
      if (result.success) {
        Alert.alert('Success', 'You are now logged in!');
        setOtpSent(false);
        setOtp('');
      } else {
        const errorType = categorizeAuthError({ message: result.error });
        
        switch (errorType) {
          case AuthErrorType.INVALID_CREDENTIALS:
            Alert.alert('Invalid OTP', 'Please check the code and try again');
            break;
          case AuthErrorType.OTP_EXPIRED:
            Alert.alert('OTP Expired', 'Please request a new code');
            setOtpSent(false);
            break;
          default:
            Alert.alert('Error', result.error || 'Failed to verify OTP');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const result = await auth.signOut();
      
      if (result.success) {
        Alert.alert('Success', 'You have been signed out');
        setOtpSent(false);
        setOtp('');
      } else {
        Alert.alert('Error', result.error || 'Failed to sign out');
      }
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Welcome! You are logged in.</Text>
        <Text>User ID: {session.user.id}</Text>
        <Text>Phone: {session.user.phone}</Text>
        <Button 
          title="Sign Out" 
          onPress={handleSignOut} 
          disabled={loading}
        />
      </View>
    );
  }

  return (
    <View style={{ padding: 20 }}>
      <Text>Phone Authentication</Text>
      
      {!otpSent ? (
        <>
          <TextInput
            placeholder="Phone number (e.g., +962777123456)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={{ 
              borderWidth: 1, 
              borderColor: '#ccc', 
              padding: 10, 
              marginVertical: 10 
            }}
          />
          <Button 
            title="Send OTP" 
            onPress={handleSendOTP} 
            disabled={loading || !phone}
          />
        </>
      ) : (
        <>
          <Text>Enter the 6-digit code sent to {phone}</Text>
          <TextInput
            placeholder="123456"
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
            maxLength={6}
            style={{ 
              borderWidth: 1, 
              borderColor: '#ccc', 
              padding: 10, 
              marginVertical: 10 
            }}
          />
          <Button 
            title="Verify OTP" 
            onPress={handleVerifyOTP} 
            disabled={loading || otp.length !== 6}
          />
          <Button 
            title="Resend OTP" 
            onPress={handleSendOTP} 
            disabled={loading}
          />
        </>
      )}
    </View>
  );
};

/**
 * Example: Protected API Call
 */
export const ProtectedAPIExample: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchProtectedData = async () => {
    setLoading(true);
    try {
      // Check if authenticated
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      // Get auth token for API calls
      const { session } = await auth.getSession();
      if (!session) {
        Alert.alert('Error', 'No session found');
        return;
      }

      // Make API call with auth token
      const response = await fetch('https://your-api.com/protected-endpoint', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else {
        Alert.alert('Error', 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching protected data:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button 
        title="Fetch Protected Data" 
        onPress={fetchProtectedData} 
        disabled={loading}
      />
      {data && (
        <Text>{JSON.stringify(data, null, 2)}</Text>
      )}
    </View>
  );
};

/**
 * Example: Auth Hook
 */
export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    auth.getSession().then(({ session }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen to auth changes
    const unsubscribe = auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user || null,
    loading,
    isAuthenticated: !!session,
  };
};