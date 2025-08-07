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
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { bookingService } from '../../services/bookingService';
import LoadingOverlay from '../../components/shared/LoadingOverlay';
import { ProviderStackParamList } from '../../navigation/ProviderStackNavigator';
import { customColors } from '../../theme/index';

type ProviderBookingDetailsScreenNavigationProp = NativeStackNavigationProp<
  ProviderStackParamList,
  'BookingDetails'
>;

type ProviderBookingDetailsScreenRouteProp = RouteProp<
  ProviderStackParamList,
  'BookingDetails'
>;

interface Props {
  navigation: ProviderBookingDetailsScreenNavigationProp;
  route: ProviderBookingDetailsScreenRouteProp;
}

const ProviderBookingDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { t, language } = useTranslation();
  const { bookingId } = route.params;
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getBookingById(bookingId);
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      Alert.alert(t('common.error'), t('booking.errorLoadingDetails'));
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
        return customColors.success;
      case 'completed':
        return theme.colors.primary;
      case 'cancelled':
        return theme.colors.error;
      default:
        return customColors.warning;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('booking.status.pending');
      case 'confirmed':
        return t('booking.status.confirmed');
      case 'completed':
        return t('booking.status.completed');
      case 'cancelled':
        return t('booking.status.cancelled');
      default:
        return status;
    }
  };

  const handleCall = () => {
    if (booking?.customer?.phone) {
      Linking.openURL(`tel:${booking.customer.phone}`);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setLoading(true);
      await bookingService.updateBookingStatus(bookingId, newStatus);
      await fetchBookingDetails();
      Alert.alert(t('common.success'), t('booking.statusUpdated'));
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert(t('common.error'), t('booking.errorUpdatingStatus'));
    } finally {
      setLoading(false);
      setMenuVisible(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      await bookingService.updateBookingStatus(bookingId, 'completed', notes);
      await fetchBookingDetails();
      Alert.alert(t('common.success'), t('booking.completedSuccessfully'));
      setShowCompleteModal(false);
    } catch (error) {
      console.error('Error completing booking:', error);
      Alert.alert(t('common.error'), t('booking.errorCompleting'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert(t('common.error'), t('booking.cancelReasonRequired'));
      return;
    }

    try {
      setLoading(true);
      await bookingService.updateBookingStatus(bookingId, 'cancelled', cancelReason);
      await fetchBookingDetails();
      Alert.alert(t('common.success'), t('booking.cancelledSuccessfully'));
      setShowCancelModal(false);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert(t('common.error'), t('booking.errorCancelling'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <IconButton
            icon={isRTL ? 'arrow-right' : 'arrow-left'}
            onPress={() => navigation.goBack()}
          />
          <Text variant="headlineSmall">{t('booking.details')}</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text>{t('booking.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL ? 'arrow-right' : 'arrow-left'}
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineSmall">{t('booking.details')}</Text>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          {booking.status === 'pending' && (
            <Menu.Item
              onPress={() => handleUpdateStatus('confirmed')}
              title={t('booking.confirm')}
              leadingIcon="check"
            />
          )}
          {booking.status === 'confirmed' && (
            <Menu.Item
              onPress={() => setShowCompleteModal(true)}
              title={t('booking.markCompleted')}
              leadingIcon="check-circle"
            />
          )}
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <Menu.Item
              onPress={() => setShowCancelModal(true)}
              title={t('booking.cancel')}
              leadingIcon="close-circle"
            />
          )}
        </Menu>
      </View>

      <ScrollView style={styles.content}>
        <Surface style={styles.statusContainer} elevation={1}>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(booking.status) }]}
            textStyle={{ color: '#FFFFFF' }}
          >
            {getStatusText(booking.status)}
          </Chip>
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="account"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('booking.customerInfo')}
            </Text>
          </View>
          <Divider />
          <View style={styles.sectionContent}>
            <List.Item
              title={booking.customer?.name || t('common.unknown')}
              description={booking.customer?.phone || ''}
              left={(props) => <List.Icon {...props} icon="account" />}
              right={() => (
                <IconButton
                  icon="phone"
                  onPress={handleCall}
                  disabled={!booking.customer?.phone}
                />
              )}
            />
          </View>
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('booking.dateTime')}
            </Text>
          </View>
          <Divider />
          <View style={styles.sectionContent}>
            <View style={styles.row}>
              <View style={styles.infoItem}>
                <Text variant="bodySmall" style={styles.label}>
                  {t('booking.date')}
                </Text>
                <Text variant="bodyLarge">{formatDate(booking.booking_date)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text variant="bodySmall" style={styles.label}>
                  {t('booking.time')}
                </Text>
                <Text variant="bodyLarge">{formatTime(booking.booking_time)}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.infoItem}>
                <Text variant="bodySmall" style={styles.label}>
                  {t('booking.duration')}
                </Text>
                <Text variant="bodyLarge">
                  {booking.service?.duration || 60} {t('common.minutes')}
                </Text>
              </View>
            </View>
          </View>
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="content-cut"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('booking.serviceDetails')}
            </Text>
          </View>
          <Divider />
          <View style={styles.sectionContent}>
            <Text variant="bodyLarge" style={styles.serviceName}>
              {booking.service?.name || t('common.unknown')}
            </Text>
            <View style={styles.priceContainer}>
              <Text variant="bodyMedium" style={styles.label}>
                {t('booking.price')}
              </Text>
              <Text variant="titleLarge" style={styles.price}>
                {booking.total_amount} {t('common.currency')}
              </Text>
            </View>
          </View>
        </Surface>

        {booking.special_requests && (
          <Surface style={styles.section} elevation={1}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="note-text"
                size={24}
                color={theme.colors.primary}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('booking.specialRequests')}
              </Text>
            </View>
            <Divider />
            <View style={styles.sectionContent}>
              <Text variant="bodyMedium">{booking.special_requests}</Text>
            </View>
          </Surface>
        )}

        <View style={styles.bookingInfo}>
          <Text variant="bodySmall" style={styles.bookingId}>
            {t('booking.id')}: {booking.id}
          </Text>
          <Text variant="bodySmall" style={styles.bookingDate}>
            {t('booking.createdAt')}:{' '}
            {new Date(booking.created_at).toLocaleDateString(
              isRTL ? 'ar-JO' : 'en-US'
            )}
          </Text>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showCancelModal}
          onDismiss={() => setShowCancelModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {t('booking.cancelBooking')}
          </Text>
          <Text variant="bodyMedium" style={styles.modalText}>
            {t('booking.cancelConfirmation')}
          </Text>
          <TextInput
            mode="outlined"
            label={t('booking.cancelReason')}
            value={cancelReason}
            onChangeText={setCancelReason}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowCancelModal(false)}
              style={styles.modalButton}
            >
              {t('common.close')}
            </Button>
            <Button
              mode="contained"
              onPress={handleCancel}
              style={styles.modalButton}
              buttonColor={theme.colors.error}
            >
              {t('booking.cancel')}
            </Button>
          </View>
        </Modal>

        <Modal
          visible={showCompleteModal}
          onDismiss={() => setShowCompleteModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {t('booking.completeBooking')}
          </Text>
          <Text variant="bodyMedium" style={styles.modalText}>
            {t('booking.completeConfirmation')}
          </Text>
          <TextInput
            mode="outlined"
            label={t('booking.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowCompleteModal(false)}
              style={styles.modalButton}
            >
              {t('common.close')}
            </Button>
            <Button
              mode="contained"
              onPress={handleComplete}
              style={styles.modalButton}
            >
              {t('booking.markCompleted')}
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusChip: {
    paddingHorizontal: 16,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
  },
  sectionContent: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  label: {
    color: '#757575',
    marginBottom: 4,
  },
  serviceName: {
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: '#FF8FAB',
  },
  bookingInfo: {
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  bookingId: {
    color: '#757575',
  },
  bookingDate: {
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    marginBottom: 12,
  },
  modalText: {
    marginBottom: 16,
    color: '#757575',
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default ProviderBookingDetailsScreen;