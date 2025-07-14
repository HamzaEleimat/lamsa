import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import i18n, { isRTL } from '../../../i18n';
import ProgressIndicator from '../../../components/onboarding/ProgressIndicator';
import { ProviderOnboardingStackParamList } from '../../../navigation/ProviderOnboardingNavigator';
import { ProviderOnboardingService } from '../../../services/ProviderOnboardingService';

type CompletionNavigationProp = NativeStackNavigationProp<
  ProviderOnboardingStackParamList,
  'Completion'
>;

type CompletionRouteProp = RouteProp<
  ProviderOnboardingStackParamList,
  'Completion'
>;

interface Props {
  navigation: CompletionNavigationProp;
  route: CompletionRouteProp;
}

const { width: screenWidth } = Dimensions.get('window');

const CompletionScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { phoneNumber } = route.params;
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [animationValues] = useState({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
    celebration: new Animated.Value(0),
  });

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
    startCelebrationAnimation();
  }, []);

  const startCelebrationAnimation = () => {
    const animations = [
      Animated.spring(animationValues.scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(animationValues.opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(500),
        Animated.loop(
          Animated.sequence([
            Animated.timing(animationValues.celebration, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(animationValues.celebration, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ),
      ]),
    ];

    Animated.parallel(animations).start();
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      // Complete the onboarding process
      const provider = await ProviderOnboardingService.completeOnboarding();
      
      // Authenticate the user and navigate to main app
      await login({
        user: provider,
        tokens: {
          accessToken: 'temp_token', // Will be replaced by actual auth
          refreshToken: 'temp_refresh',
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          type: 'Bearer',
        },
      });
      
      // Navigation will be handled by RootNavigator based on auth state
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // For now, just navigate anyway - auth can be handled later
      // navigation.replace('Main');
    } finally {
      setIsLoading(false);
    }
  };

  const celebrationScale = animationValues.celebration.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const celebrationRotate = animationValues.celebration.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ProgressIndicator
        currentStep={7}
        totalSteps={7}
        stepTitles={stepTitles}
      />

      <View style={styles.content}>
        {/* Animated Celebration Section */}
        <Animated.View
          style={[
            styles.celebrationContainer,
            {
              transform: [
                { scale: animationValues.scale },
                { scale: celebrationScale },
                { rotate: celebrationRotate },
              ],
              opacity: animationValues.opacity,
            },
          ]}
        >
          <View style={[styles.celebrationIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
            <MaterialCommunityIcons
              name="party-popper"
              size={80}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.fireworksContainer}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={24}
              color="#FFD700"
              style={[styles.firework, styles.firework1]}
            />
            <MaterialCommunityIcons
              name="star-four-points"
              size={20}
              color="#FF6B35"
              style={[styles.firework, styles.firework2]}
            />
            <MaterialCommunityIcons
              name="star-four-points"
              size={18}
              color="#4ECDC4"
              style={[styles.firework, styles.firework3]}
            />
            <MaterialCommunityIcons
              name="star-four-points"
              size={22}
              color="#E17055"
              style={[styles.firework, styles.firework4]}
            />
          </View>
        </Animated.View>

        {/* Success Message */}
        <Animated.View
          style={[
            styles.messageContainer,
            { opacity: animationValues.opacity },
          ]}
        >
          <Text variant="headlineLarge" style={styles.congratsTitle}>
            {i18n.t('providerOnboarding.completion.congratulations')}
          </Text>
          
          <Text variant="titleMedium" style={styles.successTitle}>
            {i18n.t('providerOnboarding.completion.successTitle')}
          </Text>
          
          <Text variant="bodyLarge" style={[styles.successMessage, { color: theme.colors.onSurfaceVariant }]}>
            {i18n.t('providerOnboarding.completion.successMessage')}
          </Text>
        </Animated.View>

        {/* Next Steps Card */}
        <Animated.View
          style={[
            styles.nextStepsContainer,
            { opacity: animationValues.opacity },
          ]}
        >
          <Surface style={styles.nextStepsCard} elevation={2}>
            <Text variant="titleMedium" style={styles.nextStepsTitle}>
              {i18n.t('providerOnboarding.completion.nextStepsTitle')}
            </Text>
            
            <View style={styles.nextStepsList}>
              <View style={styles.nextStepItem}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text variant="bodyMedium" style={styles.nextStepText}>
                  {i18n.t('providerOnboarding.completion.step1')}
                </Text>
              </View>
              
              <View style={styles.nextStepItem}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodyMedium" style={styles.nextStepText}>
                  {i18n.t('providerOnboarding.completion.step2')}
                </Text>
              </View>
              
              <View style={styles.nextStepItem}>
                <MaterialCommunityIcons
                  name="star-outline"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodyMedium" style={styles.nextStepText}>
                  {i18n.t('providerOnboarding.completion.step3')}
                </Text>
              </View>
            </View>
          </Surface>
        </Animated.View>

        {/* Welcome Message */}
        <Animated.View
          style={[
            styles.welcomeContainer,
            { opacity: animationValues.opacity },
          ]}
        >
          <Text variant="titleMedium" style={styles.welcomeTitle}>
            {i18n.t('providerOnboarding.completion.welcomeTitle')}
          </Text>
          
          <Text variant="bodyMedium" style={[styles.welcomeMessage, { color: theme.colors.onSurfaceVariant }]}>
            {i18n.t('providerOnboarding.completion.welcomeMessage')}
          </Text>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View
        style={[
          styles.footer,
          { opacity: animationValues.opacity },
        ]}
      >
        <Button
          mode="contained"
          onPress={completeOnboarding}
          disabled={isLoading}
          loading={isLoading}
          style={styles.completeButton}
          contentStyle={styles.completeButtonContent}
          labelStyle={styles.completeButtonLabel}
        >
          {i18n.t('providerOnboarding.completion.startJourney')}
        </Button>
        
        <Text variant="bodySmall" style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
          {i18n.t('providerOnboarding.completion.footerMessage')}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  celebrationIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  fireworksContainer: {
    position: 'absolute',
    width: screenWidth,
    height: 200,
    top: -20,
  },
  firework: {
    position: 'absolute',
  },
  firework1: {
    top: 20,
    left: screenWidth * 0.2,
  },
  firework2: {
    top: 40,
    right: screenWidth * 0.2,
  },
  firework3: {
    top: 80,
    left: screenWidth * 0.15,
  },
  firework4: {
    top: 60,
    right: screenWidth * 0.15,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  congratsTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    color: '#2E7D32',
  },
  successTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  successMessage: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  nextStepsContainer: {
    marginBottom: 24,
  },
  nextStepsCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  nextStepsTitle: {
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  nextStepsList: {
    gap: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextStepText: {
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeMessage: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
  },
  completeButton: {
    borderRadius: 32,
    marginBottom: 12,
    minWidth: 200,
  },
  completeButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  completeButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: 20,
  },
});

export default CompletionScreen;