import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { 
  Text, 
  useTheme, 
  Searchbar, 
  Card, 
  Chip,
  Avatar,
  ActivityIndicator
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { searchService } from '../../services/searchService';
import { customerBookingService } from '../../services/customerBookingService';
import { supabase } from '../../services/supabase';
import { isRTL } from '../../i18n';

const { width } = Dimensions.get('window');

interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  icon: string;
  color: string;
}

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProviders, setFeaturedProviders] = useState<any[]>([]);
  const [popularServices, setPopularServices] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [categoriesData, featuredData, popularData, bookingsData] = await Promise.all([
        loadCategories(),
        searchService.getFeaturedProviders(6),
        searchService.getPopularServices(4),
        user ? customerBookingService.getUpcomingBookings(user.id) : Promise.resolve([])
      ]);

      setCategories(categoriesData);
      setFeaturedProviders(featuredData);
      setPopularServices(popularData);
      setUpcomingBookings(bookingsData);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const handleSearch = () => {
    navigation.navigate('Search', { query: searchQuery });
  };

  const handleCategoryPress = (category: Category) => {
    navigation.navigate('Search', { categoryId: category.id });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View>
          <Text variant="bodyMedium" style={styles.greeting}>
            {getGreeting()}, {user?.name || t('guest')}!
          </Text>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            {t('findYourBeauty')}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Notifications')}
          style={styles.notificationButton}
        >
          <MaterialCommunityIcons 
            name="bell-outline" 
            size={24} 
            color={theme.colors.onSurface} 
          />
        </TouchableOpacity>
      </View>

      <Searchbar
        placeholder={t('searchServices')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        onSubmitEditing={handleSearch}
        style={styles.searchBar}
        icon={isRTL() ? 'magnify' : 'magnify'}
        clearIcon={isRTL() ? 'close' : 'close'}
      />
    </View>
  );

  const renderCategories = () => (
    <View style={styles.section}>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        {t('categories')}
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryCard}
            onPress={() => handleCategoryPress(category)}
          >
            <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
              <MaterialCommunityIcons 
                name={category.icon as any} 
                size={32} 
                color={category.color} 
              />
            </View>
            <Text variant="bodySmall" style={styles.categoryName}>
              {isRTL() ? category.name_ar : category.name_en}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderUpcomingBookings = () => {
    if (!user || upcomingBookings.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            {t('upcomingBookings')}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
            <Text style={styles.seeAllText}>{t('seeAll')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {upcomingBookings.map((booking) => (
            <Card 
              key={booking.id} 
              style={styles.bookingCard}
              onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })}
            >
              <Card.Content style={styles.bookingContent}>
                <Avatar.Image 
                  size={48} 
                  source={{ uri: booking.provider?.profile_image_url || 'https://via.placeholder.com/48' }}
                />
                <View style={styles.bookingInfo}>
                  <Text variant="titleMedium" numberOfLines={1}>
                    {isRTL() ? booking.service?.name_ar : booking.service?.name_en}
                  </Text>
                  <Text variant="bodySmall" style={styles.bookingProvider}>
                    {booking.provider?.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.bookingTime}>
                    {formatBookingDate(booking.booking_date)} • {booking.start_time}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderFeaturedProviders = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          {t('featuredProviders')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search', { featured: true })}>
          <Text style={styles.seeAllText}>{t('seeAll')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={featuredProviders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card 
            style={styles.providerCard}
            onPress={() => navigation.navigate('ProviderDetail', { providerId: item.id })}
          >
            <Card.Cover 
              source={{ uri: item.profile_image_url || 'https://via.placeholder.com/200' }} 
              style={styles.providerImage}
            />
            <Card.Content style={styles.providerContent}>
              <Text variant="titleMedium" numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.providerMeta}>
                <MaterialCommunityIcons name="star" size={16} color={theme.colors.primary} />
                <Text variant="bodySmall" style={styles.rating}>
                  {item.rating.toFixed(1)}
                </Text>
                <Text variant="bodySmall" style={styles.reviewCount}>
                  ({item.review_count})
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.startingPrice}>
                {t('startingFrom')} {item.starting_price} {t('jod')}
              </Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );

  const renderPopularServices = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          {t('popularServices')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search', { sortBy: 'popularity' })}>
          <Text style={styles.seeAllText}>{t('seeAll')}</Text>
        </TouchableOpacity>
      </View>
      {popularServices.map((service) => (
        <Card 
          key={service.id} 
          style={styles.serviceCard}
          onPress={() => navigation.navigate('ServiceDetails', { serviceId: service.id })}
        >
          <Card.Content style={styles.serviceContent}>
            <View style={styles.serviceInfo}>
              <Text variant="titleMedium" numberOfLines={1}>
                {isRTL() ? service.name_ar : service.name_en}
              </Text>
              <Text variant="bodySmall" style={styles.serviceProvider}>
                {service.provider_name}
              </Text>
              <View style={styles.serviceMeta}>
                <Chip mode="flat" compact style={styles.priceChip}>
                  {service.price} {t('jod')}
                </Chip>
                <Text variant="bodySmall" style={styles.duration}>
                  {service.duration_minutes} {t('minutes')}
                </Text>
              </View>
            </View>
            {service.is_featured && (
              <Chip mode="flat" style={styles.featuredChip}>
                {t('featured')}
              </Chip>
            )}
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  const formatBookingDate = (date: string) => {
    const bookingDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (bookingDate.toDateString() === today.toDateString()) {
      return t('today');
    } else if (bookingDate.toDateString() === tomorrow.toDateString()) {
      return t('tomorrow');
    } else {
      return bookingDate.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
      {renderHeader()}
      {renderUpcomingBookings()}
      {renderCategories()}
      {renderFeaturedProviders()}
      {renderPopularServices()}
      <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    opacity: 0.7,
  },
  headerTitle: {
    marginTop: 4,
    fontWeight: 'bold',
  },
  notificationButton: {
    padding: 8,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#FF8FAB',
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingRight: 16,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    textAlign: 'center',
  },
  bookingCard: {
    marginRight: 16,
    width: width * 0.75,
  },
  bookingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingInfo: {
    flex: 1,
    marginLeft: isRTL() ? 0 : 12,
    marginRight: isRTL() ? 12 : 0,
  },
  bookingProvider: {
    opacity: 0.7,
    marginTop: 2,
  },
  bookingTime: {
    marginTop: 4,
    color: '#FF8FAB',
  },
  providerCard: {
    marginRight: 16,
    width: width * 0.45,
  },
  providerImage: {
    height: 120,
  },
  providerContent: {
    paddingTop: 8,
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    marginLeft: 4,
    fontWeight: 'bold',
  },
  reviewCount: {
    marginLeft: 4,
    opacity: 0.7,
  },
  startingPrice: {
    marginTop: 8,
    color: '#FF8FAB',
    fontWeight: '600',
  },
  serviceCard: {
    marginBottom: 12,
  },
  serviceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceProvider: {
    opacity: 0.7,
    marginTop: 2,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  priceChip: {
    backgroundColor: '#FFE5EC',
  },
  duration: {
    opacity: 0.7,
  },
  featuredChip: {
    backgroundColor: '#FFC2D1',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default HomeScreen;
