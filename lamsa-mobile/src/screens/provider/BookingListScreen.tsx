import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { 
  Text, 
  Card, 
  Chip, 
  Avatar, 
  IconButton, 
  FAB,
  Searchbar,
  SegmentedButtons,
  useTheme,
  ActivityIndicator,
  Divider,
  Menu,
  Button
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { providerBookingService, ProviderBooking } from '../../services/providerBookingService';
import { Booking, BookingStatus } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { isRTL } from '../../i18n';


const BookingListScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuVisible, setMenuVisible] = useState<{ [key: string]: boolean }>({});

  const statusColors = {
    [BookingStatus.PENDING]: theme.colors.warning,
    [BookingStatus.CONFIRMED]: theme.colors.primary,
    [BookingStatus.COMPLETED]: theme.colors.success,
    [BookingStatus.CANCELLED]: theme.colors.error,
  };

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const filters = statusFilter !== 'all' ? { status: statusFilter as BookingStatus } : undefined;
      const providerBookings = await providerBookingService.getProviderBookings(user.id, filters);
      setBookings(providerBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBookings();
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await providerBookingService.updateBookingStatus(bookingId, newStatus);
      await loadBookings();
      setMenuVisible({ ...menuVisible, [bookingId]: false });
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const getFilteredBookings = () => {
    let filtered = bookings;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.customer?.name?.toLowerCase().includes(query) ||
        booking.service?.name_en?.toLowerCase().includes(query) ||
        booking.service?.name_ar?.toLowerCase().includes(query) ||
        booking.customer?.phone?.includes(searchQuery)
      );
    }

    return filtered;
  };

  const formatBookingDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    const locale = isRTL() ? ar : enUS;

    if (isToday(date)) {
      return t('common.today');
    } else if (isTomorrow(date)) {
      return t('common.tomorrow');
    }

    return format(date, 'EEEE, dd MMMM', { locale });
  };

  const renderBookingItem = ({ item }: { item: ProviderBooking }) => {
    const bookingDate = typeof item.booking_date === 'string' ? parseISO(item.booking_date) : new Date(item.booking_date);
    const isPastBooking = new Date(bookingDate) < new Date();

    return (
      <Card 
        style={styles.bookingCard}
        onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
      >
        <Card.Content>
          <View style={styles.bookingHeader}>
            <View style={styles.customerInfo}>
              <Avatar.Text 
                size={40} 
                label={item.customer?.name?.charAt(0) || 'C'} 
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={styles.customerDetails}>
                <Text variant="titleMedium" style={styles.customerName}>
                  {item.customer?.name || t('bookings.unknown_customer')}
                </Text>
                <Text variant="bodySmall" style={styles.serviceName}>
                  {isRTL() ? item.service?.name_ar : item.service?.name_en}
                </Text>
              </View>
            </View>
            <Menu
              visible={menuVisible[item.id] || false}
              onDismiss={() => setMenuVisible({ ...menuVisible, [item.id]: false })}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible({ ...menuVisible, [item.id]: true })}
                />
              }
            >
              {item.status === BookingStatus.PENDING && (
                <>
                  <Menu.Item 
                    onPress={() => handleStatusUpdate(item.id, BookingStatus.CONFIRMED)}
                    title={t('bookings.confirm')}
                    leadingIcon="check"
                  />
                  <Menu.Item 
                    onPress={() => handleStatusUpdate(item.id, BookingStatus.CANCELLED)}
                    title={t('bookings.cancel')}
                    leadingIcon="close"
                  />
                </>
              )}
              {item.status === BookingStatus.CONFIRMED && !isPastBooking && (
                <Menu.Item 
                  onPress={() => handleStatusUpdate(item.id, BookingStatus.CANCELLED)}
                  title={t('bookings.cancel')}
                  leadingIcon="close"
                />
              )}
              {item.status === BookingStatus.CONFIRMED && isPastBooking && (
                <Menu.Item 
                  onPress={() => handleStatusUpdate(item.id, BookingStatus.COMPLETED)}
                  title={t('bookings.mark_completed')}
                  leadingIcon="check-all"
                />
              )}
              <Divider />
              <Menu.Item 
                onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
                title={t('bookings.view_details')}
                leadingIcon="eye"
              />
            </Menu>
          </View>

          <View style={styles.bookingDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons 
                name="calendar" 
                size={16} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text variant="bodySmall" style={styles.detailText}>
                {formatBookingDate(item.booking_date)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons 
                name="clock-outline" 
                size={16} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text variant="bodySmall" style={styles.detailText}>
                {item.start_time} - {item.end_time}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons 
                name="cash" 
                size={16} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text variant="bodySmall" style={styles.detailText}>
                {item.total_amount} {t('common.currency')}
              </Text>
            </View>
          </View>

          <View style={styles.chipContainer}>
            <Chip 
              mode="flat" 
              style={[styles.statusChip, { backgroundColor: statusColors[item.status] }]}
              textStyle={{ color: theme.colors.onPrimary }}
            >
              {t(`bookings.status.${item.status.toLowerCase()}`)}
            </Chip>
            {item.payment_method && (
              <Chip 
                mode="outlined" 
                icon={item.payment_method === 'ONLINE' ? 'credit-card' : 'cash'}
                style={styles.paymentChip}
              >
                {t(`bookings.payment.${item.payment_method.toLowerCase()}`)}
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('navigation.bookings')}
        </Text>
        <Searchbar
          placeholder={t('bookings.search_placeholder')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          icon={isRTL() ? 'magnify' : 'magnify'}
          clearIcon={isRTL() ? 'close' : 'close'}
        />
        <SegmentedButtons
          value={statusFilter}
          onValueChange={setStatusFilter}
          buttons={[
            { value: 'all', label: t('common.all') },
            { value: BookingStatus.PENDING, label: t('bookings.status.pending') },
            { value: BookingStatus.CONFIRMED, label: t('bookings.status.confirmed') },
            { value: BookingStatus.COMPLETED, label: t('bookings.status.completed') },
          ]}
          style={styles.filterButtons}
        />
      </View>

      <FlatList
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="calendar-blank" 
              size={64} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text variant="titleMedium" style={styles.emptyText}>
              {statusFilter === 'all' 
                ? t('bookings.no_bookings') 
                : t('bookings.no_bookings_filtered')}
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateBooking')}
        label={t('bookings.create_booking')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    marginBottom: 16,
    textAlign: isRTL() ? 'right' : 'left',
  },
  searchbar: {
    marginBottom: 12,
  },
  filterButtons: {
    marginTop: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  bookingCard: {
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerDetails: {
    marginLeft: isRTL() ? 0 : 12,
    marginRight: isRTL() ? 12 : 0,
    flex: 1,
  },
  customerName: {
    fontWeight: '600',
  },
  serviceName: {
    color: '#666',
    marginTop: 2,
  },
  bookingDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: isRTL() ? 0 : 8,
    marginRight: isRTL() ? 8 : 0,
    color: '#666',
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    height: 28,
  },
  paymentChip: {
    height: 28,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: isRTL() ? undefined : 0,
    left: isRTL() ? 0 : undefined,
    bottom: 0,
  },
});

export default BookingListScreen;