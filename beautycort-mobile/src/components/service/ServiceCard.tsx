import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  I18nManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { EnhancedService } from '../../types/service.types';
import { colors } from '../../constants/colors';

interface ServiceCardProps {
  service: EnhancedService;
  onPress?: () => void;
  onQuickToggle?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  showAnalytics?: boolean;
}

export default function ServiceCard({
  service,
  onPress,
  onQuickToggle,
  onEdit,
  onDuplicate,
  onDelete,
  bulkMode = false,
  isSelected = false,
  onToggleSelection,
  showAnalytics = true,
}: ServiceCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const serviceName = i18n.language === 'ar' ? service.name_ar : service.name_en;
  const serviceDescription = i18n.language === 'ar' ? service.description_ar : service.description_en;

  const handleCardPress = () => {
    if (bulkMode) {
      onToggleSelection?.();
    } else {
      onPress?.();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        !service.active && styles.inactiveCard,
        bulkMode && isSelected && styles.selectedCard,
      ]}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      {/* Bulk Mode Checkbox */}
      {bulkMode && (
        <View style={styles.checkboxContainer}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={24}
            color={colors.primary}
          />
        </View>
      )}

      {/* Service Image */}
      <View style={styles.imageContainer}>
        {service.image_urls && service.image_urls.length > 0 ? (
          <Image
            source={{ uri: service.image_urls[0] }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={24} color={colors.gray} />
          </View>
        )}
        
        {/* Status Badge */}
        <View style={[styles.statusBadge, service.active ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, service.active && styles.activeStatusText]}>
            {service.active ? t('active') : t('inactive')}
          </Text>
        </View>
      </View>

      {/* Service Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {serviceName}
          </Text>
          
          {/* Quick Toggle Button */}
          {!bulkMode && (
            <TouchableOpacity
              style={styles.quickToggleButton}
              onPress={onQuickToggle}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={service.active ? 'pause-circle' : 'play-circle'}
                size={24}
                color={service.active ? colors.warning : colors.success}
              />
            </TouchableOpacity>
          )}
        </View>

        {serviceDescription && (
          <Text style={styles.description} numberOfLines={2}>
            {serviceDescription}
          </Text>
        )}

        {/* Price and Duration */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {service.price} {t('jod')}
          </Text>
          <Text style={styles.duration}>
            {service.duration_minutes} {t('minutes')}
          </Text>
        </View>

        {/* Tags */}
        {service.tags && service.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {service.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: tag.color || colors.lightGray }]}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {i18n.language === 'ar' ? tag.name_ar : tag.name_en}
                </Text>
              </View>
            ))}
            {service.tags.length > 2 && (
              <Text style={styles.moreTagsText}>
                +{service.tags.length - 2}
              </Text>
            )}
          </View>
        )}

        {/* Analytics Row */}
        {showAnalytics && (
          <View style={styles.analyticsRow}>
            <View style={styles.analyticItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.gray} />
              <Text style={styles.analyticText}>
                {service.booking_count || 0}
              </Text>
            </View>
            <View style={styles.analyticItem}>
              <Ionicons name="trending-up-outline" size={14} color={colors.gray} />
              <Text style={styles.analyticText}>
                {service.popularity_score || 0}
              </Text>
            </View>
            <View style={styles.analyticItem}>
              <Ionicons name="eye-outline" size={14} color={colors.gray} />
              <Text style={styles.analyticText}>
                {service.analytics?.views_count || 0}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {!bulkMode && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onEdit}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onDuplicate}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="copy-outline" size={18} color={colors.secondary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    margin: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  inactiveCard: {
    opacity: 0.7,
  },
  selectedCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  activeBadge: {
    backgroundColor: colors.success,
  },
  inactiveBadge: {
    backgroundColor: colors.error,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  activeStatusText: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  quickToggleButton: {
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  duration: {
    fontSize: 14,
    color: colors.gray,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    maxWidth: 80,
  },
  tagText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    color: colors.gray,
    fontStyle: 'italic',
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  analyticItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analyticText: {
    fontSize: 12,
    color: colors.gray,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.lightGray,
  },
});