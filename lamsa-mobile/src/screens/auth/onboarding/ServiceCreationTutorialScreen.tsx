/**
 * @file ServiceCreationTutorialScreen.tsx
 * @description Provider onboarding screen displaying service creation tutorial and tips
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
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  Card,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n, { isRTL } from '../../../i18n';
import ProgressIndicator from '../../../components/onboarding/ProgressIndicator';
import { ProviderOnboardingStackParamList } from '../../../navigation/ProviderOnboardingNavigator';
import { ProviderOnboardingService } from '../../../services/ProviderOnboardingService';

type ServiceCreationTutorialNavigationProp = NativeStackNavigationProp<
  ProviderOnboardingStackParamList,
  'ServiceCreationTutorial'
>;

type ServiceCreationTutorialRouteProp = RouteProp<
  ProviderOnboardingStackParamList,
  'ServiceCreationTutorial'
>;

interface Props {
  navigation: ServiceCreationTutorialNavigationProp;
  route: ServiceCreationTutorialRouteProp;
}

const TUTORIAL_STEPS = [
  {
    icon: 'format-list-bulleted',
    title: 'Create Your Services',
    titleAr: 'أنشئي خدماتك',
    description: 'Add your beauty services with clear descriptions and pricing',
    descriptionAr: 'أضيفي خدمات الجمال الخاصة بك مع أوصاف واضحة وتسعير',
  },
  {
    icon: 'camera',
    title: 'Add Service Photos',
    titleAr: 'أضيفي صور الخدمة',
    description: 'Upload high-quality photos of your work to attract customers',
    descriptionAr: 'حمّلي صور عالية الجودة لأعمالك لجذب العملاء',
  },
  {
    icon: 'clock',
    title: 'Set Duration & Availability',
    titleAr: 'حددي المدة والتوفر',
    description: 'Configure service duration and when you are available',
    descriptionAr: 'اضبطي مدة الخدمة ومتى تكونين متاحة',
  },
  {
    icon: 'star',
    title: 'Build Your Reputation',
    titleAr: 'ابني سمعتك',
    description: 'Deliver excellent service to earn positive reviews and ratings',
    descriptionAr: 'قدمي خدمة ممتازة لكسب تقييمات إيجابية',
  },
];

const ServiceCreationTutorialScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { phoneNumber } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const stepTitles = [
    i18n.t('providerOnboarding.steps.businessInfo'),
    i18n.t('providerOnboarding.steps.location'),
    i18n.t('providerOnboarding.steps.categories'),
    i18n.t('providerOnboarding.steps.hours'),
    i18n.t('providerOnboarding.steps.license'),
    i18n.t('providerOnboarding.steps.tutorial'),
    i18n.t('providerOnboarding.steps.completion'),
  ];

  useEffect(() => {
    loadSelectedCategories();
  }, []);

  const loadSelectedCategories = async () => {
    try {
      const onboardingState = await ProviderOnboardingService.getCurrentOnboardingState();
      if (onboardingState?.provider) {
        const step4Data = onboardingState.steps.find(step => step.stepNumber === 4)?.data;
        if (step4Data?.selectedCategories) {
          setSelectedCategories(step4Data.selectedCategories);
        }
      }
    } catch (error) {
      console.error('Error loading selected categories:', error);
    }
  };

  const onContinue = async () => {
    setIsLoading(true);
    try {
      // Mark tutorial as completed
      await ProviderOnboardingService.updateOnboardingStep(6, { completed: true }, true);
      navigation.navigate('Completion', { phoneNumber });
    } catch (error) {
      console.error('Error completing tutorial:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('providerOnboarding.errors.tutorialSave')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderTutorialStep = (step: typeof TUTORIAL_STEPS[0], index: number) => {
    const title = isRTL() ? step.titleAr : step.title;
    const description = isRTL() ? step.descriptionAr : step.description;

    return (
      <Card key={index} style={styles.tutorialCard}>
        <Card.Content style={styles.tutorialContent}>
          <View style={styles.tutorialHeader}>
            <View style={[styles.tutorialIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
              <MaterialCommunityIcons
                name={step.icon as any}
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.stepNumber}>
              <Text variant="labelMedium" style={[styles.stepNumberText, { color: theme.colors.primary }]}>
                {index + 1}
              </Text>
            </View>
          </View>
          
          <Text variant="titleMedium" style={styles.tutorialTitle}>
            {title}
          </Text>
          
          <Text variant="bodyMedium" style={[styles.tutorialDescription, { color: theme.colors.onSurfaceVariant }]}>
            {description}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressIndicator
        currentStep={6}
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
              name="school-outline"
              size={48}
              color={theme.colors.primary}
            />
            <Text variant="headlineSmall" style={styles.title}>
              {i18n.t('providerOnboarding.tutorial.title')}
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {i18n.t('providerOnboarding.tutorial.subtitle')}
            </Text>
          </View>

          {/* Selected Categories Recap */}
          {selectedCategories.length > 0 && (
            <Surface style={styles.categoriesRecap} elevation={1}>
              <Text variant="titleMedium" style={styles.recapTitle}>
                {i18n.t('providerOnboarding.tutorial.yourCategories')}
              </Text>
              <View style={styles.categoriesContainer}>
                {selectedCategories.map((categoryId, index) => (
                  <Chip key={categoryId} mode="flat" style={styles.categoryChip}>
                    {`Category ${index + 1}`}
                  </Chip>
                ))}
              </View>
            </Surface>
          )}

          {/* Tutorial Steps */}
          <View style={styles.tutorialSteps}>
            <Text variant="titleLarge" style={styles.stepsHeader}>
              {i18n.t('providerOnboarding.tutorial.nextSteps')}
            </Text>
            {TUTORIAL_STEPS.map(renderTutorialStep)}
          </View>

          {/* Success Tips */}
          <Surface style={styles.tipsContainer} elevation={1}>
            <Text variant="titleMedium" style={styles.tipsTitle}>
              {i18n.t('providerOnboarding.tutorial.successTips')}
            </Text>
            
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={styles.tipText}>
                  {i18n.t('providerOnboarding.tutorial.tip1')}
                </Text>
              </View>
              
              <View style={styles.tipItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={styles.tipText}>
                  {i18n.t('providerOnboarding.tutorial.tip2')}
                </Text>
              </View>
              
              <View style={styles.tipItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={styles.tipText}>
                  {i18n.t('providerOnboarding.tutorial.tip3')}
                </Text>
              </View>
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
          onPress={onContinue}
          disabled={isLoading}
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
  categoriesRecap: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  recapTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    marginBottom: 4,
  },
  tutorialSteps: {
    marginBottom: 24,
  },
  stepsHeader: {
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  tutorialCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  tutorialContent: {
    padding: 20,
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tutorialIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  stepNumberText: {
    fontWeight: '600',
    fontSize: 12,
  },
  tutorialTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  tutorialDescription: {
    lineHeight: 20,
  },
  tipsContainer: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  tipsTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
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

export default ServiceCreationTutorialScreen;