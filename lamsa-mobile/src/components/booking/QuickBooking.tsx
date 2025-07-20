import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import providerService from '../../services/providerService';
import { ProviderServiceItem } from '../../services/providerService';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface QuickBookingProps {
  providerId: string;
  providerName: string;
  providerPhone: string;
  services: ProviderServiceItem[];
  onBookingComplete?: (bookingData: any) => void;
  workingHours?: { [key: number]: any };
}

export default function QuickBooking({
  providerId,
  providerName,
  providerPhone,
  services,
  onBookingComplete,
  workingHours = {},
}: QuickBookingProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? ar : enUS;

  const [selectedService, setSelectedService] = useState<ProviderServiceItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedService, selectedDate]);

  const loadAvailableSlots = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from the API
      // For now, generate mock slots based on working hours
      const dayOfWeek = selectedDate.getDay();
      const dayHours = workingHours[dayOfWeek];
      
      if (!dayHours || !dayHours.isOpen) {
        setAvailableSlots([]);
        return;
      }

      // Generate time slots
      const slots: TimeSlot[] = [];
      const startHour = parseInt(dayHours.openTime.split(':')[0]);
      const endHour = parseInt(dayHours.closeTime.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        // Skip break times
        if (dayHours.breaks) {
          const inBreak = dayHours.breaks.some((breakTime: any) => {
            const breakStart = parseInt(breakTime.startTime.split(':')[0]);
            const breakEnd = parseInt(breakTime.endTime.split(':')[0]);
            return hour >= breakStart && hour < breakEnd;
          });
          if (inBreak) continue;
        }

        // Add :00 and :30 slots
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          available: Math.random() > 0.3, // Mock availability
        });
        if (hour < endHour - 1) {
          slots.push({
            time: `${hour.toString().padStart(2, '0')}:30`,
            available: Math.random() > 0.3,
          });
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: ProviderServiceItem) => {
    setSelectedService(service);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleQuickBook = () => {
    if (!selectedService || !selectedTime) {
      Alert.alert(t('error'), t('pleaseSelectServiceAndTime'));
      return;
    }

    setShowWhatsAppOptions(true);
  };

  const sendWhatsAppMessage = (messageType: 'instant' | 'custom') => {
    if (!selectedService || !selectedTime) return;

    const dateStr = format(selectedDate, 'EEEE, dd MMMM', { locale });
    let message = '';

    if (messageType === 'instant') {
      message = t('quickBookingMessage', {
        service: selectedService.name[i18n.language] || selectedService.name.en,
        date: dateStr,
        time: selectedTime,
        duration: selectedService.durationMinutes,
        price: selectedService.price,
      });
    } else {
      message = t('customBookingMessage', {
        providerName,
        service: selectedService.name[i18n.language] || selectedService.name.en,
      });
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=+962${providerPhone}&text=${encodedMessage}`;
    
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert(t('error'), t('whatsappNotInstalled'));
    });

    // Track booking attempt
    if (onBookingComplete) {
      onBookingComplete({
        service: selectedService,
        date: selectedDate,
        time: selectedTime,
        method: 'whatsapp',
      });
    }
  };

  const renderServiceSelection = () => {
    const popularServices = services.filter(s => s.isPopular).slice(0, 5);
    const otherServices = services.filter(s => !s.isPopular);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('selectService')}</Text>
        
        {popularServices.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>{t('popularServices')}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.serviceScroll}
            >
              {popularServices.map(service => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.popularServiceCard,
                    selectedService?.id === service.id && styles.selectedServiceCard,
                  ]}
                  onPress={() => handleServiceSelect(service)}
                >
                  <Text style={styles.popularServiceName} numberOfLines={2}>
                    {service.name[i18n.language] || service.name.en}
                  </Text>
                  <View style={styles.serviceDetails}>
                    <View style={styles.servicePrice}>
                      <Text style={styles.priceAmount}>{service.price}</Text>
                      <Text style={styles.priceCurrency}>{t('jod')}</Text>
                    </View>
                    <View style={styles.serviceDuration}>
                      <Ionicons name="time-outline" size={14} color={colors.gray} />
                      <Text style={styles.durationText}>
                        {service.durationMinutes} {t('min')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <TouchableOpacity
          style={styles.allServicesButton}
          onPress={() => {
            // Navigate to full service list
            Alert.alert(t('allServices'), t('fullServiceListComingSoon'));
          }}
        >
          <Text style={styles.allServicesText}>{t('viewAllServices')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderDateSelection = () => {
    if (!selectedService) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('selectDate')}</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
        >
          {dates.map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = index === 0;
            
            return (
              <TouchableOpacity
                key={date.toISOString()}
                style={[
                  styles.dateCard,
                  isSelected && styles.selectedDateCard,
                  isToday && styles.todayCard,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[
                  styles.dayName,
                  isSelected && styles.selectedDateText,
                ]}>
                  {isToday ? t('today') : format(date, 'EEE', { locale })}
                </Text>
                <Text style={[
                  styles.dayNumber,
                  isSelected && styles.selectedDateText,
                ]}>
                  {format(date, 'dd', { locale })}
                </Text>
                <Text style={[
                  styles.monthName,
                  isSelected && styles.selectedDateText,
                ]}>
                  {format(date, 'MMM', { locale })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderTimeSelection = () => {
    if (!selectedService || !selectedDate) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('selectTime')}</Text>
        
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : availableSlots.length === 0 ? (
          <Text style={styles.noSlotsText}>{t('noAvailableSlots')}</Text>
        ) : (
          <View style={styles.timeGrid}>
            {availableSlots.map((slot) => (
              <TouchableOpacity
                key={slot.time}
                style={[
                  styles.timeSlot,
                  !slot.available && styles.unavailableSlot,
                  selectedTime === slot.time && styles.selectedTimeSlot,
                ]}
                onPress={() => slot.available && handleTimeSelect(slot.time)}
                disabled={!slot.available}
              >
                <Text style={[
                  styles.timeText,
                  !slot.available && styles.unavailableText,
                  selectedTime === slot.time && styles.selectedTimeText,
                ]}>
                  {slot.time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderBookingSummary = () => {
    if (!selectedService || !selectedTime) return null;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{t('bookingSummary')}</Text>
        
        <View style={styles.summaryRow}>
          <Ionicons name="cut" size={20} color={colors.primary} />
          <Text style={styles.summaryText}>
            {selectedService.name[i18n.language] || selectedService.name.en}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.summaryText}>
            {format(selectedDate, 'EEEE, dd MMMM', { locale })}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Ionicons name="time" size={20} color={colors.primary} />
          <Text style={styles.summaryText}>
            {selectedTime} ({selectedService.durationMinutes} {t('minutes')})
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Ionicons name="cash" size={20} color={colors.primary} />
          <Text style={styles.summaryText}>
            {selectedService.price} {t('jod')}
          </Text>
        </View>
      </View>
    );
  };

  const renderWhatsAppOptions = () => {
    return (
      <View style={styles.whatsappOptions}>
        <Text style={styles.whatsappTitle}>{t('howToBook')}</Text>
        
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() => sendWhatsAppMessage('instant')}
        >
          <Ionicons name="flash" size={24} color={colors.white} />
          <View style={styles.whatsappButtonContent}>
            <Text style={styles.whatsappButtonTitle}>{t('instantBooking')}</Text>
            <Text style={styles.whatsappButtonDesc}>
              {t('sendBookingDetailsDirectly')}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.whatsappButton, styles.customButton]}
          onPress={() => sendWhatsAppMessage('custom')}
        >
          <Ionicons name="chatbubbles" size={24} color={colors.primary} />
          <View style={styles.whatsappButtonContent}>
            <Text style={[styles.whatsappButtonTitle, styles.customButtonText]}>
              {t('customMessage')}
            </Text>
            <Text style={[styles.whatsappButtonDesc, styles.customButtonText]}>
              {t('discussDetailsWithProvider')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!showWhatsAppOptions ? (
        <>
          {renderServiceSelection()}
          {renderDateSelection()}
          {renderTimeSelection()}
          {renderBookingSummary()}
          
          <TouchableOpacity
            style={[
              styles.bookButton,
              (!selectedService || !selectedTime) && styles.disabledButton,
            ]}
            onPress={handleQuickBook}
            disabled={!selectedService || !selectedTime}
          >
            <Ionicons name="logo-whatsapp" size={24} color={colors.white} />
            <Text style={styles.bookButtonText}>{t('bookViaWhatsApp')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        renderWhatsAppOptions()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
  },
  serviceScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  popularServiceCard: {
    width: 160,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectedServiceCard: {
    borderColor: colors.primary,
    backgroundColor: colors.lightPrimary,
  },
  popularServiceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  priceCurrency: {
    fontSize: 12,
    color: colors.gray,
    marginLeft: 4,
  },
  serviceDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: colors.gray,
  },
  allServicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  allServicesText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  dateScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  dateCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 80,
  },
  selectedDateCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  todayCard: {
    borderColor: colors.secondary,
  },
  dayName: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  monthName: {
    fontSize: 12,
    color: colors.gray,
  },
  selectedDateText: {
    color: colors.white,
  },
  loader: {
    marginVertical: 20,
  },
  noSlotsText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    paddingVertical: 20,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 80,
    alignItems: 'center',
  },
  unavailableSlot: {
    backgroundColor: colors.lightGray,
    borderColor: colors.lightGray,
  },
  selectedTimeSlot: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  unavailableText: {
    color: colors.gray,
  },
  selectedTimeText: {
    color: colors.white,
  },
  summaryCard: {
    backgroundColor: colors.lightPrimary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 'auto',
  },
  disabledButton: {
    backgroundColor: colors.gray,
    opacity: 0.5,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  whatsappOptions: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  whatsappTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#25D366',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  customButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  whatsappButtonContent: {
    flex: 1,
  },
  whatsappButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  whatsappButtonDesc: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
  },
  customButtonText: {
    color: colors.text,
  },
});