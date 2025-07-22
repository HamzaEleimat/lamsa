import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import i18n from '../../i18n';

type CustomerStackParamList = {
  PaymentConfirmation: {
    paymentId: string;
    bookingId: string;
    amount: number;
    status: 'success' | 'failure';
  };
  BookingDetails: { bookingId: string };
  Home: undefined;
  Checkout: { bookingId: string; amount: number };
};

type PaymentConfirmationScreenNavigationProp = NativeStackNavigationProp<
  CustomerStackParamList,
  'PaymentConfirmation'
>;

type PaymentConfirmationScreenRouteProp = RouteProp<
  CustomerStackParamList,
  'PaymentConfirmation'
>;

interface Props {
  navigation: PaymentConfirmationScreenNavigationProp;
  route: PaymentConfirmationScreenRouteProp;
}

const PaymentConfirmationScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { paymentId, bookingId, amount, status } = route.params;
  const isSuccess = status === 'success';

  useEffect(() => {
    // Prevent going back to checkout
    navigation.setOptions({
      headerShown: false,
      gestureEnabled: false,
    });
  }, [navigation]);

  const handleViewBooking = () => {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Home' },
        { name: 'BookingDetails', params: { bookingId } },
      ],
    });
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const handleRetry = () => {
    navigation.navigate('Checkout', { bookingId, amount });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Icon/Animation */}
          <View style={styles.iconContainer}>
            {isSuccess ? (
              <View style={styles.successIcon}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={120}
                  color={theme.colors.primary}
                />
              </View>
            ) : (
              <View style={styles.failureIcon}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={120}
                  color={theme.colors.error}
                />
              </View>
            )}
          </View>

          {/* Title */}
          <Text variant="headlineMedium" style={styles.title}>
            {isSuccess
              ? i18n.t('payment.success.title')
              : i18n.t('payment.failure.title')
            }
          </Text>

          {/* Message */}
          <Text variant="bodyLarge" style={styles.message}>
            {isSuccess
              ? i18n.t('payment.success.message')
              : i18n.t('payment.failure.message')
            }
          </Text>

          {/* Payment Details */}
          {isSuccess && (
            <Surface style={styles.detailsCard} elevation={1}>
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>
                  {i18n.t('payment.transactionId')}
                </Text>
                <Text variant="bodyMedium" style={styles.detailValue}>
                  {paymentId.toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>
                  {i18n.t('payment.amount')}
                </Text>
                <Text variant="titleMedium" style={[styles.detailValue, { color: theme.colors.primary }]}>
                  {amount.toFixed(2)} {i18n.t('common.currency')}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>
                  {i18n.t('payment.date')}
                </Text>
                <Text variant="bodyMedium" style={styles.detailValue}>
                  {new Date().toLocaleDateString()}
                </Text>
              </View>
            </Surface>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {isSuccess ? (
              <>
                <Button
                  mode="contained"
                  onPress={handleViewBooking}
                  style={styles.primaryButton}
                  labelStyle={styles.buttonLabel}
                  contentStyle={styles.buttonContent}
                >
                  {i18n.t('payment.viewBooking')}
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={handleGoHome}
                  style={styles.secondaryButton}
                  labelStyle={styles.buttonLabel}
                  contentStyle={styles.buttonContent}
                >
                  {i18n.t('payment.backToHome')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  mode="contained"
                  onPress={handleRetry}
                  style={styles.primaryButton}
                  labelStyle={styles.buttonLabel}
                  contentStyle={styles.buttonContent}
                >
                  {i18n.t('payment.tryAgain')}
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={handleGoHome}
                  style={styles.secondaryButton}
                  labelStyle={styles.buttonLabel}
                  contentStyle={styles.buttonContent}
                >
                  {i18n.t('payment.backToHome')}
                </Button>
              </>
            )}
          </View>

          {/* Help Text */}
          <Text variant="bodySmall" style={styles.helpText}>
            {isSuccess
              ? i18n.t('payment.success.helpText')
              : i18n.t('payment.failure.helpText')
            }
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  successIcon: {
    width: 120,
    height: 120,
  },
  failureIcon: {
    width: 120,
    height: 120,
  },
  title: {
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  detailsCard: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    opacity: 0.7,
  },
  detailValue: {
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    borderRadius: 28,
  },
  secondaryButton: {
    borderRadius: 28,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  helpText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingHorizontal: 32,
  },
});

export default PaymentConfirmationScreen;