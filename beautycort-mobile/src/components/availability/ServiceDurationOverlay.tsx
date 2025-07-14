import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  I18nManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import {
  format,
  addMinutes,
  differenceInMinutes,
  startOfDay,
  endOfDay,
  isWithinInterval,
  isBefore,
  isAfter,
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

interface Service {
  id: string;
  name: string;
  name_ar: string;
  duration: number; // in minutes
  category: string;
  category_ar: string;
  price: number;
  currency: string;
  color?: string;
  bufferTime: number; // setup/cleanup time in minutes
  canOverlap?: boolean;
  requiresSetup?: boolean;
}

interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  type: 'available' | 'booked' | 'break' | 'unavailable';
  serviceId?: string;
  title?: string;
}

interface ServiceDurationOverlayProps {
  visible: boolean;
  timeSlots: TimeSlot[];
  services: Service[];
  selectedTimeSlot?: TimeSlot;
  onServiceSelect?: (service: Service, fitsInSlot: boolean) => void;
  onClose?: () => void;
  date: Date;
  showFitAnalysis?: boolean;
  showPricing?: boolean;
}

interface ServiceFit {
  service: Service;
  fits: boolean;
  availableTime: number;
  requiredTime: number;
  conflictingSlots: TimeSlot[];
  suggestedStartTime?: Date;
  suggestedEndTime?: Date;
  efficiency: number; // percentage of slot utilization
}

export default function ServiceDurationOverlay({
  visible,
  timeSlots,
  services,
  selectedTimeSlot,
  onServiceSelect,
  onClose,
  date,
  showFitAnalysis = true,
  showPricing = true,
}: ServiceDurationOverlayProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'duration' | 'price' | 'fit'>('fit');
  const [serviceFits, setServiceFits] = useState<ServiceFit[]>([]);

  useEffect(() => {
    if (visible && selectedTimeSlot) {
      analyzeServiceFits();
    }
  }, [visible, selectedTimeSlot, services, timeSlots]);

  const analyzeServiceFits = () => {
    if (!selectedTimeSlot) return;

    const availableTime = differenceInMinutes(selectedTimeSlot.endTime, selectedTimeSlot.startTime);
    
    const fits = services.map(service => {
      const requiredTime = service.duration + service.bufferTime;
      const fits = requiredTime <= availableTime;
      
      // Find conflicting slots
      const conflictingSlots = timeSlots.filter(slot => {
        if (slot.id === selectedTimeSlot.id) return false;
        
        const serviceEndTime = addMinutes(selectedTimeSlot.startTime, requiredTime);
        
        return isWithinInterval(slot.startTime, {
          start: selectedTimeSlot.startTime,
          end: serviceEndTime,
        }) || isWithinInterval(slot.endTime, {
          start: selectedTimeSlot.startTime,
          end: serviceEndTime,
        });
      });

      // Calculate efficiency
      const efficiency = Math.min((requiredTime / availableTime) * 100, 100);

      // Suggest optimal timing if service doesn't fit exactly
      let suggestedStartTime = selectedTimeSlot.startTime;
      let suggestedEndTime = addMinutes(selectedTimeSlot.startTime, requiredTime);

      if (!fits) {
        // Try to find the best fit within available slots
        const availableSlots = timeSlots.filter(slot => slot.type === 'available');
        const bestSlot = availableSlots.find(slot => {
          const slotDuration = differenceInMinutes(slot.endTime, slot.startTime);
          return slotDuration >= requiredTime;
        });

        if (bestSlot) {
          suggestedStartTime = bestSlot.startTime;
          suggestedEndTime = addMinutes(bestSlot.startTime, requiredTime);
        }
      }

      return {
        service,
        fits,
        availableTime,
        requiredTime,
        conflictingSlots,
        suggestedStartTime,
        suggestedEndTime,
        efficiency,
      };
    });

    setServiceFits(fits);
  };

  const getCategories = () => {
    const categories = new Set(services.map(s => s.category));
    return ['all', ...Array.from(categories)];
  };

  const getFilteredServices = () => {
    let filtered = serviceFits;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(sf => sf.service.category === selectedCategory);
    }

    // Sort services
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'duration':
          return a.service.duration - b.service.duration;
        case 'price':
          return a.service.price - b.service.price;
        case 'fit':
          if (a.fits && !b.fits) return -1;
          if (!a.fits && b.fits) return 1;
          return b.efficiency - a.efficiency;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getServiceColor = (service: Service) => {
    return service.color || colors.primary;
  };

  const getFitColor = (fit: ServiceFit) => {
    if (fit.fits) {
      if (fit.efficiency > 90) return colors.success;
      if (fit.efficiency > 70) return colors.warning;
      return colors.primary;
    }
    return colors.error;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatPrice = (price: number, currency: string) => {
    return `${price} ${currency}`;
  };

  const renderTimeVisualization = (fit: ServiceFit) => {
    if (!selectedTimeSlot) return null;

    const slotWidth = width - 64;
    const totalTime = differenceInMinutes(selectedTimeSlot.endTime, selectedTimeSlot.startTime);
    const serviceWidth = (fit.service.duration / totalTime) * slotWidth;
    const bufferWidth = (fit.service.bufferTime / totalTime) * slotWidth;

    return (
      <View style={styles.timeVisualization}>
        <View style={styles.timeScale}>
          <Text style={styles.timeScaleText}>
            {format(selectedTimeSlot.startTime, 'HH:mm')}
          </Text>
          <Text style={styles.timeScaleText}>
            {format(selectedTimeSlot.endTime, 'HH:mm')}
          </Text>
        </View>
        
        <View style={[styles.timeSlotBar, { width: slotWidth }]}>
          {/* Service duration */}
          <View
            style={[
              styles.serviceDurationBar,
              {
                width: serviceWidth,
                backgroundColor: getServiceColor(fit.service),
              },
            ]}
          />
          
          {/* Buffer time */}
          {fit.service.bufferTime > 0 && (
            <View
              style={[
                styles.bufferTimeBar,
                {
                  width: bufferWidth,
                  backgroundColor: `${getServiceColor(fit.service)}80`, // 50% opacity
                },
              ]}
            />
          )}
          
          {/* Remaining time */}
          <View style={styles.remainingTimeBar} />
        </View>
        
        <View style={styles.timeLabels}>
          <Text style={styles.timeLabel}>
            {t('service')}: {formatDuration(fit.service.duration)}
          </Text>
          {fit.service.bufferTime > 0 && (
            <Text style={styles.timeLabel}>
              {t('buffer')}: {formatDuration(fit.service.bufferTime)}
            </Text>
          )}
          <Text style={styles.timeLabel}>
            {t('total')}: {formatDuration(fit.requiredTime)}
          </Text>
        </View>
      </View>
    );
  };

  const renderServiceCard = (fit: ServiceFit) => {
    const service = fit.service;
    const serviceName = i18n.language === 'ar' ? service.name_ar : service.name;
    const categoryName = i18n.language === 'ar' ? service.category_ar : service.category;

    return (
      <TouchableOpacity
        key={service.id}
        style={[
          styles.serviceCard,
          { borderColor: getFitColor(fit) },
          !fit.fits && styles.unfitServiceCard,
        ]}
        onPress={() => onServiceSelect?.(service, fit.fits)}
        activeOpacity={0.8}
      >
        <View style={styles.serviceHeader}>
          <View style={styles.serviceInfo}>
            <View style={[
              styles.serviceColorDot,
              { backgroundColor: getServiceColor(service) }
            ]} />
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName}>{serviceName}</Text>
              <Text style={styles.serviceCategory}>{categoryName}</Text>
            </View>
          </View>
          
          <View style={styles.serviceMeta}>
            {showPricing && (
              <Text style={styles.servicePrice}>
                {formatPrice(service.price, service.currency)}
              </Text>
            )}
            <Text style={styles.serviceDuration}>
              {formatDuration(service.duration)}
            </Text>
          </View>
        </View>

        {showFitAnalysis && (
          <View style={styles.fitAnalysis}>
            <View style={styles.fitIndicator}>
              <Ionicons
                name={fit.fits ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={getFitColor(fit)}
              />
              <Text style={[styles.fitText, { color: getFitColor(fit) }]}>
                {fit.fits ? t('fits') : t('doesNotFit')}
              </Text>
              <Text style={styles.efficiencyText}>
                {Math.round(fit.efficiency)}% {t('efficiency')}
              </Text>
            </View>

            {fit.service.bufferTime > 0 && (
              <Text style={styles.bufferInfo}>
                +{formatDuration(fit.service.bufferTime)} {t('bufferTime')}
              </Text>
            )}

            {!fit.fits && fit.suggestedStartTime && (
              <Text style={styles.suggestionText}>
                {t('suggestedTime')}: {format(fit.suggestedStartTime, 'HH:mm')} - {format(fit.suggestedEndTime!, 'HH:mm')}
              </Text>
            )}
          </View>
        )}

        {fit.fits && renderTimeVisualization(fit)}

        {fit.conflictingSlots.length > 0 && (
          <View style={styles.conflictWarning}>
            <Ionicons name="warning" size={16} color={colors.warning} />
            <Text style={styles.conflictText}>
              {t('conflictsWith')} {fit.conflictingSlots.length} {t('otherSlots')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!visible || !selectedTimeSlot) {
    return null;
  }

  const filteredServices = getFilteredServices();
  const categories = getCategories();

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('serviceSelection')}</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Time Slot Info */}
        <View style={styles.slotInfo}>
          <Text style={styles.slotTitle}>{t('selectedTimeSlot')}</Text>
          <Text style={styles.slotTime}>
            {format(selectedTimeSlot.startTime, 'HH:mm')} - {format(selectedTimeSlot.endTime, 'HH:mm')}
          </Text>
          <Text style={styles.slotDuration}>
            {formatDuration(differenceInMinutes(selectedTimeSlot.endTime, selectedTimeSlot.startTime))} {t('available')}
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.selectedCategory,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category && styles.selectedCategoryText,
                ]}>
                  {category === 'all' ? t('all') : category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sort Options */}
          <View style={styles.sortOptions}>
            {[
              { key: 'fit', label: t('fit'), icon: 'checkmark-circle' },
              { key: 'duration', label: t('duration'), icon: 'time' },
              { key: 'price', label: t('price'), icon: 'pricetag' },
            ].map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortButton,
                  sortBy === option.key && styles.selectedSort,
                ]}
                onPress={() => setSortBy(option.key as any)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={16}
                  color={sortBy === option.key ? colors.white : colors.primary}
                />
                <Text style={[
                  styles.sortText,
                  sortBy === option.key && styles.selectedSortText,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Services List */}
        <ScrollView
          style={styles.servicesList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.servicesContent}
        >
          {filteredServices.map(renderServiceCard)}
          
          {filteredServices.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color={colors.gray} />
              <Text style={styles.emptyText}>{t('noServicesFound')}</Text>
              <Text style={styles.emptySubtext}>{t('tryAdjustingFilters')}</Text>
            </View>
          )}
        </ScrollView>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {filteredServices.filter(f => f.fits).length} {t('of')} {filteredServices.length} {t('servicesFit')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  slotInfo: {
    backgroundColor: colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  slotTitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },
  slotTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  slotDuration: {
    fontSize: 14,
    color: colors.gray,
  },
  filters: {
    backgroundColor: colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryFilter: {
    marginBottom: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
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
  sortOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedSort: {
    backgroundColor: colors.primary,
  },
  sortText: {
    fontSize: 12,
    color: colors.primary,
  },
  selectedSortText: {
    color: colors.white,
  },
  servicesList: {
    flex: 1,
  },
  servicesContent: {
    padding: 16,
    gap: 12,
  },
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  unfitServiceCard: {
    opacity: 0.7,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  serviceCategory: {
    fontSize: 12,
    color: colors.gray,
  },
  serviceMeta: {
    alignItems: 'flex-end',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 2,
  },
  serviceDuration: {
    fontSize: 12,
    color: colors.gray,
  },
  fitAnalysis: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginBottom: 12,
  },
  fitIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  fitText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  efficiencyText: {
    fontSize: 12,
    color: colors.gray,
    marginLeft: 'auto',
  },
  bufferInfo: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 12,
    color: colors.warning,
    fontStyle: 'italic',
  },
  timeVisualization: {
    marginBottom: 12,
  },
  timeScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeScaleText: {
    fontSize: 10,
    color: colors.gray,
  },
  timeSlotBar: {
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  serviceDurationBar: {
    height: '100%',
  },
  bufferTimeBar: {
    height: '100%',
  },
  remainingTimeBar: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  timeLabels: {
    flexDirection: 'row',
    gap: 12,
  },
  timeLabel: {
    fontSize: 10,
    color: colors.gray,
  },
  conflictWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lightWarning,
    padding: 8,
    borderRadius: 6,
  },
  conflictText: {
    fontSize: 12,
    color: colors.warning,
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
  summary: {
    backgroundColor: colors.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
});