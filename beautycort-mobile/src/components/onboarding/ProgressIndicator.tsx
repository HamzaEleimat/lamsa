import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n, { isRTL } from '../../i18n';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
  className,
}) => {
  const theme = useTheme();
  const progress = currentStep / totalSteps;
  const rtl = isRTL();

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep - 1) return 'completed';
    if (stepIndex === currentStep - 1) return 'current';
    return 'pending';
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'current':
        return 'circle-outline';
      default:
        return 'circle-outline';
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.primary;
      case 'current':
        return theme.colors.primary;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <View style={[styles.container, className && { className }]}>
      {/* Progress Header */}
      <View style={styles.progressHeader}>
        <Text variant="titleMedium" style={styles.progressTitle}>
          {i18n.t('providerOnboarding.progress.title')}
        </Text>
        <Text variant="bodyMedium" style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
          {i18n.t('providerOnboarding.progress.step', { current: currentStep, total: totalSteps })}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <ProgressBar
          progress={progress}
          color={theme.colors.primary}
          style={styles.progressBar}
        />
        <Text variant="bodySmall" style={[styles.percentageText, { color: theme.colors.primary }]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>

      {/* Step Indicators */}
      <View style={[styles.stepsContainer, rtl && styles.stepsContainerRTL]}>
        {stepTitles.map((title, index) => {
          const status = getStepStatus(index);
          const icon = getStepIcon(status);
          const color = getStepColor(status);
          const isActive = status === 'current';

          return (
            <View key={index} style={styles.stepItem}>
              <View style={[styles.stepIconContainer, isActive && { backgroundColor: `${color}15` }]}>
                <MaterialCommunityIcons
                  name={icon as any}
                  size={status === 'completed' ? 20 : 16}
                  color={color}
                />
              </View>
              <Text
                variant="bodySmall"
                style={[
                  styles.stepTitle,
                  { color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant },
                  isActive && styles.activeStepTitle,
                ]}
                numberOfLines={2}
              >
                {title}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Current Step Highlight */}
      <View style={styles.currentStepContainer}>
        <View style={[styles.currentStepIndicator, { backgroundColor: `${theme.colors.primary}20` }]}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={16}
            color={theme.colors.primary}
            style={[rtl && { transform: [{ scaleX: -1 }] }]}
          />
          <Text variant="bodyMedium" style={[styles.currentStepText, { color: theme.colors.primary }]}>
            {stepTitles[currentStep - 1]}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  progressText: {
    opacity: 0.7,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  percentageText: {
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
  activeStepTitle: {
    fontWeight: '600',
  },
  currentStepContainer: {
    alignItems: 'center',
  },
  currentStepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  currentStepText: {
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 13,
  },
});

export default ProgressIndicator;