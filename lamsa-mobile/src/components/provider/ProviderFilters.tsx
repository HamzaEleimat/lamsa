import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  I18nManager,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { ServiceCategory, BusinessType } from '../../types';
import { ProviderSearchParams } from '../../services/providerService';

interface ProviderFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ProviderSearchParams) => void;
  currentFilters: ProviderSearchParams;
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.selectedChip]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, selected && styles.selectedChipText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function ProviderFilters({
  visible,
  onClose,
  onApply,
  currentFilters,
}: ProviderFiltersProps) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const [filters, setFilters] = useState<ProviderSearchParams>({
    ...currentFilters,
  });

  const serviceCategories = [
    { key: ServiceCategory.HAIR, label: t('hair') },
    { key: ServiceCategory.NAILS, label: t('nails') },
    { key: ServiceCategory.MAKEUP, label: t('makeup') },
    { key: ServiceCategory.SPA, label: t('spa') },
    { key: ServiceCategory.AESTHETIC, label: t('aesthetic') },
  ];

  const businessTypes = [
    { key: BusinessType.SALON, label: t('salon') },
    { key: BusinessType.SPA, label: t('spa') },
    { key: BusinessType.MOBILE, label: t('mobileService') },
    { key: BusinessType.HOME_BASED, label: t('homeBased') },
    { key: BusinessType.CLINIC, label: t('clinic') },
  ];

  const sortOptions = [
    { key: 'distance', label: t('distance') },
    { key: 'rating', label: t('rating') },
    { key: 'price', label: t('price') },
    { key: 'reviews', label: t('reviews') },
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
    onClose();
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('filters')}</Text>
          <TouchableOpacity onPress={handleReset} disabled={!hasActiveFilters()}>
            <Text style={[
              styles.resetText,
              !hasActiveFilters() && styles.disabledText,
            ]}>
              {t('reset')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Sort By */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sortBy')}</Text>
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
            <Text style={styles.sectionTitle}>{t('serviceCategories')}</Text>
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
            <Text style={styles.sectionTitle}>{t('businessType')}</Text>
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
              {t('distanceRadius')}: {filters.radiusKm || 50} {t('km')}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={100}
              value={filters.radiusKm || 50}
              onValueChange={(value) => setFilters({ ...filters, radiusKm: Math.round(value) })}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.lightGray}
              thumbTintColor={colors.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1 {t('km')}</Text>
              <Text style={styles.sliderLabel}>100 {t('km')}</Text>
            </View>
          </View>

          {/* Minimum Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('minimumRating')}: {filters.minRating || 0} ★
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
                    color={(filters.minRating || 0) >= rating ? colors.warning : colors.lightGray}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('availability')}</Text>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFilters({ ...filters, availableNow: !filters.availableNow })}
            >
              <View style={[styles.checkbox, filters.availableNow && styles.checkedBox]}>
                {filters.availableNow && (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>{t('availableNow')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFilters({ ...filters, availableToday: !filters.availableToday })}
            >
              <View style={[styles.checkbox, filters.availableToday && styles.checkedBox]}>
                {filters.availableToday && (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>{t('availableToday')}</Text>
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
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>{t('showNewProviders')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>{t('applyFilters')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  resetText: {
    fontSize: 16,
    color: colors.primary,
  },
  disabledText: {
    color: colors.gray,
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
    color: colors.text,
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
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedChipText: {
    color: colors.white,
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
    color: colors.gray,
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
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: colors.text,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});