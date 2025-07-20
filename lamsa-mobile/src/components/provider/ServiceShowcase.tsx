import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  I18nManager,
  Platform,
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { ServiceCategory } from '../../types';
import { ProviderServiceItem } from '../../services/providerService';
import { LinearGradient } from 'expo-linear-gradient';

interface ServiceShowcaseProps {
  services: ProviderServiceItem[];
  onServicePress: (service: ProviderServiceItem) => void;
  onBookService: (service: ProviderServiceItem) => void;
  providerId: string;
  providerPhone?: string;
  onQuickBook?: (service: ProviderServiceItem) => void;
}

interface ServiceGroup {
  category: ServiceCategory;
  services: ProviderServiceItem[];
  icon: string;
  color: string;
}

export default function ServiceShowcase({
  services,
  onServicePress,
  onBookService,
  providerId,
  providerPhone,
  onQuickBook,
}: ServiceShowcaseProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [expandedCategories, setExpandedCategories] = useState<Set<ServiceCategory>>(new Set());
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Group services by category
  const serviceGroups: ServiceGroup[] = [
    {
      category: ServiceCategory.HAIR,
      services: services.filter(s => s.category === ServiceCategory.HAIR),
      icon: 'cut',
      color: colors.primary,
    },
    {
      category: ServiceCategory.NAILS,
      services: services.filter(s => s.category === ServiceCategory.NAILS),
      icon: 'hand-left',
      color: colors.secondary,
    },
    {
      category: ServiceCategory.MAKEUP,
      services: services.filter(s => s.category === ServiceCategory.MAKEUP),
      icon: 'color-palette',
      color: colors.error,
    },
    {
      category: ServiceCategory.SPA,
      services: services.filter(s => s.category === ServiceCategory.SPA),
      icon: 'flower',
      color: colors.success,
    },
    {
      category: ServiceCategory.AESTHETIC,
      services: services.filter(s => s.category === ServiceCategory.AESTHETIC),
      icon: 'sparkles',
      color: colors.warning,
    },
  ].filter(group => group.services.length > 0);

  // Find popular services (could be based on bookings, ratings, etc.)
  const popularServices = services
    .filter(s => s.isPopular)
    .slice(0, 3);

  // Find package deals (services with special pricing or bundles)
  const packageDeals = [
    {
      id: 'bridal',
      name: t('bridalPackage'),
      nameAr: 'باقة العروس',
      services: ['Hair Styling', 'Makeup', 'Nails'],
      originalPrice: 250,
      packagePrice: 200,
      savings: 20,
      color: colors.secondary,
    },
    {
      id: 'pamper',
      name: t('pamperPackage'),
      nameAr: 'باقة الدلال',
      services: ['Facial', 'Massage', 'Manicure'],
      originalPrice: 180,
      packagePrice: 150,
      savings: 17,
      color: colors.primary,
    },
  ];

  const toggleCategory = (category: ServiceCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleWhatsAppInquiry = (service: ProviderServiceItem) => {
    if (!providerPhone) return;
    
    const message = encodeURIComponent(
      t('whatsappServiceInquiry', {
        serviceName: service.name[i18n.language] || service.name.en,
      })
    );
    Linking.openURL(`whatsapp://send?phone=+962${providerPhone}&text=${message}`);
  };

  const renderPopularServices = () => {
    if (popularServices.length === 0) return null;

    return (
      <View style={styles.popularSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star" size={20} color={colors.warning} />
          <Text style={styles.sectionTitle}>{t('popularServices')}</Text>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.popularScroll}
        >
          {popularServices.map(service => (
            <TouchableOpacity
              key={service.id}
              style={styles.popularCard}
              onPress={() => onServicePress(service)}
            >
              <LinearGradient
                colors={[colors.primary + '20', colors.primary + '10']}
                style={styles.popularGradient}
              >
                <Text style={styles.popularName} numberOfLines={2}>
                  {service.name[i18n.language] || service.name.en}
                </Text>
                <View style={styles.popularDetails}>
                  <View style={styles.popularPrice}>
                    <Text style={styles.priceAmount}>{service.price}</Text>
                    <Text style={styles.priceCurrency}>{t('jod')}</Text>
                  </View>
                  <View style={styles.popularDuration}>
                    <Ionicons name="time-outline" size={14} color={colors.gray} />
                    <Text style={styles.durationText}>
                      {service.durationMinutes} {t('min')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.popularBookButton}
                  onPress={() => onBookService(service)}
                >
                  <Text style={styles.popularBookText}>{t('bookNow')}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderPackageDeals = () => {
    if (packageDeals.length === 0) return null;

    return (
      <View style={styles.packagesSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="gift" size={20} color={colors.secondary} />
          <Text style={styles.sectionTitle}>{t('specialPackages')}</Text>
        </View>

        {packageDeals.map(pkg => (
          <TouchableOpacity
            key={pkg.id}
            style={[
              styles.packageCard,
              selectedPackage === pkg.id && styles.selectedPackage,
            ]}
            onPress={() => setSelectedPackage(pkg.id)}
          >
            <LinearGradient
              colors={[pkg.color + '20', pkg.color + '10']}
              style={styles.packageGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.packageHeader}>
                <View>
                  <Text style={styles.packageName}>
                    {isRTL ? pkg.nameAr : pkg.name}
                  </Text>
                  <Text style={styles.packageServices}>
                    {pkg.services.join(' • ')}
                  </Text>
                </View>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>
                    {t('save')} {pkg.savings}%
                  </Text>
                </View>
              </View>

              <View style={styles.packagePricing}>
                <View style={styles.priceRow}>
                  <Text style={styles.originalPrice}>{pkg.originalPrice} {t('jod')}</Text>
                  <Text style={styles.packagePrice}>{pkg.packagePrice} {t('jod')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.packageBookButton}
                  onPress={() => handleWhatsAppInquiry({ 
                    id: pkg.id, 
                    name: { en: pkg.name, ar: pkg.nameAr },
                    price: pkg.packagePrice,
                    durationMinutes: 0,
                    category: ServiceCategory.SPA,
                  } as ProviderServiceItem)}
                >
                  <Ionicons name="logo-whatsapp" size={16} color={colors.white} />
                  <Text style={styles.packageBookText}>{t('inquire')}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderServiceGroup = (group: ServiceGroup) => {
    const isExpanded = expandedCategories.has(group.category);
    const displayServices = isExpanded ? group.services : group.services.slice(0, 3);

    return (
      <View key={group.category} style={styles.categorySection}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategory(group.category)}
        >
          <View style={styles.categoryInfo}>
            <View style={[styles.categoryIcon, { backgroundColor: group.color + '20' }]}>
              <Ionicons name={group.icon as any} size={24} color={group.color} />
            </View>
            <View>
              <Text style={styles.categoryName}>
                {t(group.category.toLowerCase())}
              </Text>
              <Text style={styles.categoryCount}>
                {group.services.length} {t('services')}
              </Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.gray}
          />
        </TouchableOpacity>

        <View style={styles.servicesList}>
          {displayServices.map(service => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceItem}
              onPress={() => onServicePress(service)}
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
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={colors.gray} />
                    <Text style={styles.metaText}>
                      {service.durationMinutes} {t('min')}
                    </Text>
                  </View>
                  {service.isPopular && (
                    <View style={styles.popularBadge}>
                      <Ionicons name="star" size={12} color={colors.warning} />
                      <Text style={styles.popularBadgeText}>{t('popular')}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.serviceActions}>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceAmount}>{service.price}</Text>
                  <Text style={styles.priceCurrency}>{t('jod')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={() => onBookService(service)}
                >
                  <Ionicons name="calendar" size={16} color={colors.white} />
                  <Text style={styles.bookButtonText}>{t('book')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {!isExpanded && group.services.length > 3 && (
          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => toggleCategory(group.category)}
          >
            <Text style={styles.showMoreText}>
              {t('showMore')} ({group.services.length - 3})
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Popular Services */}
      {renderPopularServices()}

      {/* Package Deals */}
      {renderPackageDeals()}

      {/* Service Categories */}
      <View style={styles.categoriesSection}>
        {serviceGroups.map(renderServiceGroup)}
      </View>

      {/* Quick Inquiry */}
      <View style={styles.inquirySection}>
        <Text style={styles.inquiryText}>{t('cantFindService')}</Text>
        <TouchableOpacity
          style={styles.inquiryButton}
          onPress={() => handleWhatsAppInquiry({
            id: 'custom',
            name: { en: 'Custom Service', ar: 'خدمة مخصصة' },
            price: 0,
            durationMinutes: 0,
            category: ServiceCategory.SPA,
          } as ProviderServiceItem)}
        >
          <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
          <Text style={styles.inquiryButtonText}>{t('askOnWhatsApp')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  popularSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  popularScroll: {
    marginHorizontal: -16,
  },
  popularCard: {
    width: 180,
    marginLeft: 16,
  },
  popularGradient: {
    padding: 16,
    borderRadius: 12,
    height: 160,
  },
  popularName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  popularDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  popularPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  priceCurrency: {
    fontSize: 14,
    color: colors.gray,
    marginLeft: 4,
  },
  popularDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: colors.gray,
  },
  popularBookButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  popularBookText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  packagesSection: {
    marginBottom: 24,
  },
  packageCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedPackage: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  packageGradient: {
    padding: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  packageServices: {
    fontSize: 14,
    color: colors.gray,
  },
  savingsBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  packagePricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRow: {
    alignItems: 'flex-start',
  },
  originalPrice: {
    fontSize: 14,
    color: colors.gray,
    textDecorationLine: 'line-through',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  packageBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  packageBookText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categorySection: {
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
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
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  categoryCount: {
    fontSize: 12,
    color: colors.gray,
  },
  servicesList: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.gray,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lightWarning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '500',
  },
  serviceActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bookButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
  },
  showMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  inquirySection: {
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  inquiryText: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 12,
    textAlign: 'center',
  },
  inquiryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  inquiryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
});