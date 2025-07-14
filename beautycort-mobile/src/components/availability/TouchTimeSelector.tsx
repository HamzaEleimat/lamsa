import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Vibration,
  I18nManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { format, addMinutes, startOfDay, isSameDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { colors } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

interface TouchTimeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onTimeSelect: (time: Date) => void;
  initialTime?: Date;
  minTime?: Date;
  maxTime?: Date;
  interval?: number; // in minutes
  title?: string;
  mode?: '12h' | '24h';
  allowPrayerTimes?: boolean;
  showPresets?: boolean;
}

interface TimePreset {
  label: string;
  time: Date;
  icon: string;
  type: 'work' | 'prayer' | 'break';
}

export default function TouchTimeSelector({
  visible,
  onClose,
  onTimeSelect,
  initialTime = new Date(),
  minTime,
  maxTime,
  interval = 15,
  title,
  mode = '12h',
  allowPrayerTimes = true,
  showPresets = true,
}: TouchTimeSelectorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;

  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [activeTab, setActiveTab] = useState<'time' | 'presets'>('time');

  // Generate time slots based on interval
  const generateTimeSlots = () => {
    const slots = [];
    const startTime = minTime || startOfDay(new Date());
    const endTime = maxTime || new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
    
    let currentTime = new Date(startTime);
    
    while (currentTime < endTime) {
      slots.push(new Date(currentTime));
      currentTime = addMinutes(currentTime, interval);
    }
    
    return slots;
  };

  const [timeSlots] = useState(generateTimeSlots());

  // Jordan prayer times (approximate - would be calculated dynamically in production)
  const getPrayerTimePresets = (): TimePreset[] => {
    const today = new Date();
    return [
      {
        label: t('fajr'),
        time: new Date(today.setHours(5, 30, 0)),
        icon: 'sunrise-outline',
        type: 'prayer',
      },
      {
        label: t('dhuhr'),
        time: new Date(today.setHours(12, 30, 0)),
        icon: 'sunny-outline',
        type: 'prayer',
      },
      {
        label: t('asr'),
        time: new Date(today.setHours(15, 30, 0)),
        icon: 'partly-sunny-outline',
        type: 'prayer',
      },
      {
        label: t('maghrib'),
        time: new Date(today.setHours(18, 0, 0)),
        icon: 'sunset-outline',
        type: 'prayer',
      },
      {
        label: t('isha'),
        time: new Date(today.setHours(19, 30, 0)),
        icon: 'moon-outline',
        type: 'prayer',
      },
    ];
  };

  const getWorkTimePresets = (): TimePreset[] => {
    const today = new Date();
    return [
      {
        label: t('morningStart'),
        time: new Date(today.setHours(9, 0, 0)),
        icon: 'sunny-outline',
        type: 'work',
      },
      {
        label: t('lunchBreak'),
        time: new Date(today.setHours(12, 0, 0)),
        icon: 'restaurant-outline',
        type: 'break',
      },
      {
        label: t('afternoonStart'),
        time: new Date(today.setHours(14, 0, 0)),
        icon: 'time-outline',
        type: 'work',
      },
      {
        label: t('eveningEnd'),
        time: new Date(today.setHours(18, 0, 0)),
        icon: 'moon-outline',
        type: 'work',
      },
      {
        label: t('nightStart'),
        time: new Date(today.setHours(19, 0, 0)),
        icon: 'moon',
        type: 'work',
      },
    ];
  };

  const handleTimeSelect = (time: Date) => {
    setSelectedTime(time);
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50); // Haptic feedback
    }
  };

  const handleConfirm = () => {
    onTimeSelect(selectedTime);
    onClose();
  };

  const formatTime = (time: Date) => {
    if (mode === '12h') {
      return format(time, 'h:mm a', { locale });
    }
    return format(time, 'HH:mm', { locale });
  };

  const getTimeSlotColor = (time: Date) => {
    if (isSameDay(time, selectedTime) && 
        time.getHours() === selectedTime.getHours() && 
        time.getMinutes() === selectedTime.getMinutes()) {
      return colors.primary;
    }
    
    const hour = time.getHours();
    if (hour < 6 || hour > 22) {
      return colors.lightGray; // Late night/early morning
    }
    if (hour >= 9 && hour <= 18) {
      return colors.success; // Business hours
    }
    return colors.white; // Regular hours
  };

  const getPresetColor = (type: 'work' | 'prayer' | 'break') => {
    switch (type) {
      case 'prayer':
        return colors.secondary;
      case 'break':
        return colors.warning;
      case 'work':
        return colors.primary;
      default:
        return colors.gray;
    }
  };

  const renderTimeGrid = () => (
    <ScrollView 
      style={styles.timeGrid}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.timeGridContent}
    >
      <View style={styles.timeSlots}>
        {timeSlots.map((time, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.timeSlot,
              {
                backgroundColor: getTimeSlotColor(time),
                borderColor: isSameDay(time, selectedTime) && 
                           time.getHours() === selectedTime.getHours() && 
                           time.getMinutes() === selectedTime.getMinutes()
                  ? colors.primary
                  : colors.border,
              },
            ]}
            onPress={() => handleTimeSelect(time)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.timeSlotText,
                {
                  color: isSameDay(time, selectedTime) && 
                         time.getHours() === selectedTime.getHours() && 
                         time.getMinutes() === selectedTime.getMinutes()
                    ? colors.white
                    : colors.text,
                },
              ]}
            >
              {formatTime(time)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderPresets = () => (
    <ScrollView 
      style={styles.presetsContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Work Time Presets */}
      <View style={styles.presetSection}>
        <Text style={styles.presetSectionTitle}>{t('workHours')}</Text>
        <View style={styles.presetGrid}>
          {getWorkTimePresets().map((preset, index) => (
            <TouchableOpacity
              key={`work-${index}`}
              style={[
                styles.presetButton,
                { borderColor: getPresetColor(preset.type) },
              ]}
              onPress={() => handleTimeSelect(preset.time)}
            >
              <Ionicons 
                name={preset.icon as any} 
                size={24} 
                color={getPresetColor(preset.type)} 
              />
              <Text style={styles.presetLabel}>{preset.label}</Text>
              <Text style={styles.presetTime}>{formatTime(preset.time)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Prayer Time Presets */}
      {allowPrayerTimes && (
        <View style={styles.presetSection}>
          <Text style={styles.presetSectionTitle}>{t('prayerTimes')}</Text>
          <View style={styles.presetGrid}>
            {getPrayerTimePresets().map((preset, index) => (
              <TouchableOpacity
                key={`prayer-${index}`}
                style={[
                  styles.presetButton,
                  { borderColor: getPresetColor(preset.type) },
                ]}
                onPress={() => handleTimeSelect(preset.time)}
              >
                <Ionicons 
                  name={preset.icon as any} 
                  size={24} 
                  color={getPresetColor(preset.type)} 
                />
                <Text style={styles.presetLabel}>{preset.label}</Text>
                <Text style={styles.presetTime}>{formatTime(preset.time)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {title || t('selectTime')}
          </Text>
          
          <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
            <Text style={styles.confirmText}>{t('confirm')}</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Time Display */}
        <View style={styles.selectedTimeContainer}>
          <Text style={styles.selectedTimeLabel}>{t('selectedTime')}</Text>
          <Text style={styles.selectedTime}>{formatTime(selectedTime)}</Text>
        </View>

        {/* Tab Navigation */}
        {showPresets && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'time' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('time')}
            >
              <Ionicons 
                name="time-outline" 
                size={20} 
                color={activeTab === 'time' ? colors.primary : colors.gray} 
              />
              <Text 
                style={[
                  styles.tabText,
                  activeTab === 'time' && styles.activeTabText,
                ]}
              >
                {t('timeGrid')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'presets' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('presets')}
            >
              <Ionicons 
                name="bookmarks-outline" 
                size={20} 
                color={activeTab === 'presets' ? colors.primary : colors.gray} 
              />
              <Text 
                style={[
                  styles.tabText,
                  activeTab === 'presets' && styles.activeTabText,
                ]}
              >
                {t('presets')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'time' || !showPresets ? renderTimeGrid() : renderPresets()}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleTimeSelect(new Date())}
          >
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>{t('now')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleTimeSelect(new Date(new Date().setHours(9, 0, 0)))}
          >
            <Ionicons name="sunny" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>{t('9am')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleTimeSelect(new Date(new Date().setHours(18, 0, 0)))}
          >
            <Ionicons name="moon" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>{t('6pm')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  headerButton: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
  },
  selectedTimeContainer: {
    backgroundColor: colors.white,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedTimeLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
  },
  selectedTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
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
    fontSize: 16,
    color: colors.gray,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  timeGrid: {
    flex: 1,
  },
  timeGridContent: {
    padding: 16,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  timeSlot: {
    width: (width - 64) / 4, // 4 columns with padding
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '600',
  },
  presetsContainer: {
    flex: 1,
    padding: 16,
  },
  presetSection: {
    marginBottom: 24,
  },
  presetSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetButton: {
    width: (width - 64) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    gap: 8,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  presetTime: {
    fontSize: 16,
    color: colors.gray,
  },
  quickActions: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});