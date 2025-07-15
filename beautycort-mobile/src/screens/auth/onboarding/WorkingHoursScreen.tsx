/**
 * @file WorkingHoursScreen.tsx
 * @description Provider onboarding screen for configuring business working hours and availability
 * @author BeautyCort Development Team
 * @date Created: 2025-01-14
 * @copyright BeautyCort 2025
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  Switch,
  Chip,
  Portal,
  Dialog,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import i18n, { isRTL } from '../../../i18n';
import ProgressIndicator from '../../../components/onboarding/ProgressIndicator';
import { ProviderOnboardingStackParamList } from '../../../navigation/ProviderOnboardingNavigator';
import { ProviderOnboardingService } from '../../../services/ProviderOnboardingService';
import { BusinessHours, BusinessType } from '../../../types';

type WorkingHoursNavigationProp = NativeStackNavigationProp<
  ProviderOnboardingStackParamList,
  'WorkingHours'
>;

type WorkingHoursRouteProp = RouteProp<
  ProviderOnboardingStackParamList,
  'WorkingHours'
>;

interface Props {
  navigation: WorkingHoursNavigationProp;
  route: WorkingHoursRouteProp;
}

interface DaySchedule extends BusinessHours {
  dayName: string;
  dayNameAr: string;
}

const DAYS_OF_WEEK = [
  { dayOfWeek: 0, name: 'Sunday', nameAr: 'الأحد' },
  { dayOfWeek: 1, name: 'Monday', nameAr: 'الاثنين' },
  { dayOfWeek: 2, name: 'Tuesday', nameAr: 'الثلاثاء' },
  { dayOfWeek: 3, name: 'Wednesday', nameAr: 'الأربعاء' },
  { dayOfWeek: 4, name: 'Thursday', nameAr: 'الخميس' },
  { dayOfWeek: 5, name: 'Friday', nameAr: 'الجمعة' },
  { dayOfWeek: 6, name: 'Saturday', nameAr: 'السبت' },
];

const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00',
];

const QUICK_PRESETS = [
  {
    name: 'Salon Standard',
    nameAr: 'نموذجي الصالون',
    schedule: {
      opening: '09:00',
      closing: '20:00',
      breakStart: '13:00',
      breakEnd: '14:30',
      workDays: [0, 1, 2, 3, 4, 6], // Sunday to Thursday + Saturday
    },
  },
  {
    name: 'Mobile Service',
    nameAr: 'خدمة متنقلة',
    schedule: {
      opening: '10:00',
      closing: '18:00',
      workDays: [0, 1, 2, 3, 4, 6], // Sunday to Thursday + Saturday
    },
  },
  {
    name: 'Evening Only',
    nameAr: 'مسائي فقط',
    schedule: {
      opening: '16:00',
      closing: '22:00',
      workDays: [0, 1, 2, 3, 4, 5, 6], // All days
    },
  },
];

const WorkingHoursScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { phoneNumber } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [businessType, setBusinessType] = useState<BusinessType>(BusinessType.SALON);
  const [workingHours, setWorkingHours] = useState<{ [key: number]: DaySchedule }>({});
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [selectedTimeField, setSelectedTimeField] = useState<{
    day: number;
    field: 'openingTime' | 'closingTime' | 'breakStartTime' | 'breakEndTime';
  } | null>(null);
  const [tempTime, setTempTime] = useState(new Date());

  const stepTitles = [
    i18n.t('providerOnboarding.steps.businessInfo'),
    i18n.t('providerOnboarding.steps.location'),
    i18n.t('providerOnboarding.steps.categories'),
    i18n.t('providerOnboarding.steps.hours'),
    i18n.t('providerOnboarding.steps.license'),
    i18n.t('providerOnboarding.steps.tutorial'),
    i18n.t('providerOnboarding.steps.completion'),
  ];

  useEffect(() => {
    loadDraftData();
  }, []);

  const loadDraftData = async () => {
    try {
      const onboardingState = await ProviderOnboardingService.getCurrentOnboardingState();
      if (onboardingState?.provider) {
        // Load business type from step 1
        const step1Data = onboardingState.steps.find(step => step.stepNumber === 1)?.data;
        if (step1Data?.businessType) {
          setBusinessType(step1Data.businessType);
        }

        // Load working hours from step 6
        const step6Data = onboardingState.steps.find(step => step.stepNumber === 6)?.data;
        if (step6Data?.businessHours) {
          const loadedHours: { [key: number]: DaySchedule } = {};
          Object.entries(step6Data.businessHours).forEach(([dayStr, hours]) => {
            const day = parseInt(dayStr);
            const dayInfo = DAYS_OF_WEEK.find(d => d.dayOfWeek === day);
            if (dayInfo) {
              loadedHours[day] = {
                ...(hours as BusinessHours),
                dayName: dayInfo.name,
                dayNameAr: dayInfo.nameAr,
              };
            }
          });
          setWorkingHours(loadedHours);
        } else {
          // Initialize with default hours based on business type
          initializeDefaultHours();
        }
      } else {
        initializeDefaultHours();
      }
    } catch (error) {
      console.error('Error loading draft data:', error);
      initializeDefaultHours();
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const initializeDefaultHours = () => {
    const defaultHours = ProviderOnboardingService.getDefaultBusinessHours(businessType);
    const initialHours: { [key: number]: DaySchedule } = {};
    
    DAYS_OF_WEEK.forEach(dayInfo => {
      const defaultDay = defaultHours[dayInfo.dayOfWeek];
      initialHours[dayInfo.dayOfWeek] = {
        ...defaultDay,
        dayName: dayInfo.name,
        dayNameAr: dayInfo.nameAr,
      };
    });
    
    setWorkingHours(initialHours);
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    const updatedHours = { ...workingHours };
    
    DAYS_OF_WEEK.forEach(dayInfo => {
      const isWorkDay = preset.schedule.workDays.includes(dayInfo.dayOfWeek);
      updatedHours[dayInfo.dayOfWeek] = {
        ...updatedHours[dayInfo.dayOfWeek],
        isWorkingDay: isWorkDay,
        openingTime: isWorkDay ? preset.schedule.opening : '',
        closingTime: isWorkDay ? preset.schedule.closing : '',
        breakStartTime: preset.schedule.breakStart || '',
        breakEndTime: preset.schedule.breakEnd || '',
      };
    });
    
    setWorkingHours(updatedHours);
    saveDraft(updatedHours);
  };

  const toggleWorkingDay = (day: number) => {
    const updatedHours = {
      ...workingHours,
      [day]: {
        ...workingHours[day],
        isWorkingDay: !workingHours[day].isWorkingDay,
      },
    };
    setWorkingHours(updatedHours);
    saveDraft(updatedHours);
  };

  const openTimeDialog = (day: number, field: 'openingTime' | 'closingTime' | 'breakStartTime' | 'breakEndTime') => {
    const currentTime = workingHours[day][field];
    if (currentTime) {
      const [hours, minutes] = currentTime.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      setTempTime(date);
    }
    setSelectedTimeField({ day, field });
    setShowTimeDialog(true);
  };

  const handleTimeConfirm = () => {
    if (!selectedTimeField) return;
    
    const timeString = tempTime.toTimeString().slice(0, 5);
    const updatedHours = {
      ...workingHours,
      [selectedTimeField.day]: {
        ...workingHours[selectedTimeField.day],
        [selectedTimeField.field]: timeString,
      },
    };
    
    setWorkingHours(updatedHours);
    saveDraft(updatedHours);
    setShowTimeDialog(false);
    setSelectedTimeField(null);
  };

  const copyToAllDays = (sourceDay: number) => {
    const sourceSchedule = workingHours[sourceDay];
    const updatedHours = { ...workingHours };
    
    DAYS_OF_WEEK.forEach(dayInfo => {
      if (dayInfo.dayOfWeek !== sourceDay) {
        updatedHours[dayInfo.dayOfWeek] = {
          ...updatedHours[dayInfo.dayOfWeek],
          isWorkingDay: sourceSchedule.isWorkingDay,
          openingTime: sourceSchedule.openingTime,
          closingTime: sourceSchedule.closingTime,
          breakStartTime: sourceSchedule.breakStartTime,
          breakEndTime: sourceSchedule.breakEndTime,
        };
      }
    });
    
    setWorkingHours(updatedHours);
    saveDraft(updatedHours);
  };

  const saveDraft = async (hours: { [key: number]: DaySchedule }) => {
    try {
      const businessHours: { [key: number]: BusinessHours } = {};
      Object.entries(hours).forEach(([dayStr, schedule]) => {
        const day = parseInt(dayStr);
        const { dayName, dayNameAr, ...businessHour } = schedule;
        businessHours[day] = businessHour;
      });

      await ProviderOnboardingService.updateWorkingHours({
        businessHours,
        isCompleted: false,
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const onSubmit = async () => {
    // Validate that at least one working day is selected
    const hasWorkingDay = Object.values(workingHours).some(hours => hours.isWorkingDay);
    if (!hasWorkingDay) {
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.validation.workingDayRequired')
      );
      return;
    }

    setIsLoading(true);
    try {
      const businessHours: { [key: number]: BusinessHours } = {};
      Object.entries(workingHours).forEach(([dayStr, schedule]) => {
        const day = parseInt(dayStr);
        const { dayName, dayNameAr, ...businessHour } = schedule;
        businessHours[day] = businessHour;
      });

      const submitData = { businessHours };

      // Validate form data
      const validation = ProviderOnboardingService.validateStepData(6, submitData);
      if (!validation.isValid) {
        Alert.alert(
          i18n.t('common.error'),
          validation.errors.join('\n')
        );
        return;
      }

      // Save data and mark step as completed
      await ProviderOnboardingService.updateWorkingHours({
        ...submitData,
        isCompleted: true,
      });

      navigation.navigate('LicenseVerification', { phoneNumber });
    } catch (error) {
      console.error('Error submitting working hours:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.errors.hoursSave')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderDaySchedule = (dayInfo: typeof DAYS_OF_WEEK[0]) => {
    const schedule = workingHours[dayInfo.dayOfWeek];
    if (!schedule) return null;

    const dayName = isRTL() ? schedule.dayNameAr : schedule.dayName;
    const isWorkingDay = schedule.isWorkingDay;

    return (
      <Surface key={dayInfo.dayOfWeek} style={styles.dayCard} elevation={1}>
        <View style={styles.dayHeader}>
          <View style={styles.dayInfo}>
            <Text variant="titleMedium" style={styles.dayName}>
              {dayName}
            </Text>
            {dayInfo.dayOfWeek === 5 && ( // Friday
              <Chip
                mode="outlined"
                compact
                style={styles.fridayChip}
                textStyle={styles.fridayChipText}
              >
                {i18n.t('providerOnboarding.workingHours.friday')}
              </Chip>
            )}
          </View>
          
          <View style={styles.dayControls}>
            <Switch
              value={isWorkingDay}
              onValueChange={() => toggleWorkingDay(dayInfo.dayOfWeek)}
            />
            {isWorkingDay && (
              <Button
                mode="text"
                onPress={() => copyToAllDays(dayInfo.dayOfWeek)}
                icon="content-copy"
                compact
                style={styles.copyButton}
              >
                {i18n.t('providerOnboarding.workingHours.copyToAll')}
              </Button>
            )}
          </View>
        </View>

        {isWorkingDay && (
          <View style={styles.timeSettings}>
            {/* Opening and Closing Times */}
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text variant="labelMedium" style={styles.timeLabel}>
                  {i18n.t('providerOnboarding.workingHours.openingTime')}
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => openTimeDialog(dayInfo.dayOfWeek, 'openingTime')}
                  style={styles.timeButton}
                >
                  {schedule.openingTime || '--:--'}
                </Button>
              </View>
              
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={theme.colors.onSurfaceVariant}
                style={styles.timeArrow}
              />
              
              <View style={styles.timeField}>
                <Text variant="labelMedium" style={styles.timeLabel}>
                  {i18n.t('providerOnboarding.workingHours.closingTime')}
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => openTimeDialog(dayInfo.dayOfWeek, 'closingTime')}
                  style={styles.timeButton}
                >
                  {schedule.closingTime || '--:--'}
                </Button>
              </View>
            </View>

            {/* Break Times (Optional) */}
            <View style={styles.breakSection}>
              <Text variant="labelMedium" style={styles.breakLabel}>
                {i18n.t('providerOnboarding.workingHours.breakTime')} ({i18n.t('common.optional')})
              </Text>
              
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Button
                    mode="outlined"
                    onPress={() => openTimeDialog(dayInfo.dayOfWeek, 'breakStartTime')}
                    style={styles.timeButton}
                  >
                    {schedule.breakStartTime || '--:--'}
                  </Button>
                </View>
                
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.timeArrow}
                />
                
                <View style={styles.timeField}>
                  <Button
                    mode="outlined"
                    onPress={() => openTimeDialog(dayInfo.dayOfWeek, 'breakEndTime')}
                    style={styles.timeButton}
                  >
                    {schedule.breakEndTime || '--:--'}
                  </Button>
                </View>
              </View>
            </View>
          </View>
        )}

        {!isWorkingDay && (
          <View style={styles.closedDay}>
            <Text variant="bodyMedium" style={[styles.closedText, { color: theme.colors.onSurfaceVariant }]}>
              {i18n.t('providerOnboarding.workingHours.closed')}
            </Text>
          </View>
        )}
      </Surface>
    );
  };

  if (isLoadingDraft) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>{i18n.t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ProgressIndicator
        currentStep={4}
        totalSteps={7}
        stepTitles={stepTitles}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={48}
              color={theme.colors.primary}
            />
            <Text variant="headlineSmall" style={styles.title}>
              {i18n.t('providerOnboarding.workingHours.title')}
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {i18n.t('providerOnboarding.workingHours.subtitle')}
            </Text>
          </View>

          {/* Quick Presets */}
          <Surface style={styles.presetsContainer} elevation={1}>
            <Text variant="titleMedium" style={styles.presetsTitle}>
              {i18n.t('providerOnboarding.workingHours.quickPresets')}
            </Text>
            
            <View style={styles.presetButtons}>
              {QUICK_PRESETS.map((preset, index) => (
                <Button
                  key={index}
                  mode="outlined"
                  onPress={() => applyPreset(preset)}
                  style={styles.presetButton}
                  contentStyle={styles.presetButtonContent}
                >
                  {isRTL() ? preset.nameAr : preset.name}
                </Button>
              ))}
            </View>
          </Surface>

          {/* Working Days */}
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map(renderDaySchedule)}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          {i18n.t('common.back')}
        </Button>
        <Button
          mode="contained"
          onPress={onSubmit}
          disabled={isLoading}
          loading={isLoading}
          style={styles.continueButton}
        >
          {i18n.t('providerOnboarding.buttons.continue')}
        </Button>
      </View>

      {/* Time Picker Dialog */}
      <Portal>
        <Dialog visible={showTimeDialog} onDismiss={() => setShowTimeDialog(false)}>
          <Dialog.Title>
            {i18n.t('providerOnboarding.workingHours.selectTime')}
          </Dialog.Title>
          <Dialog.Content>
            <DateTimePicker
              value={tempTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={(event, selectedTime) => {
                if (selectedTime) {
                  setTempTime(selectedTime);
                }
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTimeDialog(false)}>
              {i18n.t('common.cancel')}
            </Button>
            <Button onPress={handleTimeConfirm}>
              {i18n.t('common.confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  presetsContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  presetsTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    borderRadius: 20,
    minWidth: 100,
  },
  presetButtonContent: {
    paddingHorizontal: 8,
  },
  daysContainer: {
    gap: 12,
  },
  dayCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    fontWeight: '600',
  },
  fridayChip: {
    height: 24,
  },
  fridayChipText: {
    fontSize: 10,
  },
  dayControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyButton: {
    marginLeft: 8,
  },
  timeSettings: {
    gap: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    marginBottom: 4,
    fontWeight: '500',
  },
  timeButton: {
    borderRadius: 8,
  },
  timeArrow: {
    marginTop: 16,
  },
  breakSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  breakLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  closedDay: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  closedText: {
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  backButton: {
    flex: 1,
    borderRadius: 28,
  },
  continueButton: {
    flex: 2,
    borderRadius: 28,
  },
});

export default WorkingHoursScreen;