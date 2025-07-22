import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import i18n from '../../i18n';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
}) => {
  const theme = useTheme();
  const isRTL = i18n.locale === 'ar';

  return (
    <View style={styles.container}>
      <View style={[styles.progressBar, isRTL && styles.progressBarRTL]}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <React.Fragment key={index}>
              <View
                style={[
                  styles.step,
                  {
                    backgroundColor: isActive || isCompleted
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Text
                  variant="labelSmall"
                  style={[
                    styles.stepNumber,
                    {
                      color: isActive || isCompleted
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {stepNumber}
                </Text>
              </View>
              {index < totalSteps - 1 && (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: isCompleted
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
      {stepLabels && stepLabels[currentStep - 1] && (
        <Text variant="bodyMedium" style={styles.stepLabel}>
          {stepLabels[currentStep - 1]}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarRTL: {
    flexDirection: 'row-reverse',
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontWeight: 'bold',
  },
  connector: {
    height: 2,
    width: 40,
  },
  stepLabel: {
    marginTop: 12,
    textAlign: 'center',
  },
});

export default ProgressIndicator;