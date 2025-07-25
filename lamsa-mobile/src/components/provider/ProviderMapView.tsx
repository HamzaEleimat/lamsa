import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Region } from '../MapView';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { ProviderWithDistance } from '../../services/providerService';
import ProviderCard from './ProviderCard';
import { BusinessType } from '../../types';

const { width, height } = Dimensions.get('window');

// Jordan default coordinates (Amman)
const DEFAULT_REGION = {
  latitude: 31.9539,
  longitude: 35.9106,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

interface ProviderMapViewProps {
  providers: ProviderWithDistance[];
  loading?: boolean;
  onProviderPress: (provider: ProviderWithDistance) => void;
  currentLocation?: { latitude: number; longitude: number };
  onRegionChange?: (region: Region) => void;
  onMapReady?: () => void;
  style?: any;
}

interface ClusteredMarker {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  providers: ProviderWithDistance[];
}

export default function ProviderMapView({
  providers,
  loading = false,
  onProviderPress,
  currentLocation,
  onRegionChange,
  onMapReady,
  style,
}: ProviderMapViewProps) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithDistance | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [clusteredMarkers, setClusteredMarkers] = useState<ClusteredMarker[]>([]);

  // Calculate clusters based on zoom level
  useEffect(() => {
    const clusterProviders = () => {
      // Simple clustering algorithm - group providers within 0.01 degrees
      const clusters: ClusteredMarker[] = [];
      const processed = new Set<string>();

      providers.forEach(provider => {
        if (processed.has(provider.id)) return;

        const cluster: ProviderWithDistance[] = [provider];
        processed.add(provider.id);

        // Find nearby providers
        providers.forEach(otherProvider => {
          if (
            !processed.has(otherProvider.id) &&
            Math.abs(provider.location.latitude - otherProvider.location.latitude) < 0.01 &&
            Math.abs(provider.location.longitude - otherProvider.location.longitude) < 0.01
          ) {
            cluster.push(otherProvider);
            processed.add(otherProvider.id);
          }
        });

        // Calculate cluster center
        const centerLat = cluster.reduce((sum, p) => sum + p.location.latitude, 0) / cluster.length;
        const centerLng = cluster.reduce((sum, p) => sum + p.location.longitude, 0) / cluster.length;

        clusters.push({
          id: cluster.map(p => p.id).join('-'),
          coordinate: {
            latitude: centerLat,
            longitude: centerLng,
          },
          providers: cluster,
        });
      });

      setClusteredMarkers(clusters);
    };

    clusterProviders();
  }, [providers, region]);

  const getMarkerColor = (type: BusinessType): string => {
    switch (type) {
      case BusinessType.SALON:
        return colors.primary;
      case BusinessType.SPA:
        return colors.secondary;
      case BusinessType.MOBILE:
        return colors.warning;
      case BusinessType.HOME_BASED:
        return colors.success;
      case BusinessType.CLINIC:
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const handleMarkerPress = useCallback((provider: ProviderWithDistance) => {
    setSelectedProvider(provider);
    setShowProviderModal(true);
  }, []);

  const handleProviderSelect = useCallback(() => {
    if (selectedProvider) {
      setShowProviderModal(false);
      onProviderPress(selectedProvider);
    }
  }, [selectedProvider, onProviderPress]);

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);
    onRegionChange?.(newRegion);
  }, [onRegionChange]);

  const centerOnUserLocation = useCallback(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [currentLocation]);

  const renderMarker = useCallback((cluster: ClusteredMarker) => {
    const isCluster = cluster.providers.length > 1;
    const provider = cluster.providers[0];

    return (
      <Marker
        key={cluster.id}
        coordinate={cluster.coordinate}
        onPress={() => {
          if (isCluster) {
            // Zoom in on cluster
            mapRef.current?.animateToRegion({
              ...cluster.coordinate,
              latitudeDelta: region.latitudeDelta * 0.5,
              longitudeDelta: region.longitudeDelta * 0.5,
            });
          } else {
            handleMarkerPress(provider);
          }
        }}
      >
        {isCluster ? (
          <View style={styles.clusterMarker}>
            <Text style={styles.clusterText}>{cluster.providers.length}</Text>
          </View>
        ) : (
          <View style={[styles.marker, { backgroundColor: getMarkerColor(provider.businessType) }]}>
            <Ionicons name="location" size={24} color={colors.white} />
          </View>
        )}
      </Marker>
    );
  }, [region, handleMarkerPress]);

  const renderProviderModal = () => {
    if (!selectedProvider) return null;

    return (
      <Modal
        visible={showProviderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProviderModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={0.8}
          onPress={() => setShowProviderModal(false)}
        >
          <View style={styles.modalContent}>
            <ProviderCard
              provider={selectedProvider}
              onPress={handleProviderSelect}
              viewMode="map"
              showDistance={!!currentLocation}
              currentLocation={currentLocation}
            />
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={handleProviderSelect}
            >
              <Text style={styles.viewDetailsText}>{t('viewDetails')}</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={currentLocation ? {
          ...currentLocation,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        } : DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        onMapReady={onMapReady}
        showsUserLocation={!!currentLocation}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {clusteredMarkers.map(renderMarker)}
      </MapView>

      {/* Custom location button */}
      {currentLocation && (
        <TouchableOpacity
          style={styles.locationButton}
          onPress={centerOnUserLocation}
        >
          <Ionicons name="locate" size={24} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('loadingProviders')}</Text>
          </View>
        </View>
      )}

      {/* Provider info modal */}
      {renderProviderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  clusterMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  clusterText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  locationButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray,
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
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  viewDetailsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});