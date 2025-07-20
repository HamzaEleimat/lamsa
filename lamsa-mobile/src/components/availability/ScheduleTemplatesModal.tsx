import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  I18nManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { format, setHours, setMinutes } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';

interface ScheduleTemplate {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  type: 'preset' | 'custom';
  category: 'standard' | 'ramadan' | 'weekend' | 'mobile' | 'seasonal';
  schedule: {
    [key: string]: { // day of week (0-6)
      isWorkingDay: boolean;
      startTime?: string; // HH:mm format
      endTime?: string;
      breaks: Array<{
        startTime: string;
        endTime: string;
        type: 'prayer' | 'meal' | 'rest';
        title: string;
      }>;
    };
  };
  prayerTimes?: boolean;
  ramadanAware?: boolean;
  icon: string;
  color: string;
  popular?: boolean;
}

interface ScheduleTemplatesModalProps {
  visible: boolean;
  onClose: () => void;
  onTemplateSelect: (template: ScheduleTemplate) => void;
  onCopyDay: (fromDay: number, toDays: number[]) => void;
  currentSchedule?: any;
}

export default function ScheduleTemplatesModal({
  visible,
  onClose,
  onTemplateSelect,
  onCopyDay,
  currentSchedule,
}: ScheduleTemplatesModalProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;

  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('standard');
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'copy'>('presets');

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPresetTemplates(),
        loadCustomTemplates(),
      ]);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPresetTemplates = async () => {
    // Preset templates for Jordan beauty market
    const presetTemplates: ScheduleTemplate[] = [
      {
        id: 'standard-salon',
        name: 'Standard Salon Hours',
        name_ar: 'ساعات الصالون العادية',
        description: 'Monday to Saturday, 9 AM to 6 PM',
        description_ar: 'من الاثنين إلى السبت، من 9 صباحاً إلى 6 مساءً',
        type: 'preset',
        category: 'standard',
        schedule: {
          0: { isWorkingDay: false, breaks: [] }, // Sunday
          1: { // Monday
            isWorkingDay: true,
            startTime: '09:00',
            endTime: '18:00',
            breaks: [
              {
                startTime: '12:00',
                endTime: '12:30',
                type: 'prayer',
                title: 'Dhuhr Prayer',
              },
              {
                startTime: '13:00',
                endTime: '14:00',
                type: 'meal',
                title: 'Lunch Break',
              },
            ],
          },
          2: { isWorkingDay: true, startTime: '09:00', endTime: '18:00', breaks: [] },
          3: { isWorkingDay: true, startTime: '09:00', endTime: '18:00', breaks: [] },
          4: { isWorkingDay: true, startTime: '09:00', endTime: '18:00', breaks: [] },
          5: { // Friday
            isWorkingDay: true,
            startTime: '09:00',
            endTime: '18:00',
            breaks: [
              {
                startTime: '12:00',
                endTime: '14:00',
                type: 'prayer',
                title: 'Jumu\'ah Prayer',
              },
            ],
          },
          6: { isWorkingDay: true, startTime: '09:00', endTime: '18:00', breaks: [] },
        },
        prayerTimes: true,
        icon: 'business',
        color: colors.primary,
        popular: true,
      },
      {
        id: 'weekend-warrior',
        name: 'Weekend Warrior',
        name_ar: 'محارب نهاية الأسبوع',
        description: 'Thursday to Saturday only',
        description_ar: 'من الخميس إلى السبت فقط',
        type: 'preset',
        category: 'weekend',
        schedule: {
          0: { isWorkingDay: false, breaks: [] },
          1: { isWorkingDay: false, breaks: [] },
          2: { isWorkingDay: false, breaks: [] },
          3: { isWorkingDay: false, breaks: [] },
          4: { isWorkingDay: true, startTime: '16:00', endTime: '22:00', breaks: [] },
          5: { isWorkingDay: true, startTime: '09:00', endTime: '22:00', breaks: [] },
          6: { isWorkingDay: true, startTime: '09:00', endTime: '18:00', breaks: [] },
        },
        prayerTimes: true,
        icon: 'calendar',
        color: colors.secondary,
      },
      {
        id: 'ramadan-schedule',
        name: 'Ramadan Schedule',
        name_ar: 'جدول رمضان',
        description: 'Fasting-friendly hours with iftar break',
        description_ar: 'ساعات متوافقة مع الصيام مع فترة الإفطار',
        type: 'preset',
        category: 'ramadan',
        schedule: {
          0: { isWorkingDay: false, breaks: [] },
          1: {
            isWorkingDay: true,
            startTime: '10:00',
            endTime: '15:00',
            breaks: [
              {
                startTime: '12:30',
                endTime: '13:00',
                type: 'prayer',
                title: 'Dhuhr Prayer',
              },
            ],
          },
          2: { isWorkingDay: true, startTime: '10:00', endTime: '15:00', breaks: [] },
          3: { isWorkingDay: true, startTime: '10:00', endTime: '15:00', breaks: [] },
          4: { isWorkingDay: true, startTime: '10:00', endTime: '15:00', breaks: [] },
          5: {
            isWorkingDay: true,
            startTime: '10:00',
            endTime: '15:00',
            breaks: [
              {
                startTime: '12:00',
                endTime: '14:00',
                type: 'prayer',
                title: 'Jumu\'ah Prayer',
              },
            ],
          },
          6: { isWorkingDay: true, startTime: '19:30', endTime: '23:00', breaks: [] },
        },
        ramadanAware: true,
        prayerTimes: true,
        icon: 'moon',
        color: colors.warning,
      },
      {
        id: 'mobile-service',
        name: 'Mobile Service',
        name_ar: 'خدمة متنقلة',
        description: 'Flexible hours for home visits',
        description_ar: 'ساعات مرنة للزيارات المنزلية',
        type: 'preset',
        category: 'mobile',
        schedule: {
          0: { isWorkingDay: true, startTime: '10:00', endTime: '20:00', breaks: [] },
          1: { isWorkingDay: true, startTime: '08:00', endTime: '20:00', breaks: [] },
          2: { isWorkingDay: true, startTime: '08:00', endTime: '20:00', breaks: [] },
          3: { isWorkingDay: true, startTime: '08:00', endTime: '20:00', breaks: [] },
          4: { isWorkingDay: true, startTime: '08:00', endTime: '20:00', breaks: [] },
          5: {
            isWorkingDay: true,
            startTime: '08:00',
            endTime: '20:00',
            breaks: [
              {
                startTime: '12:00',
                endTime: '14:00',
                type: 'prayer',
                title: 'Jumu\'ah Prayer',
              },
            ],
          },
          6: { isWorkingDay: true, startTime: '08:00', endTime: '20:00', breaks: [] },
        },
        prayerTimes: true,
        icon: 'car',
        color: colors.success,
      },
      {
        id: 'part-time',
        name: 'Part Time',
        name_ar: 'دوام جزئي',
        description: 'Mornings only, perfect for students',
        description_ar: 'الصباح فقط، مثالي للطلاب',
        type: 'preset',
        category: 'standard',
        schedule: {
          0: { isWorkingDay: false, breaks: [] },
          1: { isWorkingDay: true, startTime: '09:00', endTime: '13:00', breaks: [] },
          2: { isWorkingDay: true, startTime: '09:00', endTime: '13:00', breaks: [] },
          3: { isWorkingDay: true, startTime: '09:00', endTime: '13:00', breaks: [] },
          4: { isWorkingDay: true, startTime: '09:00', endTime: '13:00', breaks: [] },
          5: { isWorkingDay: false, breaks: [] },
          6: { isWorkingDay: true, startTime: '09:00', endTime: '13:00', breaks: [] },
        },
        prayerTimes: true,
        icon: 'school',
        color: colors.lightPrimary,
      },
    ];

    setTemplates(presetTemplates);
  };

  const loadCustomTemplates = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/schedule-templates`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCustomTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading custom templates:', error);
    }
  };

  const handleTemplateSelect = (template: ScheduleTemplate) => {
    Alert.alert(
      t('applyTemplate'),
      t('applyTemplateConfirmation', { name: i18n.language === 'ar' ? template.name_ar : template.name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('apply'),
          onPress: () => {
            onTemplateSelect(template);
            onClose();
          },
        },
      ]
    );
  };

  const saveAsTemplate = async () => {
    if (!currentSchedule) {
      Alert.alert(t('error'), t('noScheduleToSave'));
      return;
    }

    Alert.prompt(
      t('saveTemplate'),
      t('enterTemplateName'),
      async (name) => {
        if (!name) return;

        try {
          const token = await AsyncStorage.getItem('authToken');
          const providerId = await AsyncStorage.getItem('providerId');

          const template = {
            name,
            name_ar: name, // In production, should ask for Arabic name too
            description: 'Custom template',
            description_ar: 'قالب مخصص',
            schedule: currentSchedule,
            type: 'custom',
            category: 'standard',
            icon: 'bookmark',
            color: colors.primary,
          };

          const response = await fetch(
            `${API_URL}/api/providers/${providerId}/schedule-templates`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(template),
            }
          );

          if (response.ok) {
            Alert.alert(t('success'), t('templateSaved'));
            loadCustomTemplates();
          } else {
            Alert.alert(t('error'), t('failedToSaveTemplate'));
          }
        } catch (error) {
          console.error('Error saving template:', error);
          Alert.alert(t('error'), t('somethingWentWrong'));
        }
      }
    );
  };

  const renderTemplate = (template: ScheduleTemplate) => {
    const templateName = i18n.language === 'ar' ? template.name_ar : template.name;
    const templateDescription = i18n.language === 'ar' ? template.description_ar : template.description;

    return (
      <TouchableOpacity
        key={template.id}
        style={[
          styles.templateCard,
          template.popular && styles.popularTemplate,
        ]}
        onPress={() => handleTemplateSelect(template)}
      >
        {template.popular && (
          <View style={styles.popularBadge}>
            <Ionicons name="star" size={12} color={colors.white} />
            <Text style={styles.popularText}>{t('popular')}</Text>
          </View>
        )}

        <View style={styles.templateHeader}>
          <View style={[styles.templateIcon, { backgroundColor: template.color }]}>
            <Ionicons name={template.icon as any} size={24} color={colors.white} />
          </View>
          <View style={styles.templateInfo}>
            <Text style={styles.templateName}>{templateName}</Text>
            <Text style={styles.templateDescription}>{templateDescription}</Text>
          </View>
        </View>

        <View style={styles.templateSchedule}>
          {Object.entries(template.schedule).map(([dayIndex, daySchedule]) => {
            const dayName = format(new Date(2024, 0, parseInt(dayIndex)), 'EEE', { locale });
            return (
              <View key={dayIndex} style={styles.dayPreview}>
                <Text style={styles.dayName}>{dayName}</Text>
                {daySchedule.isWorkingDay ? (
                  <Text style={styles.dayHours}>
                    {daySchedule.startTime} - {daySchedule.endTime}
                  </Text>
                ) : (
                  <Text style={styles.dayOff}>{t('off')}</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.templateFeatures}>
          {template.prayerTimes && (
            <View style={styles.featureBadge}>
              <Ionicons name="moon" size={12} color={colors.secondary} />
              <Text style={styles.featureText}>{t('prayerTimes')}</Text>
            </View>
          )}
          {template.ramadanAware && (
            <View style={styles.featureBadge}>
              <Ionicons name="calendar" size={12} color={colors.warning} />
              <Text style={styles.featureText}>{t('ramadanAware')}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCopyOptions = () => {
    const days = [
      { index: 1, name: t('monday'), name_ar: 'الاثنين' },
      { index: 2, name: t('tuesday'), name_ar: 'الثلاثاء' },
      { index: 3, name: t('wednesday'), name_ar: 'الأربعاء' },
      { index: 4, name: t('thursday'), name_ar: 'الخميس' },
      { index: 5, name: t('friday'), name_ar: 'الجمعة' },
      { index: 6, name: t('saturday'), name_ar: 'السبت' },
      { index: 0, name: t('sunday'), name_ar: 'الأحد' },
    ];

    return (
      <View style={styles.copyOptionsContainer}>
        <Text style={styles.sectionTitle}>{t('copyDaySchedule')}</Text>
        
        {days.map(day => (
          <View key={day.index} style={styles.copyOption}>
            <Text style={styles.copyOptionLabel}>
              {t('copy')} {i18n.language === 'ar' ? day.name_ar : day.name}
            </Text>
            
            <View style={styles.copyButtons}>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  const weekdays = [1, 2, 3, 4, 5]; // Mon-Fri
                  onCopyDay(day.index, weekdays.filter(d => d !== day.index));
                  onClose();
                }}
              >
                <Text style={styles.copyButtonText}>{t('toWeekdays')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  const allDays = [0, 1, 2, 3, 4, 5, 6];
                  onCopyDay(day.index, allDays.filter(d => d !== day.index));
                  onClose();
                }}
              >
                <Text style={styles.copyButtonText}>{t('toAllDays')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const categories = [
    { key: 'standard', label: t('standard'), icon: 'business' },
    { key: 'ramadan', label: t('ramadan'), icon: 'moon' },
    { key: 'weekend', label: t('weekend'), icon: 'calendar' },
    { key: 'mobile', label: t('mobile'), icon: 'car' },
  ];

  const filteredTemplates = templates.filter(t => t.category === selectedCategory);

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('scheduleTemplates')}</Text>
          <TouchableOpacity onPress={saveAsTemplate}>
            <Ionicons name="bookmark" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {[
            { key: 'presets', label: t('presets'), icon: 'library' },
            { key: 'custom', label: t('custom'), icon: 'bookmark' },
            { key: 'copy', label: t('copy'), icon: 'copy' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.key ? colors.primary : colors.gray}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'presets' && (
            <>
              {/* Category Filter */}
              <View style={styles.categoryFilter}>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category.key}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category.key && styles.selectedCategory,
                    ]}
                    onPress={() => setSelectedCategory(category.key)}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={20}
                      color={selectedCategory === category.key ? colors.white : colors.primary}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === category.key && styles.selectedCategoryText,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Templates */}
              <View style={styles.templatesContainer}>
                {filteredTemplates.map(renderTemplate)}
              </View>
            </>
          )}

          {activeTab === 'custom' && (
            <View style={styles.templatesContainer}>
              {customTemplates.length > 0 ? (
                customTemplates.map(renderTemplate)
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="bookmark-outline" size={48} color={colors.gray} />
                  <Text style={styles.emptyText}>{t('noCustomTemplates')}</Text>
                  <Text style={styles.emptySubtext}>{t('saveCurrentAsTemplate')}</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'copy' && renderCopyOptions()}
        </ScrollView>
      </View>
    </Modal>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.gray,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  categoryFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedCategory: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.primary,
  },
  selectedCategoryText: {
    color: colors.white,
  },
  templatesContainer: {
    gap: 16,
  },
  templateCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  popularTemplate: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: colors.gray,
  },
  templateSchedule: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dayPreview: {
    alignItems: 'center',
    minWidth: 60,
  },
  dayName: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 4,
  },
  dayHours: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '500',
  },
  dayOff: {
    fontSize: 10,
    color: colors.error,
    fontStyle: 'italic',
  },
  templateFeatures: {
    flexDirection: 'row',
    gap: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  featureText: {
    fontSize: 10,
    color: colors.text,
  },
  copyOptionsContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  copyOption: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyOptionLabel: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  copyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
});