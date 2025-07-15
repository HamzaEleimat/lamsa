/**
 * @file LocationSetupScreen.tsx
 * @description Provider onboarding screen for setting up business location and service areas
 * @author BeautyCort Development Team
 * @date Created: 2025-01-14
 * @copyright BeautyCort 2025
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Surface,
  Switch,
  Chip,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import i18n, { isRTL } from '../../../i18n';
import ProgressIndicator from '../../../components/onboarding/ProgressIndicator';
import { ProviderOnboardingStackParamList } from '../../../navigation/ProviderOnboardingNavigator';
import { ProviderOnboardingService } from '../../../services/ProviderOnboardingService';
import { BusinessType } from '../../../types';

type LocationSetupNavigationProp = NativeStackNavigationProp<
  ProviderOnboardingStackParamList,
  'LocationSetup'
>;

type LocationSetupRouteProp = RouteProp<
  ProviderOnboardingStackParamList,
  'LocationSetup'
>;

interface Props {
  navigation: LocationSetupNavigationProp;
  route: LocationSetupRouteProp;
}

interface LocationSetupFormData {
  address: string;
  addressAr: string;
  latitude: number;
  longitude: number;
  isMobile: boolean;
  serviceRadius?: number;
  serviceAreas?: string[];
  landmark?: string;
  landmarkAr?: string;
}

const { width: screenWidth } = Dimensions.get('window');
const JORDAN_REGION = {
  latitude: 31.9454,
  longitude: 35.9284,
  latitudeDelta: 2,
  longitudeDelta: 2,
};

const AMMAN_REGION = {
  latitude: 31.9515,
  longitude: 35.9239,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const JORDAN_SERVICE_AREAS = [
  'عمان الشرقية',
  'عمان الغربية', 
  'الزرقاء',
  'إربد',
  'العقبة',
  'الكرك',
  'معان',
  'الطفيلة',
  'مادبا',
  'جرش',
  'عجلون',
  'البلقاء',
];

const LocationSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { phoneNumber } = route.params;
  const mapRef = useRef<MapView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [businessType, setBusinessType] = useState<BusinessType>(BusinessType.SALON);
  const [region, setRegion] = useState<Region>(AMMAN_REGION);
  const [selectedServiceAreas, setSelectedServiceAreas] = useState<string[]>([]);

  const stepTitles = [
    i18n.t('providerOnboarding.steps.businessInfo'),
    i18n.t('providerOnboarding.steps.location'),
    i18n.t('providerOnboarding.steps.categories'),
    i18n.t('providerOnboarding.steps.hours'),
    i18n.t('providerOnboarding.steps.license'),
    i18n.t('providerOnboarding.steps.tutorial'),
    i18n.t('providerOnboarding.steps.completion'),
  ];

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    trigger,
  } = useForm<LocationSetupFormData>({
    mode: 'onChange',
    defaultValues: {
      isMobile: false,
      serviceRadius: 10,
      latitude: AMMAN_REGION.latitude,
      longitude: AMMAN_REGION.longitude,
    },
  });

  const isMobile = watch('isMobile');
  const currentLatitude = watch('latitude');
  const currentLongitude = watch('longitude');

  useEffect(() => {
    loadDraftData();
    requestLocationPermission();
  }, []);

  const loadDraftData = async () => {
    try {
      const onboardingState = await ProviderOnboardingService.getCurrentOnboardingState();
      if (onboardingState?.provider) {
        // Load business type from step 1
        const step1Data = onboardingState.steps.find(step => step.stepNumber === 1)?.data;
        if (step1Data?.businessType) {
          setBusinessType(step1Data.businessType);
          setValue('isMobile', step1Data.businessType === BusinessType.MOBILE);
        }

        // Load location data from step 3
        const step3Data = onboardingState.steps.find(step => step.stepNumber === 3)?.data;
        if (step3Data) {
          setValue('address', step3Data.address || '');
          setValue('addressAr', step3Data.addressAr || '');
          setValue('latitude', step3Data.latitude || AMMAN_REGION.latitude);
          setValue('longitude', step3Data.longitude || AMMAN_REGION.longitude);
          setValue('isMobile', step3Data.isMobile || false);
          setValue('serviceRadius', step3Data.serviceRadius || 10);
          setValue('landmark', step3Data.landmark || '');
          setValue('landmarkAr', step3Data.landmarkAr || '');
          
          if (step3Data.serviceAreas) {
            setSelectedServiceAreas(step3Data.serviceAreas);
          }

          if (step3Data.latitude && step3Data.longitude) {
            const newRegion = {
              ...region,
              latitude: step3Data.latitude,
              longitude: step3Data.longitude,
            };
            setRegion(newRegion);
          }
        }
      }
    } catch (error) {
      console.error('Error loading draft data:', error);
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        ...region,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setRegion(newRegion);
      setValue('latitude', location.coords.latitude);
      setValue('longitude', location.coords.longitude);
      trigger(['latitude', 'longitude']);
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setValue('latitude', latitude);
    setValue('longitude', longitude);
    trigger(['latitude', 'longitude']);
    
    // Update region to center map on selected point
    setRegion({
      ...region,
      latitude,
      longitude,
    });
  };

  const centerOnCurrentLocation = () => {
    getCurrentLocation();
  };

  const handleServiceAreaToggle = (area: string) => {
    const newAreas = selectedServiceAreas.includes(area)
      ? selectedServiceAreas.filter(a => a !== area)
      : [...selectedServiceAreas, area];
    setSelectedServiceAreas(newAreas);
    saveDraft({ ...watch(), serviceAreas: newAreas });
  };

  const saveDraft = async (data: Partial<LocationSetupFormData>) => {
    try {
      await ProviderOnboardingService.updateLocationSetup({
        ...data,
        serviceAreas: selectedServiceAreas,
        isCompleted: false,
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const onSubmit = async (data: LocationSetupFormData) => {
    setIsLoading(true);
    try {
      const submitData = {
        ...data,
        serviceAreas: selectedServiceAreas,
      };

      // Validate form data
      const validation = ProviderOnboardingService.validateStepData(3, submitData);
      if (!validation.isValid) {
        Alert.alert(
          i18n.t('common.error'),
          validation.errors.join('\n')
        );
        return;
      }

      // Save data and mark step as completed
      await ProviderOnboardingService.updateLocationSetup({
        ...submitData,
        isCompleted: true,
      });

      navigation.navigate('ServiceCategories', { phoneNumber });
    } catch (error) {
      console.error('Error submitting location setup:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.errors.locationSave')
      );
    } finally {
      setIsLoading(false);
    }
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
        currentStep={2}
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
              name="map-marker-outline"
              size={48}
              color={theme.colors.primary}
            />
            <Text variant="headlineSmall" style={styles.title}>
              {i18n.t('providerOnboarding.location.title')}
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {i18n.t('providerOnboarding.location.subtitle')}
            </Text>
          </View>

          {/* Map Section */}
          <Surface style={styles.mapContainer} elevation={2}>
            <View style={styles.mapHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {i18n.t('providerOnboarding.location.selectOnMap')}
              </Text>
              <Button
                mode="outlined"
                onPress={centerOnCurrentLocation}
                icon="crosshairs-gps"
                compact
                style={styles.locationButton}
              >
                {i18n.t('providerOnboarding.location.currentLocation')}
              </Button>
            </View>

            <MapView
              ref={mapRef}
              style={styles.map}
              region={region}
              onRegionChangeComplete={setRegion}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
              provider="google"
            >
              {currentLatitude && currentLongitude && (
                <Marker
                  coordinate={{
                    latitude: currentLatitude,
                    longitude: currentLongitude,
                  }}
                  title={i18n.t('providerOnboarding.location.selectedLocation')}
                  draggable
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setValue('latitude', latitude);
                    setValue('longitude', longitude);
                    trigger(['latitude', 'longitude']);
                  }}
                />
              )}
            </MapView>
          </Surface>

          {/* Form Section */}
          <Surface style={styles.formContainer} elevation={1}>
            {/* Mobile Service Toggle */}
            {businessType !== BusinessType.MOBILE && (
              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text variant="titleSmall">
                      {i18n.t('providerOnboarding.location.offerMobileService')}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {i18n.t('providerOnboarding.location.mobileServiceDescription')}
                    </Text>
                  </View>
                  <Controller
                    control={control}
                    name="isMobile"
                    render={({ field: { value, onChange } }) => (
                      <Switch
                        value={value}
                        onValueChange={(newValue) => {
                          onChange(newValue);
                          saveDraft({ ...watch(), isMobile: newValue });
                        }}
                      />
                    )}
                  />
                </View>
              </View>
            )}

            {/* Address */}
            <View style={styles.inputGroup}>
              <Controller
                control={control}
                name="address"
                rules={{
                  required: i18n.t('providerOnboarding.validation.addressRequired'),
                  minLength: {
                    value: 10,
                    message: i18n.t('providerOnboarding.validation.addressMin'),
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    mode="outlined"
                    label={i18n.t('providerOnboarding.fields.address')}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      onChange(text);
                      saveDraft({ ...watch(), address: text });
                    }}
                    error={!!errors.address}
                    multiline
                    numberOfLines={2}
                    style={styles.input}
                  />
                )}
              />
              {errors.address && (
                <HelperText type="error">{errors.address.message}</HelperText>
              )}
            </View>

            {/* Address (Arabic) */}
            <View style={styles.inputGroup}>
              <Controller
                control={control}
                name="addressAr"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    mode="outlined"
                    label={i18n.t('providerOnboarding.fields.addressAr')}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      onChange(text);
                      saveDraft({ ...watch(), addressAr: text });
                    }}
                    multiline
                    numberOfLines={2}
                    style={[styles.input, styles.inputRTL]}
                  />
                )}
              />
            </View>

            {/* Landmark */}
            <View style={styles.inputGroup}>
              <Controller
                control={control}
                name="landmark"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    mode="outlined"
                    label={i18n.t('providerOnboarding.fields.landmark')}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      onChange(text);
                      saveDraft({ ...watch(), landmark: text });
                    }}
                    style={styles.input}
                  />
                )}
              />
            </View>

            {/* Service Areas (for mobile services) */}
            {isMobile && (
              <View style={styles.inputGroup}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  {i18n.t('providerOnboarding.location.serviceAreas')}
                </Text>
                <Text variant="bodySmall" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {i18n.t('providerOnboarding.location.serviceAreasDescription')}
                </Text>
                
                <View style={styles.chipContainer}>
                  {JORDAN_SERVICE_AREAS.map((area) => (
                    <Chip
                      key={area}
                      mode={selectedServiceAreas.includes(area) ? 'flat' : 'outlined'}
                      selected={selectedServiceAreas.includes(area)}
                      onPress={() => handleServiceAreaToggle(area)}
                      style={styles.chip}
                      textStyle={styles.chipText}
                    >
                      {area}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {/* Service Radius (for mobile services) */}
            {isMobile && (
              <View style={styles.inputGroup}>
                <Controller
                  control={control}
                  name="serviceRadius"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      mode="outlined"
                      label={i18n.t('providerOnboarding.fields.serviceRadius')}
                      value={value?.toString()}
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        const radius = parseInt(text) || 10;
                        onChange(radius);
                        saveDraft({ ...watch(), serviceRadius: radius });
                      }}
                      keyboardType="numeric"
                      right={<TextInput.Affix text="كم" />}
                      style={styles.input}
                    />
                  )}
                />
              </View>
            )}
          </Surface>
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
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || isLoading}
          loading={isLoading}
          style={styles.continueButton}
        >
          {i18n.t('providerOnboarding.buttons.continue')}
        </Button>
      </View>
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
  mapContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationButton: {
    borderRadius: 20,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  formContainer: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  inputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
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

export default LocationSetupScreen;