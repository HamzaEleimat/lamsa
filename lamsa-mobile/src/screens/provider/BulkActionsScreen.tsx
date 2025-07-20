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
  Switch,
  I18nManager,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BulkServiceOperation, ServiceCategory, ServiceTag } from '../../types/service.types';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';

type BulkActionsRouteProp = RouteProp<{
  BulkActions: {
    serviceIds: string[];
    selectedCount: number;
  };
}, 'BulkActions'>;

export default function BulkActionsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<BulkActionsRouteProp>();
  const isRTL = I18nManager.isRTL;

  const { serviceIds, selectedCount } = route.params;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [tags, setTags] = useState<ServiceTag[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<BulkServiceOperation['operation']>('activate');
  const [operationData, setOperationData] = useState<{
    priceAdjustment?: number;
    priceAdjustmentType?: 'fixed' | 'percentage';
    categoryId?: string;
    selectedTags?: string[];
  }>({
    priceAdjustmentType: 'percentage',
    selectedTags: [],
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch(`${API_URL}/api/services/categories`),
        fetch(`${API_URL}/api/services/tags`),
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.data || []);
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData.data || []);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleExecuteBulkOperation = async () => {
    if (!selectedOperation) return;

    // Validation
    if (selectedOperation === 'update_price' && !operationData.priceAdjustment) {
      Alert.alert(t('error'), t('priceAdjustmentRequired'));
      return;
    }

    if (selectedOperation === 'update_category' && !operationData.categoryId) {
      Alert.alert(t('error'), t('categoryRequired'));
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      const bulkOperation: BulkServiceOperation = {
        service_ids: serviceIds,
        operation: selectedOperation,
        data: operationData,
      };

      const response = await fetch(`${API_URL}/api/services/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bulkOperation),
      });

      if (response.ok) {
        Alert.alert(
          t('success'),
          t('bulkOperationSuccess'),
          [
            {
              text: t('ok'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert(t('error'), error.message || t('bulkOperationFailed'));
      }
    } catch (error) {
      console.error('Error executing bulk operation:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOperation = () => {
    const operationName = t(selectedOperation);
    Alert.alert(
      t('confirmAction'),
      t('confirmBulkOperation', { operation: operationName, count: selectedCount }),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('confirm'),
          onPress: handleExecuteBulkOperation,
          style: 'destructive',
        },
      ]
    );
  };

  const toggleTag = (tagId: string) => {
    const currentTags = operationData.selectedTags || [];
    const updatedTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    setOperationData(prev => ({ ...prev, selectedTags: updatedTags }));
  };

  const renderOperationSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('selectOperation')}</Text>
      <View style={styles.operationGrid}>
        {[
          { value: 'activate', icon: 'checkmark-circle', color: colors.success },
          { value: 'deactivate', icon: 'pause-circle', color: colors.warning },
          { value: 'delete', icon: 'trash', color: colors.error },
          { value: 'update_price', icon: 'pricetag', color: colors.primary },
          { value: 'update_category', icon: 'folder', color: colors.secondary },
        ].map(operation => (
          <TouchableOpacity
            key={operation.value}
            style={[
              styles.operationButton,
              selectedOperation === operation.value && styles.selectedOperationButton,
            ]}
            onPress={() => setSelectedOperation(operation.value as any)}
          >
            <Ionicons
              name={operation.icon as any}
              size={24}
              color={selectedOperation === operation.value ? colors.white : operation.color}
            />
            <Text style={[
              styles.operationButtonText,
              selectedOperation === operation.value && styles.selectedOperationButtonText,
            ]}>
              {t(operation.value)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPriceAdjustmentForm = () => {
    if (selectedOperation !== 'update_price') return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('priceAdjustment')}</Text>
        
        <View style={styles.priceAdjustmentContainer}>
          <View style={styles.adjustmentTypeSelector}>
            <TouchableOpacity
              style={[
                styles.adjustmentTypeButton,
                operationData.priceAdjustmentType === 'percentage' && styles.selectedAdjustmentTypeButton,
              ]}
              onPress={() => setOperationData(prev => ({ ...prev, priceAdjustmentType: 'percentage' }))}
            >
              <Text style={[
                styles.adjustmentTypeButtonText,
                operationData.priceAdjustmentType === 'percentage' && styles.selectedAdjustmentTypeButtonText,
              ]}>
                {t('percentage')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.adjustmentTypeButton,
                operationData.priceAdjustmentType === 'fixed' && styles.selectedAdjustmentTypeButton,
              ]}
              onPress={() => setOperationData(prev => ({ ...prev, priceAdjustmentType: 'fixed' }))}
            >
              <Text style={[
                styles.adjustmentTypeButtonText,
                operationData.priceAdjustmentType === 'fixed' && styles.selectedAdjustmentTypeButtonText,
              ]}>
                {t('fixedAmount')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.priceInputContainer}>
            <TextInput
              style={styles.priceInput}
              placeholder={operationData.priceAdjustmentType === 'percentage' ? '10' : '5.00'}
              value={operationData.priceAdjustment?.toString() || ''}
              onChangeText={(text) => setOperationData(prev => ({ 
                ...prev, 
                priceAdjustment: parseFloat(text) || 0 
              }))}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.gray}
            />
            <Text style={styles.priceInputSuffix}>
              {operationData.priceAdjustmentType === 'percentage' ? '%' : t('jod')}
            </Text>
          </View>

          <Text style={styles.priceAdjustmentNote}>
            {operationData.priceAdjustmentType === 'percentage' 
              ? t('percentageAdjustmentNote') 
              : t('fixedAmountAdjustmentNote')
            }
          </Text>
        </View>
      </View>
    );
  };

  const renderCategorySelector = () => {
    if (selectedOperation !== 'update_category') return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('selectNewCategory')}</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={operationData.categoryId}
            onValueChange={(value) => setOperationData(prev => ({ ...prev, categoryId: value }))}
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
    );
  };

  const renderTagsSelector = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('updateTags')} ({t('optional')})</Text>
        <View style={styles.tagsContainer}>
          {tags.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagChip,
                (operationData.selectedTags || []).includes(tag.id) && styles.selectedTagChip,
              ]}
              onPress={() => toggleTag(tag.id)}
            >
              <Text style={[
                styles.tagChipText,
                (operationData.selectedTags || []).includes(tag.id) && styles.selectedTagChipText,
              ]}>
                {i18n.language === 'ar' ? tag.name_ar : tag.name_en}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderOperationSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>{t('operationSummary')}</Text>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>{t('selectedServices')}:</Text>
        <Text style={styles.summaryValue}>{selectedCount}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>{t('operation')}:</Text>
        <Text style={styles.summaryValue}>{t(selectedOperation)}</Text>
      </View>
      
      {selectedOperation === 'update_price' && operationData.priceAdjustment && (
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t('priceAdjustment')}:</Text>
          <Text style={styles.summaryValue}>
            {operationData.priceAdjustment}
            {operationData.priceAdjustmentType === 'percentage' ? '%' : ` ${t('jod')}`}
          </Text>
        </View>
      )}
      
      {selectedOperation === 'update_category' && operationData.categoryId && (
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t('newCategory')}:</Text>
          <Text style={styles.summaryValue}>
            {categories.find(c => c.id === operationData.categoryId)?.name_en || ''}
          </Text>
        </View>
      )}
      
      {operationData.selectedTags && operationData.selectedTags.length > 0 && (
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t('tags')}:</Text>
          <Text style={styles.summaryValue}>
            {operationData.selectedTags.length} {t('selected')}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bulkActions')}</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{selectedCount}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderOperationSelector()}
        {renderPriceAdjustmentForm()}
        {renderCategorySelector()}
        {renderTagsSelector()}
        {renderOperationSummary()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.executeButton, loading && styles.disabledButton]}
          onPress={handleConfirmOperation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.executeButtonText}>{t('executeOperation')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  headerBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  operationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  operationButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    gap: 8,
  },
  selectedOperationButton: {
    backgroundColor: colors.primary,
  },
  operationButtonText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  selectedOperationButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  priceAdjustmentContainer: {
    gap: 16,
  },
  adjustmentTypeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustmentTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
  },
  selectedAdjustmentTypeButton: {
    backgroundColor: colors.primary,
  },
  adjustmentTypeButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedAdjustmentTypeButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
  },
  priceInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.text,
  },
  priceInputSuffix: {
    fontSize: 16,
    color: colors.gray,
    marginLeft: 8,
  },
  priceAdjustmentNote: {
    fontSize: 12,
    color: colors.gray,
    fontStyle: 'italic',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  picker: {
    height: 50,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedTagChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontSize: 12,
    color: colors.text,
  },
  selectedTagChipText: {
    color: colors.white,
  },
  summaryContainer: {
    backgroundColor: colors.lightPrimary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: 'bold',
  },
  executeButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  executeButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: 'bold',
  },
});