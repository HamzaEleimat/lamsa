import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  I18nManager,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from '../MapView';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { format, isToday, isTomorrow, addDays, getDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface WorkingHours {
  [key: number]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
    breaks?: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
}

interface LocationHoursProps {
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  addressAr?: string;
  city: string;
  workingHours: WorkingHours;
  phoneNumber?: string;
  whatsappNumber?: string;
  amenities?: string[];
  parkingAvailable?: boolean;
  accessibleEntrance?: boolean;
  femaleSection?: boolean;
}

export default function LocationHours({
  location,
  address,
  addressAr,
  city,
  workingHours,
  phoneNumber,
  whatsappNumber,
  amenities = [],
  parkingAvailable,
  accessibleEntrance,
  femaleSection,
}: LocationHoursProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;
  
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  const daysOfWeek = [
    { key: 0, label: t('sunday'), labelAr: 'الأحد' },
    { key: 1, label: t('monday'), labelAr: 'الإثنين' },
    { key: 2, label: t('tuesday'), labelAr: 'الثلاثاء' },
    { key: 3, label: t('wednesday'), labelAr: 'الأربعاء' },
    { key: 4, label: t('thursday'), labelAr: 'الخميس' },
    { key: 5, label: t('friday'), labelAr: 'الجمعة' },
    { key: 6, label: t('saturday'), labelAr: 'السبت' },
  ];

  const currentDay = getDay(new Date());
  const currentTime = format(new Date(), 'HH:mm');

  const isOpenNow = () => {
    const todayHours = workingHours[currentDay];
    if (!todayHours || !todayHours.isOpen) return false;

    const isWithinWorkingHours = 
      currentTime >= todayHours.openTime && 
      currentTime <= todayHours.closeTime;

    // Check if currently in a break
    if (todayHours.breaks && isWithinWorkingHours) {
      for (const breakTime of todayHours.breaks) {
        if (currentTime >= breakTime.startTime && currentTime <= breakTime.endTime) {
          return false;
        }
      }
    }

    return isWithinWorkingHours;
  };

  const getNextOpenTime = () => {
    // If open now, return null
    if (isOpenNow()) return null;

    // Check remaining hours today
    const todayHours = workingHours[currentDay];
    if (todayHours && todayHours.isOpen && currentTime < todayHours.openTime) {
      return {
        day: 'today',
        time: todayHours.openTime,
      };
    }

    // Check next 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDay = (currentDay + i) % 7;
      const dayHours = workingHours[checkDay];
      if (dayHours && dayHours.isOpen) {
        return {
          day: i === 1 ? 'tomorrow' : daysOfWeek[checkDay].label,
          time: dayHours.openTime,
        };
      }
    }

    return null;
  };

  const handleDirections = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${location.latitude},${location.longitude}`,
      android: `geo:0,0?q=${location.latitude},${location.longitude}`,
    });
    Linking.openURL(url);
  };

  const handleCall = () => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleWhatsApp = () => {
    if (whatsappNumber) {
      const message = encodeURIComponent(t('locationInquiry'));
      Linking.openURL(`whatsapp://send?phone=+962${whatsappNumber}&text=${message}`);
    }
  };

  const renderOpenStatus = () => {
    const open = isOpenNow();
    const nextOpen = getNextOpenTime();

    return (
      <View style={[styles.openStatus, open ? styles.openNow : styles.closedNow]}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: open ? colors.success : colors.error }]} />
          <Text style={styles.statusText}>
            {open ? t('openNow') : t('closed')}
          </Text>
        </View>
        {!open && nextOpen && (
          <Text style={styles.nextOpenText}>
            {t('opensAt', { 
              day: t(nextOpen.day), 
              time: nextOpen.time 
            })}
          </Text>
        )}
      </View>
    );
  };

  const renderWorkingHours = () => {
    return (
      <View style={styles.workingHoursSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>{t('workingHours')}</Text>
        </View>

        {daysOfWeek.map(day => {
          const hours = workingHours[day.key];
          const isExpanded = expandedDay === day.key;
          const isCurrentDay = day.key === currentDay;

          return (
            <TouchableOpacity
              key={day.key}
              style={[
                styles.dayRow,
                isCurrentDay && styles.currentDayRow,
              ]}
              onPress={() => setExpandedDay(isExpanded ? null : day.key)}
              disabled={!hours || !hours.isOpen}
            >
              <Text style={[
                styles.dayName,
                isCurrentDay && styles.currentDayName,
                (!hours || !hours.isOpen) && styles.closedDayName,
              ]}>
                {isRTL ? day.labelAr : day.label}
              </Text>

              {hours && hours.isOpen ? (
                <View style={styles.hoursContainer}>
                  <Text style={[
                    styles.hoursText,
                    isCurrentDay && styles.currentDayHours,
                  ]}>
                    {hours.openTime} - {hours.closeTime}
                  </Text>
                  {hours.breaks && hours.breaks.length > 0 && (
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.gray}
                    />
                  )}
                </View>
              ) : (
                <Text style={styles.closedText}>{t('closed')}</Text>
              )}

              {isExpanded && hours && hours.breaks && hours.breaks.length > 0 && (
                <View style={styles.breaksContainer}>
                  <Text style={styles.breaksTitle}>{t('breaks')}:</Text>
                  {hours.breaks.map((breakTime, index) => (
                    <Text key={index} style={styles.breakTime}>
                      {breakTime.startTime} - {breakTime.endTime}
                    </Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderMap = () => {
    return (
      <View style={styles.mapSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>{t('location')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.mapContainer, mapExpanded && styles.expandedMap]}
          onPress={() => setMapExpanded(!mapExpanded)}
          activeOpacity={0.9}
        >
          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              ...location,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={mapExpanded}
            zoomEnabled={mapExpanded}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker coordinate={location} />
          </MapView>
          
          {!mapExpanded && (
            <View style={styles.mapOverlay}>
              <Ionicons name="expand" size={24} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.addressContainer}>
          <Text style={styles.addressText}>
            {isRTL ? addressAr || address : address}
          </Text>
          <Text style={styles.cityText}>{city}</Text>
        </View>

        <View style={styles.locationActions}>
          <TouchableOpacity style={styles.locationButton} onPress={handleDirections}>
            <Ionicons name="navigate-outline" size={20} color={colors.primary} />
            <Text style={styles.locationButtonText}>{t('getDirections')}</Text>
          </TouchableOpacity>

          {phoneNumber && (
            <TouchableOpacity style={styles.locationButton} onPress={handleCall}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={styles.locationButtonText}>{t('call')}</Text>
            </TouchableOpacity>
          )}

          {whatsappNumber && (
            <TouchableOpacity style={styles.locationButton} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={[styles.locationButtonText, { color: '#25D366' }]}>
                {t('whatsApp')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderAmenities = () => {
    const allAmenities = [...amenities];
    
    if (parkingAvailable) allAmenities.push(t('parkingAvailable'));
    if (accessibleEntrance) allAmenities.push(t('accessibleEntrance'));
    if (femaleSection) allAmenities.push(t('femaleSectionAvailable'));

    if (allAmenities.length === 0) return null;

    return (
      <View style={styles.amenitiesSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>{t('amenities')}</Text>
        </View>

        <View style={styles.amenitiesList}>
          {allAmenities.map((amenity, index) => (
            <View key={index} style={styles.amenityItem}>
              <Ionicons name="checkmark" size={16} color={colors.success} />
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Open Status */}
      {renderOpenStatus()}

      {/* Working Hours */}
      {renderWorkingHours()}

      {/* Map and Location */}
      {renderMap()}

      {/* Amenities */}
      {renderAmenities()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  openStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  openNow: {
    backgroundColor: colors.lightSuccess,
  },
  closedNow: {
    backgroundColor: colors.lightError,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nextOpenText: {
    fontSize: 14,
    color: colors.gray,
  },
  workingHoursSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currentDayRow: {
    backgroundColor: colors.lightPrimary,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  dayName: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  currentDayName: {
    fontWeight: '600',
    color: colors.primary,
  },
  closedDayName: {
    color: colors.gray,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoursText: {
    fontSize: 16,
    color: colors.text,
  },
  currentDayHours: {
    fontWeight: '600',
    color: colors.primary,
  },
  closedText: {
    fontSize: 16,
    color: colors.gray,
  },
  breaksContainer: {
    position: 'absolute',
    top: 44,
    right: 0,
    backgroundColor: colors.lightGray,
    padding: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  breaksTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  breakTime: {
    fontSize: 12,
    color: colors.gray,
  },
  mapSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  expandedMap: {
    height: 300,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressContainer: {
    marginBottom: 16,
  },
  addressText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  cityText: {
    fontSize: 14,
    color: colors.gray,
  },
  locationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  amenitiesSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
  amenitiesList: {
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amenityText: {
    fontSize: 14,
    color: colors.text,
  },
});