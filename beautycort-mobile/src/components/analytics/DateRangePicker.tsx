import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../constants/colors';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from '../../hooks/useTranslation';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
  quickRanges?: boolean;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  quickRanges = true,
}: DateRangePickerProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? ar : enUS;
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showQuickRanges, setShowQuickRanges] = useState(false);
  
  const quickRangeOptions = [
    {
      label: t('today'),
      getValue: () => {
        const today = new Date();
        return { start: today, end: today };
      },
    },
    {
      label: t('yesterday'),
      getValue: () => {
        const yesterday = subDays(new Date(), 1);
        return { start: yesterday, end: yesterday };
      },
    },
    {
      label: t('last7Days'),
      getValue: () => {
        const end = new Date();
        const start = subDays(end, 6);
        return { start, end };
      },
    },
    {
      label: t('thisWeek'),
      getValue: () => {
        const now = new Date();
        return {
          start: startOfWeek(now, { weekStartsOn: 0 }),
          end: endOfWeek(now, { weekStartsOn: 0 }),
        };
      },
    },
    {
      label: t('thisMonth'),
      getValue: () => {
        const now = new Date();
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      },
    },
    {
      label: t('lastMonth'),
      getValue: () => {
        const lastMonth = subMonths(new Date(), 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
        };
      },
    },
    {
      label: t('last30Days'),
      getValue: () => {
        const end = new Date();
        const start = subDays(end, 29);
        return { start, end };
      },
    },
    {
      label: t('last90Days'),
      getValue: () => {
        const end = new Date();
        const start = subDays(end, 89);
        return { start, end };
      },
    },
  ];
  
  const handleQuickRange = (option: typeof quickRangeOptions[0]) => {
    const { start, end } = option.getValue();
    onDateChange(start, end);
    setShowQuickRanges(false);
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.dateContainer}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartPicker(true)}
        >
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.dateText}>
            {format(startDate, 'dd MMM yyyy', { locale })}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.separator}>{t('to')}</Text>
        
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndPicker(true)}
        >
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.dateText}>
            {format(endDate, 'dd MMM yyyy', { locale })}
          </Text>
        </TouchableOpacity>
        
        {quickRanges && (
          <TouchableOpacity
            style={styles.quickRangeButton}
            onPress={() => setShowQuickRanges(true)}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) {
              onDateChange(date, endDate);
            }
          }}
          maximumDate={endDate}
        />
      )}
      
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) {
              onDateChange(startDate, date);
            }
          }}
          minimumDate={startDate}
          maximumDate={new Date()}
        />
      )}
      
      <Modal
        visible={showQuickRanges}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuickRanges(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowQuickRanges(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectDateRange')}</Text>
              <TouchableOpacity onPress={() => setShowQuickRanges(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.quickRangesList}>
              {quickRangeOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickRangeItem}
                  onPress={() => handleQuickRange(option)}
                >
                  <Text style={styles.quickRangeText}>{option.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.gray} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dateText: {
    fontSize: 14,
    color: colors.text,
  },
  separator: {
    fontSize: 14,
    color: colors.gray,
  },
  quickRangeButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  quickRangesList: {
    paddingVertical: 8,
  },
  quickRangeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickRangeText: {
    fontSize: 16,
    color: colors.text,
  },
});