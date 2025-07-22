import React, { useState, useContext } from 'react';
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
  IconButton,
  Divider,
  Checkbox,
  Portal,
  Modal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import i18n from '../../i18n';
import { AuthContext } from '../../contexts/AuthContext';
import { getSupabase } from '../../lib/supabase';
import LoadingOverlay from '../../components/shared/LoadingOverlay';

type CustomerStackParamList = {
  BookingConfirmation: {
    bookingData: {
      serviceId: string;
      providerId: string;
      serviceName: string;
      providerName: string;
      price: number;
      duration: number;
      specialRequests?: string;
      date: string;
      time: string;
    };
  };
  Checkout: {
    bookingId: string;
    amount: number;
  };
  BookingDetails: {
    bookingId: string;
  };
  Home: undefined;
};

type BookingConfirmationScreenNavigationProp = NativeStackNavigationProp<
  CustomerStackParamList,
  'BookingConfirmation'
>;

type BookingConfirmationScreenRouteProp = RouteProp<
  CustomerStackParamList,
  'BookingConfirmation'
>;

interface Props {
  navigation: BookingConfirmationScreenNavigationProp;
  route: BookingConfirmationScreenRouteProp;
}

const BookingConfirmationScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const { bookingData } = route.params;
  const isRTL = i18n.locale === 'ar';

  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString(isRTL ? 'ar-JO' : 'en-US', options);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? (isRTL ? 'م' : 'PM') : (isRTL ? 'ص' : 'AM');
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleConfirmBooking = async () => {
    if (!termsAccepted) {
      return;
    }

    setLoading(true);
    try {
      // Create booking in database
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_id: user?.id,
          provider_id: bookingData.providerId,
          service_id: bookingData.serviceId,
          booking_date: bookingData.date,
          booking_time: bookingData.time,
          duration: bookingData.duration,
          price: bookingData.price,
          special_requests: bookingData.specialRequests,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      setBookingId(data.id);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating booking:', error);
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    setShowSuccessModal(false);
    navigation.navigate('Checkout', {
      bookingId,
      amount: bookingData.price,
    });
  };

  const handleViewBooking = () => {
    setShowSuccessModal(false);
    navigation.navigate('BookingDetails', { bookingId });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL ? "arrow-right" : "arrow-left"}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          {i18n.t('booking.confirmBooking')}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Summary */}
        <Surface style={styles.summaryCard} elevation={2}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('booking.bookingDetails')}
          </Text>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="spa"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <View style={styles.detailContent}>
              <Text variant="bodyLarge" style={styles.detailLabel}>
                {bookingData.serviceName}
              </Text>
              <Text variant="bodyMedium" style={styles.detailSubLabel}>
                {bookingData.providerName}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <View style={styles.detailContent}>
              <Text variant="bodyLarge" style={styles.detailLabel}>
                {formatDate(bookingData.date)}
              </Text>
              <Text variant="bodyMedium" style={styles.detailSubLabel}>
                {formatTime(bookingData.time)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyLarge" style={styles.detailContent}>
              {bookingData.duration} {i18n.t('common.minutes')}
            </Text>
          </View>

          {bookingData.specialRequests && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="note-text"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <View style={styles.detailContent}>
                <Text variant="bodyMedium" style={styles.detailLabel}>
                  {i18n.t('booking.specialRequests')}:
                </Text>
                <Text variant="bodyMedium" style={styles.detailSubLabel}>
                  {bookingData.specialRequests}
                </Text>
              </View>
            </View>
          )}

          <Divider style={styles.divider} />

          <View style={styles.priceRow}>
            <Text variant="titleLarge">{i18n.t('booking.totalAmount')}</Text>
            <Text variant="headlineMedium" style={[styles.price, { color: theme.colors.primary }]}>
              {bookingData.price} {i18n.t('common.currency')}
            </Text>
          </View>
        </Surface>

        {/* Payment Info */}
        <Surface style={styles.infoCard} elevation={1}>
          <MaterialCommunityIcons
            name="information"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="bodyMedium" style={styles.infoText}>
            {i18n.t('booking.paymentInfo')}
          </Text>
        </Surface>

        {/* Terms & Conditions */}
        <View style={styles.termsContainer}>
          <View style={styles.checkboxRow}>
            <Checkbox
              status={termsAccepted ? 'checked' : 'unchecked'}
              onPress={() => setTermsAccepted(!termsAccepted)}
              color={theme.colors.primary}
            />
            <Text variant="bodyMedium" style={styles.termsText}>
              {i18n.t('booking.termsPrefix')}{' '}
              <Text style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}>
                {i18n.t('booking.termsLink')}
              </Text>
            </Text>
          </View>
          {!termsAccepted && (
            <Text variant="bodySmall" style={styles.termsError}>
              {i18n.t('booking.termsRequired')}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleConfirmBooking}
          disabled={!termsAccepted}
          style={styles.confirmButton}
          labelStyle={styles.buttonLabel}
          contentStyle={styles.buttonContent}
        >
          {i18n.t('booking.confirmAndProceed')}
        </Button>
      </View>

      {/* Success Modal */}
      <Portal>
        <Modal
          visible={showSuccessModal}
          onDismiss={() => {}}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.successContent}>
            {/* Success animation placeholder */}
            <View style={styles.successIcon}>
              <MaterialCommunityIcons
                name="check-circle"
                size={80}
                color={theme.colors.primary}
              />
            </View>
            
            <Text variant="headlineSmall" style={styles.successTitle}>
              {i18n.t('booking.bookingConfirmed')}
            </Text>
            
            <Text variant="bodyLarge" style={styles.successMessage}>
              {i18n.t('booking.bookingConfirmedMessage')}
            </Text>

            <View style={styles.modalButtons}>
              <Button
                mode="contained"
                onPress={handleProceedToPayment}
                style={styles.modalButton}
              >
                {i18n.t('booking.proceedToPayment')}
              </Button>
              
              <Button
                mode="outlined"
                onPress={handleViewBooking}
                style={styles.modalButton}
              >
                {i18n.t('booking.viewBooking')}
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      <LoadingOverlay
        visible={loading}
        message={i18n.t('booking.creatingBooking')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontWeight: '500',
  },
  detailSubLabel: {
    opacity: 0.7,
    marginTop: 2,
  },
  divider: {
    marginVertical: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    opacity: 0.8,
  },
  termsContainer: {
    marginBottom: 100,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    flex: 1,
    marginLeft: 8,
  },
  termsError: {
    color: 'red',
    marginTop: 4,
    marginLeft: 40,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  confirmButton: {
    borderRadius: 28,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    padding: 0,
  },
  successContent: {
    padding: 32,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 32,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    borderRadius: 28,
  },
});

export default BookingConfirmationScreen;