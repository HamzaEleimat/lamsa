import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, shadows } from '../../theme';
import { Button } from './Button';
import { Badge } from './Badge';
import { isRTL } from '../../i18n';

interface ProviderCardProps {
  provider: {
    id: string;
    name: string;
    image?: string;
    rating: number;
    reviewCount: number;
    distance?: number;
    isOpen?: boolean;
    isVerified?: boolean;
    services?: string[];
  };
  onPress: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  onPress,
  onFavorite,
  isFavorite = false,
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[styles.providerCard, { backgroundColor: theme.colors.surface }, shadows.md]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.providerImageContainer}>
        <Image
          source={{ uri: provider.image || 'https://via.placeholder.com/300x200' }}
          style={styles.providerImage}
          resizeMode="cover"
        />
        {onFavorite && (
          <TouchableOpacity
            style={[styles.favoriteButton, { backgroundColor: theme.colors.surface }]}
            onPress={onFavorite}
          >
            <MaterialCommunityIcons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? theme.colors.error : theme.colors.onSurface}
            />
          </TouchableOpacity>
        )}
        <View style={styles.providerBadges}>
          {provider.isVerified && (
            <Badge variant="info" size="small">VERIFIED</Badge>
          )}
          {provider.isOpen && (
            <Badge variant="success" size="small">OPEN NOW</Badge>
          )}
        </View>
      </View>

      <View style={styles.providerContent}>
        <Text style={[styles.providerName, { color: theme.colors.onSurface }]}>
          {provider.name}
        </Text>
        
        <View style={styles.providerMeta}>
          <View style={styles.ratingContainer}>
            <MaterialCommunityIcons
              name="star"
              size={16}
              color={theme.colors.warning}
            />
            <Text style={[styles.rating, { color: theme.colors.onSurface }]}>
              {provider.rating.toFixed(1)}
            </Text>
            <Text style={[styles.reviewCount, { color: theme.colors.onSurfaceVariant }]}>
              ({provider.reviewCount})
            </Text>
          </View>
          
          {provider.distance && (
            <Text style={[styles.distance, { color: theme.colors.onSurfaceVariant }]}>
              {provider.distance.toFixed(1)} km
            </Text>
          )}
        </View>

        {provider.services && provider.services.length > 0 && (
          <View style={styles.servicesPreview}>
            {provider.services.slice(0, 3).map((service, index) => (
              <Text
                key={index}
                style={[styles.serviceTag, { color: theme.colors.onSurfaceVariant }]}
              >
                {service}
              </Text>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    provider: string;
    price: number;
    duration: number;
    image?: string;
  };
  onPress: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onPress }) => {
  const theme = useTheme();

  return (
    <View style={[styles.serviceCard, { backgroundColor: theme.colors.surface }, shadows.md]}>
      <Image
        source={{ uri: service.image || 'https://via.placeholder.com/120x120' }}
        style={styles.serviceImage}
        resizeMode="cover"
      />
      
      <View style={styles.serviceContent}>
        <View style={styles.serviceHeader}>
          <View style={styles.serviceInfo}>
            <Text style={[styles.serviceName, { color: theme.colors.onSurface }]}>
              {service.name}
            </Text>
            <Text style={[styles.serviceProvider, { color: theme.colors.onSurfaceVariant }]}>
              {service.provider}
            </Text>
          </View>
          <View style={styles.serviceMeta}>
            <Text style={[styles.servicePrice, { color: theme.colors.primary }]}>
              {service.price} JOD
            </Text>
            <Text style={[styles.serviceDuration, { color: theme.colors.onSurfaceVariant }]}>
              {service.duration} min
            </Text>
          </View>
        </View>
        
        <Button
          variant="primary"
          size="small"
          onPress={onPress}
          fullWidth
          style={{ marginTop: spacing.md }}
        >
          BOOK
        </Button>
      </View>
    </View>
  );
};

interface EmployeeCardProps {
  employee: {
    id: string;
    name: string;
    role: string;
    image?: string;
    rating?: number;
    specialties?: string[];
  };
  onSelect: () => void;
  isSelected?: boolean;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onSelect,
  isSelected = false,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.employeeCard,
        { 
          backgroundColor: theme.colors.surface,
          borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
          borderWidth: isSelected ? 2 : 1,
        },
        shadows.sm,
      ]}
    >
      <Image
        source={{ uri: employee.image || 'https://via.placeholder.com/80x80' }}
        style={styles.employeeImage}
        resizeMode="cover"
      />
      
      <Text style={[styles.employeeName, { color: theme.colors.onSurface }]}>
        {employee.name}
      </Text>
      
      <Text style={[styles.employeeRole, { color: theme.colors.onSurfaceVariant }]}>
        {employee.role}
      </Text>
      
      {employee.rating && (
        <View style={styles.employeeRating}>
          <MaterialCommunityIcons
            name="star"
            size={14}
            color={theme.colors.warning}
          />
          <Text style={[styles.rating, { color: theme.colors.onSurface }]}>
            {employee.rating.toFixed(1)}
          </Text>
        </View>
      )}
      
      {employee.specialties && employee.specialties.length > 0 && (
        <View style={styles.employeeSpecialties}>
          {employee.specialties.map((specialty, index) => (
            <Badge key={index} variant="secondary" size="small">
              {specialty}
            </Badge>
          ))}
        </View>
      )}
      
      <Button
        variant="outline"
        size="small"
        onPress={onSelect}
        fullWidth
        style={{ marginTop: spacing.md }}
      >
        {isSelected ? 'SELECTED' : 'SELECT'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  // Provider Card Styles
  providerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  providerImageContainer: {
    position: 'relative',
    height: 180,
  },
  providerImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  providerBadges: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  providerContent: {
    padding: spacing.md,
  },
  providerName: {
    fontSize: 18,
    fontFamily: 'CormorantGaramond_600SemiBold',
    marginBottom: spacing.xs,
  },
  providerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rating: {
    fontSize: 14,
    fontFamily: 'MartelSans_600SemiBold',
  },
  reviewCount: {
    fontSize: 12,
    fontFamily: 'MartelSans_400Regular',
  },
  distance: {
    fontSize: 12,
    fontFamily: 'MartelSans_400Regular',
  },
  servicesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  serviceTag: {
    fontSize: 12,
    fontFamily: 'MartelSans_400Regular',
  },

  // Service Card Styles
  serviceCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  serviceImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  serviceContent: {
    flex: 1,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: 'CormorantGaramond_600SemiBold',
    marginBottom: spacing.xs,
  },
  serviceProvider: {
    fontSize: 14,
    fontFamily: 'MartelSans_400Regular',
  },
  serviceMeta: {
    alignItems: isRTL() ? 'flex-start' : 'flex-end',
  },
  servicePrice: {
    fontSize: 18,
    fontFamily: 'MartelSans_700Bold',
  },
  serviceDuration: {
    fontSize: 12,
    fontFamily: 'MartelSans_400Regular',
  },

  // Employee Card Styles
  employeeCard: {
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 160,
  },
  employeeImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.sm,
  },
  employeeName: {
    fontSize: 16,
    fontFamily: 'CormorantGaramond_600SemiBold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  employeeRole: {
    fontSize: 14,
    fontFamily: 'MartelSans_400Regular',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  employeeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  employeeSpecialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
});