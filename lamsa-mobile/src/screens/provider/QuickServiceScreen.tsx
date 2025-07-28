import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  I18nManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { ServiceCategory } from '../../types/service.types';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';

interface QuickServiceData {
  name_en: string;
  name_ar: string;
  category_id: string;
  price: number;
  duration_minutes: number;
  gender_preference: 'unisex' | 'male' | 'female';
}

export default function QuickServiceScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isRTL = I18nManager.isRTL;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [formData, setFormData] = useState<QuickServiceData>({
    name_en: '',
    name_ar: '',
    category_id: '',
    price: 0,
    duration_minutes: 30,
    gender_preference: 'unisex',
  });

  const [recentServices, setRecentServices] = useState<any[]>([]);
  const [quickPresets, setQuickPresets] = useState([
    { name_en: 'Haircut', name_ar: 'قص شعر', duration: 30, price: 15 },
    { name_en: 'Makeup', name_ar: 'مكياج', duration: 60, price: 50 },
    { name_en: 'Manicure', name_ar: 'مانيكير', duration: 45, price: 20 },
    { name_en: 'Facial', name_ar: 'تنظيف بشرة', duration: 60, price: 35 },
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        fetchCategories(),
        fetchRecentServices(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
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

  const fetchRecentServices = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');
      
      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/services?limit=5&sort=created_at&order=desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRecentServices(data.data.services || []);
      }
    } catch (error) {
      console.error('Error fetching recent services:', error);
    }
  };

  const handleCreateService = async () => {
    // Validation
    if (!formData.name_en || !formData.name_ar) {
      Alert.alert(t('error'), t('serviceNameRequired'));
      return;
    }

    if (!formData.category_id) {
      Alert.alert(t('error'), t('categoryRequired'));
      return;
    }

    if (formData.price <= 0) {
      Alert.alert(t('error'), t('validPriceRequired'));
      return;
    }

    if (formData.duration_minutes <= 0) {
      Alert.alert(t('error'), t('validDurationRequired'));
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/api/services`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          category: formData.category_id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          t('success'),
          t('serviceCreated'),
          [
            {
              text: t('createAnother'),
              onPress: () => {
                setFormData({
                  name_en: '',
                  name_ar: '',
                  category_id: formData.category_id,
                  price: 0,
                  duration_minutes: 30,
                  gender_preference: 'unisex',
                });
              },
            },
            {
              text: t('editService'),
              onPress: () => navigation.navigate('ServiceForm', { serviceId: result.data.id }),
            },
            {
              text: t('done'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert(t('error'), error.message || t('failedToCreateService'));
      }
    } catch (error) {
      console.error('Error creating service:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateService = async (serviceId: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/api/services/duplicate/${serviceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          t('success'),
          t('serviceDuplicated'),
          [
            {
              text: t('editService'),
              onPress: () => navigation.navigate('ServiceForm', { serviceId: result.data.id }),
            },
            {
              text: t('done'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(t('error'), t('failedToDuplicate'));
      }
    } catch (error) {
      console.error('Error duplicating service:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleUsePreset = (preset: any) => {
    setFormData(prev => ({
      ...prev,
      name_en: preset.name_en,
      name_ar: preset.name_ar,
      duration_minutes: preset.duration,
      price: preset.price,
    }));
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      // Handle photo capture for service
      Alert.alert(t('info'), t('photoFeatureComingSoon'));
    }
  };

  const renderQuickPresets = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('quickPresets')}</Text>
      <View style={styles.presetsContainer}>
        {quickPresets.map((preset, index) => (
          <TouchableOpacity
            key={index}
            style={styles.presetButton}
            onPress={() => handleUsePreset(preset)}
          >
            <Text style={styles.presetButtonText}>
              {i18n.language === 'ar' ? preset.name_ar : preset.name_en}
            </Text>
            <Text style={styles.presetButtonSubtext}>
              {preset.duration}min • {preset.price} {t('jod')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRecentServices = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('recentServices')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {recentServices.map((service, index) => (
          <TouchableOpacity
            key={index}
            style={styles.recentServiceCard}
            onPress={() => handleDuplicateService(service.id)}
          >
            <Text style={styles.recentServiceName}>
              {i18n.language === 'ar' ? service.name_ar : service.name_en}
            </Text>
            <Text style={styles.recentServiceDetails}>
              {service.price} {t('jod')} • {service.duration_minutes}min
            </Text>
            <View style={styles.duplicateButton}>
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
              <Text style={styles.duplicateButtonText}>{t('duplicate')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('quickServiceCreation')}</Text>
        <TouchableOpacity onPress={handleTakePhoto}>
          <Ionicons name="camera" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderQuickPresets()}
        {recentServices.length > 0 && renderRecentServices()}

        {/* Quick Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createNewService')}</Text>
          
          <View style={styles.formContainer}>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('serviceNameEnglish')} *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name_en}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name_en: text }))}
                  placeholder={t('enterServiceNameEnglish')}
                  placeholderTextColor={colors.gray}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('serviceNameArabic')} *</Text>
                <TextInput
                  style={[styles.textInput, isRTL && styles.rtlText]}
                  value={formData.name_ar}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name_ar: text }))}
                  placeholder={t('enterServiceNameArabic')}
                  placeholderTextColor={colors.gray}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('category')} *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.category_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label={t('selectCategory')} value="" />
                    {categories.map(category => (
                      <Picker.Item
                        key={category.id}
                        label={i18n.language === 'ar' ? category.name_ar : category.name_en}
                        value={category.id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.inputLabel}>{t('price')} ({t('jod')}) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.price.toString()}
                  onChangeText={(text) => setFormData(prev => ({ 
                    ...prev, 
                    price: parseFloat(text) || 0 
                  }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.gray}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.inputLabel}>{t('duration')} ({t('minutes')}) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.duration_minutes.toString()}
                  onChangeText={(text) => setFormData(prev => ({ 
                    ...prev, 
                    duration_minutes: parseInt(text) || 0 
                  }))}
                  placeholder="30"
                  placeholderTextColor={colors.gray}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('genderPreference')}</Text>
                <View style={styles.genderOptions}>
                  {['unisex', 'male', 'female'].map(gender => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.genderOption,
                        formData.gender_preference === gender && styles.selectedGenderOption,
                      ]}
                      onPress={() => setFormData(prev => ({ 
                        ...prev, 
                        gender_preference: gender as any 
                      }))}
                    >
                      <Text style={[
                        styles.genderOptionText,
                        formData.gender_preference === gender && styles.selectedGenderOptionText,
                      ]}>
                        {t(gender)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.advancedButton}
          onPress={() => navigation.navigate('ServiceForm')}
        >
          <Ionicons name="settings-outline" size={20} color={colors.gray} />
          <Text style={styles.advancedButtonText}>{t('advancedOptions')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.createButton, loading && styles.disabledButton]}
          onPress={handleCreateService}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.createButtonText}>{t('createService')}</Text>
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
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  presetButtonSubtext: {
    fontSize: 12,
    color: colors.gray,
  },
  recentServiceCard: {
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    width: 140,
  },
  recentServiceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  recentServiceDetails: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 8,
  },
  duplicateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duplicateButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  formContainer: {
    gap: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  halfWidth: {
    flex: 0.5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
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
  genderOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  selectedGenderOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedGenderOptionText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  advancedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
  },
  advancedButtonText: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: 'bold',
  },
  createButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: 'bold',
  },
});