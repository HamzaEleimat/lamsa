import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  Checkbox,
  SearchBar,
  Chip,
  Badge,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n, { isRTL } from '../../../i18n';
import ProgressIndicator from '../../../components/onboarding/ProgressIndicator';
import { ProviderOnboardingStackParamList } from '../../../navigation/ProviderOnboardingNavigator';
import { ProviderOnboardingService } from '../../../services/ProviderOnboardingService';

type ServiceCategoriesNavigationProp = NativeStackNavigationProp<
  ProviderOnboardingStackParamList,
  'ServiceCategories'
>;

type ServiceCategoriesRouteProp = RouteProp<
  ProviderOnboardingStackParamList,
  'ServiceCategories'
>;

interface Props {
  navigation: ServiceCategoriesNavigationProp;
  route: ServiceCategoriesRouteProp;
}

interface ServiceCategory {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  icon: string;
  color: string;
  serviceCount: number;
  isPopular: boolean;
}

// Mock service categories data - replace with API call
const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: '1',
    name_en: 'Hair Care',
    name_ar: 'العناية بالشعر',
    description_en: 'Cutting, styling, coloring, treatments',
    description_ar: 'قص، تصفيف، صبغ، علاجات',
    icon: 'content-cut',
    color: '#FF6B35',
    serviceCount: 15,
    isPopular: true,
  },
  {
    id: '2',
    name_en: 'Skincare & Facials',
    name_ar: 'العناية بالبشرة والوجه',
    description_en: 'Facial treatments, skincare, cleansing',
    description_ar: 'علاجات الوجه، العناية بالبشرة، التنظيف',
    icon: 'face-woman',
    color: '#4ECDC4',
    serviceCount: 12,
    isPopular: true,
  },
  {
    id: '3',
    name_en: 'Nail Care',
    name_ar: 'العناية بالأظافر',
    description_en: 'Manicure, pedicure, nail art',
    description_ar: 'مانيكير، بديكير، فن الأظافر',
    icon: 'hand-heart',
    color: '#FF9F43',
    serviceCount: 8,
    isPopular: true,
  },
  {
    id: '4',
    name_en: 'Makeup & Styling',
    name_ar: 'المكياج والتجميل',
    description_en: 'Bridal makeup, event styling, makeup lessons',
    description_ar: 'مكياج العروس، تصفيف المناسبات، دروس المكياج',
    icon: 'lipstick',
    color: '#E17055',
    serviceCount: 10,
    isPopular: true,
  },
  {
    id: '5',
    name_en: 'Body Treatments',
    name_ar: 'علاجات الجسم',
    description_en: 'Massage, body wraps, scrubs',
    description_ar: 'مساج، لفافات الجسم، تقشير',
    icon: 'spa',
    color: '#6C5CE7',
    serviceCount: 6,
    isPopular: false,
  },
  {
    id: '6',
    name_en: 'Eyebrows & Lashes',
    name_ar: 'الحواجب والرموش',
    description_en: 'Threading, tinting, lash extensions',
    description_ar: 'خيط، صبغ، تركيب رموش',
    icon: 'eye',
    color: '#00B894',
    serviceCount: 7,
    isPopular: false,
  },
  {
    id: '7',
    name_en: 'Hair Removal',
    name_ar: 'إزالة الشعر',
    description_en: 'Waxing, threading, laser treatments',
    description_ar: 'شمع، خيط، ليزر',
    icon: 'razor-single-edge',
    color: '#FD79A8',
    serviceCount: 5,
    isPopular: false,
  },
  {
    id: '8',
    name_en: 'Henna & Traditional',
    name_ar: 'الحناء والتراثي',
    description_en: 'Henna designs, traditional beauty treatments',
    description_ar: 'نقوش الحناء، علاجات الجمال التراثية',
    icon: 'flower',
    color: '#A29BFE',
    serviceCount: 4,
    isPopular: false,
  },
];

const ServiceCategoriesScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { phoneNumber } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<ServiceCategory[]>(SERVICE_CATEGORIES);

  const stepTitles = [
    i18n.t('providerOnboarding.steps.businessInfo'),
    i18n.t('providerOnboarding.steps.location'),
    i18n.t('providerOnboarding.steps.categories'),
    i18n.t('providerOnboarding.steps.hours'),
    i18n.t('providerOnboarding.steps.license'),
    i18n.t('providerOnboarding.steps.tutorial'),
    i18n.t('providerOnboarding.steps.completion'),
  ];

  useEffect(() => {
    loadDraftData();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [searchQuery]);

  const loadDraftData = async () => {
    try {
      const onboardingState = await ProviderOnboardingService.getCurrentOnboardingState();
      if (onboardingState?.provider) {
        const step4Data = onboardingState.steps.find(step => step.stepNumber === 4)?.data;
        if (step4Data?.selectedCategories) {
          setSelectedCategories(step4Data.selectedCategories);
        }
      }
    } catch (error) {
      console.error('Error loading draft data:', error);
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const filterCategories = () => {
    if (!searchQuery.trim()) {
      setFilteredCategories(SERVICE_CATEGORIES);
      return;
    }

    const filtered = SERVICE_CATEGORIES.filter(category => 
      category.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.name_ar.includes(searchQuery) ||
      category.description_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description_ar?.includes(searchQuery)
    );
    setFilteredCategories(filtered);
  };

  const handleCategoryToggle = (categoryId: string) => {
    const updatedCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setSelectedCategories(updatedCategories);
    saveDraft(updatedCategories);
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === SERVICE_CATEGORIES.length) {
      setSelectedCategories([]);
      saveDraft([]);
    } else {
      const allIds = SERVICE_CATEGORIES.map(cat => cat.id);
      setSelectedCategories(allIds);
      saveDraft(allIds);
    }
  };

  const handleSelectPopular = () => {
    const popularIds = SERVICE_CATEGORIES.filter(cat => cat.isPopular).map(cat => cat.id);
    const uniqueCategories = [...new Set([...selectedCategories, ...popularIds])];
    setSelectedCategories(uniqueCategories);
    saveDraft(uniqueCategories);
  };

  const saveDraft = async (categories: string[]) => {
    try {
      await ProviderOnboardingService.updateServiceCategories({
        selectedCategories: categories,
        isCompleted: false,
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const onSubmit = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.validation.categoriesRequired')
      );
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        selectedCategories,
      };

      // Validate form data
      const validation = ProviderOnboardingService.validateStepData(4, submitData);
      if (!validation.isValid) {
        Alert.alert(
          i18n.t('common.error'),
          validation.errors.join('\n')
        );
        return;
      }

      // Save data and mark step as completed
      await ProviderOnboardingService.updateServiceCategories({
        ...submitData,
        isCompleted: true,
      });

      navigation.navigate('WorkingHours', { phoneNumber });
    } catch (error) {
      console.error('Error submitting service categories:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.errors.categoriesSave')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderCategoryCard = ({ item }: { item: ServiceCategory }) => {
    const isSelected = selectedCategories.includes(item.id);
    const categoryName = isRTL() ? item.name_ar : item.name_en;
    const categoryDescription = isRTL() ? item.description_ar : item.description_en;

    return (
      <Surface 
        style={[
          styles.categoryCard,
          isSelected && { 
            borderColor: item.color,
            borderWidth: 2,
            backgroundColor: `${item.color}08`,
          }
        ]}
        elevation={isSelected ? 4 : 2}
      >
        <View style={styles.categoryContent}>
          <View style={styles.categoryHeader}>
            <View style={styles.categoryLeft}>
              <View 
                style={[
                  styles.categoryIcon,
                  { backgroundColor: `${item.color}15` }
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color={item.color}
                />
              </View>
              
              <View style={styles.categoryInfo}>
                <View style={styles.categoryTitleRow}>
                  <Text variant="titleMedium" style={styles.categoryTitle}>
                    {categoryName}
                  </Text>
                  {item.isPopular && (
                    <Badge 
                      style={[styles.popularBadge, { backgroundColor: theme.colors.primary }]}
                      size={16}
                    >
                      {i18n.t('providerOnboarding.categories.popular')}
                    </Badge>
                  )}
                </View>
                
                {categoryDescription && (
                  <Text 
                    variant="bodySmall" 
                    style={[styles.categoryDescription, { color: theme.colors.onSurfaceVariant }]}
                    numberOfLines={2}
                  >
                    {categoryDescription}
                  </Text>
                )}
                
                <Text 
                  variant="bodySmall" 
                  style={[styles.serviceCount, { color: item.color }]}
                >
                  {i18n.t('providerOnboarding.categories.serviceCount', { count: item.serviceCount })}
                </Text>
              </View>
            </View>

            <Checkbox
              status={isSelected ? 'checked' : 'unchecked'}
              onPress={() => handleCategoryToggle(item.id)}
              uncheckedColor={theme.colors.outline}
            />
          </View>
        </View>
      </Surface>
    );
  };

  if (isLoadingDraft) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>{i18n.t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ProgressIndicator
        currentStep={3}
        totalSteps={7}
        stepTitles={stepTitles}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={48}
            color={theme.colors.primary}
          />
          <Text variant="headlineSmall" style={styles.title}>
            {i18n.t('providerOnboarding.categories.title')}
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            {i18n.t('providerOnboarding.categories.subtitle')}
          </Text>
        </View>

        {/* Search and Quick Actions */}
        <Surface style={styles.searchContainer} elevation={1}>
          <SearchBar
            placeholder={i18n.t('providerOnboarding.categories.search')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={[isRTL() && styles.searchInputRTL]}
          />
          
          <View style={styles.quickActions}>
            <Button
              mode="outlined"
              onPress={handleSelectPopular}
              icon="star"
              compact
              style={styles.quickActionButton}
            >
              {i18n.t('providerOnboarding.categories.selectPopular')}
            </Button>
            
            <Button
              mode="outlined"
              onPress={handleSelectAll}
              icon={selectedCategories.length === SERVICE_CATEGORIES.length ? "checkbox-marked" : "checkbox-blank-outline"}
              compact
              style={styles.quickActionButton}
            >
              {selectedCategories.length === SERVICE_CATEGORIES.length 
                ? i18n.t('providerOnboarding.categories.deselectAll')
                : i18n.t('providerOnboarding.categories.selectAll')
              }
            </Button>
          </View>
        </Surface>

        {/* Selected Categories Summary */}
        {selectedCategories.length > 0 && (
          <Surface style={styles.selectedSummary} elevation={1}>
            <View style={styles.selectedHeader}>
              <Text variant="titleSmall" style={styles.selectedTitle}>
                {i18n.t('providerOnboarding.categories.selected')} ({selectedCategories.length})
              </Text>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.selectedChips}
            >
              {selectedCategories.map(categoryId => {
                const category = SERVICE_CATEGORIES.find(cat => cat.id === categoryId);
                if (!category) return null;
                
                const categoryName = isRTL() ? category.name_ar : category.name_en;
                
                return (
                  <Chip
                    key={categoryId}
                    mode="flat"
                    onClose={() => handleCategoryToggle(categoryId)}
                    style={[styles.selectedChip, { backgroundColor: `${category.color}20` }]}
                    textStyle={{ color: category.color }}
                  >
                    {categoryName}
                  </Chip>
                );
              })}
            </ScrollView>
          </Surface>
        )}

        {/* Categories List */}
        <FlatList
          data={filteredCategories}
          renderItem={renderCategoryCard}
          keyExtractor={(item) => item.id}
          style={styles.categoriesList}
          contentContainerStyle={styles.categoriesContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.categorySeparator} />}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          {i18n.t('common.back')}
        </Button>
        <Button
          mode="contained"
          onPress={onSubmit}
          disabled={selectedCategories.length === 0 || isLoading}
          loading={isLoading}
          style={styles.continueButton}
        >
          {i18n.t('providerOnboarding.buttons.continue')}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    marginBottom: 12,
  },
  searchInputRTL: {
    textAlign: 'right',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 20,
  },
  selectedSummary: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  selectedHeader: {
    marginBottom: 8,
  },
  selectedTitle: {
    fontWeight: '600',
  },
  selectedChips: {
    flexDirection: 'row',
  },
  selectedChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  categoriesList: {
    flex: 1,
  },
  categoriesContent: {
    paddingBottom: 20,
  },
  categorySeparator: {
    height: 12,
  },
  categoryCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryContent: {
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTitle: {
    fontWeight: '600',
    marginRight: 8,
  },
  popularBadge: {
    paddingHorizontal: 6,
  },
  categoryDescription: {
    marginBottom: 4,
    lineHeight: 16,
  },
  serviceCount: {
    fontWeight: '500',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  backButton: {
    flex: 1,
    borderRadius: 28,
  },
  continueButton: {
    flex: 2,
    borderRadius: 28,
  },
});

export default ServiceCategoriesScreen;