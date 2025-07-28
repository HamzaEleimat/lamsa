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
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialTopTabBar, createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  EnhancedService, 
  ServiceFilters, 
  ServiceCategory,
  BulkServiceOperation,
  ServiceTag
} from '../../types/service.types';
import { colors } from '../../constants/colors';
import { serviceManagementService } from '../../services/serviceManagementService';
import { useAuth } from '../../contexts/AuthContext';
import ServiceCard from '../../components/service/ServiceCard';
import ServiceFiltersModal from '../../components/service/ServiceFilters';

const Tab = createMaterialTopTabNavigator();

export default function ServiceListScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = I18nManager.isRTL;

  const [services, setServices] = useState<EnhancedService[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [tags, setTags] = useState<ServiceTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<ServiceFilters>({
    search: '',
    category_id: '',
    status: 'all',
    price_range: [0, 1000],
    tags: [],
    gender_preference: 'all',
    sort_by: 'name',
    sort_order: 'asc',
  });
  const [quickActionVisible, setQuickActionVisible] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        fetchServices(),
        fetchPackages(),
        fetchCategories(),
        fetchTags(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      if (!user?.id) return;
      
      const providerServices = await serviceManagementService.getProviderServices(user.id);
      setServices(providerServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert(t('common.error'), t('serviceManagement.failedToLoadServices'));
    }
  };

  const fetchPackages = async () => {
    try {
      // TODO: Implement package fetching from Supabase
      // For now, packages functionality will be added later
      setPackages([]);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const categories = await serviceManagementService.getCategories();
      setCategories(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const tags = await serviceManagementService.getTags();
      setTags(tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleBulkOperation = async (operation: BulkServiceOperation['operation']) => {
    if (selectedServices.length === 0) {
      Alert.alert(t('common.error'), t('serviceManagement.noServicesSelected'));
      return;
    }

    try {
      // TODO: Implement bulk operations in serviceManagementService
      // For now, we'll process them one by one
      for (const serviceId of selectedServices) {
        if (operation === 'activate' || operation === 'deactivate') {
          const service = services.find(s => s.id === serviceId);
          if (service) {
            await serviceManagementService.updateService(serviceId, {
              ...service,
              active: operation === 'activate'
            });
          }
        } else if (operation === 'delete') {
          await serviceManagementService.deleteService(serviceId);
        }
      }
      
      Alert.alert(t('common.success'), t('serviceManagement.bulkOperationSuccess'));
      setBulkMode(false);
      setSelectedServices([]);
      await fetchServices();
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      Alert.alert(t('common.error'), t('common.somethingWentWrong'));
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
    <ServiceCard
      service={item}
      onPress={() => navigation.navigate('ServiceForm', { serviceId: item.id })}
      onQuickToggle={() => handleQuickToggle(item.id)}
      onEdit={() => navigation.navigate('ServiceForm', { serviceId: item.id })}
      onDuplicate={() => handleDuplicateService(item.id)}
      onDelete={() => handleDeleteService(item.id)}
      bulkMode={bulkMode}
      isSelected={selectedServices.includes(item.id)}
      onToggleSelection={() => toggleServiceSelection(item.id)}
      showAnalytics={true}
    />
  );

  const handleDuplicateService = async (serviceId: string) => {
    try {
      const service = services.find(s => s.id === serviceId);
      if (!service || !user?.id) return;

      // Create a duplicate with a new name
      const duplicatedService = {
        ...service,
        name_en: `${service.name_en} (Copy)`,
        name_ar: `${service.name_ar} (نسخة)`,
        active: false // Start as inactive
      };

      await serviceManagementService.createService(user.id, duplicatedService);
      Alert.alert(t('common.success'), t('serviceManagement.serviceDuplicated'));
      await fetchServices();
    } catch (error) {
      console.error('Error duplicating service:', error);
      Alert.alert(t('common.error'), t('common.somethingWentWrong'));
    }
  };

  const handleQuickToggle = async (serviceId: string) => {
    try {
      const service = services.find(s => s.id === serviceId);
      if (!service) return;

      await serviceManagementService.updateService(serviceId, {
        ...service,
        active: !service.active
      });

      setServices(prev => prev.map(s => 
        s.id === serviceId ? { ...s, active: !s.active } : s
      ));
    } catch (error) {
      console.error('Error toggling service:', error);
      Alert.alert(t('common.error'), t('common.somethingWentWrong'));
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    Alert.alert(
      t('common.confirmDelete'),
      t('common.deleteServiceConfirmation'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await serviceManagementService.deleteService(serviceId);
              setServices(prev => prev.filter(s => s.id !== serviceId));
              Alert.alert(t('common.success'), t('serviceManagement.serviceDeleted'));
            } catch (error) {
              console.error('Error deleting service:', error);
              Alert.alert(t('common.error'), t('common.somethingWentWrong'));
            }
          },
        },
      ]
    );
  };

  const handleFiltersChange = (newFilters: ServiceFilters) => {
    setFilters(newFilters);
    setSearchQuery(newFilters.search || '');
    setSelectedCategory(newFilters.category_id || null);
  };

  const handleBulkActions = () => {
    if (selectedServices.length === 0) {
      Alert.alert(t('common.error'), t('serviceManagement.noServicesSelected'));
      return;
    }
    
    // TODO: Implement BulkActions screen
    console.log('Navigate to BulkActions with serviceIds:', selectedServices);
    // navigation.navigate('BulkActions', {
    //   serviceIds: selectedServices,
    //   selectedCount: selectedServices.length,
    // });
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
            <Text style={styles.emptyText}>{t('serviceManagement.noServicesFound')}</Text>
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
          onPress={() => {
            // TODO: Implement PackageForm screen
            console.log('Navigate to PackageForm with packageId:', item.id);
          }}
        >
          <View style={styles.packageHeader}>
            <Text style={styles.packageName}>
              {i18n.language === 'ar' ? item.name_ar : item.name_en}
            </Text>
            {item.featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>{t('common.featured')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.packageDetails}>
            {t('serviceManagement.originalPrice')}: <Text style={styles.strikethrough}>{item.original_price} {t('common.jod')}</Text>
          </Text>
          <Text style={styles.packagePrice}>
            {t('serviceManagement.packagePrice')}: {item.package_price} {t('common.jod')} ({item.discount_percentage.toFixed(0)}% {t('serviceManagement.off')})
          </Text>
          <Text style={styles.packageServices}>
            {item.package_services?.length || 0} {t('common.services')} • {item.total_duration_minutes} {t('common.minutes')}
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
          <Text style={styles.emptyText}>{t('serviceManagement.noPackagesFound')}</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              // TODO: Implement PackageForm screen
              console.log('Navigate to PackageForm for new package');
            }}
          >
            <Text style={styles.createButtonText}>{t('serviceManagement.createFirstPackage')}</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.gray} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('serviceManagement.searchServices')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.gray}
            />
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => setFiltersVisible(true)}
            >
              <Ionicons name="filter-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => {
                // TODO: Implement ServiceAnalytics screen
                console.log('Navigate to ServiceAnalytics');
              }}
            >
              <Ionicons name="analytics-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => {
                // TODO: Implement ServiceTemplates screen
                console.log('Navigate to ServiceTemplates');
              }}
            >
              <Ionicons name="library-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
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
            {selectedServices.length} {t('common.selected')}
          </Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={handleBulkActions}
            >
              <Ionicons name="cog-outline" size={20} color={colors.primary} />
              <Text style={styles.bulkButtonText}>{t('common.bulkActions')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={() => {
                setBulkMode(false);
                setSelectedServices([]);
              }}
            >
              <Ionicons name="close" size={20} color={colors.error} />
              <Text style={styles.bulkButtonText}>{t('common.cancel')}</Text>
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
          options={{ title: t('serviceManagement.activeServices') }}
        >
          {() => <ServicesTab status="active" />}
        </Tab.Screen>
        <Tab.Screen 
          name="Inactive" 
          options={{ title: t('serviceManagement.inactiveServices') }}
        >
          {() => <ServicesTab status="inactive" />}
        </Tab.Screen>
        <Tab.Screen 
          name="Packages" 
          component={PackagesTab}
          options={{ title: t('common.packages') }}
        />
      </Tab.Navigator>

      {/* Enhanced FAB */}
      {!bulkMode && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.secondaryFab}
            onPress={() => {
              // TODO: Implement QuickService screen
              console.log('Navigate to QuickService');
            }}
          >
            <Ionicons name="flash" size={20} color={colors.white} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('ServiceForm')}
          >
            <Ionicons name="add" size={28} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Service Filters Modal */}
      <ServiceFiltersModal
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        categories={categories}
        tags={tags}
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.lightGray,
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
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  fab: {
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
  secondaryFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});