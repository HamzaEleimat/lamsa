import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  I18nManager,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from '../../components/MapView';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import providerService, {
  ProviderServiceItem,
  ProviderReview,
} from '../../services/providerService';
import { Provider, ServiceCategory, BusinessType } from '../../types';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const { width } = Dimensions.get('window');

interface RouteParams {
  providerId: string;
}

export default function ProviderDetailScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;
  
  const { providerId } = route.params as RouteParams;

  // State
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<ProviderServiceItem[]>([]);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [selectedService, setSelectedService] = useState<ProviderServiceItem | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const servicesRef = useRef<View>(null);
  const reviewsRef = useRef<View>(null);

  useEffect(() => {
    loadProviderData();
  }, [providerId]);

  const loadProviderData = async () => {
    try {
      setLoading(true);
      
      // Load provider details, services, and initial reviews in parallel
      const [providerData, servicesData, reviewsData] = await Promise.all([
        providerService.getProviderById(providerId),
        providerService.getProviderServices(providerId),
        providerService.getProviderReviews(providerId, 1, 5),
      ]);

      setProvider(providerData);
      setServices(servicesData);
      setReviews(reviewsData.reviews);
      setAverageRating(reviewsData.rating);
      setHasMoreReviews(reviewsData.reviews.length >= 5);
    } catch (error) {
      console.error('Error loading provider data:', error);
      Alert.alert(t('error'), t('failedToLoadProvider'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadMoreReviews = async () => {
    if (!hasMoreReviews) return;

    try {
      const nextPage = reviewsPage + 1;
      const reviewsData = await providerService.getProviderReviews(providerId, nextPage, 5);
      
      setReviews(prev => [...prev, ...reviewsData.reviews]);
      setReviewsPage(nextPage);
      setHasMoreReviews(reviewsData.reviews.length >= 5);
    } catch (error) {
      console.error('Error loading more reviews:', error);
    }
  };

  const getBusinessTypeIcon = (type: BusinessType): string => {
    switch (type) {
      case BusinessType.SALON:
        return 'cut';
      case BusinessType.SPA:
        return 'flower';
      case BusinessType.MOBILE:
        return 'car';
      case BusinessType.HOME_BASED:
        return 'home';
      case BusinessType.CLINIC:
        return 'medical';
      default:
        return 'business';
    }
  };

  const handleCall = () => {
    if (provider?.phone) {
      Linking.openURL(`tel:${provider.phone}`);
    }
  };

  const handleDirections = () => {
    if (provider?.location) {
      const url = Platform.select({
        ios: `maps:0,0?q=${provider.location.latitude},${provider.location.longitude}`,
        android: `geo:0,0?q=${provider.location.latitude},${provider.location.longitude}`,
      });
      Linking.openURL(url);
    }
  };

  const handleServicePress = (service: ProviderServiceItem) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };

  const handleBookService = () => {
    if (selectedService) {
      navigation.navigate('Booking', {
        providerId: provider.id,
        serviceId: selectedService.id,
        providerName: provider.businessName,
        serviceName: selectedService.name[i18n.language] || selectedService.name.en,
        price: selectedService.price,
        duration: selectedService.durationMinutes,
      });
      setShowServiceModal(false);
    }
  };

  const renderHeader = () => {
    if (!provider) return null;

    return (
      <View>
        {/* Cover Image */}
        <Image
          source={{
            uri: provider.coverImageUrl || provider.avatarUrl || 'https://via.placeholder.com/400x250',
          }}
          style={styles.coverImage}
        />
        
        {/* Provider Info */}
        <View style={styles.providerInfo}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: provider.avatarUrl || 'https://via.placeholder.com/100',
              }}
              style={styles.avatar}
            />
            {provider.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              </View>
            )}
          </View>

          <Text style={styles.businessName}>
            {isRTL ? provider.businessNameAr || provider.businessName : provider.businessName}
          </Text>

          <View style={styles.businessTypeRow}>
            <Ionicons
              name={getBusinessTypeIcon(provider.businessType) as any}
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={styles.businessType}>
              {t(provider.businessType)}
            </Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            {[...Array(5)].map((_, i) => (
              <Ionicons
                key={i}
                name={i < Math.floor(averageRating) ? 'star' : 'star-outline'}
                size={20}
                color={theme.colors.tertiary}
              />
            ))}
            <Text style={styles.ratingText}>
              {averageRating.toFixed(1)} ({provider.totalReviews} {t('reviews')})
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <Ionicons name="call" size={24} color={theme.colors.onPrimary} />
              <Text style={styles.actionButtonText}>{t('call')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
              <Ionicons name="navigate" size={24} color={theme.colors.onSecondary} />
              <Text style={styles.actionButtonText}>{t('directions')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.bookButton]}
              onPress={() => scrollViewRef.current?.scrollTo({ y: 500, animated: true })}
            >
              <Ionicons name="calendar" size={24} color={theme.colors.onSecondary} />
              <Text style={styles.actionButtonText}>{t('book')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bio */}
        {provider.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('about')}</Text>
            <Text style={styles.bio}>
              {isRTL ? provider.bioAr || provider.bio : provider.bio}
            </Text>
          </View>
        )}

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('location')}</Text>
          <View style={styles.addressContainer}>
            <Ionicons name="location" size={20} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.address}>
              {isRTL ? provider.addressAr || provider.address : provider.address}, {provider.city}
            </Text>
          </View>
          
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: provider.location.latitude,
                longitude: provider.location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: provider.location.latitude,
                  longitude: provider.location.longitude,
                }}
              />
            </MapView>
          </View>
        </View>
      </View>
    );
  };

  const renderServices = () => {
    const categories = [...new Set(services.map(s => s.category))];
    const filteredServices = selectedCategory === 'all'
      ? services
      : services.filter(s => s.category === selectedCategory);

    return (
      <View ref={servicesRef} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('services')}</Text>
        
        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === 'all' && styles.selectedCategoryChip,
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === 'all' && styles.selectedCategoryChipText,
            ]}>
              {t('all')}
            </Text>
          </TouchableOpacity>
          
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.selectedCategoryChip,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category && styles.selectedCategoryChipText,
              ]}>
                {t(category.toLowerCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Services List */}
        {filteredServices.map(service => (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceCard}
            onPress={() => handleServicePress(service)}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>
                {service.name[i18n.language] || service.name.en}
              </Text>
              {service.description && (
                <Text style={styles.serviceDescription} numberOfLines={2}>
                  {service.description[i18n.language] || service.description.en}
                </Text>
              )}
              <View style={styles.serviceMeta}>
                <View style={styles.serviceMetaItem}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.serviceMetaText}>
                    {service.durationMinutes} {t('minutes')}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.servicePrice}>
              <Text style={styles.priceAmount}>{service.price}</Text>
              <Text style={styles.priceCurrency}>{t('jod')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderReviews = () => {
    return (
      <View ref={reviewsRef} style={styles.section}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>{t('reviews')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AllReviews', { providerId })}>
            <Text style={styles.seeAllText}>{t('seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {reviews.map(review => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Image
                source={{
                  uri: review.customerAvatar || 'https://via.placeholder.com/40',
                }}
                style={styles.reviewerAvatar}
              />
              <View style={styles.reviewerInfo}>
                <Text style={styles.reviewerName}>{review.customerName}</Text>
                <View style={styles.reviewRating}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < review.rating ? 'star' : 'star-outline'}
                      size={14}
                      color={theme.colors.tertiary}
                    />
                  ))}
                  <Text style={styles.reviewDate}>
                    {format(new Date(review.createdAt), 'MMM dd, yyyy', { locale })}
                  </Text>
                </View>
              </View>
            </View>
            
            {review.serviceName && (
              <Text style={styles.reviewService}>{review.serviceName}</Text>
            )}
            
            {review.comment && (
              <Text style={styles.reviewComment}>{review.comment}</Text>
            )}

            {review.response && (
              <View style={styles.reviewResponse}>
                <Text style={styles.responseLabel}>{t('providerResponse')}:</Text>
                <Text style={styles.responseText}>{review.response.comment}</Text>
              </View>
            )}
          </View>
        ))}

        {hasMoreReviews && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreReviews}>
            <Text style={styles.loadMoreText}>{t('loadMoreReviews')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderServiceModal = () => {
    if (!selectedService) return null;

    return (
      <Modal
        visible={showServiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowServiceModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedService.name[i18n.language] || selectedService.name.en}
              </Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {selectedService.description && (
              <Text style={styles.modalDescription}>
                {selectedService.description[i18n.language] || selectedService.description.en}
              </Text>
            )}

            <View style={styles.modalDetails}>
              <View style={styles.modalDetailItem}>
                <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.modalDetailText}>
                  {t('duration')}: {selectedService.durationMinutes} {t('minutes')}
                </Text>
              </View>

              <View style={styles.modalDetailItem}>
                <Ionicons name="pricetag-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.modalDetailText}>
                  {t('price')}: {selectedService.price} {t('jod')}
                </Text>
              </View>

              <View style={styles.modalDetailItem}>
                <Ionicons name="list-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.modalDetailText}>
                  {t('category')}: {t(selectedService.category.toLowerCase())}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.bookServiceButton}
              onPress={handleBookService}
            >
              <Text style={styles.bookServiceButtonText}>{t('bookThisService')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="heart-outline" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderServices()}
        {renderReviews()}
      </ScrollView>

      {renderServiceModal()}
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scrollView: {
    flex: 1,
  },
  coverImage: {
    width: width,
    height: 250,
  },
  providerInfo: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: theme.colors.surface,
    marginTop: -40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 60,
  },
  avatarContainer: {
    position: 'absolute',
    top: -50,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: theme.colors.surface,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 2,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 4,
    textAlign: 'center',
  },
  businessTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  businessType: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bookButton: {
    backgroundColor: theme.colors.secondary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
  },
  section: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  mapContainer: {
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryFilter: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceVariant,
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  selectedCategoryChipText: {
    color: theme.colors.onPrimary,
    fontWeight: '500',
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  serviceMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceMetaText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  servicePrice: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  priceCurrency: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  reviewCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginLeft: 8,
  },
  reviewService: {
    fontSize: 12,
    color: theme.colors.secondary,
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 20,
  },
  reviewResponse: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  loadMoreText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    flex: 1,
    marginRight: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalDetails: {
    gap: 16,
    marginBottom: 24,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalDetailText: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  bookServiceButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookServiceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
  },
});