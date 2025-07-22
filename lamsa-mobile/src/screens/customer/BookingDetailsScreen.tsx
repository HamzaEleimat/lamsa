import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  useTheme,
  IconButton,
  Divider,
  Chip,
  Menu,
  List,
  Portal,
  Modal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import i18n from '../../i18n';
import { getSupabase } from '../../lib/supabase';
import LoadingOverlay from '../../components/shared/LoadingOverlay';

type CustomerStackParamList = {
  BookingDetails: { bookingId: string };
  Home: undefined;
};

type BookingDetailsScreenNavigationProp = NativeStackNavigationProp<
  CustomerStackParamList,
  'BookingDetails'
>;

type BookingDetailsScreenRouteProp = RouteProp<
  CustomerStackParamList,
  'BookingDetails'
>;

interface Props {
  navigation: BookingDetailsScreenNavigationProp;
  route: BookingDetailsScreenRouteProp;
}

interface BookingData {
  id: string;
  service_name: string;
  provider_name: string;
  provider_phone: string;
  provider_address: string;
  booking_date: string;
  booking_time: string;
  duration: number;
  price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  special_requests?: string;
  created_at: string;
  provider_logo?: string;
}

const BookingDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { bookingId } = route.params;
  const isRTL = i18n.locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockBooking: BookingData = {
        id: bookingId,
        service_name: 'Hair Styling & Treatment',
        provider_name: 'Elite Beauty Salon',
        provider_phone: '+962791234567',
        provider_address: '123 Rainbow St, Amman',
        booking_date: '2024-12-15',
        booking_time: '10:00',
        duration: 90,
        price: 45,
        status: 'confirmed',
        special_requests: 'Please use organic products',
        created_at: new Date().toISOString(),
        provider_logo: 'https://example.com/logo.png',
      };
      setBooking(mockBooking);
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.tertiary;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.secondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return i18n.t('booking.status.pending');
      case 'confirmed':
        return i18n.t('booking.status.confirmed');
      case 'completed':
        return i18n.t('booking.status.completed');
      case 'cancelled':
        return i18n.t('booking.status.cancelled');
      default:
        return status;
    }
  };

  const handleCall = () => {
    if (booking?.provider_phone) {
      Linking.openURL(`tel:${booking.provider_phone}`);
    }
  };

  const handleDirections = () => {
    if (booking?.provider_address) {
      const address = encodeURIComponent(booking.provider_address);
      const url = Platform.OS === 'ios'
        ? `maps:0,0?q=${address}`
        : `geo:0,0?q=${address}`;
      Linking.openURL(url);
    }
  };

  const handleAddToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const defaultCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];
        
        if (defaultCalendar && booking) {
          const eventDate = new Date(`${booking.booking_date}T${booking.booking_time}`);
          const endDate = new Date(eventDate.getTime() + booking.duration * 60000);
          
          await Calendar.createEventAsync(defaultCalendar.id, {
            title: `${booking.service_name} at ${booking.provider_name}`,
            startDate: eventDate,
            endDate: endDate,
            location: booking.provider_address,
            notes: booking.special_requests,
          });
          
          Alert.alert(
            i18n.t('booking.calendarAdded'),
            i18n.t('booking.calendarAddedMessage')
          );
        }
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
    }
  };

  const handleCancelBooking = async () => {
    // Implement cancellation logic
    setShowCancelModal(false);
    // Update booking status to cancelled
  };

  const handleReschedule = () => {
    // Navigate to reschedule screen
    Alert.alert(
      i18n.t('booking.reschedule'),
      i18n.t('booking.rescheduleMessage')
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingOverlay visible={loading} message={i18n.t('common.loading')} />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>{i18n.t('booking.notFound')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL ? "arrow-right" : "arrow-left"}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          {i18n.t('booking.details')}
        </Text>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              size={24}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              handleAddToCalendar();
            }}
            title={i18n.t('booking.addToCalendar')}
            leadingIcon="calendar-plus"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              // Share booking
            }}
            title={i18n.t('booking.share')}
            leadingIcon="share-variant"
          />
        </Menu>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <Surface style={styles.statusCard} elevation={2}>
          <View style={styles.statusHeader}>
            <MaterialCommunityIcons
              name="check-circle"
              size={48}
              color={getStatusColor(booking.status)}
            />
            <View style={styles.statusInfo}>
              <Text variant="headlineSmall" style={styles.statusTitle}>
                {getStatusText(booking.status)}
              </Text>
              <Text variant="bodyMedium" style={styles.bookingId}>
                {i18n.t('booking.bookingId')}: {booking.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>
        </Surface>

        {/* Service Details */}
        <Surface style={styles.detailsCard} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('booking.serviceDetails')}
          </Text>
          
          <List.Item
            title={booking.service_name}
            description={booking.provider_name}
            left={(props) => <List.Icon {...props} icon="spa" />}
            titleStyle={styles.listTitle}
          />
          
          <Divider style={styles.divider} />
          
          <List.Item
            title={formatDate(booking.booking_date)}
            description={formatTime(booking.booking_time)}
            left={(props) => <List.Icon {...props} icon="calendar" />}
            titleStyle={styles.listTitle}
          />
          
          <List.Item
            title={`${booking.duration} ${i18n.t('common.minutes')}`}
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
            titleStyle={styles.listTitle}
          />
          
          {booking.special_requests && (
            <>
              <Divider style={styles.divider} />
              <List.Item
                title={i18n.t('booking.specialRequests')}
                description={booking.special_requests}
                left={(props) => <List.Icon {...props} icon="note-text" />}
                titleStyle={styles.listTitle}
                descriptionNumberOfLines={3}
              />
            </>
          )}
        </Surface>

        {/* Payment Info */}
        <Surface style={styles.paymentCard} elevation={1}>
          <View style={styles.paymentRow}>
            <Text variant="titleMedium">{i18n.t('booking.totalAmount')}</Text>
            <Text variant="headlineSmall" style={[styles.price, { color: theme.colors.primary }]}>
              {booking.price} {i18n.t('common.currency')}
            </Text>
          </View>
          <Chip icon="cash" style={styles.paymentChip}>
            {i18n.t('booking.payAtSalon')}
          </Chip>
        </Surface>

        {/* Provider Actions */}
        <Surface style={styles.actionsCard} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('booking.contactProvider')}
          </Text>
          
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={handleCall}
              icon="phone"
              style={styles.actionButton}
            >
              {i18n.t('booking.call')}
            </Button>
            <Button
              mode="outlined"
              onPress={handleDirections}
              icon="map-marker"
              style={styles.actionButton}
            >
              {i18n.t('booking.directions')}
            </Button>
          </View>
        </Surface>

        {/* Booking Actions */}
        {booking.status === 'confirmed' && (
          <View style={styles.bookingActions}>
            <Button
              mode="contained-tonal"
              onPress={handleReschedule}
              style={styles.rescheduleButton}
            >
              {i18n.t('booking.reschedule')}
            </Button>
            <Button
              mode="outlined"
              onPress={() => setShowCancelModal(true)}
              textColor={theme.colors.error}
              style={styles.cancelButton}
            >
              {i18n.t('booking.cancel')}
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Cancel Modal */}
      <Portal>
        <Modal
          visible={showCancelModal}
          onDismiss={() => setShowCancelModal(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {i18n.t('booking.cancelBooking')}
          </Text>
          <Text variant="bodyMedium" style={styles.modalMessage}>
            {i18n.t('booking.cancelConfirmation')}
          </Text>
          
          <View style={styles.modalButtons}>
            <Button
              mode="text"
              onPress={() => setShowCancelModal(false)}
            >
              {i18n.t('common.no')}
            </Button>
            <Button
              mode="contained"
              onPress={handleCancelBooking}
              buttonColor={theme.colors.error}
            >
              {i18n.t('common.yes')}
            </Button>
          </View>
        </Modal>
      </Portal>
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
  statusCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  bookingId: {
    opacity: 0.7,
  },
  detailsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
  },
  divider: {
    marginVertical: 8,
  },
  paymentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontWeight: 'bold',
  },
  paymentChip: {
    alignSelf: 'flex-start',
  },
  actionsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  bookingActions: {
    gap: 12,
    marginBottom: 24,
  },
  rescheduleButton: {
    borderRadius: 28,
  },
  cancelButton: {
    borderRadius: 28,
    borderColor: 'currentColor',
  },
  modalContent: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
  },
  modalTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  modalMessage: {
    marginBottom: 24,
    opacity: 0.8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});

export default BookingDetailsScreen;