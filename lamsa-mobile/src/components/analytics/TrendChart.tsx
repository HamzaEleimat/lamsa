import React from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors } from '../../constants/colors';

const { width: screenWidth } = Dimensions.get('window');

interface TrendChartProps {
  title: string;
  subtitle?: string;
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
      color?: (opacity: number) => string;
      strokeWidth?: number;
    }>;
  };
  type?: 'line' | 'bar';
  height?: number;
  showGrid?: boolean;
  yAxisSuffix?: string;
  yAxisPrefix?: string;
  formatYLabel?: (value: string) => string;
  style?: ViewStyle;
  chartStyle?: ViewStyle;
  bezier?: boolean;
  showDots?: boolean;
  onDataPointClick?: (data: { value: number; index: number }) => void;
}

export default function TrendChart({
  title,
  subtitle,
  data,
  type = 'line',
  height = 200,
  showGrid = true,
  yAxisSuffix = '',
  yAxisPrefix = '',
  formatYLabel,
  style,
  chartStyle,
  bezier = true,
  showDots = true,
  onDataPointClick,
}: TrendChartProps) {
  const chartWidth = screenWidth - 64; // Account for card padding
  
  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => colors.primary,
    labelColor: (opacity = 1) => colors.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: showDots ? {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    } : { r: '0' },
    propsForBackgroundLines: {
      strokeDasharray: showGrid ? '' : '0',
      stroke: colors.border,
      strokeOpacity: showGrid ? 0.5 : 0,
    },
  };
  
  const ChartComponent = type === 'line' ? LineChart : BarChart;
  
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
        <View style={styles.chartContainer}>
          <ChartComponent
            data={data}
            width={chartWidth}
            height={height}
            yAxisLabel={yAxisPrefix}
            yAxisSuffix={yAxisSuffix}
            chartConfig={chartConfig}
            style={[styles.chart, chartStyle]}
            bezier={type === 'line' && bezier}
            fromZero
            formatYLabel={formatYLabel}
            onDataPointClick={onDataPointClick}
          />
        </View>
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
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});