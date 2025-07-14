import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ResendTimerProps {
  initialCountdown: number; // seconds
  onResend: () => Promise<void>;
  isLoading?: boolean;
  maxAttempts?: number;
  currentAttempts?: number;
  isRTL?: boolean;
}

const ResendTimer: React.FC<ResendTimerProps> = ({
  initialCountdown = 30,
  onResend,
  isLoading = false,
  maxAttempts = 3,
  currentAttempts = 0,
  isRTL = false,
}) => {
  const theme = useTheme();
  const [countdown, setCountdown] = useState(initialCountdown);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (currentAttempts >= maxAttempts) {
      return;
    }

    setCanResend(false);
    setCountdown(initialCountdown * Math.pow(2, currentAttempts)); // Exponential backoff
    
    try {
      await onResend();
    } catch (error) {
      // If resend fails, allow immediate retry
      setCanResend(true);
      setCountdown(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isAttemptLimit = currentAttempts >= maxAttempts;

  if (isAttemptLimit) {
    return (
      <View style={styles.container}>
        <View style={styles.warningContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={16}
            color={theme.colors.error}
          />
          <Text style={[styles.warningText, { color: theme.colors.error }]}>
            Too many attempts. Please try again later.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!canResend ? (
        <View style={styles.timerContainer}>
          <MaterialCommunityIcons
            name="timer-sand"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={[styles.timerText, { color: theme.colors.primary }]}>
            {isRTL ? `إعادة الإرسال خلال ${formatTime(countdown)}` : `Resend in ${formatTime(countdown)}`}
          </Text>
        </View>
      ) : (
        <Button
          mode="text"
          onPress={handleResend}
          loading={isLoading}
          disabled={isLoading}
          icon="refresh"
          style={styles.resendButton}
          labelStyle={styles.resendButtonText}
        >
          {isRTL ? 'إعادة الإرسال' : 'Resend Code'}
        </Button>
      )}
      
      {currentAttempts > 0 && (
        <Text style={[styles.attemptsText, { color: theme.colors.onSurfaceVariant }]}>
          {isRTL 
            ? `المحاولة ${currentAttempts + 1} من ${maxAttempts}`
            : `Attempt ${currentAttempts + 1} of ${maxAttempts}`
          }
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  resendButton: {
    marginBottom: 8,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  attemptsText: {
    fontSize: 12,
    opacity: 0.7,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ResendTimer;
