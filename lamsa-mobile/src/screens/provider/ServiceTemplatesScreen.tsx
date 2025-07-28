import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  I18nManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServiceTemplate, ServiceCategory } from '../../types/service.types';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';

export default function ServiceTemplatesScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isRTL = I18nManager.isRTL;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTemplates(),
        fetchCategories(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/services/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/services/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleUseTemplate = async (template: ServiceTemplate) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const serviceData = {
        name_en: template.name_en,
        name_ar: template.name_ar,
        description_en: template.description_en,
        description_ar: template.description_ar,
        category_id: template.category_id,
        price: template.typical_price_min || 0,
        duration_minutes: template.typical_duration_minutes || 30,
        gender_preference: template.gender_specific || 'unisex',
        tags: template.suggested_tags || [],
        provider_id: providerId,
      };

      const response = await fetch(`${API_URL}/api/services/from-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          t('success'),
          t('serviceCreatedFromTemplate'),
          [
            {
              text: t('editService'),
              onPress: () => navigation.navigate('ServiceForm', { serviceId: result.data.id }),
            },
            {
              text: t('viewServices'),
              onPress: () => navigation.navigate('ServiceList'),
            },
          ]
        );
      } else {
        Alert.alert(t('error'), t('failedToCreateService'));
      }
    } catch (error) {
      console.error('Error creating service from template:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' || 
      template.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.name_ar.includes(searchQuery);
    
    const matchesCategory = !selectedCategory || template.category_id === selectedCategory;
    const matchesSegment = !selectedSegment || template.market_segment === selectedSegment;
    
    return matchesSearch && matchesCategory && matchesSegment;
  });

  const popularTemplates = filteredTemplates.filter(t => t.is_popular);
  const regularTemplates = filteredTemplates.filter(t => !t.is_popular);

  const renderTemplateCard = ({ item }: { item: ServiceTemplate }) => {
    const templateName = i18n.language === 'ar' ? item.name_ar : item.name_en;
    const templateDescription = i18n.language === 'ar' ? item.description_ar : item.description_en;
    const category = categories.find(c => c.id === item.category_id);

    return (
      <TouchableOpacity
        style={[styles.templateCard, item.is_popular && styles.popularTemplateCard]}
        onPress={() => handleUseTemplate(item)}
      >
        {item.is_popular && (
          <View style={styles.popularBadge}>
            <Ionicons name="star" size={12} color={colors.white} />
            <Text style={styles.popularBadgeText}>{t('popular')}</Text>
          </View>
        )}

        <View style={styles.templateHeader}>
          <Text style={styles.templateName} numberOfLines={1}>
            {templateName}
          </Text>
          <View style={styles.templateActions}>
            <TouchableOpacity
              style={styles.previewButton}
              onPress={() => {
                Alert.alert(
                  templateName,
                  templateDescription || t('noDescription'),
                  [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('useTemplate'), onPress: () => handleUseTemplate(item) },
                  ]
                );
              }}
            >
              <Ionicons name="eye-outline" size={16} color={colors.gray} />
            </TouchableOpacity>
          </View>
        </View>

        {templateDescription && (
          <Text style={styles.templateDescription} numberOfLines={2}>
            {templateDescription}
          </Text>
        )}

        <View style={styles.templateDetails}>
          <View style={styles.templateDetail}>
            <Ionicons name="folder-outline" size={16} color={colors.gray} />
            <Text style={styles.templateDetailText}>
              {i18n.language === 'ar' ? category?.name_ar : category?.name_en}
            </Text>
          </View>
          
          <View style={styles.templateDetail}>
            <Ionicons name="time-outline" size={16} color={colors.gray} />
            <Text style={styles.templateDetailText}>
              {item.typical_duration_minutes} {t('minutes')}
            </Text>
          </View>
        </View>

        <View style={styles.templatePricing}>
          <Text style={styles.priceRange}>
            {item.typical_price_min} - {item.typical_price_max} {t('jod')}
          </Text>
          <View style={styles.segmentBadge}>
            <Text style={styles.segmentText}>{t(item.market_segment || 'standard')}</Text>
          </View>
        </View>

        <View style={styles.templateFooter}>
          <View style={styles.genderIndicator}>
            <Ionicons 
              name={
                item.gender_specific === 'male' ? 'man' : 
                item.gender_specific === 'female' ? 'woman' : 'people'
              } 
              size={16} 
              color={colors.gray} 
            />
            <Text style={styles.genderText}>{t(item.gender_specific || 'unisex')}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.useTemplateButton}
            onPress={() => handleUseTemplate(item)}
          >
            <Text style={styles.useTemplateButtonText}>{t('useTemplate')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('serviceTemplates')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ServiceForm')}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchTemplates')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.gray}
          />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryFilter,
                selectedCategory === item.id && styles.selectedCategoryFilter,
              ]}
              onPress={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
            >
              <Text style={[
                styles.categoryFilterText,
                selectedCategory === item.id && styles.selectedCategoryFilterText,
              ]}>
                {i18n.language === 'ar' ? item.name_ar : item.name_en}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.categoryFiltersContainer}
          ListHeaderComponent={
            <TouchableOpacity
              style={[
                styles.categoryFilter,
                !selectedCategory && styles.selectedCategoryFilter,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[
                styles.categoryFilterText,
                !selectedCategory && styles.selectedCategoryFilterText,
              ]}>
                {t('all')}
              </Text>
            </TouchableOpacity>
          }
        />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['budget', 'standard', 'premium', 'luxury']}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.segmentFilter,
                selectedSegment === item && styles.selectedSegmentFilter,
              ]}
              onPress={() => setSelectedSegment(selectedSegment === item ? null : item)}
            >
              <Text style={[
                styles.segmentFilterText,
                selectedSegment === item && styles.selectedSegmentFilterText,
              ]}>
                {t(item)}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
          contentContainerStyle={styles.segmentFiltersContainer}
        />
      </View>

      {/* Templates List */}
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <View>
            {popularTemplates.length > 0 && (
              <>
                {renderSectionHeader(t('popularTemplates'))}
                <FlatList
                  data={popularTemplates}
                  renderItem={renderTemplateCard}
                  keyExtractor={item => item.id}
                  numColumns={2}
                  columnWrapperStyle={styles.templatesRow}
                  scrollEnabled={false}
                />
              </>
            )}
            
            {regularTemplates.length > 0 && (
              <>
                {renderSectionHeader(t('allTemplates'))}
                <FlatList
                  data={regularTemplates}
                  renderItem={renderTemplateCard}
                  keyExtractor={item => item.id}
                  numColumns={2}
                  columnWrapperStyle={styles.templatesRow}
                  scrollEnabled={false}
                />
              </>
            )}
          </View>
        }
        contentContainerStyle={styles.templatesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color={colors.gray} />
            <Text style={styles.emptyText}>{t('noTemplatesFound')}</Text>
          </View>
        }
      />
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
  filtersContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: colors.text,
  },
  categoryFiltersContainer: {
    paddingVertical: 8,
  },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    marginRight: 8,
  },
  selectedCategoryFilter: {
    backgroundColor: colors.primary,
  },
  categoryFilterText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedCategoryFilterText: {
    color: colors.white,
  },
  segmentFiltersContainer: {
    paddingVertical: 8,
  },
  segmentFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
    marginRight: 8,
  },
  selectedSegmentFilter: {
    backgroundColor: colors.secondary,
  },
  segmentFilterText: {
    fontSize: 12,
    color: colors.text,
  },
  selectedSegmentFilterText: {
    color: colors.white,
  },
  templatesContainer: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 16,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  templatesRow: {
    justifyContent: 'space-between',
  },
  templateCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    margin: 4,
    position: 'relative',
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
  popularTemplateCard: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  previewButton: {
    padding: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 12,
    lineHeight: 20,
  },
  templateDetails: {
    marginBottom: 12,
  },
  templateDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  templateDetailText: {
    fontSize: 12,
    color: colors.gray,
  },
  templatePricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceRange: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  segmentBadge: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 10,
    color: colors.text,
    textTransform: 'uppercase',
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genderIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  genderText: {
    fontSize: 12,
    color: colors.gray,
  },
  useTemplateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  useTemplateButtonText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray,
    marginTop: 16,
  },
});