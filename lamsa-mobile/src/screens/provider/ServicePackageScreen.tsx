import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Switch,
  I18nManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { ServicePackageFormData, EnhancedService } from '../../types/service.types';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';

type ServicePackageRouteProp = RouteProp<{
  ServicePackage: { packageId?: string };
}, 'ServicePackage'>;

export default function ServicePackageScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<ServicePackageRouteProp>();
  const isRTL = I18nManager.isRTL;

  const packageId = route.params?.packageId;
  const isEditing = !!packageId;

  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<EnhancedService[]>([]);
  const [formData, setFormData] = useState<ServicePackageFormData>({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    service_ids: [],
    package_price: 0,
    package_type: 'bundle',
    featured: false,
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [totalOriginalPrice, setTotalOriginalPrice] = useState(0);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    calculateTotalPrice();
  }, [selectedServices, services]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchServices(),
        packageId && fetchPackageDetails(),
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
        `${API_URL}/api/providers/${providerId}/services?active=true`,
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
    }
  };

  const fetchPackageDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/services/packages/${packageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const pkg = data.data;
        
        setFormData({
          name_en: pkg.name_en,
          name_ar: pkg.name_ar,
          description_en: pkg.description_en || '',
          description_ar: pkg.description_ar || '',
          service_ids: pkg.services?.map((s: any) => ({
            service_id: s.service_id,
            quantity: s.quantity,
            sequence_order: s.sequence_order,
            is_optional: s.is_optional,
          })) || [],
          package_price: pkg.package_price,
          package_type: pkg.package_type,
          featured: pkg.featured,
        });
        
        setSelectedServices(pkg.services?.map((s: any) => s.service_id) || []);
      }
    } catch (error) {
      console.error('Error fetching package details:', error);
    }
  };

  const calculateTotalPrice = () => {
    const total = selectedServices.reduce((sum, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return sum + (service?.price || 0);
    }, 0);
    setTotalOriginalPrice(total);
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name_en || !formData.name_ar) {
      Alert.alert(t('common.error'), t('common.packageNameRequired'));
      return;
    }

    if (selectedServices.length === 0) {
      Alert.alert(t('common.error'), t('common.atLeastOneServiceRequired'));
      return;
    }

    if (formData.package_price <= 0) {
      Alert.alert(t('common.error'), t('common.validPackagePriceRequired'));
      return;
    }

    if (formData.package_price >= totalOriginalPrice) {
      Alert.alert(t('common.error'), t('common.packagePriceMustBeLessThanOriginal'));
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const packageData = {
        ...formData,
        service_ids: selectedServices.map(serviceId => ({
          service_id: serviceId,
          quantity: 1,
          sequence_order: selectedServices.indexOf(serviceId),
          is_optional: false,
        })),
      };

      const url = isEditing 
        ? `${API_URL}/api/services/packages/${packageId}`
        : `${API_URL}/api/services/packages`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(packageData),
      });

      if (response.ok) {
        Alert.alert(
          t('common.success'),
          isEditing ? t('common.packageUpdated') : t('common.packageCreated'),
          [
            {
              text: t('common.ok'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert(t('common.error'), error.message || t('common.failedToSavePackage'));
      }
    } catch (error) {
      console.error('Error saving package:', error);
      Alert.alert(t('common.error'), t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const discountPercentage = totalOriginalPrice > 0 
    ? ((totalOriginalPrice - formData.package_price) / totalOriginalPrice * 100)
    : 0;

  const renderServiceItem = ({ item }: { item: EnhancedService }) => {
    const isSelected = selectedServices.includes(item.id);
    const serviceName = i18n.language === 'ar' ? item.name_ar : item.name_en;

    return (
      <TouchableOpacity
        style={[styles.serviceItem, isSelected && styles.selectedServiceItem]}
        onPress={() => handleServiceToggle(item.id)}
      >
        <View style={styles.serviceItemContent}>
          <Text style={styles.serviceItemName}>{serviceName}</Text>
          <Text style={styles.serviceItemPrice}>
            {item.price} {t('common.jod')} • {item.duration_minutes} {t('common.minutes')}
          </Text>
        </View>
        
        <View style={styles.serviceItemCheckbox}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={24}
            color={isSelected ? colors.primary : colors.gray}
          />
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>
          {isEditing ? t('common.editPackage') : t('common.createPackage')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('serviceForm.basicInformation')}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('common.packageNameEnglish')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.name_en}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name_en: text }))}
              placeholder={t('common.enterPackageNameEnglish')}
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('common.packageNameArabic')} *</Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlText]}
              value={formData.name_ar}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name_ar: text }))}
              placeholder={t('common.enterPackageNameArabic')}
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('serviceForm.descriptionEnglish')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description_en}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description_en: text }))}
              placeholder={t('serviceForm.enterDescriptionEnglish')}
              placeholderTextColor={colors.gray}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('serviceForm.descriptionArabic')}</Text>
            <TextInput
              style={[styles.input, styles.textArea, isRTL && styles.rtlText]}
              value={formData.description_ar}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description_ar: text }))}
              placeholder={t('serviceForm.enterDescriptionArabic')}
              placeholderTextColor={colors.gray}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Package Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.packageSettings')}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('common.packageType')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.package_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, package_type: value }))}
                style={styles.picker}
              >
                <Picker.Item label={t('common.bundle')} value="bundle" />
                <Picker.Item label={t('common.subscription')} value="subscription" />
                <Picker.Item label={t('common.promotional')} value="promotional" />
              </Picker>
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('common.featuredPackage')}</Text>
            <Switch
              value={formData.featured}
              onValueChange={(value) => setFormData(prev => ({ ...prev, featured: value }))}
              trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
              thumbColor={formData.featured ? colors.primary : colors.gray}
            />
          </View>
        </View>

        {/* Service Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('common.selectServices')} ({selectedServices.length})
          </Text>
          
          <FlatList
            data={services}
            renderItem={renderServiceItem}
            keyExtractor={item => item.id}
            style={styles.servicesList}
            scrollEnabled={false}
          />
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.pricing')}</Text>
          
          <View style={styles.pricingContainer}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>{t('common.originalPrice')}:</Text>
              <Text style={styles.pricingValue}>
                {totalOriginalPrice.toFixed(2)} {t('common.jod')}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('common.packagePrice')} ({t('common.jod')}) *</Text>
              <TextInput
                style={styles.input}
                value={formData.package_price.toString()}
                onChangeText={(text) => setFormData(prev => ({ 
                  ...prev, 
                  package_price: parseFloat(text) || 0 
                }))}
                placeholder="0.00"
                placeholderTextColor={colors.gray}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>{t('common.discount')}:</Text>
              <Text style={[styles.pricingValue, styles.discountValue]}>
                {discountPercentage.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>{t('common.savings')}:</Text>
              <Text style={[styles.pricingValue, styles.savingsValue]}>
                {(totalOriginalPrice - formData.package_price).toFixed(2)} {t('common.jod')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? t('common.updatePackage') : t('common.createPackage')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.white,
    marginBottom: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rtlText: {
    textAlign: 'right',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text,
  },
  servicesList: {
    maxHeight: 300,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
    marginBottom: 8,
  },
  selectedServiceItem: {
    backgroundColor: colors.lightPrimary,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  serviceItemContent: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  serviceItemPrice: {
    fontSize: 14,
    color: colors.gray,
  },
  serviceItemCheckbox: {
    marginLeft: 12,
  },
  pricingContainer: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 16,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 16,
    color: colors.text,
  },
  pricingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  discountValue: {
    color: colors.primary,
  },
  savingsValue: {
    color: colors.success,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});