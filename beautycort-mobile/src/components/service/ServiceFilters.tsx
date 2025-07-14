import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  I18nManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Slider from '@react-native-community/slider';
import { ServiceFilters as ServiceFiltersType, ServiceCategory, ServiceTag } from '../../types/service.types';
import { colors } from '../../constants/colors';

interface ServiceFiltersProps {
  visible: boolean;
  onClose: () => void;
  filters: ServiceFiltersType;
  onFiltersChange: (filters: ServiceFiltersType) => void;
  categories: ServiceCategory[];
  tags: ServiceTag[];
}

export default function ServiceFilters({
  visible,
  onClose,
  filters,
  onFiltersChange,
  categories,
  tags,
}: ServiceFiltersProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const [localFilters, setLocalFilters] = useState<ServiceFiltersType>(filters);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleResetFilters = () => {
    const resetFilters: ServiceFiltersType = {
      search: '',
      category_id: '',
      status: 'all',
      price_range: [0, 1000],
      tags: [],
      gender_preference: 'all',
      sort_by: 'name',
      sort_order: 'asc',
    };
    setLocalFilters(resetFilters);
  };

  const toggleTag = (tagId: string) => {
    const currentTags = localFilters.tags || [];
    const updatedTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    setLocalFilters(prev => ({ ...prev, tags: updatedTags }));
  };

  const sortOptions = [
    { value: 'name', label: t('sortByName') },
    { value: 'price', label: t('sortByPrice') },
    { value: 'popularity', label: t('sortByPopularity') },
    { value: 'bookings', label: t('sortByBookings') },
    { value: 'created', label: t('sortByCreated') },
  ];

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
          <TouchableOpacity onPress={handleResetFilters}>
            <Text style={styles.resetText}>{t('reset')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('search')}</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.gray} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchServices')}
                value={localFilters.search}
                onChangeText={(text) => setLocalFilters(prev => ({ ...prev, search: text }))}
                placeholderTextColor={colors.gray}
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryRow}>
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !localFilters.category_id && styles.selectedCategoryChip,
                  ]}
                  onPress={() => setLocalFilters(prev => ({ ...prev, category_id: '' }))}
                >
                  <Text style={[
                    styles.categoryChipText,
                    !localFilters.category_id && styles.selectedCategoryChipText,
                  ]}>
                    {t('all')}
                  </Text>
                </TouchableOpacity>
                
                {categories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      localFilters.category_id === category.id && styles.selectedCategoryChip,
                    ]}
                    onPress={() => setLocalFilters(prev => ({ ...prev, category_id: category.id }))}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      localFilters.category_id === category.id && styles.selectedCategoryChipText,
                    ]}>
                      {i18n.language === 'ar' ? category.name_ar : category.name_en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('status')}</Text>
            <View style={styles.statusRow}>
              {['all', 'active', 'inactive'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusChip,
                    localFilters.status === status && styles.selectedStatusChip,
                  ]}
                  onPress={() => setLocalFilters(prev => ({ ...prev, status: status as any }))}
                >
                  <Text style={[
                    styles.statusChipText,
                    localFilters.status === status && styles.selectedStatusChipText,
                  ]}>
                    {t(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('priceRange')}</Text>
            <View style={styles.priceRangeContainer}>
              <Text style={styles.priceText}>
                {localFilters.price_range?.[0] || 0} - {localFilters.price_range?.[1] || 1000} {t('jod')}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1000}
                value={localFilters.price_range?.[0] || 0}
                onValueChange={(value) => {
                  const currentRange = localFilters.price_range || [0, 1000];
                  setLocalFilters(prev => ({ 
                    ...prev, 
                    price_range: [value, currentRange[1]] 
                  }));
                }}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.lightGray}
                thumbStyle={{ backgroundColor: colors.primary }}
              />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1000}
                value={localFilters.price_range?.[1] || 1000}
                onValueChange={(value) => {
                  const currentRange = localFilters.price_range || [0, 1000];
                  setLocalFilters(prev => ({ 
                    ...prev, 
                    price_range: [currentRange[0], value] 
                  }));
                }}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.lightGray}
                thumbStyle={{ backgroundColor: colors.primary }}
              />
            </View>
          </View>

          {/* Gender Preference */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('genderPreference')}</Text>
            <View style={styles.genderRow}>
              {['all', 'unisex', 'male', 'female'].map(gender => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.genderChip,
                    localFilters.gender_preference === gender && styles.selectedGenderChip,
                  ]}
                  onPress={() => setLocalFilters(prev => ({ ...prev, gender_preference: gender as any }))}
                >
                  <Text style={[
                    styles.genderChipText,
                    localFilters.gender_preference === gender && styles.selectedGenderChipText,
                  ]}>
                    {t(gender)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('tags')}</Text>
            <View style={styles.tagsContainer}>
              {tags.map(tag => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    (localFilters.tags || []).includes(tag.id) && styles.selectedTagChip,
                  ]}
                  onPress={() => toggleTag(tag.id)}
                >
                  <Text style={[
                    styles.tagChipText,
                    (localFilters.tags || []).includes(tag.id) && styles.selectedTagChipText,
                  ]}>
                    {i18n.language === 'ar' ? tag.name_ar : tag.name_en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sortBy')}</Text>
            <View style={styles.sortContainer}>
              {sortOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    localFilters.sort_by === option.value && styles.selectedSortOption,
                  ]}
                  onPress={() => setLocalFilters(prev => ({ ...prev, sort_by: option.value as any }))}
                >
                  <Text style={[
                    styles.sortOptionText,
                    localFilters.sort_by === option.value && styles.selectedSortOptionText,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.sortOrderContainer}>
              <TouchableOpacity
                style={[
                  styles.sortOrderButton,
                  localFilters.sort_order === 'asc' && styles.selectedSortOrderButton,
                ]}
                onPress={() => setLocalFilters(prev => ({ ...prev, sort_order: 'asc' }))}
              >
                <Ionicons name="arrow-up" size={20} color={
                  localFilters.sort_order === 'asc' ? colors.white : colors.gray
                } />
                <Text style={[
                  styles.sortOrderText,
                  localFilters.sort_order === 'asc' && styles.selectedSortOrderText,
                ]}>
                  {t('ascending')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sortOrderButton,
                  localFilters.sort_order === 'desc' && styles.selectedSortOrderButton,
                ]}
                onPress={() => setLocalFilters(prev => ({ ...prev, sort_order: 'desc' }))}
              >
                <Ionicons name="arrow-down" size={20} color={
                  localFilters.sort_order === 'desc' ? colors.white : colors.gray
                } />
                <Text style={[
                  styles.sortOrderText,
                  localFilters.sort_order === 'desc' && styles.selectedSortOrderText,
                ]}>
                  {t('descending')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApplyFilters}
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  resetText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: colors.text,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedCategoryChipText: {
    color: colors.white,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  selectedStatusChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedStatusChipText: {
    color: colors.white,
  },
  priceRangeContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedGenderChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderChipText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedGenderChipText: {
    color: colors.white,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedTagChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontSize: 12,
    color: colors.text,
  },
  selectedTagChipText: {
    color: colors.white,
  },
  sortContainer: {
    gap: 8,
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedSortOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  selectedSortOptionText: {
    color: colors.white,
  },
  sortOrderContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  sortOrderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedSortOrderButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortOrderText: {
    fontSize: 14,
    color: colors.gray,
  },
  selectedSortOrderText: {
    color: colors.white,
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