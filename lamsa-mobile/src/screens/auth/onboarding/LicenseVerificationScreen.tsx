/**
 * @file LicenseVerificationScreen.tsx
 * @description Provider onboarding screen for license verification and portfolio submission
 * @author Lamsa Development Team
 * @date Created: 2025-01-14
 * @copyright Lamsa 2025
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  RadioButton,
  TextInput,
  Card,
  IconButton,
  Chip,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import i18n, { isRTL } from '../../../i18n';
import ProgressIndicator from '../../../components/onboarding/ProgressIndicator';
import { ProviderOnboardingStackParamList } from '../../../navigation/ProviderOnboardingNavigator';
import { ProviderOnboardingService } from '../../../services/ProviderOnboardingService';

type LicenseVerificationNavigationProp = NativeStackNavigationProp<
  ProviderOnboardingStackParamList,
  'LicenseVerification'
>;

type LicenseVerificationRouteProp = RouteProp<
  ProviderOnboardingStackParamList,
  'LicenseVerification'
>;

interface Props {
  navigation: LicenseVerificationNavigationProp;
  route: LicenseVerificationRouteProp;
}

interface LicenseVerificationFormData {
  hasLicense: boolean;
  licenseType?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  issuingAuthority?: string;
  licenseDocument?: string;
  portfolioImages?: string[];
  experienceYears?: number;
  certifications?: string[];
  additionalNotes?: string;
}

interface DocumentImage {
  uri: string;
  name: string;
  type: string;
}

const LICENSE_TYPES = [
  { value: 'beauty_license', label: 'Beauty License', labelAr: 'رخصة تجميل' },
  { value: 'cosmetology_license', label: 'Cosmetology License', labelAr: 'رخصة التجميل' },
  { value: 'hairdressing_license', label: 'Hairdressing License', labelAr: 'رخصة تصفيف الشعر' },
  { value: 'business_license', label: 'Business License', labelAr: 'رخصة تجارية' },
  { value: 'health_permit', label: 'Health Permit', labelAr: 'تصريح صحي' },
  { value: 'other', label: 'Other', labelAr: 'أخرى' },
];

const ISSUING_AUTHORITIES = [
  'Ministry of Health - Jordan',
  'Jordan Medical Association',
  'Private Training Institute',
  'International Certification Body',
  'Other',
];

const { width: screenWidth } = Dimensions.get('window');

const LicenseVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { phoneNumber } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [licenseDocument, setLicenseDocument] = useState<DocumentImage | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<DocumentImage[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);

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
  } = useForm<LicenseVerificationFormData>({
    mode: 'onChange',
    defaultValues: {
      hasLicense: false,
      experienceYears: 1,
    },
  });

  const hasLicense = watch('hasLicense');

  useEffect(() => {
    loadDraftData();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        i18n.t('providerOnboarding.license.permissionTitle'),
        i18n.t('providerOnboarding.license.permissionMessage')
      );
    }
  };

  const loadDraftData = async () => {
    try {
      const onboardingState = await ProviderOnboardingService.getCurrentOnboardingState();
      if (onboardingState?.provider) {
        const step5Data = onboardingState.steps.find(step => step.stepNumber === 5)?.data;
        if (step5Data) {
          setValue('hasLicense', step5Data.hasLicense || false);
          setValue('licenseType', step5Data.licenseType || '');
          setValue('licenseNumber', step5Data.licenseNumber || '');
          setValue('licenseExpiry', step5Data.licenseExpiry || '');
          setValue('issuingAuthority', step5Data.issuingAuthority || '');
          setValue('experienceYears', step5Data.experienceYears || 1);
          setValue('additionalNotes', step5Data.additionalNotes || '');
          
          if (step5Data.licenseDocument) {
            setLicenseDocument({
              uri: step5Data.licenseDocument,
              name: 'license_document.jpg',
              type: 'image/jpeg',
            });
          }
          
          if (step5Data.portfolioImages) {
            const portfolioImgs = step5Data.portfolioImages.map((uri: string, index: number) => ({
              uri,
              name: `portfolio_${index}.jpg`,
              type: 'image/jpeg',
            }));
            setPortfolioImages(portfolioImgs);
          }
        }
      }
    } catch (error) {
      console.error('Error loading draft data:', error);
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const pickLicenseDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const document: DocumentImage = {
          uri: asset.uri,
          name: asset.fileName || 'license_document.jpg',
          type: 'image/jpeg',
        };
        
        setLicenseDocument(document);
        setValue('licenseDocument', asset.uri);
        saveDraft({ ...watch(), licenseDocument: asset.uri });
      }
    } catch (error) {
      console.error('Error picking license document:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.license.documentPickError')
      );
    }
  };

  const takeLicensePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          i18n.t('providerOnboarding.license.cameraPermissionTitle'),
          i18n.t('providerOnboarding.license.cameraPermissionMessage')
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const document: DocumentImage = {
          uri: asset.uri,
          name: 'license_document.jpg',
          type: 'image/jpeg',
        };
        
        setLicenseDocument(document);
        setValue('licenseDocument', asset.uri);
        saveDraft({ ...watch(), licenseDocument: asset.uri });
      }
    } catch (error) {
      console.error('Error taking license photo:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.license.cameraError')
      );
    }
  };

  const addPortfolioImage = async () => {
    if (portfolioImages.length >= 10) {
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.license.portfolioLimit')
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: Math.min(5, 10 - portfolioImages.length),
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImages: DocumentImage[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName || `portfolio_${portfolioImages.length + index}.jpg`,
          type: 'image/jpeg',
        }));

        const updatedPortfolio = [...portfolioImages, ...newImages];
        setPortfolioImages(updatedPortfolio);
        
        const portfolioUris = updatedPortfolio.map(img => img.uri);
        setValue('portfolioImages', portfolioUris);
        saveDraft({ ...watch(), portfolioImages: portfolioUris });
      }
    } catch (error) {
      console.error('Error adding portfolio images:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.license.portfolioError')
      );
    }
  };

  const removePortfolioImage = (index: number) => {
    const updatedPortfolio = portfolioImages.filter((_, i) => i !== index);
    setPortfolioImages(updatedPortfolio);
    
    const portfolioUris = updatedPortfolio.map(img => img.uri);
    setValue('portfolioImages', portfolioUris);
    saveDraft({ ...watch(), portfolioImages: portfolioUris });
  };

  const saveDraft = async (data: Partial<LicenseVerificationFormData>) => {
    try {
      await ProviderOnboardingService.updateLicenseVerification({
        ...data,
        isCompleted: false,
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const onSubmit = async (data: LicenseVerificationFormData) => {
    setIsLoading(true);
    try {
      const submitData = {
        ...data,
        licenseDocument: licenseDocument?.uri,
        portfolioImages: portfolioImages.map(img => img.uri),
      };

      // Validate form data
      const validation = ProviderOnboardingService.validateStepData(5, submitData);
      if (!validation.isValid) {
        Alert.alert(
          i18n.t('common.error'),
          validation.errors.join('\n')
        );
        return;
      }

      // Upload documents if needed
      if (licenseDocument) {
        setUploadingDocument(true);
        try {
          await ProviderOnboardingService.uploadVerificationDocument(
            'license',
            {
              uri: licenseDocument.uri,
              name: licenseDocument.name,
              type: licenseDocument.type,
            },
            data.licenseNumber
          );
        } catch (uploadError) {
          console.error('Error uploading license document:', uploadError);
        }
        setUploadingDocument(false);
      }

      // Save data and mark step as completed
      await ProviderOnboardingService.updateLicenseVerification({
        ...submitData,
        isCompleted: true,
      });

      navigation.navigate('ServiceCreationTutorial', { phoneNumber });
    } catch (error) {
      console.error('Error submitting license verification:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.errors.licenseSave')
      );
    } finally {
      setIsLoading(false);
      setUploadingDocument(false);
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
        currentStep={5}
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
              name="certificate-outline"
              size={48}
              color={theme.colors.primary}
            />
            <Text variant="headlineSmall" style={styles.title}>
              {i18n.t('providerOnboarding.license.title')}
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {i18n.t('providerOnboarding.license.subtitle')}
            </Text>
          </View>

          <Surface style={styles.formContainer} elevation={1}>
            {/* License Type Selection */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {i18n.t('providerOnboarding.license.licenseTypeTitle')}
              </Text>
              
              <Controller
                control={control}
                name="hasLicense"
                render={({ field: { value, onChange } }) => (
                  <RadioButton.Group
                    onValueChange={(newValue) => {
                      onChange(newValue === 'true');
                      saveDraft({ ...watch(), hasLicense: newValue === 'true' });
                    }}
                    value={value ? 'true' : 'false'}
                  >
                    <View style={styles.radioOption}>
                      <RadioButton value="true" />
                      <Text variant="bodyLarge" style={styles.radioLabel}>
                        {i18n.t('providerOnboarding.license.hasLicense')}
                      </Text>
                    </View>
                    <View style={styles.radioOption}>
                      <RadioButton value="false" />
                      <Text variant="bodyLarge" style={styles.radioLabel}>
                        {i18n.t('providerOnboarding.license.noLicense')}
                      </Text>
                    </View>
                  </RadioButton.Group>
                )}
              />
            </View>

            {/* License Details (if has license) */}
            {hasLicense && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {i18n.t('providerOnboarding.license.licenseDetails')}
                </Text>

                {/* License Type */}
                <View style={styles.inputGroup}>
                  <Controller
                    control={control}
                    name="licenseType"
                    rules={{
                      required: hasLicense ? i18n.t('providerOnboarding.validation.licenseTypeRequired') : false,
                    }}
                    render={({ field: { onChange, value } }) => (
                      <View>
                        <Text variant="labelMedium" style={styles.fieldLabel}>
                          {i18n.t('providerOnboarding.fields.licenseType')}
                        </Text>
                        <View style={styles.chipContainer}>
                          {LICENSE_TYPES.map((type) => {
                            const label = isRTL() ? type.labelAr : type.label;
                            return (
                              <Chip
                                key={type.value}
                                mode={value === type.value ? 'flat' : 'outlined'}
                                selected={value === type.value}
                                onPress={() => {
                                  onChange(type.value);
                                  saveDraft({ ...watch(), licenseType: type.value });
                                }}
                                style={styles.chip}
                              >
                                {label}
                              </Chip>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  />
                  {errors.licenseType && (
                    <HelperText type="error">{errors.licenseType.message}</HelperText>
                  )}
                </View>

                {/* License Number */}
                <View style={styles.inputGroup}>
                  <Controller
                    control={control}
                    name="licenseNumber"
                    rules={{
                      required: hasLicense ? i18n.t('providerOnboarding.validation.licenseNumberRequired') : false,
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        mode="outlined"
                        label={i18n.t('providerOnboarding.fields.licenseNumber')}
                        value={value}
                        onBlur={onBlur}
                        onChangeText={(text) => {
                          onChange(text);
                          saveDraft({ ...watch(), licenseNumber: text });
                        }}
                        error={!!errors.licenseNumber}
                        style={styles.input}
                      />
                    )}
                  />
                  {errors.licenseNumber && (
                    <HelperText type="error">{errors.licenseNumber.message}</HelperText>
                  )}
                </View>

                {/* Issuing Authority */}
                <View style={styles.inputGroup}>
                  <Controller
                    control={control}
                    name="issuingAuthority"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        mode="outlined"
                        label={i18n.t('providerOnboarding.fields.issuingAuthority')}
                        value={value}
                        onBlur={onBlur}
                        onChangeText={(text) => {
                          onChange(text);
                          saveDraft({ ...watch(), issuingAuthority: text });
                        }}
                        style={styles.input}
                      />
                    )}
                  />
                </View>

                {/* License Document Upload */}
                <View style={styles.section}>
                  <Text variant="titleSmall" style={styles.subsectionTitle}>
                    {i18n.t('providerOnboarding.license.uploadDocument')}
                  </Text>
                  
                  {licenseDocument ? (
                    <Card style={styles.documentCard}>
                      <Image source={{ uri: licenseDocument.uri }} style={styles.documentImage} />
                      <Card.Actions>
                        <Button onPress={() => setLicenseDocument(null)}>
                          {i18n.t('common.remove')}
                        </Button>
                        <Button onPress={pickLicenseDocument}>
                          {i18n.t('providerOnboarding.license.replace')}
                        </Button>
                      </Card.Actions>
                    </Card>
                  ) : (
                    <View style={styles.uploadArea}>
                      <MaterialCommunityIcons
                        name="camera-plus"
                        size={48}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text variant="bodyMedium" style={[styles.uploadText, { color: theme.colors.onSurfaceVariant }]}>
                        {i18n.t('providerOnboarding.license.uploadInstructions')}
                      </Text>
                      <View style={styles.uploadButtons}>
                        <Button
                          mode="outlined"
                          onPress={takeLicensePhoto}
                          icon="camera"
                          style={styles.uploadButton}
                        >
                          {i18n.t('providerOnboarding.license.takePhoto')}
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={pickLicenseDocument}
                          icon="folder"
                          style={styles.uploadButton}
                        >
                          {i18n.t('providerOnboarding.license.chooseFile')}
                        </Button>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Portfolio/Alternative Verification (if no license) */}
            {!hasLicense && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {i18n.t('providerOnboarding.license.alternativeVerification')}
                </Text>
                
                <Text variant="bodyMedium" style={[styles.alternativeText, { color: theme.colors.onSurfaceVariant }]}>
                  {i18n.t('providerOnboarding.license.alternativeDescription')}
                </Text>

                {/* Experience Years */}
                <View style={styles.inputGroup}>
                  <Controller
                    control={control}
                    name="experienceYears"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        mode="outlined"
                        label={i18n.t('providerOnboarding.fields.experienceYears')}
                        value={value?.toString()}
                        onBlur={onBlur}
                        onChangeText={(text) => {
                          const years = parseInt(text) || 0;
                          onChange(years);
                          saveDraft({ ...watch(), experienceYears: years });
                        }}
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    )}
                  />
                </View>

                {/* Portfolio Images */}
                <View style={styles.section}>
                  <Text variant="titleSmall" style={styles.subsectionTitle}>
                    {i18n.t('providerOnboarding.license.portfolioImages')}
                  </Text>
                  <Text variant="bodySmall" style={[styles.portfolioDescription, { color: theme.colors.onSurfaceVariant }]}>
                    {i18n.t('providerOnboarding.license.portfolioInstructions')}
                  </Text>

                  <View style={styles.portfolioGrid}>
                    {portfolioImages.map((image, index) => (
                      <View key={index} style={styles.portfolioItem}>
                        <Image source={{ uri: image.uri }} style={styles.portfolioImage} />
                        <IconButton
                          icon="close-circle"
                          size={20}
                          iconColor={theme.colors.error}
                          style={styles.removeButton}
                          onPress={() => removePortfolioImage(index)}
                        />
                      </View>
                    ))}
                    
                    {portfolioImages.length < 10 && (
                      <Button
                        mode="outlined"
                        onPress={addPortfolioImage}
                        icon="plus"
                        style={styles.addImageButton}
                        contentStyle={styles.addImageContent}
                      >
                        {i18n.t('providerOnboarding.license.addImage')}
                      </Button>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Additional Notes */}
            <View style={styles.inputGroup}>
              <Controller
                control={control}
                name="additionalNotes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    mode="outlined"
                    label={i18n.t('providerOnboarding.fields.additionalNotes')}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      onChange(text);
                      saveDraft({ ...watch(), additionalNotes: text });
                    }}
                    multiline
                    numberOfLines={3}
                    style={styles.textArea}
                  />
                )}
              />
            </View>
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
          disabled={isLoading || uploadingDocument}
          loading={isLoading || uploadingDocument}
          style={styles.continueButton}
        >
          {uploadingDocument 
            ? i18n.t('providerOnboarding.license.uploading')
            : i18n.t('providerOnboarding.buttons.continue')
          }
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
  formContainer: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    minHeight: 80,
  },
  fieldLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioLabel: {
    marginLeft: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 8,
  },
  uploadArea: {
    alignItems: 'center',
    padding: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  uploadText: {
    marginVertical: 12,
    textAlign: 'center',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    borderRadius: 20,
  },
  documentCard: {
    marginBottom: 16,
  },
  documentImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  alternativeText: {
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  portfolioDescription: {
    marginBottom: 16,
    lineHeight: 18,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  portfolioItem: {
    position: 'relative',
    width: (screenWidth - 80) / 3,
    height: (screenWidth - 80) / 3,
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
  },
  addImageButton: {
    width: (screenWidth - 80) / 3,
    height: (screenWidth - 80) / 3,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addImageContent: {
    height: '100%',
    flexDirection: 'column',
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

export default LicenseVerificationScreen;