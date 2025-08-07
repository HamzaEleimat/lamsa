import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  Image
} from 'react-native';
import { 
  Text, 
  useTheme, 
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
import { 
  SearchInput, 
  ProviderCard, 
  ServiceCard, 
  Badge, 
  Chip,
  IconButton 
} from '../../components/ui';
import { spacing, shadows } from '../../theme/index';

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
    <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.headerContent}>
        <View>
          <Text style={[styles.greeting, { color: theme.colors.onSurfaceVariant }]}>
            {getGreeting()}, {user?.name || t('guest')}!
          </Text>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            {t('findYourBeauty')}
          </Text>
        </View>
        <IconButton 
          icon={<MaterialCommunityIcons 
            name="bell-outline" 
            size={24} 
            color={theme.colors.onSurface} 
          />}
          onPress={() => navigation.navigate('Notifications')}
          variant="outline"
        />
      </View>

      <SearchInput
        placeholder={t('searchServices')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        onClear={() => setSearchQuery('')}
        containerStyle={{ marginTop: spacing.md }}
      />
    </View>
  );

  const renderCategories = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
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
            <View style={[
              styles.categoryIcon, 
              { backgroundColor: category.color + '20' },
              shadows.sm
            ]}>
              <MaterialCommunityIcons 
                name={category.icon as any} 
                size={32} 
                color={category.color} 
              />
            </View>
            <Text style={[styles.categoryName, { color: theme.colors.onSurfaceVariant }]}>
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
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {t('upcomingBookings')}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
            <Text style={[styles.seeAllText, { color: theme.colors.secondary }]}>
              {t('seeAll')}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {upcomingBookings.map((booking) => (
            <TouchableOpacity
              key={booking.id} 
              style={[styles.bookingCard, { backgroundColor: theme.colors.surface }, shadows.md]}
              onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })}
            >
              <View style={styles.bookingContent}>
                <Image 
                  style={styles.bookingAvatar}
                  source={{ uri: booking.provider?.profile_image_url || 'https://via.placeholder.com/48' }}
                />
                <View style={styles.bookingInfo}>
                  <Text style={[styles.bookingServiceName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {isRTL() ? booking.service?.name_ar : booking.service?.name_en}
                  </Text>
                  <Text style={[styles.bookingProvider, { color: theme.colors.onSurfaceVariant }]}>
                    {booking.provider?.name}
                  </Text>
                  <View style={styles.bookingTimeContainer}>
                    <Badge variant="primary" size="small">
                      {formatBookingDate(booking.booking_date)} • {booking.start_time}
                    </Badge>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderFeaturedProviders = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          {t('featuredProviders')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search', { featured: true })}>
          <Text style={[styles.seeAllText, { color: theme.colors.secondary }]}>
            {t('seeAll')}
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={featuredProviders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingRight: spacing.md }}
        renderItem={({ item }) => (
          <View style={{ marginRight: spacing.md }}>
            <ProviderCard
              provider={{
                id: item.id,
                name: item.name,
                image: item.profile_image_url,
                rating: item.rating || 0,
                reviewCount: item.review_count || 0,
                distance: item.distance,
                isOpen: item.is_open,
                isVerified: item.is_verified,
                services: item.services?.map(s => isRTL() ? s.name_ar : s.name_en)
              }}
              onPress={() => navigation.navigate('ProviderDetail', { providerId: item.id })}
              onFavorite={() => console.log('Toggle favorite', item.id)}
              isFavorite={false}
            />
          </View>
        )}
      />
    </View>
  );

  const renderPopularServices = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          {t('popularServices')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search', { sortBy: 'popularity' })}>
          <Text style={[styles.seeAllText, { color: theme.colors.secondary }]}>
            {t('seeAll')}
          </Text>
        </TouchableOpacity>
      </View>
      {popularServices.map((service) => (
        <ServiceCard
          key={service.id}
          service={{
            id: service.id,
            name: isRTL() ? service.name_ar : service.name_en,
            provider: service.provider_name,
            price: service.price,
            duration: service.duration_minutes,
            image: service.image_url
          }}
          onPress={() => navigation.navigate('ServiceDetails', { serviceId: service.id })}
        />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'MartelSans_400Regular',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'CormorantGaramond_600SemiBold',
    letterSpacing: -0.5,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'CormorantGaramond_500Medium',
    letterSpacing: 0,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'MartelSans_600SemiBold',
    letterSpacing: 0.25,
  },
  categoriesContainer: {
    paddingRight: spacing.md,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 80,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: 12,
    fontFamily: 'MartelSans_400Regular',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  bookingCard: {
    marginRight: spacing.md,
    width: width * 0.75,
    borderRadius: 16,
    padding: spacing.md,
  },
  bookingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  bookingInfo: {
    flex: 1,
    marginLeft: isRTL() ? 0 : spacing.md,
    marginRight: isRTL() ? spacing.md : 0,
  },
  bookingServiceName: {
    fontSize: 16,
    fontFamily: 'CormorantGaramond_600SemiBold',
    marginBottom: spacing.xs,
  },
  bookingProvider: {
    fontSize: 14,
    fontFamily: 'MartelSans_400Regular',
    marginBottom: spacing.sm,
  },
  bookingTimeContainer: {
    flexDirection: 'row',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default HomeScreen;
