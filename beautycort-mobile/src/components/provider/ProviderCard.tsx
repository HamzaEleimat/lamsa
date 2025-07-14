import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  I18nManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { ProviderWithDistance } from '../../services/providerService';
import { BusinessType } from '../../types';

interface ProviderCardProps {
  provider: ProviderWithDistance;
  onPress: () => void;
  viewMode?: 'list' | 'map';
  showDistance?: boolean;
  currentLocation?: { latitude: number; longitude: number };
}

export default function ProviderCard({
  provider,
  onPress,
  viewMode = 'list',
  showDistance = true,
  currentLocation,
}: ProviderCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;

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

  const getBusinessTypeLabel = (type: BusinessType): string => {
    switch (type) {
      case BusinessType.SALON:
        return t('salon');
      case BusinessType.SPA:
        return t('spa');
      case BusinessType.MOBILE:
        return t('mobileService');
      case BusinessType.HOME_BASED:
        return t('homeBased');
      case BusinessType.CLINIC:
        return t('clinic');
      default:
        return type;
    }
  };

  const renderRating = () => {
    const fullStars = Math.floor(provider.rating);
    const hasHalfStar = provider.rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.ratingContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <Ionicons key={`full-${i}`} name="star" size={14} color={colors.warning} />
        ))}
        {hasHalfStar && <Ionicons name="star-half" size={14} color={colors.warning} />}
        {[...Array(emptyStars)].map((_, i) => (
          <Ionicons key={`empty-${i}`} name="star-outline" size={14} color={colors.warning} />
        ))}
        <Text style={styles.ratingText}>
          {provider.rating.toFixed(1)} ({provider.totalReviews})
        </Text>
      </View>
    );
  };

  const renderPromotionBadge = () => {
    if (!provider.promotionBadge) return null;

    const getBadgeStyle = () => {
      switch (provider.promotionBadge) {
        case 'new':
          return { backgroundColor: colors.success, text: t('new') };
        case 'featured':
          return { backgroundColor: colors.primary, text: t('featured') };
        case 'trending':
          return { backgroundColor: colors.secondary, text: t('trending') };
        default:
          return null;
      }
    };

    const badge = getBadgeStyle();
    if (!badge) return null;

    return (
      <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
        <Text style={styles.badgeText}>{badge.text}</Text>
      </View>
    );
  };

  const renderDistance = () => {
    if (!showDistance || !provider.distance) return null;

    return (
      <View style={styles.distanceContainer}>
        <Ionicons name="location-outline" size={14} color={colors.gray} />
        <Text style={styles.distanceText}>
          {provider.distance < 1
            ? `${Math.round(provider.distance * 1000)}${t('meters')}`
            : `${provider.distance.toFixed(1)}${t('km')}`}
        </Text>
      </View>
    );
  };

  const renderAvailability = () => {
    if (provider.isAvailableNow) {
      return (
        <View style={styles.availableNowBadge}>
          <View style={styles.availableDot} />
          <Text style={styles.availableText}>{t('availableNow')}</Text>
        </View>
      );
    }

    if (provider.nextAvailableSlot) {
      return (
        <Text style={styles.nextSlotText}>
          {t('nextSlot')}: {provider.nextAvailableSlot}
        </Text>
      );
    }

    return null;
  };

  const renderPriceRange = () => {
    if (!provider.estimatedPrice) return null;

    return (
      <Text style={styles.priceRange}>
        {t('from')} {provider.estimatedPrice.min} {t('jod')}
      </Text>
    );
  };

  if (viewMode === 'map') {
    // Compact card for map info windows
    return (
      <TouchableOpacity style={styles.mapCard} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.mapCardContent}>
          <Image
            source={{
              uri: provider.avatarUrl || 'https://via.placeholder.com/60',
            }}
            style={styles.mapCardImage}
          />
          <View style={styles.mapCardInfo}>
            <Text style={styles.mapCardName} numberOfLines={1}>
              {isRTL ? provider.businessNameAr || provider.businessName : provider.businessName}
            </Text>
            {renderRating()}
            {renderDistance()}
          </View>
        </View>
        {renderPromotionBadge()}
      </TouchableOpacity>
    );
  }

  // Full card for list view
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Cover Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: provider.coverImageUrl || provider.avatarUrl || 'https://via.placeholder.com/400x200',
          }}
          style={styles.coverImage}
        />
        {renderPromotionBadge()}
        {provider.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={colors.white} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.businessName} numberOfLines={1}>
              {isRTL ? provider.businessNameAr || provider.businessName : provider.businessName}
            </Text>
            <View style={styles.businessTypeContainer}>
              <Ionicons
                name={getBusinessTypeIcon(provider.businessType) as any}
                size={14}
                color={colors.gray}
              />
              <Text style={styles.businessType}>
                {getBusinessTypeLabel(provider.businessType)}
              </Text>
            </View>
          </View>
          {renderDistance()}
        </View>

        {/* Rating and Reviews */}
        <View style={styles.ratingRow}>
          {renderRating()}
          {renderPriceRange()}
        </View>

        {/* Bio */}
        {provider.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {isRTL ? provider.bioAr || provider.bio : provider.bio}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={14} color={colors.gray} />
            <Text style={styles.address} numberOfLines={1}>
              {isRTL ? provider.addressAr || provider.address : provider.address}, {provider.city}
            </Text>
          </View>
          {renderAvailability()}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  imageContainer: {
    position: 'relative',
    height: 150,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  businessTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  businessType: {
    fontSize: 12,
    color: colors.gray,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: colors.gray,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: colors.gray,
    marginLeft: 4,
  },
  priceRange: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  bio: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  address: {
    flex: 1,
    fontSize: 12,
    color: colors.gray,
  },
  availableNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lightSuccess,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  availableText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  nextSlotText: {
    fontSize: 12,
    color: colors.secondary,
  },
  // Map card styles
  mapCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 8,
    width: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  mapCardContent: {
    flexDirection: 'row',
    gap: 8,
  },
  mapCardImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  mapCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mapCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
});