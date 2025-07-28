import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  I18nManager,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import ProviderList from '../../components/provider/ProviderList';
import ProviderMapView from '../../components/provider/ProviderMapView';
import providerService, {
  ProviderSearchParams,
  ProviderWithDistance,
} from '../../services/providerService';
import { debounce } from 'lodash';

export default function SearchScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isRTL = I18nManager.isRTL;
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [providers, setProviders] = useState<ProviderWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useState<ProviderSearchParams>({
    sortBy: 'distance',
    sortOrder: 'asc',
    limit: 20,
    includeNewProviders: true,
  });

  // Refs
  const searchInputRef = useRef<TextInput>(null);

  // Get user location on mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Search providers when params change
  useEffect(() => {
    if (page === 1) {
      searchProviders();
    }
  }, [searchParams, page]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationEnabled(false);
        Alert.alert(
          t('customer.locationPermission'),
          t('customer.locationPermissionMessage'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationEnabled(false);
    }
  };

  const searchProviders = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoading(true);
      } else {
        setLoading(true);
      }

      const params: ProviderSearchParams = {
        ...searchParams,
        page: isLoadMore ? page + 1 : 1,
        searchQuery: searchQuery.trim() || undefined,
      };

      if (userLocation && locationEnabled) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
        params.radiusKm = 50; // 50km default radius
      }

      const response = await providerService.searchProviders(params);

      if (isLoadMore) {
        setProviders(prev => [...prev, ...response.providers]);
        setPage(prev => prev + 1);
      } else {
        setProviders(response.providers);
        setPage(1);
      }

      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Error searching providers:', error);
      Alert.alert(t('common.error'), t('customer.failedToLoadProviders'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      setPage(1);
      searchProviders();
    }, 500),
    [searchParams, userLocation]
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    searchProviders();
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      searchProviders(true);
    }
  };

  const handleProviderPress = (provider: ProviderWithDistance) => {
    navigation.navigate('ProviderDetail', { providerId: provider.id });
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'list' ? 'map' : 'list');
  };

  const toggleLocation = async () => {
    if (!locationEnabled) {
      await requestLocationPermission();
    } else {
      setLocationEnabled(false);
      setUserLocation(null);
      // Re-search without location
      setPage(1);
      searchProviders();
    }
  };

  const handleFiltersPress = () => {
    navigation.navigate('ProviderFilters', {
      currentFilters: searchParams,
      onApply: (newParams: ProviderSearchParams) => {
        setSearchParams(newParams);
        setPage(1);
      },
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.gray} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, isRTL && styles.rtlText]}
            placeholder={t('customer.searchProviders')}
            placeholderTextColor={colors.gray}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            textAlign={isRTL ? 'right' : 'left'}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setPage(1);
                searchProviders();
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Location Toggle */}
        <TouchableOpacity
          style={[
            styles.iconButton,
            locationEnabled && styles.activeIconButton,
          ]}
          onPress={toggleLocation}
        >
          <Ionicons
            name={locationEnabled ? 'location' : 'location-outline'}
            size={24}
            color={locationEnabled ? colors.primary : colors.gray}
          />
        </TouchableOpacity>

        {/* Filters */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleFiltersPress}
        >
          <Ionicons name="filter" size={24} color={colors.gray} />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'list' && styles.activeViewMode,
          ]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list"
            size={20}
            color={viewMode === 'list' ? colors.primary : colors.gray}
          />
          <Text
            style={[
              styles.viewModeText,
              viewMode === 'list' && styles.activeViewModeText,
            ]}
          >
            {t('customer.listView')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'map' && styles.activeViewMode,
          ]}
          onPress={() => setViewMode('map')}
        >
          <Ionicons
            name="map"
            size={20}
            color={viewMode === 'map' ? colors.primary : colors.gray}
          />
          <Text
            style={[
              styles.viewModeText,
              viewMode === 'map' && styles.activeViewModeText,
            ]}
          >
            {t('customer.mapView')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      {providers.length > 0 && (
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>
            {t('showingResults', { count: providers.length })}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="dark-content" />
      
      {renderHeader()}

      {viewMode === 'list' ? (
        <ProviderList
          providers={providers}
          loading={loading}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          onProviderPress={handleProviderPress}
          currentLocation={userLocation}
          emptyMessage={searchQuery ? t('customer.noProvidersMatchSearch') : undefined}
        />
      ) : (
        <ProviderMapView
          providers={providers}
          loading={loading}
          onProviderPress={handleProviderPress}
          currentLocation={userLocation}
          onRegionChange={(region) => {
            // Could trigger new search based on map movement
          }}
        />
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  rtlText: {
    textAlign: 'right',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconButton: {
    backgroundColor: colors.lightPrimary,
  },
  viewModeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
  },
  activeViewMode: {
    backgroundColor: colors.lightPrimary,
  },
  viewModeText: {
    fontSize: 14,
    color: colors.gray,
  },
  activeViewModeText: {
    color: colors.primary,
    fontWeight: '500',
  },
  resultsCount: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 12,
    color: colors.gray,
  },
});