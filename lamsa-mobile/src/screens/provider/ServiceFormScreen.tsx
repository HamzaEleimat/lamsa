import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
  Image,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  ServiceFormData,
  ServiceCategory,
  ServiceTag,
  ServiceVariation,
  EnhancedService,
} from '../../types/service.types';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';

type ServiceFormRouteProp = RouteProp<{ ServiceForm: { serviceId?: string } }, 'ServiceForm'>;

export default function ServiceFormScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<ServiceFormRouteProp>();
  const isRTL = I18nManager.isRTL;
  const scrollViewRef = useRef<ScrollView>(null);

  const serviceId = route.params?.serviceId;
  const isEditing = !!serviceId;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [availableTags, setAvailableTags] = useState<ServiceTag[]>([]);
  const [formData, setFormData] = useState<ServiceFormData>({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    category_id: '',
    price: 0,
    duration_minutes: 30,
    gender_preference: 'unisex',
    tags: [],
    variations: [],
    image_urls: [],
    requires_consultation: false,
    allow_parallel_booking: false,
    max_parallel_bookings: 1,
    preparation_time_minutes: 0,
    cleanup_time_minutes: 0,
    max_advance_booking_days: 30,
    min_advance_booking_hours: 2,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCategories(),
        fetchTags(),
        serviceId && fetchServiceDetails(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert(t('error'), t('failedToLoadData'));
    } finally {
      setLoading(false);
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

  const fetchTags = async () => {
    try {
      const response = await fetch(`${API_URL}/api/services/tags`);
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchServiceDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/services/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const service: EnhancedService = data.data;
        
        setFormData({
          name_en: service.name_en,
          name_ar: service.name_ar,
          description_en: service.description_en || '',
          description_ar: service.description_ar || '',
          category_id: service.category_id,
          price: service.price,
          duration_minutes: service.duration_minutes,
          gender_preference: service.gender_preference,
          tags: service.tags?.map(tag => tag.id) || [],
          variations: service.variations || [],
          image_urls: service.image_urls || [],
          requires_consultation: service.requires_consultation,
          allow_parallel_booking: service.allow_parallel_booking,
          max_parallel_bookings: service.max_parallel_bookings || 1,
          preparation_time_minutes: service.preparation_time_minutes || 0,
          cleanup_time_minutes: service.cleanup_time_minutes || 0,
          max_advance_booking_days: service.max_advance_booking_days || 30,
          min_advance_booking_hours: service.min_advance_booking_hours || 2,
        });
      }
    } catch (error) {
      console.error('Error fetching service details:', error);
      Alert.alert(t('error'), t('failedToLoadService'));
    }
  };

  const handleSubmit = async () => {
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
      
      const url = isEditing 
        ? `${API_URL}/api/services/${serviceId}`
        : `${API_URL}/api/services`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          category: formData.category_id, // API expects 'category' field
        }),
      });

      if (response.ok) {
        Alert.alert(
          t('success'),
          isEditing ? t('serviceUpdated') : t('serviceCreated'),
          [
            {
              text: t('ok'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert(t('error'), error.message || t('failedToSaveService'));
      }
    } catch (error) {
      console.error('Error saving service:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const newImageUrls = result.assets.map(asset => asset.uri);
      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls!, ...newImageUrls],
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls!.filter((_, i) => i !== index),
    }));
  };

  const addVariation = () => {
    const newVariation: Omit<ServiceVariation, 'id' | 'service_id'> = {
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      price_modifier: 0,
      duration_modifier: 0,
      sort_order: formData.variations.length,
      is_default: false,
      active: true,
    };
    
    setFormData(prev => ({
      ...prev,
      variations: [...prev.variations, newVariation],
    }));
  };

  const updateVariation = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      ),
    }));
  };

  const removeVariation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index),
    }));
  };

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId],
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('basicInformation')}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('serviceNameEnglish')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.name_en}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name_en: text }))}
              placeholder={t('enterServiceNameEnglish')}
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('serviceNameArabic')} *</Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlText]}
              value={formData.name_ar}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name_ar: text }))}
              placeholder={t('enterServiceNameArabic')}
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('descriptionEnglish')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description_en}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description_en: text }))}
              placeholder={t('enterDescriptionEnglish')}
              placeholderTextColor={colors.gray}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('descriptionArabic')}</Text>
            <TextInput
              style={[styles.input, styles.textArea, isRTL && styles.rtlText]}
              value={formData.description_ar}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description_ar: text }))}
              placeholder={t('enterDescriptionArabic')}
              placeholderTextColor={colors.gray}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Category and Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('categoryAndPricing')}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('category')} *</Text>
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

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('price')} ({t('jod')}) *</Text>
              <TextInput
                style={styles.input}
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

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('duration')} ({t('minutes')}) *</Text>
              <TextInput
                style={styles.input}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('genderPreference')}</Text>
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

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tags')}</Text>
          <View style={styles.tagsContainer}>
            {availableTags.map(tag => (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tagChip,
                  formData.tags.includes(tag.id) && styles.selectedTagChip,
                ]}
                onPress={() => toggleTag(tag.id)}
              >
                <Text style={[
                  styles.tagChipText,
                  formData.tags.includes(tag.id) && styles.selectedTagChipText,
                ]}>
                  {i18n.language === 'ar' ? tag.name_ar : tag.name_en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Service Variations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('serviceVariations')}</Text>
            <TouchableOpacity onPress={addVariation}>
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {formData.variations.map((variation, index) => (
            <View key={index} style={styles.variationCard}>
              <View style={styles.variationHeader}>
                <Text style={styles.variationTitle}>
                  {t('variation')} {index + 1}
                </Text>
                <TouchableOpacity onPress={() => removeVariation(index)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>{t('nameEnglish')}</Text>
                  <TextInput
                    style={styles.input}
                    value={variation.name_en}
                    onChangeText={(text) => updateVariation(index, 'name_en', text)}
                    placeholder={`${t('e.g.')} Men's Cut`}
                    placeholderTextColor={colors.gray}
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>{t('nameArabic')}</Text>
                  <TextInput
                    style={[styles.input, isRTL && styles.rtlText]}
                    value={variation.name_ar}
                    onChangeText={(text) => updateVariation(index, 'name_ar', text)}
                    placeholder={`${t('e.g.')} قص رجالي`}
                    placeholderTextColor={colors.gray}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>{t('priceModifier')} ({t('jod')})</Text>
                  <TextInput
                    style={styles.input}
                    value={variation.price_modifier.toString()}
                    onChangeText={(text) => updateVariation(index, 'price_modifier', parseFloat(text) || 0)}
                    placeholder="+5.00"
                    placeholderTextColor={colors.gray}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>{t('durationModifier')} ({t('minutes')})</Text>
                  <TextInput
                    style={styles.input}
                    value={variation.duration_modifier.toString()}
                    onChangeText={(text) => updateVariation(index, 'duration_modifier', parseInt(text) || 0)}
                    placeholder="+15"
                    placeholderTextColor={colors.gray}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('serviceImages')}</Text>
          
          <TouchableOpacity style={styles.imageUploadButton} onPress={handleImagePick}>
            <Ionicons name="camera" size={24} color={colors.primary} />
            <Text style={styles.imageUploadText}>{t('addImages')}</Text>
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {formData.image_urls!.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Advanced Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('advancedSettings')}</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('requiresConsultation')}</Text>
            <Switch
              value={formData.requires_consultation}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                requires_consultation: value 
              }))}
              trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
              thumbColor={formData.requires_consultation ? colors.primary : colors.gray}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('allowParallelBooking')}</Text>
            <Switch
              value={formData.allow_parallel_booking}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                allow_parallel_booking: value 
              }))}
              trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
              thumbColor={formData.allow_parallel_booking ? colors.primary : colors.gray}
            />
          </View>

          {formData.allow_parallel_booking && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('maxParallelBookings')}</Text>
              <TextInput
                style={styles.input}
                value={formData.max_parallel_bookings?.toString()}
                onChangeText={(text) => setFormData(prev => ({ 
                  ...prev, 
                  max_parallel_bookings: parseInt(text) || 1 
                }))}
                placeholder="1"
                placeholderTextColor={colors.gray}
                keyboardType="number-pad"
              />
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('preparationTime')} ({t('minutes')})</Text>
              <TextInput
                style={styles.input}
                value={formData.preparation_time_minutes?.toString()}
                onChangeText={(text) => setFormData(prev => ({ 
                  ...prev, 
                  preparation_time_minutes: parseInt(text) || 0 
                }))}
                placeholder="0"
                placeholderTextColor={colors.gray}
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('cleanupTime')} ({t('minutes')})</Text>
              <TextInput
                style={styles.input}
                value={formData.cleanup_time_minutes?.toString()}
                onChangeText={(text) => setFormData(prev => ({ 
                  ...prev, 
                  cleanup_time_minutes: parseInt(text) || 0 
                }))}
                placeholder="0"
                placeholderTextColor={colors.gray}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? t('updateService') : t('createService')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedTagChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedTagChipText: {
    color: colors.white,
  },
  variationCard: {
    backgroundColor: colors.lightGray,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  variationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  variationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  imageUploadText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  imagesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
});