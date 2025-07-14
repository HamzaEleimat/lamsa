import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  I18nManager,
  RefreshControl,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { MaterialTopTabBar, createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  EnhancedService, 
  ServiceFilters, 
  ServiceCategory,
  BulkServiceOperation 
} from '../../types/service.types';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';

const Tab = createMaterialTopTabNavigator();

export default function ServiceListScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isRTL = I18nManager.isRTL;

  const [services, setServices] = useState<EnhancedService[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        fetchServices(),
        fetchPackages(),
        fetchCategories(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');
      
      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/services?includeInactive=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setServices(data.data.services || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert(t('error'), t('failedToLoadServices'));
    }
  };

  const fetchPackages = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');
      
      const response = await fetch(
        `${API_URL}/api/services/packages/${providerId}?includeInactive=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPackages(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
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

  const handleBulkOperation = async (operation: BulkServiceOperation['operation']) => {
    if (selectedServices.length === 0) {
      Alert.alert(t('error'), t('noServicesSelected'));
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/api/services/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_ids: selectedServices,
          operation,
        }),
      });

      if (response.ok) {
        Alert.alert(t('success'), t('bulkOperationSuccess'));
        setBulkMode(false);
        setSelectedServices([]);
        await fetchServices();
      } else {
        Alert.alert(t('error'), t('bulkOperationFailed'));
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    }
  };

  const toggleServiceSelection = (serviceId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = searchQuery === '' || 
        service.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.name_ar.includes(searchQuery);
      
      const matchesCategory = !selectedCategory || service.category_id === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, selectedCategory]);

  const activeServices = filteredServices.filter(s => s.active);
  const inactiveServices = filteredServices.filter(s => !s.active);

  const renderServiceItem = ({ item }: { item: EnhancedService }) => (
    <TouchableOpacity
      style={[
        styles.serviceCard,
        bulkMode && selectedServices.includes(item.id) && styles.selectedCard
      ]}
      onPress={() => {
        if (bulkMode) {
          toggleServiceSelection(item.id);
        } else {
          navigation.navigate('ServiceForm', { serviceId: item.id });
        }
      }}
      onLongPress={() => {
        if (!bulkMode) {
          setBulkMode(true);
          toggleServiceSelection(item.id);
        }
      }}
    >
      {bulkMode && (
        <View style={styles.checkboxContainer}>
          <Ionicons
            name={selectedServices.includes(item.id) ? 'checkbox' : 'square-outline'}
            size={24}
            color={colors.primary}
          />
        </View>
      )}
      
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>
          {i18n.language === 'ar' ? item.name_ar : item.name_en}
        </Text>
        <Text style={styles.serviceDetails}>
          {t('price')}: {item.price} {t('jod')} • {t('duration')}: {item.duration_minutes} {t('minutes')}
        </Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: tag.color || colors.lightGray }]}>
                <Text style={styles.tagText}>
                  {i18n.language === 'ar' ? tag.name_ar : tag.name_en}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.serviceActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ServiceForm', { serviceId: item.id })}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDuplicateService(item.id)}
        >
          <Ionicons name="copy-outline" size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const handleDuplicateService = async (serviceId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/api/services/duplicate/${serviceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert(t('success'), t('serviceDuplicated'));
        await fetchServices();
      } else {
        Alert.alert(t('error'), t('failedToDuplicate'));
      }
    } catch (error) {
      console.error('Error duplicating service:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    }
  };

  const ServicesTab = ({ status }: { status: 'active' | 'inactive' }) => {
    const data = status === 'active' ? activeServices : inactiveServices;
    
    return (
      <FlatList
        data={data}
        renderItem={renderServiceItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={48} color={colors.gray} />
            <Text style={styles.emptyText}>{t('noServicesFound')}</Text>
          </View>
        }
      />
    );
  };

  const PackagesTab = () => (
    <FlatList
      data={packages}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.packageCard}
          onPress={() => navigation.navigate('PackageForm', { packageId: item.id })}
        >
          <View style={styles.packageHeader}>
            <Text style={styles.packageName}>
              {i18n.language === 'ar' ? item.name_ar : item.name_en}
            </Text>
            {item.featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>{t('featured')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.packageDetails}>
            {t('originalPrice')}: <Text style={styles.strikethrough}>{item.original_price} {t('jod')}</Text>
          </Text>
          <Text style={styles.packagePrice}>
            {t('packagePrice')}: {item.package_price} {t('jod')} ({item.discount_percentage.toFixed(0)}% {t('off')})
          </Text>
          <Text style={styles.packageServices}>
            {item.package_services?.length || 0} {t('services')} • {item.total_duration_minutes} {t('minutes')}
          </Text>
        </TouchableOpacity>
      )}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="gift-outline" size={48} color={colors.gray} />
          <Text style={styles.emptyText}>{t('noPackagesFound')}</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('PackageForm')}
          >
            <Text style={styles.createButtonText}>{t('createFirstPackage')}</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchServices')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.gray}
          />
        </View>
        
        {/* Category Filter */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, name_en: 'All', name_ar: 'الكل' }, ...categories]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item.id && styles.selectedCategoryChip
              ]}
              onPress={() => setSelectedCategory(item.id)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === item.id && styles.selectedCategoryChipText
              ]}>
                {i18n.language === 'ar' ? item.name_ar : item.name_en}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id || 'all'}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      {/* Bulk Actions */}
      {bulkMode && (
        <View style={styles.bulkActionsContainer}>
          <Text style={styles.bulkText}>
            {selectedServices.length} {t('selected')}
          </Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={() => handleBulkOperation('activate')}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <Text style={styles.bulkButtonText}>{t('activate')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={() => handleBulkOperation('deactivate')}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.warning} />
              <Text style={styles.bulkButtonText}>{t('deactivate')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={() => {
                setBulkMode(false);
                setSelectedServices([]);
              }}
            >
              <Ionicons name="close" size={20} color={colors.error} />
              <Text style={styles.bulkButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs */}
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: styles.tabLabel,
          tabBarIndicatorStyle: styles.tabIndicator,
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tab.Screen 
          name="Active" 
          options={{ title: t('activeServices') }}
        >
          {() => <ServicesTab status="active" />}
        </Tab.Screen>
        <Tab.Screen 
          name="Inactive" 
          options={{ title: t('inactiveServices') }}
        >
          {() => <ServicesTab status="inactive" />}
        </Tab.Screen>
        <Tab.Screen 
          name="Packages" 
          component={PackagesTab}
          options={{ title: t('packages') }}
        />
      </Tab.Navigator>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ServiceForm')}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
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
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
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
  categoriesContainer: {
    paddingVertical: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedCategoryChipText: {
    color: colors.white,
  },
  bulkActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.lightPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bulkText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bulkButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  tabBar: {
    backgroundColor: colors.white,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabIndicator: {
    backgroundColor: colors.primary,
    height: 3,
  },
  listContainer: {
    padding: 16,
  },
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  serviceDetails: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.text,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  packageCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  featuredBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: 'bold',
  },
  packageDetails: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  packageServices: {
    fontSize: 14,
    color: colors.gray,
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
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});