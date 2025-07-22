import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

// Types for compatibility
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Callout extends React.FC<any> {}

export const PROVIDER_GOOGLE = 'google';

// Web-compatible map component
interface MapViewProps {
  style?: any;
  region?: Region;
  onRegionChange?: (region: Region) => void;
  provider?: string;
  children?: React.ReactNode;
}

const MapView: React.FC<MapViewProps> = ({ style, region, children, ...props }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.placeholder}>
        Map View (Web Version)
        {region && (
          <Text style={styles.coordinates}>
            {'\n'}Lat: {region.latitude.toFixed(4)}, Lng: {region.longitude.toFixed(4)}
          </Text>
        )}
      </Text>
      {children}
    </View>
  );
};

const Marker: React.FC<any> = ({ coordinate, title, children, ...props }) => {
  return (
    <View style={styles.marker}>
      <Text style={styles.markerText}>📍 {title || 'Marker'}</Text>
      {children}
    </View>
  );
};

const CalloutComponent: React.FC<any> = ({ children }) => {
  return <View style={styles.callout}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholder: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  coordinates: {
    fontSize: 12,
    color: '#999',
  },
  marker: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  markerText: {
    fontSize: 12,
    color: '#333',
  },
  callout: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});

export default MapView;
export { Marker, CalloutComponent as Callout, PROVIDER_GOOGLE };
export type { Region };