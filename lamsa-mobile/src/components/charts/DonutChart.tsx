import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { colors } from '../../constants/colors';

interface DonutChartData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
  strokeWidth?: number;
  centerContent?: React.ReactNode;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
  strokeWidth = 40,
  centerContent
}) => {
  const radius = (size - strokeWidth) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  // Calculate total value
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  // Calculate angles for each segment
  let currentAngle = -90; // Start from top
  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = startAngle + angle;
    currentAngle = endAngle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
      angle
    };
  });

  // Convert polar coordinates to cartesian
  const polarToCartesian = (angle: number) => {
    const angleInRadians = ((angle - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  // Create path for each segment
  const createPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    if (endAngle - startAngle >= 360) {
      // Full circle
      return `
        M ${centerX} ${centerY - radius}
        A ${radius} ${radius} 0 1 1 ${centerX - 0.01} ${centerY - radius}
        Z
      `;
    }

    return `
      M ${start.x} ${start.y}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}
    `;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G>
          {segments.map((segment, index) => (
            <Path
              key={index}
              d={createPath(segment.startAngle, segment.endAngle)}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          ))}
        </G>
      </Svg>
      
      {centerContent && (
        <View style={[styles.centerContent, { width: size, height: size }]}>
          {centerContent}
        </View>
      )}
      
      <View style={styles.legendContainer}>
        {segments.map((segment, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
            <Text style={styles.legendLabel}>{segment.label}</Text>
            <Text style={styles.legendValue}>{segment.percentage.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    marginTop: 20,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});

export default DonutChart;