import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, useTheme, Searchbar, Chip, Surface, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProviderList from '../../components/provider/ProviderList';
import ProviderMapView from '../../components/provider/ProviderMapView';
import ProviderFilters from '../../components/provider/ProviderFilters';
import i18n from '../../i18n';
import HelpButton from '../../components/help/HelpButton';
import TooltipManager from '../../components/help/TooltipManager';
import providerService, { ProviderWithDistance, ProviderSearchParams } from '../../services/providerService';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';

const SearchScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [providers, setProviders] = useState<ProviderWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchParams, setSearchParams] = useState<ProviderSearchParams>({
    sortBy: 'distance',
    sortOrder: 'asc',
    limit: 20,
  });
  
  const categories = [
    { id: 'hair', name: i18n.t('categories.hair'), icon: 'content-cut' },
    { id: 'nails', name: i18n.t('categories.nails'), icon: 'hand-heart' },
    { id: 'makeup', name: i18n.t('categories.makeup'), icon: 'palette' },
    { id: 'spa', name: i18n.t('categories.spa'), icon: 'spa' },
    { id: 'skincare', name: i18n.t('categories.skincare'), icon: 'face-woman' },
  ];

  // Get user location on mount
  useEffect(() => {
    requestLocationPermission();
    searchProviders();
  }, []);

  // Search when category or search query changes
  useEffect(() => {
    debouncedSearch();
  }, [selectedCategory]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const searchProviders = async () => {
    try {
      setLoading(true);
      const params: ProviderSearchParams = {
        ...searchParams,
        searchQuery: searchQuery.trim() || undefined,
        serviceCategory: selectedCategory || undefined,
      };

      if (userLocation) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
        params.radiusKm = 50;
      }

      const response = await providerService.searchProviders(params);
      setProviders(response.providers);
    } catch (error) {
      console.error('Error searching providers:', error);
      Alert.alert(i18n.t('error'), i18n.t('failedToLoadProviders'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce(() => {
      searchProviders();
    }, 500),
    [searchParams, userLocation, selectedCategory, searchQuery]
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    searchProviders();
  };

  const handleProviderPress = (provider: ProviderWithDistance) => {
    navigation.navigate('ProviderDetail', { providerId: provider.id });
  };

  const renderSearchHeader = () => (
    <View style={styles.searchHeader}>
      <Searchbar
        placeholder={i18n.t('search.placeholder')}
        onChangeText={handleSearchChange}
        value={searchQuery}
        style={styles.searchBar}
        elevation={1}
      />
      <View style={styles.headerActions}>
        <IconButton
          icon={showMap ? 'format-list-bulleted' : 'map'}
          size={24}
          onPress={() => setShowMap(!showMap)}
          style={styles.actionButton}
        />
        <IconButton
          icon="filter-variant"
          size={24}
          onPress={() => setShowFilters(!showFilters)}
          style={styles.actionButton}
        />
        <HelpButton
          onPress={() => setShowHelp(true)}
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  const renderCategories = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
      contentContainerStyle={styles.categoriesContent}
    >
      {categories.map((category) => (
        <Chip
          key={category.id}
          icon={category.icon}
          selected={selectedCategory === category.id}
          onPress={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
          style={styles.categoryChip}
          textStyle={styles.categoryText}
        >
          {category.name}
        </Chip>
      ))}
    </ScrollView>
  );

  const renderContent = () => {
    if (showMap) {
      return (
        <View style={styles.mapContainer}>
          <ProviderMapView
            providers={providers}
            loading={loading}
            onProviderPress={handleProviderPress}
            currentLocation={userLocation}
          />
        </View>
      );
    }

    return (
      <ProviderList
        providers={providers}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onProviderPress={handleProviderPress}
        currentLocation={userLocation}
        emptyMessage={searchQuery ? i18n.t('noProvidersMatchSearch') : undefined}
      />
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderSearchHeader()}
      {renderCategories()}
      
      {showFilters && (
        <Surface style={styles.filtersContainer} elevation={2}>
          <ProviderFilters
            onApplyFilters={(filters) => {
              console.log('Applied filters:', filters);
              setShowFilters(false);
            }}
            onClose={() => setShowFilters(false)}
          />
        </Surface>
      )}
      
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
      
      {/* Help Tooltips */}
      <TooltipManager
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        tooltips={[
          {
            id: 'search',
            title: i18n.t('help.search.title'),
            description: i18n.t('help.search.description'),
            targetComponent: 'searchBar',
          },
          {
            id: 'categories',
            title: i18n.t('help.categories.title'),
            description: i18n.t('help.categories.description'),
            targetComponent: 'categories',
          },
          {
            id: 'mapToggle',
            title: i18n.t('help.mapToggle.title'),
            description: i18n.t('help.mapToggle.description'),
            targetComponent: 'mapButton',
          },
          {
            id: 'filters',
            title: i18n.t('help.filters.title'),
            description: i18n.t('help.filters.description'),
            targetComponent: 'filterButton',
          },
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    margin: 0,
  },
  categoriesContainer: {
    maxHeight: 48,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  filtersContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
});

export default SearchScreen;