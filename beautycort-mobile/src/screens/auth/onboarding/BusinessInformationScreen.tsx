import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Surface,
  SegmentedButtons,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n, { isRTL } from '../../../i18n';
import ProgressIndicator from '../../../components/onboarding/ProgressIndicator';
import { ProviderOnboardingStackParamList } from '../../../navigation/ProviderOnboardingNavigator';
import { ProviderOnboardingService } from '../../../services/ProviderOnboardingService';
import { BusinessType } from '../../../types';

type BusinessInformationNavigationProp = NativeStackNavigationProp<
  ProviderOnboardingStackParamList,
  'BusinessInformation'
>;

type BusinessInformationRouteProp = RouteProp<
  ProviderOnboardingStackParamList,
  'BusinessInformation'
>;

interface Props {
  navigation: BusinessInformationNavigationProp;
  route: BusinessInformationRouteProp;
}

interface BusinessInformationFormData {
  ownerName: string;
  email?: string;
  businessName: string;
  businessNameAr: string;
  businessType: BusinessType;
  description?: string;
  descriptionAr?: string;
}

const BusinessInformationScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { phoneNumber } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

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
  } = useForm<BusinessInformationFormData>({
    mode: 'onChange',
    defaultValues: {
      businessType: BusinessType.SALON,
    },
  });

  const selectedBusinessType = watch('businessType');

  const businessTypeOptions = [
    {
      value: BusinessType.SALON,
      label: i18n.t('providerOnboarding.businessType.salon'),
      icon: 'store',
    },
    {
      value: BusinessType.MOBILE,
      label: i18n.t('providerOnboarding.businessType.mobile'),
      icon: 'car',
    },
    {
      value: BusinessType.FREELANCER,
      label: i18n.t('providerOnboarding.businessType.freelancer'),
      icon: 'account',
    },
  ];

  // Load draft data on component mount
  useEffect(() => {
    loadDraftData();
  }, []);

  const loadDraftData = async () => {
    try {
      const onboardingState = await ProviderOnboardingService.getCurrentOnboardingState();
      if (onboardingState?.provider) {
        const step1Data = onboardingState.steps.find(step => step.stepNumber === 1)?.data;
        if (step1Data) {
          setValue('ownerName', step1Data.ownerName || '');
          setValue('email', step1Data.email || '');
          setValue('businessName', step1Data.businessName || '');
          setValue('businessNameAr', step1Data.businessNameAr || '');
          setValue('businessType', step1Data.businessType || BusinessType.SALON);
          setValue('description', step1Data.description || '');
          setValue('descriptionAr', step1Data.descriptionAr || '');
        }
      }
    } catch (error) {
      console.error('Error loading draft data:', error);
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const saveDraft = async (data: BusinessInformationFormData) => {
    try {
      await ProviderOnboardingService.updatePersonalInformation({
        ...data,
        isCompleted: false,
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const onSubmit = async (data: BusinessInformationFormData) => {
    setIsLoading(true);
    try {
      // Validate form data
      const validation = ProviderOnboardingService.validateStepData(1, data);
      if (!validation.isValid) {
        console.error('Validation errors:', validation.errors);
        return;
      }

      // Save data and mark step as completed
      await ProviderOnboardingService.updatePersonalInformation({
        ...data,
        isCompleted: true,
      });

      navigation.navigate('LocationSetup', { phoneNumber });
    } catch (error) {
      console.error('Error submitting business information:', error);
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
        currentStep={1}
        totalSteps={7}
        stepTitles={stepTitles}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <MaterialCommunityIcons
                name="briefcase-outline"
                size={48}
                color={theme.colors.primary}
              />
              <Text variant="headlineSmall" style={styles.title}>
                {i18n.t('providerOnboarding.businessInfo.title')}
              </Text>
              <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                {i18n.t('providerOnboarding.businessInfo.subtitle')}
              </Text>
            </View>

            <Surface style={styles.formContainer} elevation={1}>
              {/* Owner Name */}
              <View style={styles.inputGroup}>
                <Controller
                  control={control}
                  name="ownerName"
                  rules={{
                    required: i18n.t('providerOnboarding.validation.ownerNameRequired'),
                    minLength: {
                      value: 2,
                      message: i18n.t('providerOnboarding.validation.ownerNameMin'),
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      mode="outlined"
                      label={i18n.t('providerOnboarding.fields.ownerName')}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        onChange(text);
                        saveDraft({ ...watch(), ownerName: text });
                      }}
                      error={!!errors.ownerName}
                      autoCapitalize="words"
                      textContentType="name"
                      style={[styles.input, isRTL() && styles.inputRTL]}
                    />
                  )}
                />
                {errors.ownerName && (
                  <HelperText type="error" style={styles.errorText}>
                    {errors.ownerName.message}
                  </HelperText>
                )}
              </View>

              {/* Email (Optional) */}
              <View style={styles.inputGroup}>
                <Controller
                  control={control}
                  name="email"
                  rules={{
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: i18n.t('providerOnboarding.validation.emailInvalid'),
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      mode="outlined"
                      label={i18n.t('providerOnboarding.fields.email')}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        onChange(text);
                        saveDraft({ ...watch(), email: text });
                      }}
                      error={!!errors.email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      textContentType="emailAddress"
                      style={[styles.input, isRTL() && styles.inputRTL]}
                    />
                  )}
                />
                {errors.email && (
                  <HelperText type="error" style={styles.errorText}>
                    {errors.email.message}
                  </HelperText>
                )}
              </View>

              {/* Business Name (English) */}
              <View style={styles.inputGroup}>
                <Controller
                  control={control}
                  name="businessName"
                  rules={{
                    required: i18n.t('providerOnboarding.validation.businessNameRequired'),
                    minLength: {
                      value: 2,
                      message: i18n.t('providerOnboarding.validation.businessNameMin'),
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      mode="outlined"
                      label={i18n.t('providerOnboarding.fields.businessName')}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        onChange(text);
                        saveDraft({ ...watch(), businessName: text });
                      }}
                      error={!!errors.businessName}
                      autoCapitalize="words"
                      style={styles.input}
                    />
                  )}
                />
                {errors.businessName && (
                  <HelperText type="error" style={styles.errorText}>
                    {errors.businessName.message}
                  </HelperText>
                )}
              </View>

              {/* Business Name (Arabic) */}
              <View style={styles.inputGroup}>
                <Controller
                  control={control}
                  name="businessNameAr"
                  rules={{
                    required: i18n.t('providerOnboarding.validation.businessNameArRequired'),
                    minLength: {
                      value: 2,
                      message: i18n.t('providerOnboarding.validation.businessNameArMin'),
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      mode="outlined"
                      label={i18n.t('providerOnboarding.fields.businessNameAr')}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        onChange(text);
                        saveDraft({ ...watch(), businessNameAr: text });
                      }}
                      error={!!errors.businessNameAr}
                      autoCapitalize="words"
                      style={[styles.input, styles.inputRTL]}
                    />
                  )}
                />
                {errors.businessNameAr && (
                  <HelperText type="error" style={styles.errorText}>
                    {errors.businessNameAr.message}
                  </HelperText>
                )}
              </View>

              {/* Business Type */}
              <View style={styles.inputGroup}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  {i18n.t('providerOnboarding.fields.businessType')}
                </Text>
                <Controller
                  control={control}
                  name="businessType"
                  render={({ field: { onChange, value } }) => (
                    <SegmentedButtons
                      value={value}
                      onValueChange={(newValue) => {
                        onChange(newValue);
                        saveDraft({ ...watch(), businessType: newValue as BusinessType });
                      }}
                      buttons={businessTypeOptions.map(option => ({
                        value: option.value,
                        label: option.label,
                        icon: option.icon,
                      }))}
                      style={styles.segmentedButtons}
                    />
                  )}
                />
                
                {/* Business Type Description */}
                <View style={styles.businessTypeDescription}>
                  <Text variant="bodyMedium" style={[styles.descriptionText, { color: theme.colors.onSurfaceVariant }]}>
                    {selectedBusinessType === BusinessType.SALON && i18n.t('providerOnboarding.businessType.salonDescription')}
                    {selectedBusinessType === BusinessType.MOBILE && i18n.t('providerOnboarding.businessType.mobileDescription')}
                    {selectedBusinessType === BusinessType.FREELANCER && i18n.t('providerOnboarding.businessType.freelancerDescription')}
                  </Text>
                </View>
              </View>

              {/* Description (English) */}
              <View style={styles.inputGroup}>
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      mode="outlined"
                      label={i18n.t('providerOnboarding.fields.description')}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        onChange(text);
                        saveDraft({ ...watch(), description: text });
                      }}
                      multiline
                      numberOfLines={3}
                      style={styles.textArea}
                    />
                  )}
                />
              </View>

              {/* Description (Arabic) */}
              <View style={styles.inputGroup}>
                <Controller
                  control={control}
                  name="descriptionAr"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      mode="outlined"
                      label={i18n.t('providerOnboarding.fields.descriptionAr')}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        onChange(text);
                        saveDraft({ ...watch(), descriptionAr: text });
                      }}
                      multiline
                      numberOfLines={3}
                      style={[styles.textArea, styles.inputRTL]}
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
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || isLoading}
            loading={isLoading}
            style={styles.continueButton}
            contentStyle={styles.continueButtonContent}
          >
            {i18n.t('providerOnboarding.buttons.continue')}
          </Button>
        </View>
      </KeyboardAvoidingView>
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
  keyboardContainer: {
    flex: 1,
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
  textArea: {
    backgroundColor: '#FFFFFF',
    minHeight: 80,
  },
  errorText: {
    marginTop: 4,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  segmentedButtons: {
    marginBottom: 12,
  },
  businessTypeDescription: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  descriptionText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  continueButton: {
    borderRadius: 28,
  },
  continueButtonContent: {
    paddingVertical: 8,
  },
});

export default BusinessInformationScreen;