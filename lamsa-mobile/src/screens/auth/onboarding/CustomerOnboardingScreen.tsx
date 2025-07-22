import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  HelperText,
  Avatar,
  Chip,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../contexts/AuthContext';
import { getSupabase } from '../../../lib/supabase';
import { showMessage } from 'react-native-flash-message';

interface CustomerData {
  name: string;
  email: string;
  profilePhoto: string | null;
  preferredLanguage: 'ar' | 'en';
  locationEnabled: boolean;
  latitude?: number;
  longitude?: number;
}

const CustomerOnboardingScreen = ({ route }: any) => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { t, locale, setLocale } = useTranslation();
  const { user, signIn } = useAuth();
  const { userData } = route.params;

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    profilePhoto: null,
    preferredLanguage: locale as 'ar' | 'en',
    locationEnabled: false,
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
  });

  const validateStep1 = () => {
    const newErrors = { name: '', email: '' };
    
    if (!customerData.name.trim()) {
      newErrors.name = t('customer.onboarding.nameRequired');
    } else if (customerData.name.trim().length < 2) {
      newErrors.name = t('customer.onboarding.nameTooShort');
    }

    if (customerData.email && !isValidEmail(customerData.email)) {
      newErrors.email = t('customer.onboarding.invalidEmail');
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.email;
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showMessage({
        message: t('customer.onboarding.photoPermissionRequired'),
        type: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setCustomerData({
        ...customerData,
        profilePhoto: `data:image/jpeg;base64,${asset.base64}`,
      });
    }
  };

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        showMessage({
          message: t('customer.onboarding.locationPermissionDenied'),
          type: 'warning',
        });
        return;
      }

      setLoading(true);
      const location = await Location.getCurrentPositionAsync({});
      
      setCustomerData({
        ...customerData,
        locationEnabled: true,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      showMessage({
        message: t('customer.onboarding.locationEnabled'),
        type: 'success',
      });
    } catch (error) {
      showMessage({
        message: t('customer.onboarding.locationError'),
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      setLoading(true);

      // Create user profile in database
      const client = await getSupabase();
      const { data: profile, error } = await client
        .from('users')
        .insert({
          id: user?.id,
          phone: userData.phone,
          name: customerData.name,
          email: customerData.email || null,
          profile_image: customerData.profilePhoto,
          preferred_language: customerData.preferredLanguage,
          location_enabled: customerData.locationEnabled,
          latitude: customerData.latitude,
          longitude: customerData.longitude,
          user_type: 'customer',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update auth context
      await signIn(profile);

      showMessage({
        message: t('customer.onboarding.welcomeMessage'),
        type: 'success',
      });

      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error: any) {
      showMessage({
        message: error.message || t('common.error'),
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
        {t('customer.onboarding.basicInfo')}
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {t('customer.onboarding.basicInfoSubtitle')}
      </Text>

      <TextInput
        label={t('customer.onboarding.fullName')}
        value={customerData.name}
        onChangeText={(text) => {
          setCustomerData({ ...customerData, name: text });
          if (errors.name) setErrors({ ...errors, name: '' });
        }}
        mode="outlined"
        error={!!errors.name}
        style={styles.input}
        left={<TextInput.Icon icon="account" />}
      />
      <HelperText type="error" visible={!!errors.name}>
        {errors.name}
      </HelperText>

      <TextInput
        label={t('customer.onboarding.email')}
        value={customerData.email}
        onChangeText={(text) => {
          setCustomerData({ ...customerData, email: text });
          if (errors.email) setErrors({ ...errors, email: '' });
        }}
        mode="outlined"
        error={!!errors.email}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        left={<TextInput.Icon icon="email" />}
      />
      <HelperText type="error" visible={!!errors.email}>
        {errors.email}
      </HelperText>
      <HelperText type="info" visible={!customerData.email}>
        {t('customer.onboarding.emailOptional')}
      </HelperText>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
        {t('customer.onboarding.profilePhoto')}
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {t('customer.onboarding.profilePhotoSubtitle')}
      </Text>

      <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
        {customerData.profilePhoto ? (
          <Avatar.Image
            size={120}
            source={{ uri: customerData.profilePhoto }}
            style={styles.avatar}
          />
        ) : (
          <Surface style={[styles.photoPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons
              name="camera-plus"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              {t('customer.onboarding.addPhoto')}
            </Text>
          </Surface>
        )}
      </TouchableOpacity>

      <View style={styles.languageContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          {t('customer.onboarding.preferredLanguage')}
        </Text>
        <View style={styles.chipContainer}>
          <Chip
            selected={customerData.preferredLanguage === 'ar'}
            onPress={() => {
              setCustomerData({ ...customerData, preferredLanguage: 'ar' });
              setLocale('ar');
            }}
            style={styles.chip}
          >
            العربية
          </Chip>
          <Chip
            selected={customerData.preferredLanguage === 'en'}
            onPress={() => {
              setCustomerData({ ...customerData, preferredLanguage: 'en' });
              setLocale('en');
            }}
            style={styles.chip}
          >
            English
          </Chip>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
        {t('customer.onboarding.locationServices')}
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {t('customer.onboarding.locationServicesSubtitle')}
      </Text>

      <Surface style={[styles.locationCard, { backgroundColor: theme.colors.surface }]}>
        <MaterialCommunityIcons
          name="map-marker-radius"
          size={64}
          color={theme.colors.primary}
          style={styles.locationIcon}
        />
        
        {customerData.locationEnabled ? (
          <>
            <MaterialCommunityIcons
              name="check-circle"
              size={32}
              color={theme.colors.primary}
              style={styles.checkIcon}
            />
            <Text style={[styles.locationStatus, { color: theme.colors.primary }]}>
              {t('customer.onboarding.locationEnabled')}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.locationText, { color: theme.colors.onSurface }]}>
              {t('customer.onboarding.locationBenefits')}
            </Text>
            <Button
              mode="contained"
              onPress={requestLocation}
              loading={loading}
              style={styles.locationButton}
            >
              {t('customer.onboarding.enableLocation')}
            </Button>
            <Button
              mode="text"
              onPress={() => setCurrentStep(4)}
              style={styles.skipButton}
            >
              {t('customer.onboarding.skipForNow')}
            </Button>
          </>
        )}
      </Surface>
    </View>
  );

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map((step) => (
        <View
          key={step}
          style={[
            styles.progressStep,
            {
              backgroundColor:
                step <= currentStep ? theme.colors.primary : theme.colors.surfaceVariant,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderProgressBar()}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <Button
                mode="outlined"
                onPress={previousStep}
                style={styles.button}
                disabled={loading}
              >
                {t('common.back')}
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button
                mode="contained"
                onPress={nextStep}
                style={[styles.button, currentStep === 1 && styles.fullWidthButton]}
                disabled={loading}
              >
                {t('common.next')}
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={completeOnboarding}
                style={[styles.button, !customerData.locationEnabled && styles.fullWidthButton]}
                loading={loading}
                disabled={loading}
              >
                {t('customer.onboarding.getStarted')}
              </Button>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  progressStep: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  stepContainer: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    marginBottom: 4,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  languageContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  chip: {
    paddingHorizontal: 16,
  },
  locationCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
  },
  locationIcon: {
    marginBottom: 24,
  },
  checkIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  locationStatus: {
    fontSize: 18,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  locationButton: {
    marginBottom: 12,
  },
  skipButton: {
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 16,
  },
  button: {
    flex: 1,
  },
  fullWidthButton: {
    flex: 1,
    marginHorizontal: 0,
  },
});

export default CustomerOnboardingScreen;