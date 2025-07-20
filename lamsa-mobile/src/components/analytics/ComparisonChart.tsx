import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Card, ProgressBar } from 'react-native-paper';
import { colors } from '../../constants/colors';

interface ComparisonData {
  label: string;
  value: number;
  color?: string;
  icon?: string;
}

interface ComparisonChartProps {
  title: string;
  subtitle?: string;
  data: ComparisonData[];
  maxValue?: number;
  showPercentage?: boolean;
  style?: ViewStyle;
  orientation?: 'horizontal' | 'vertical';
}

export default function ComparisonChart({
  title,
  subtitle,
  data,
  maxValue,
  showPercentage = true,
  style,
  orientation = 'vertical',
}: ComparisonChartProps) {
  const max = maxValue || Math.max(...data.map(item => item.value));
  
  const renderHorizontalBars = () => (
    <View style={styles.horizontalContainer}>
      {data.map((item, index) => {
        const progress = max > 0 ? item.value / max : 0;
        const percentage = showPercentage ? (progress * 100).toFixed(0) : item.value.toFixed(0);
        
        return (
          <View key={index} style={styles.horizontalItem}>
            <View style={styles.horizontalHeader}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{percentage}{showPercentage ? '%' : ''}</Text>
            </View>
            <ProgressBar
              progress={progress}
              color={item.color || colors.primary}
              style={styles.progressBar}
            />
          </View>
        );
      })}
    </View>
  );
  
  const renderVerticalBars = () => {
    const barWidth = 100 / data.length - 2; // Account for gaps
    
    return (
      <View style={styles.verticalContainer}>
        <View style={styles.barsContainer}>
          {data.map((item, index) => {
            const height = max > 0 ? (item.value / max) * 180 : 0;
            
            return (
              <View key={index} style={[styles.barWrapper, { width: `${barWidth}%` }]}>
                <Text style={styles.verticalValue}>
                  {showPercentage ? `${item.value}%` : item.value}
                </Text>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: item.color || colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.verticalLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };
  
  return (
    <Card style={[styles.card, style]}>
      {(title || subtitle) && (
        <Card.Title
          title={title}
          subtitle={subtitle}
          titleStyle={styles.title}
          subtitleStyle={styles.subtitle}
        />
      )}
      <Card.Content>
        {orientation === 'horizontal' ? renderHorizontalBars() : renderVerticalBars()}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray,
  },
  horizontalContainer: {
    gap: 16,
  },
  horizontalItem: {
    gap: 8,
  },
  horizontalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: colors.text,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  verticalContainer: {
    height: 250,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  verticalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  barContainer: {
    width: '80%',
    height: 180,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  verticalLabel: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 8,
  },
});