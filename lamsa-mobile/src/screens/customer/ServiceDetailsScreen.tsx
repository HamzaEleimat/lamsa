import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  Chip,
  IconButton,
  Divider,
  List,
  Avatar,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n from '../../i18n';
import { getSupabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

type CustomerStackParamList = {
  ServiceDetails: { serviceId: string; providerId: string };
  BookingFlow: { serviceId: string; providerId: string };
};

type ServiceDetailsScreenNavigationProp = NativeStackNavigationProp<
  CustomerStackParamList,
  'ServiceDetails'
>;

type ServiceDetailsScreenRouteProp = RouteProp<
  CustomerStackParamList,
  'ServiceDetails'
>;

interface Props {
  navigation: ServiceDetailsScreenNavigationProp;
  route: ServiceDetailsScreenRouteProp;
}

interface ServiceData {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  price: number;
  duration: number;
  category_id: string;
  images: string[];
}

interface ProviderData {
  id: string;
  business_name: string;
  business_name_ar: string;
  logo: string;
  rating: number;
  total_reviews: number;
  address: string;
  address_ar: string;
}

const ServiceDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { serviceId, providerId } = route.params;
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<ServiceData | null>(null);
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isRTL = i18n.locale === 'ar';

  useEffect(() => {
    fetchServiceDetails();
  }, [serviceId, providerId]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);

      // Fetch service details
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (serviceError) throw serviceError;

      // Fetch provider details
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (providerError) throw providerError;

      setService(serviceData);
      setProvider(providerData);
    } catch (error) {
      console.error('Error fetching service details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return i18n.t('common.hoursAndMinutes', { hours, minutes: mins });
    } else if (hours > 0) {
      return i18n.t('common.hours', { count: hours });
    } else {
      return i18n.t('common.minutes', { count: mins });
    }
  };

  const handleBookService = () => {
    navigation.navigate('BookingFlow', { serviceId, providerId });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!service || !provider) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Text>{i18n.t('common.error')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {service.images && service.images.length > 0 ? (
            <>
              <Image
                source={{ uri: service.images[activeImageIndex] }}
                style={styles.mainImage}
                resizeMode="cover"
              />
              <IconButton
                icon="arrow-left"
                size={24}
                style={[styles.backButton, isRTL && styles.backButtonRTL]}
                onPress={() => navigation.goBack()}
                iconColor={theme.colors.onSurface}
                containerColor={theme.colors.surface}
              />
              {service.images.length > 1 && (
                <View style={styles.imageDots}>
                  {service.images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            index === activeImageIndex
                              ? theme.colors.primary
                              : theme.colors.surfaceVariant,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons
                name="image-off"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Service Info */}
          <View style={styles.serviceHeader}>
            <Text variant="headlineMedium" style={styles.serviceName}>
              {isRTL ? service.name_ar : service.name_en}
            </Text>
            <Text variant="displaySmall" style={[styles.price, { color: theme.colors.primary }]}>
              {service.price} {i18n.t('common.currency')}
            </Text>
          </View>

          <View style={styles.chips}>
            <Chip icon="clock-outline" style={styles.chip}>
              {formatDuration(service.duration)}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          {/* Provider Info */}
          <Surface style={styles.providerCard} elevation={1}>
            <View style={styles.providerInfo}>
              <Avatar.Image
                size={48}
                source={{ uri: provider.logo }}
                style={styles.providerLogo}
              />
              <View style={styles.providerDetails}>
                <Text variant="titleMedium">
                  {isRTL ? provider.business_name_ar : provider.business_name}
                </Text>
                <View style={styles.ratingContainer}>
                  <MaterialCommunityIcons
                    name="star"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text variant="bodyMedium" style={styles.rating}>
                    {provider.rating.toFixed(1)}
                  </Text>
                  <Text variant="bodySmall" style={styles.reviewCount}>
                    ({provider.total_reviews} {i18n.t('common.reviews')})
                  </Text>
                </View>
              </View>
            </View>
          </Surface>

          <Divider style={styles.divider} />

          {/* Description */}
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {i18n.t('service.description')}
            </Text>
            <Text variant="bodyLarge" style={styles.description}>
              {isRTL ? service.description_ar : service.description_en}
            </Text>
          </View>

          {/* What's Included */}
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {i18n.t('service.whatsIncluded')}
            </Text>
            <List.Item
              title={i18n.t('service.professionalService')}
              left={(props) => <List.Icon {...props} icon="check-circle" color={theme.colors.primary} />}
              titleStyle={styles.listItemTitle}
            />
            <List.Item
              title={i18n.t('service.qualityProducts')}
              left={(props) => <List.Icon {...props} icon="check-circle" color={theme.colors.primary} />}
              titleStyle={styles.listItemTitle}
            />
            <List.Item
              title={i18n.t('service.satisfactionGuarantee')}
              left={(props) => <List.Icon {...props} icon="check-circle" color={theme.colors.primary} />}
              titleStyle={styles.listItemTitle}
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {i18n.t('service.location')}
            </Text>
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyLarge" style={styles.address}>
                {isRTL ? provider.address_ar : provider.address}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={styles.bottomContainer}>
        <Button
          mode="contained"
          onPress={handleBookService}
          style={styles.bookButton}
          labelStyle={styles.bookButtonText}
          contentStyle={styles.bookButtonContent}
        >
          {i18n.t('service.bookNow')}
        </Button>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    height: 300,
  },
  mainImage: {
    width: width,
    height: 300,
  },
  placeholderImage: {
    width: width,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  backButtonRTL: {
    left: undefined,
    right: 16,
  },
  imageDots: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    padding: 16,
  },
  serviceHeader: {
    marginBottom: 16,
  },
  serviceName: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  price: {
    fontWeight: 'bold',
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: 'transparent',
  },
  divider: {
    marginVertical: 16,
  },
  providerCard: {
    padding: 16,
    borderRadius: 12,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerLogo: {
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    marginLeft: 4,
    fontWeight: '600',
  },
  reviewCount: {
    marginLeft: 4,
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    lineHeight: 24,
    opacity: 0.8,
  },
  listItemTitle: {
    fontSize: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  address: {
    flex: 1,
    opacity: 0.8,
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  bookButton: {
    borderRadius: 28,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bookButtonContent: {
    paddingVertical: 8,
  },
});

export default ServiceDetailsScreen;