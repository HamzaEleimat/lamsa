import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTranslation } from '../../hooks/useTranslation';
import { ServiceCategory, BusinessType } from '../../types';
import { ProviderSearchParams } from '../../services/providerService';
import { useNavigation, useRoute } from '@react-navigation/native';

interface RouteParams {
  currentFilters: ProviderSearchParams;
  onApply: (filters: ProviderSearchParams) => void;
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, selected, onPress }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.selectedChip]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function ProviderFiltersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const { currentFilters, onApply } = route.params as RouteParams;

  const [filters, setFilters] = useState<ProviderSearchParams>({
    ...currentFilters,
  });
  
  const styles = createStyles(theme);

  const serviceCategories = [
    { key: ServiceCategory.HAIR, label: t('categories.hair') },
    { key: ServiceCategory.NAILS, label: t('categories.nails') },
    { key: ServiceCategory.MAKEUP, label: t('categories.makeup') },
    { key: ServiceCategory.SPA, label: t('categories.spa') },
    { key: ServiceCategory.AESTHETIC, label: t('categories.aesthetic') },
  ];

  const businessTypes = [
    { key: BusinessType.SALON, label: t('businessTypes.salon') },
    { key: BusinessType.SPA, label: t('businessTypes.spa') },
    { key: BusinessType.MOBILE, label: t('businessTypes.mobileService') },
    { key: BusinessType.HOME_BASED, label: t('businessTypes.homeBased') },
    { key: BusinessType.CLINIC, label: t('businessTypes.clinic') },
  ];

  const sortOptions = [
    { key: 'distance', label: t('filters.distance') },
    { key: 'rating', label: t('filters.rating') },
    { key: 'price', label: t('common.price') },
    { key: 'reviews', label: t('common.reviews') },
  ];

  const handleCategoryToggle = (category: ServiceCategory) => {
    const categories = filters.categories || [];
    const index = categories.indexOf(category);
    
    if (index >= 0) {
      setFilters({
        ...filters,
        categories: categories.filter(c => c !== category),
      });
    } else {
      setFilters({
        ...filters,
        categories: [...categories, category],
      });
    }
  };

  const handleBusinessTypeToggle = (type: BusinessType) => {
    const types = filters.businessTypes || [];
    const index = types.indexOf(type);
    
    if (index >= 0) {
      setFilters({
        ...filters,
        businessTypes: types.filter(t => t !== type),
      });
    } else {
      setFilters({
        ...filters,
        businessTypes: [...types, type],
      });
    }
  };

  const handleApply = () => {
    onApply(filters);
    navigation.goBack();
  };

  const handleReset = () => {
    setFilters({
      sortBy: 'distance',
      sortOrder: 'asc',
      limit: 20,
      includeNewProviders: true,
    });
  };

  const hasActiveFilters = () => {
    return (
      (filters.categories && filters.categories.length > 0) ||
      (filters.businessTypes && filters.businessTypes.length > 0) ||
      filters.minRating ||
      filters.priceRange?.min ||
      filters.priceRange?.max ||
      filters.availableNow ||
      filters.availableToday ||
      filters.radiusKm !== undefined
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('filters.title')}</Text>
        <TouchableOpacity onPress={handleReset} disabled={!hasActiveFilters()}>
          <Text style={[
            styles.resetText,
            !hasActiveFilters() && styles.disabledText,
          ]}>
            {t('common.reset')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sort By */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.sortBy')}</Text>
          <View style={styles.chipContainer}>
            {sortOptions.map(option => (
              <FilterChip
                key={option.key}
                label={option.label}
                selected={filters.sortBy === option.key}
                onPress={() => setFilters({ ...filters, sortBy: option.key as any })}
              />
            ))}
          </View>
        </View>

        {/* Service Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.serviceCategories')}</Text>
          <View style={styles.chipContainer}>
            {serviceCategories.map(category => (
              <FilterChip
                key={category.key}
                label={category.label}
                selected={filters.categories?.includes(category.key) || false}
                onPress={() => handleCategoryToggle(category.key)}
              />
            ))}
          </View>
        </View>

        {/* Business Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.businessType')}</Text>
          <View style={styles.chipContainer}>
            {businessTypes.map(type => (
              <FilterChip
                key={type.key}
                label={type.label}
                selected={filters.businessTypes?.includes(type.key) || false}
                onPress={() => handleBusinessTypeToggle(type.key)}
              />
            ))}
          </View>
        </View>

        {/* Distance Radius */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('filters.distanceRadius')}: {filters.radiusKm || 50} {t('common.km')}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={100}
            value={filters.radiusKm || 50}
            onValueChange={(value) => setFilters({ ...filters, radiusKm: Math.round(value) })}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.surfaceVariant}
            thumbTintColor={theme.colors.primary}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1 {t('common.km')}</Text>
            <Text style={styles.sliderLabel}>100 {t('common.km')}</Text>
          </View>
        </View>

        {/* Minimum Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('filters.minimumRating')}: {filters.minRating || 0} ★
          </Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map(rating => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  (filters.minRating || 0) >= rating && styles.selectedRating,
                ]}
                onPress={() => setFilters({ ...filters, minRating: rating })}
              >
                <Ionicons
                  name="star"
                  size={24}
                  color={(filters.minRating || 0) >= rating ? theme.colors.tertiary : theme.colors.surfaceVariant}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('filters.availability')}</Text>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setFilters({ ...filters, availableNow: !filters.availableNow })}
          >
            <View style={[styles.checkbox, filters.availableNow && styles.checkedBox]}>
              {filters.availableNow && (
                <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>{t('filters.availableNow')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setFilters({ ...filters, availableToday: !filters.availableToday })}
          >
            <View style={[styles.checkbox, filters.availableToday && styles.checkedBox]}>
              {filters.availableToday && (
                <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>{t('filters.availableToday')}</Text>
          </TouchableOpacity>
        </View>

        {/* New Providers */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setFilters({ ...filters, includeNewProviders: !filters.includeNewProviders })}
          >
            <View style={[styles.checkbox, filters.includeNewProviders && styles.checkedBox]}>
              {filters.includeNewProviders && (
                <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>{t('filters.showNewProviders')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApply}
        >
          <Text style={styles.applyButtonText}>{t('filters.applyFilters')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  resetText: {
    fontSize: 16,
    color: theme.colors.primary,
  },
  disabledText: {
    color: theme.colors.onSurfaceVariant,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  selectedChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  selectedChipText: {
    color: theme.colors.onPrimary,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    padding: 4,
  },
  selectedRating: {
    transform: [{ scale: 1.1 }],
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: theme.colors.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
  },
});