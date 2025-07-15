import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  FlatList,
  Alert,
} from 'react-native';
import { Text, Card, Searchbar, Chip, ActivityIndicator, Portal, Modal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import HelpContentService, { HelpCategory, HelpContent, HelpSearchResult } from '../../services/help/HelpContentService';
import GuidedTourService, { GuidedTour } from '../../services/help/GuidedTourService';

const { width: screenWidth } = Dimensions.get('window');

interface QuickAction {
  id: string;
  title: string;
  titleAr: string;
  icon: string;
  color: string;
  action: () => void;
}

export default function HelpCenterScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [popularContent, setPopularContent] = useState<HelpContent[]>([]);
  const [availableTours, setAvailableTours] = useState<GuidedTour[]>([]);
  const [suggestedContent, setSuggestedContent] = useState<HelpContent[]>([]);
  const [showTourModal, setShowTourModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState<GuidedTour | null>(null);

  const helpService = HelpContentService.getInstance();
  const tourService = GuidedTourService.getInstance();

  useEffect(() => {
    loadHelpData();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  const loadHelpData = async () => {
    try {
      setLoading(true);
      
      const [
        categoriesData,
        popularData,
        toursData,
        suggestedData,
      ] = await Promise.all([
        helpService.getCategories(),
        helpService.getPopularContent(),
        tourService.getAvailableTours(user?.id || '', 'HelpCenter'),
        helpService.suggestContent({
          currentScreen: 'HelpCenter',
          userProgress: await helpService.getUserProgress(user?.id || ''),
        }),
      ]);

      setCategories(categoriesData);
      setPopularContent(popularData);
      setAvailableTours(toursData);
      setSuggestedContent(suggestedData);
    } catch (error) {
      console.error('Error loading help data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await helpService.searchContent(searchQuery, i18n.language as 'ar' | 'en');
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCategoryPress = (category: HelpCategory) => {
    navigation.navigate('CategoryHelp', { 
      categoryId: category.id,
      categoryName: isRTL ? category.nameAr : category.name,
    });
  };

  const handleContentPress = (content: HelpContent) => {
    navigation.navigate('HelpContent', { contentId: content.id });
  };

  const handleStartTour = (tour: GuidedTour) => {
    setSelectedTour(tour);
    setShowTourModal(true);
  };

  const confirmStartTour = async () => {
    if (selectedTour) {
      setShowTourModal(false);
      const success = await tourService.startTour(selectedTour.id, i18n.language as 'ar' | 'en');
      if (success) {
        navigation.goBack(); // Return to the screen where tour will run
      } else {
        Alert.alert(
          t('error'),
          t('tourStartError'),
          [{ text: t('ok') }]
        );
      }
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'contact-support',
      title: 'Contact Support',
      titleAr: 'اتصل بالدعم',
      icon: 'headset',
      color: colors.primary,
      action: () => navigation.navigate('SupportScreen'),
    },
    {
      id: 'video-tutorials',
      title: 'Video Tutorials',
      titleAr: 'دروس فيديو',
      icon: 'play-circle',
      color: colors.secondary,
      action: () => navigation.navigate('VideoTutorials'),
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      titleAr: 'أفضل الممارسات',
      icon: 'star',
      color: colors.success,
      action: () => navigation.navigate('BestPractices'),
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      titleAr: 'استكشاف الأخطاء',
      icon: 'build',
      color: colors.warning,
      action: () => navigation.navigate('Troubleshooting'),
    },
  ];

  const renderCategory = ({ item }: { item: HelpCategory }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: item.color + '15' }]}
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={24} color="white" />
      </View>
      <View style={styles.categoryContent}>
        <Text style={styles.categoryName}>
          {isRTL ? item.nameAr : item.name}
        </Text>
        <Text style={styles.categoryDescription}>
          {isRTL ? item.descriptionAr : item.description}
        </Text>
        <Text style={styles.categoryCount}>
          {item.contentCount} {t('helpArticles')}
        </Text>
      </View>
      <Ionicons 
        name={isRTL ? "chevron-back" : "chevron-forward"} 
        size={20} 
        color={colors.text.secondary} 
      />
    </TouchableOpacity>
  );

  const renderPopularContent = ({ item }: { item: HelpContent }) => (
    <TouchableOpacity
      style={styles.popularCard}
      onPress={() => handleContentPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.popularContent}>
        <Text style={styles.popularTitle}>
          {isRTL ? item.titleAr : item.title}
        </Text>
        <Text style={styles.popularDescription} numberOfLines={2}>
          {isRTL ? item.contentAr : item.content}
        </Text>
        <View style={styles.popularMeta}>
          <View style={styles.popularStats}>
            <Ionicons name="eye" size={12} color={colors.text.secondary} />
            <Text style={styles.popularStat}>{item.viewCount}</Text>
            <Ionicons name="thumbs-up" size={12} color={colors.text.secondary} />
            <Text style={styles.popularStat}>{item.helpfulCount}</Text>
          </View>
          <Chip
            mode="outlined"
            textStyle={styles.chipText}
            style={styles.typeChip}
          >
            {t(`helpType.${item.type}`)}
          </Chip>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: HelpSearchResult }) => (
    <TouchableOpacity
      style={styles.searchResultCard}
      onPress={() => handleContentPress(item.content)}
      activeOpacity={0.7}
    >
      <View style={styles.searchResultContent}>
        <Text style={styles.searchResultTitle}>
          {isRTL ? item.content.titleAr : item.content.title}
        </Text>
        <Text style={styles.searchResultDescription} numberOfLines={2}>
          {isRTL ? item.content.contentAr : item.content.content}
        </Text>
        <View style={styles.searchResultMeta}>
          <Text style={styles.relevanceScore}>
            {t('relevance')}: {Math.round(item.relevanceScore * 10)}%
          </Text>
          <View style={styles.matchedTerms}>
            {item.matchedTerms.slice(0, 2).map((term, index) => (
              <Chip key={index} mode="outlined" textStyle={styles.chipText} style={styles.termChip}>
                {term}
              </Chip>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTour = ({ item }: { item: GuidedTour }) => (
    <TouchableOpacity
      style={styles.tourCard}
      onPress={() => handleStartTour(item)}
      activeOpacity={0.7}
    >
      <View style={styles.tourIcon}>
        <Ionicons name={item.icon as any} size={24} color={colors.primary} />
      </View>
      <View style={styles.tourContent}>
        <Text style={styles.tourName}>
          {isRTL ? item.nameAr : item.name}
        </Text>
        <Text style={styles.tourDescription}>
          {isRTL ? item.descriptionAr : item.description}
        </Text>
        <View style={styles.tourMeta}>
          <Text style={styles.tourDuration}>
            {item.estimatedDuration} {t('minutes')}
          </Text>
          <Chip
            mode="outlined"
            textStyle={styles.chipText}
            style={[
              styles.difficultyChip,
              { backgroundColor: getDifficultyColor(item.difficulty) + '15' }
            ]}
          >
            {t(`difficulty.${item.difficulty}`)}
          </Chip>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return colors.success;
      case 'intermediate': return colors.warning;
      case 'advanced': return colors.error;
      default: return colors.text.secondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('loadingHelp')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('helpCenter')}</Text>
          <Text style={styles.headerSubtitle}>{t('helpCenterSubtitle')}</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder={t('searchHelp')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
            iconColor={colors.text.secondary}
            loading={isSearching}
          />
        </View>

        {/* Search Results */}
        {searchQuery.trim() && searchResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('searchResults')} ({searchResults.length})
            </Text>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.content.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* No Search Results */}
        {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search" size={48} color={colors.text.secondary} />
            <Text style={styles.noResultsText}>{t('noSearchResults')}</Text>
            <Text style={styles.noResultsSubtext}>{t('tryDifferentKeywords')}</Text>
          </View>
        )}

        {/* Quick Actions */}
        {!searchQuery.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.quickActionCard, { backgroundColor: action.color + '15' }]}
                  onPress={action.action}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                    <Ionicons name={action.icon as any} size={24} color="white" />
                  </View>
                  <Text style={styles.quickActionText}>
                    {isRTL ? action.titleAr : action.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Available Tours */}
        {!searchQuery.trim() && availableTours.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('guidedTours')}</Text>
            <FlatList
              data={availableTours}
              renderItem={renderTour}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toursContainer}
            />
          </View>
        )}

        {/* Popular Content */}
        {!searchQuery.trim() && popularContent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('popularContent')}</Text>
            <FlatList
              data={popularContent.slice(0, 5)}
              renderItem={renderPopularContent}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Categories */}
        {!searchQuery.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('browseByCategory')}</Text>
            <FlatList
              data={categories}
              renderItem={renderCategory}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Suggested Content */}
        {!searchQuery.trim() && suggestedContent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('suggestedForYou')}</Text>
            <FlatList
              data={suggestedContent}
              renderItem={renderPopularContent}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Tour Confirmation Modal */}
      <Portal>
        <Modal
          visible={showTourModal}
          onDismiss={() => setShowTourModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedTour && (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name={selectedTour.icon as any} size={32} color={colors.primary} />
                <Text style={styles.modalTitle}>
                  {isRTL ? selectedTour.nameAr : selectedTour.name}
                </Text>
              </View>
              <Text style={styles.modalDescription}>
                {isRTL ? selectedTour.descriptionAr : selectedTour.description}
              </Text>
              <View style={styles.modalMeta}>
                <Text style={styles.modalMetaText}>
                  {t('estimatedTime')}: {selectedTour.estimatedDuration} {t('minutes')}
                </Text>
                <Text style={styles.modalMetaText}>
                  {t('difficulty')}: {t(`difficulty.${selectedTour.difficulty}`)}
                </Text>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowTourModal(false)}
                >
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmStartTour}
                >
                  <Text style={styles.confirmButtonText}>{t('startTour')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  searchInput: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (screenWidth - 48) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  popularCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  popularContent: {
    padding: 16,
  },
  popularTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  popularDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  popularMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popularStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularStat: {
    fontSize: 12,
    color: colors.text.secondary,
    marginHorizontal: 4,
  },
  typeChip: {
    height: 28,
  },
  chipText: {
    fontSize: 11,
  },
  searchResultCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  searchResultContent: {
    padding: 16,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  searchResultDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  searchResultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  relevanceScore: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  matchedTerms: {
    flexDirection: 'row',
  },
  termChip: {
    height: 24,
    marginLeft: 4,
  },
  toursContainer: {
    paddingHorizontal: 16,
  },
  tourCard: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tourIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tourContent: {
    flex: 1,
  },
  tourName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  tourDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  tourMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tourDuration: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  difficultyChip: {
    height: 24,
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  modalContainer: {
    margin: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  modalMeta: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalMetaText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: colors.text.secondary + '15',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});