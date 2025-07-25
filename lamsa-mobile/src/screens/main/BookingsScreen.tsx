import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, useTheme, Surface, Chip, Button, Divider, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n from '../../i18n';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import HelpButton from '../../components/help/HelpButton';
import bookingService from '../../services/bookingService';
import { Booking } from '../../services/mock/mockBookings';

const BookingsScreen: React.FC = () => {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const isRTL = i18n.locale === 'ar';
  const locale = isRTL ? ar : enUS;

  useEffect(() => {
    loadBookings();
  }, [filter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingService.getUserBookings(
        filter === 'all' ? undefined : filter
      );
      setBookings(response.bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return theme.colors.primary;
      case 'completed': return theme.colors.tertiary;
      case 'cancelled': return theme.colors.error;
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return 'clock-outline';
      case 'completed': return 'check-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const providerName = isRTL ? item.provider_name_ar : item.provider_name;
    const serviceName = isRTL ? item.service_name_ar : item.service_name;
    const bookingDate = new Date(`${item.booking_date} ${item.booking_time}`);
    
    return (
      <Surface style={styles.bookingCard} elevation={1}>
        <View style={styles.bookingHeader}>
          <View style={styles.providerInfo}>
            {item.provider_image ? (
              <Avatar.Image
                size={48}
                source={{ uri: item.provider_image }}
              />
            ) : (
              <Avatar.Text
                size={48}
                label={providerName.charAt(0)}
                style={{ backgroundColor: theme.colors.primaryContainer }}
              />
            )}
            <View style={styles.providerDetails}>
              <Text variant="titleMedium" style={styles.providerName}>
                {providerName}
              </Text>
              <Text variant="bodyMedium" style={styles.serviceName}>
                {serviceName}
              </Text>
            </View>
          </View>
          <Chip
            icon={() => (
              <MaterialCommunityIcons
                name={getStatusIcon(item.status) as any}
                size={16}
                color={getStatusColor(item.status)}
              />
            )}
            style={[styles.statusChip, { borderColor: getStatusColor(item.status) }]}
            textStyle={{ color: getStatusColor(item.status) }}
          >
            {i18n.t(`booking.status.${item.status}`)}
          </Chip>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={styles.detailText}>
              {format(bookingDate, 'EEEE, dd MMMM yyyy', { locale })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={styles.detailText}>
              {item.booking_time} ({item.duration_minutes} {i18n.t('common.minutes')})
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="cash"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={styles.detailText}>
              {item.total_amount} {i18n.t('common.currency')}
            </Text>
          </View>
        </View>
      {item.status === 'upcoming' && (
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => console.log('Reschedule booking:', item.id)}
            style={styles.actionButton}
          >
            {i18n.t('booking.reschedule')}
          </Button>
          <Button
            mode="contained-tonal"
            onPress={() => console.log('View details:', item.id)}
            style={styles.actionButton}
          >
            {i18n.t('booking.viewDetails')}
          </Button>
        </View>
      )}
      
      {item.status === 'completed' && (
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => console.log('Leave review:', item.id)}
            style={styles.actionButton}
          >
            {i18n.t('booking.leaveReview')}
          </Button>
          <Button
            mode="contained-tonal"
            onPress={() => console.log('Book again:', item.id)}
            style={styles.actionButton}
          >
            {i18n.t('booking.bookAgain')}
          </Button>
        </View>
      )}
      </Surface>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <Chip
        selected={filter === 'all'}
        onPress={() => setFilter('all')}
        style={styles.filterChip}
      >
        {i18n.t('booking.filter.all')}
      </Chip>
      <Chip
        selected={filter === 'upcoming'}
        onPress={() => setFilter('upcoming')}
        style={styles.filterChip}
      >
        {i18n.t('booking.filter.upcoming')}
      </Chip>
      <Chip
        selected={filter === 'completed'}
        onPress={() => setFilter('completed')}
        style={styles.filterChip}
      >
        {i18n.t('booking.filter.completed')}
      </Chip>
      <Chip
        selected={filter === 'cancelled'}
        onPress={() => setFilter('cancelled')}
        style={styles.filterChip}
      >
        {i18n.t('booking.filter.cancelled')}
      </Chip>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="calendar-blank"
        size={64}
        color={theme.colors.onSurfaceVariant}
        style={{ opacity: 0.5 }}
      />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        {i18n.t('booking.noBookings')}
      </Text>
      <Text variant="bodyMedium" style={styles.emptyText}>
        {i18n.t('booking.noBookingsDescription')}
      </Text>
      <Button
        mode="contained"
        onPress={() => console.log('Navigate to search')}
        style={styles.emptyButton}
      >
        {i18n.t('booking.findServices')}
      </Button>
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          {i18n.t('booking.title')}
        </Text>
        <HelpButton
          onPress={() => {
            // Simple inline help alert
            alert(i18n.t('help.bookings.message'));
          }}
        />
      </View>
      
      {renderFilters()}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            {i18n.t('common.loading')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            bookings.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '600',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterChip: {
    height: 32,
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flex: 1,
  },
  bookingCard: {
    borderRadius: 12,
    padding: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  providerInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  providerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  providerName: {
    fontWeight: '600',
  },
  serviceName: {
    marginTop: 4,
    opacity: 0.8,
  },
  statusChip: {
    height: 28,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  divider: {
    marginBottom: 12,
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    opacity: 0.8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 32,
  },
  emptyButton: {
    marginTop: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
});

export default BookingsScreen;