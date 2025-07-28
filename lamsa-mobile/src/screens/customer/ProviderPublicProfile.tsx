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
  StatusBar,
  Animated,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import providerService from '../../services/providerService';
import { Provider } from '../../types';
import TrustIndicators from '../../components/provider/TrustIndicators';
import PhotoGallery from '../../components/provider/PhotoGallery';
import ServiceShowcase from '../../components/provider/ServiceShowcase';
import ReviewsSection from '../../components/provider/ReviewsSection';
import LocationHours from '../../components/provider/LocationHours';
import QuickBookingModal from '../../components/booking/QuickBookingModal';
import QuickBookingFAB from '../../components/booking/QuickBookingFAB';
import ShareProfileModal from '../../components/provider/ShareProfileModal';
import SocialMediaSection from '../../components/provider/SocialMediaSection';
import ProviderMetaTags from '../../components/seo/ProviderMetaTags';

const { width, height } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 300;
const HEADER_MIN_HEIGHT = 100;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

interface RouteParams {
  providerId: string;
  providerSlug?: string; // For SEO-friendly URLs
}

export default function ProviderPublicProfile() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const isRTL = I18nManager.isRTL;
  
  const { providerId, providerSlug } = route.params as RouteParams;

  // State
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('services');
  const [showShareModal, setShowShareModal] = useState(false);
  const [services, setServices] = useState([]);
  const [images, setImages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [showQuickBooking, setShowQuickBooking] = useState(false);

  // Animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadProviderProfile();
  }, [providerId]);

  const loadProviderProfile = async () => {
    try {
      setLoading(true);
      const data = await providerService.getProviderById(providerId);
      setProvider(data);
      
      // Load additional data
      const [servicesData, imagesData, reviewsData] = await Promise.all([
        providerService.getProviderServices(providerId),
        providerService.getProviderImages(providerId),
        providerService.getProviderReviews(providerId),
      ]);
      
      setServices(servicesData);
      setImages(imagesData);
      setReviews(reviewsData);
      
      // Update page title for SEO
      if (Platform.OS === 'web') {
        document.title = `${data.businessName} - ${t('beautyServices')} ${data.city}`;
      }
    } catch (error) {
      console.error('Error loading provider profile:', error);
      Alert.alert(t('error'), t('failedToLoadProfile'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (provider?.phone) {
      Linking.openURL(`tel:${provider.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (provider?.phone) {
      const message = encodeURIComponent(
        t('whatsappBookingMessage', { 
          businessName: provider.businessName 
        })
      );
      Linking.openURL(`whatsapp://send?phone=+962${provider.phone}&text=${message}`);
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

  const handleShare = () => {
    setShowShareModal(true);
  };

  const renderHeroHeader = () => {
    if (!provider) return null;

    return (
      <Animated.View
        style={[
          styles.heroContainer,
          {
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          },
        ]}
      >
        <Image
          source={{
            uri: provider.coverImageUrl || 'https://via.placeholder.com/400x300',
          }}
          style={styles.heroImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.heroGradient}
        />
        
        {/* Hero Content */}
        <View style={styles.heroContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: provider.avatarUrl || 'https://via.placeholder.com/100',
              }}
              style={styles.avatar}
            />
            {provider.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.businessName}>
              {isRTL ? provider.businessNameAr || provider.businessName : provider.businessName}
            </Text>
            <Text style={styles.businessTagline}>
              {provider.bio ? (isRTL ? provider.bioAr || provider.bio : provider.bio).substring(0, 60) + '...' : ''}
            </Text>
            
            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={styles.statText}>{provider.rating.toFixed(1)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="chatbox" size={16} color={colors.white} />
                <Text style={styles.statText}>{provider.totalReviews}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="location" size={16} color={colors.white} />
                <Text style={styles.statText}>{provider.city}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.heroActionButton} onPress={handleCall}>
            <Ionicons name="call" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroActionButton} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroActionButton} onPress={handleDirections}>
            <Ionicons name="navigate" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroActionButton} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderStickyHeader = () => {
    if (!provider) return null;

    return (
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            opacity: titleOpacity,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.stickyTitle} numberOfLines={1}>
          {isRTL ? provider.businessNameAr || provider.businessName : provider.businessName}
        </Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-social" size={24} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSectionTabs = () => {
    const sections = [
      { key: 'services', label: t('services'), icon: 'list' },
      { key: 'gallery', label: t('gallery'), icon: 'images' },
      { key: 'reviews', label: t('reviews'), icon: 'star' },
      { key: 'social', label: t('social'), icon: 'share-social' },
      { key: 'about', label: t('about'), icon: 'information-circle' },
    ];

    return (
      <View style={styles.sectionTabs}>
        {sections.map(section => (
          <TouchableOpacity
            key={section.key}
            style={[
              styles.sectionTab,
              activeSection === section.key && styles.activeSectionTab,
            ]}
            onPress={() => setActiveSection(section.key)}
          >
            <Ionicons
              name={section.icon as any}
              size={20}
              color={activeSection === section.key ? colors.primary : colors.gray}
            />
            <Text
              style={[
                styles.sectionTabText,
                activeSection === section.key && styles.activeSectionTabText,
              ]}
            >
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderBookingCTA = () => {
    return (
      <View style={styles.bookingCTA}>
        <TouchableOpacity
          style={styles.primaryBookButton}
          onPress={() => navigation.navigate('Booking', { providerId: provider.id })}
        >
          <Ionicons name="calendar" size={20} color={colors.white} />
          <Text style={styles.primaryBookText}>{t('bookNow')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.whatsappBookButton}
          onPress={handleWhatsApp}
        >
          <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
          <Text style={styles.whatsappBookText}>{t('bookViaWhatsApp')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const profileUrl = `https://lamsa.com/provider/${providerSlug || providerId}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      
      {/* SEO Meta Tags */}
      {provider && (
        <ProviderMetaTags
          provider={provider}
          profileUrl={profileUrl}
          language={i18n.language}
        />
      )}
      
      {/* Sticky Header */}
      {renderStickyHeader()}

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Hero Header */}
        {renderHeroHeader()}

        {/* Content */}
        <View style={styles.content}>
          {/* Trust Indicators */}
          <View style={styles.trustSection}>
            <TrustIndicators
              yearsOfExperience={provider?.yearsExperience}
              totalCustomers={provider?.totalCustomers}
              responseTime={provider?.responseTime}
              certificates={provider?.certificates || []}
              licenses={provider?.licenses || []}
              awards={provider?.awards || []}
              staffCount={provider?.staffCount}
              femaleStaff={provider?.femaleStaff}
              languages={provider?.languages || ['العربية', 'English']}
              specializations={provider?.specializations || []}
            />
          </View>

          {/* Section Tabs */}
          {renderSectionTabs()}

          {/* Dynamic Content Based on Active Section */}
          <View style={styles.sectionContent}>
            {activeSection === 'services' && (
              <ServiceShowcase
                services={services}
                onServicePress={(service) => {
                  navigation.navigate('ServiceDetail', { 
                    serviceId: service.id,
                    providerId: provider?.id,
                  });
                }}
                onBookService={(service) => {
                  navigation.navigate('Booking', {
                    providerId: provider?.id,
                    serviceId: service.id,
                  });
                }}
                providerId={provider?.id || ''}
                providerPhone={provider?.phone}
              />
            )}
            
            {activeSection === 'gallery' && (
              <PhotoGallery
                images={images}
                providerId={provider?.id || ''}
                onLoadMore={() => {
                  // Load more images
                  console.log('Load more images');
                }}
                hasMore={false}
              />
            )}
            
            {activeSection === 'reviews' && (
              <ReviewsSection
                reviews={reviews}
                totalReviews={provider?.totalReviews || 0}
                averageRating={provider?.rating || 0}
                ratingDistribution={provider?.ratingDistribution}
                onLoadMore={() => {
                  // Load more reviews
                  console.log('Load more reviews');
                }}
                hasMore={false}
                loading={false}
                providerId={provider?.id || ''}
              />
            )}

            {activeSection === 'social' && (
              <SocialMediaSection
                socialLinks={provider?.socialLinks || [
                  { platform: 'instagram', username: 'beautysalon_amman', verified: true },
                  { platform: 'facebook', username: 'beautysalonamman' },
                  { platform: 'tiktok', username: 'beauty.salon' },
                ]}
                instagramToken={provider?.instagramToken}
                showInstagramFeed={true}
              />
            )}
            
            {activeSection === 'about' && (
              <View>
                {/* Business Bio */}
                {provider?.bio && (
                  <View style={styles.bioSection}>
                    <Text style={styles.bioTitle}>{t('aboutUs')}</Text>
                    <Text style={styles.bioText}>
                      {isRTL ? provider.bioAr || provider.bio : provider.bio}
                    </Text>
                  </View>
                )}
                
                {/* Location & Hours */}
                <LocationHours
                  location={provider?.location || { latitude: 31.95, longitude: 35.93 }}
                  address={provider?.address || ''}
                  addressAr={provider?.addressAr}
                  city={provider?.city || ''}
                  workingHours={provider?.workingHours || {}}
                  phoneNumber={provider?.phone}
                  whatsappNumber={provider?.whatsappNumber || provider?.phone}
                  amenities={provider?.amenities || []}
                  parkingAvailable={provider?.parkingAvailable}
                  accessibleEntrance={provider?.accessibleEntrance}
                  femaleSection={provider?.femaleSection}
                />
              </View>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Floating Booking CTA */}
      {renderBookingCTA()}

      {/* Quick Booking FAB */}
      <QuickBookingFAB
        onPress={() => setShowQuickBooking(true)}
        visible={!loading && provider !== null}
        extended={activeSection === 'services'}
      />

      {/* Quick Booking Modal */}
      {provider && (
        <QuickBookingModal
          visible={showQuickBooking}
          onClose={() => setShowQuickBooking(false)}
          providerId={provider.id}
          providerName={provider.businessName}
          providerPhone={provider.phone}
          services={services}
          workingHours={provider.workingHours}
          onBookingComplete={(bookingData) => {
            console.log('Booking completed:', bookingData);
            // Here you could show a success message or navigate to a confirmation screen
          }}
        />
      )}

      {/* Share Profile Modal */}
      {provider && (
        <ShareProfileModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          providerId={provider.id}
          providerName={provider.businessName}
          providerNameAr={provider.businessNameAr}
          providerSlug={providerSlug}
          businessType={provider.businessType}
          city={provider.city}
          rating={provider.rating}
          totalReviews={provider.totalReviews}
          avatarUrl={provider.avatarUrl}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: colors.white,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  stickyTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  heroContainer: {
    height: HEADER_MAX_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.white,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 2,
    borderWidth: 2,
    borderColor: colors.white,
  },
  heroInfo: {
    flex: 1,
    marginLeft: 16,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  businessTagline: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.white,
    opacity: 0.5,
    marginHorizontal: 12,
  },
  heroActions: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  heroActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  trustSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  activeSectionTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  sectionTabText: {
    fontSize: 14,
    color: colors.gray,
  },
  activeSectionTabText: {
    color: colors.primary,
    fontWeight: '500',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for booking CTA
  },
  bookingCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  primaryBookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryBookText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  whatsappBookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 8,
  },
  whatsappBookText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  bioSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});