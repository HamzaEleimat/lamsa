/**
 * RTL-Aware Layout Components
 * Provides common layout patterns that work correctly in RTL
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { 
  getFlexDirection, 
  getAlignItems, 
  getJustifyContent,
  getPaddingHorizontal,
  getMarginHorizontal,
  isRTL
} from '../utils/rtl';

// RTL-aware Row component
interface RTLRowProps {
  children: React.ReactNode;
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  reverse?: boolean;
  wrap?: boolean;
  style?: any;
}

export const RTLRow: React.FC<RTLRowProps> = ({
  children,
  align = 'flex-start',
  justify = 'flex-start',
  reverse = false,
  wrap = false,
  style
}) => {
  const flexDirection = reverse ? 'row-reverse' : 'row';
  
  return (
    <View style={[
      {
        flexDirection: getFlexDirection(flexDirection),
        alignItems: getAlignItems(align),
        justifyContent: getJustifyContent(justify),
        flexWrap: wrap ? 'wrap' : 'nowrap'
      },
      style
    ]}>
      {children}
    </View>
  );
};

// RTL-aware Column component
interface RTLColumnProps {
  children: React.ReactNode;
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  reverse?: boolean;
  style?: any;
}

export const RTLColumn: React.FC<RTLColumnProps> = ({
  children,
  align = 'flex-start',
  justify = 'flex-start',
  reverse = false,
  style
}) => {
  const flexDirection = reverse ? 'column-reverse' : 'column';
  
  return (
    <View style={[
      {
        flexDirection: flexDirection,
        alignItems: getAlignItems(align),
        justifyContent: getJustifyContent(justify)
      },
      style
    ]}>
      {children}
    </View>
  );
};

// RTL-aware Container component
interface RTLContainerProps {
  children: React.ReactNode;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  margin?: number;
  marginHorizontal?: number;
  marginVertical?: number;
  backgroundColor?: string;
  style?: any;
  safe?: boolean;
  scrollable?: boolean;
}

export const RTLContainer: React.FC<RTLContainerProps> = ({
  children,
  padding,
  paddingHorizontal,
  paddingVertical,
  margin,
  marginHorizontal,
  marginVertical,
  backgroundColor = '#FFFFFF',
  style,
  safe = false,
  scrollable = false
}) => {
  const containerStyle = [
    styles.container,
    { backgroundColor },
    padding && { padding },
    paddingHorizontal && getPaddingHorizontal(paddingHorizontal, paddingHorizontal),
    paddingVertical && { paddingVertical },
    margin && { margin },
    marginHorizontal && getMarginHorizontal(marginHorizontal, marginHorizontal),
    marginVertical && { marginVertical },
    style
  ];

  if (scrollable) {
    const ScrollContainer = safe ? SafeAreaView : View;
    return (
      <ScrollContainer style={containerStyle}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </ScrollContainer>
    );
  }

  if (safe) {
    return (
      <SafeAreaView style={containerStyle}>
        {children}
      </SafeAreaView>
    );
  }

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
};

// RTL-aware Spacer component
interface RTLSpacerProps {
  size?: number;
  horizontal?: boolean;
  style?: any;
}

export const RTLSpacer: React.FC<RTLSpacerProps> = ({
  size = 16,
  horizontal = false,
  style
}) => {
  const spacerStyle = horizontal 
    ? { width: size, height: 1 }
    : { width: 1, height: size };

  return <View style={[spacerStyle, style]} />;
};

// RTL-aware Divider component
interface RTLDividerProps {
  thickness?: number;
  color?: string;
  marginVertical?: number;
  marginHorizontal?: number;
  style?: any;
}

export const RTLDivider: React.FC<RTLDividerProps> = ({
  thickness = 1,
  color = '#E0E0E0',
  marginVertical = 8,
  marginHorizontal = 0,
  style
}) => {
  return (
    <View style={[
      {
        height: thickness,
        backgroundColor: color,
        marginVertical,
        ...getMarginHorizontal(marginHorizontal, marginHorizontal)
      },
      style
    ]} />
  );
};

// RTL-aware Header component
interface RTLHeaderProps {
  title: string;
  subtitle?: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  style?: any;
  titleStyle?: any;
  subtitleStyle?: any;
}

export const RTLHeader: React.FC<RTLHeaderProps> = ({
  title,
  subtitle,
  leftComponent,
  rightComponent,
  backgroundColor = '#FFFFFF',
  style,
  titleStyle,
  subtitleStyle
}) => {
  return (
    <View style={[styles.header, { backgroundColor }, style]}>
      <RTLRow justify="space-between" align="center">
        <View style={styles.headerSide}>
          {isRTL() ? rightComponent : leftComponent}
        </View>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, titleStyle]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.headerSubtitle, subtitleStyle]}>
              {subtitle}
            </Text>
          )}
        </View>
        
        <View style={styles.headerSide}>
          {isRTL() ? leftComponent : rightComponent}
        </View>
      </RTLRow>
    </View>
  );
};

// RTL-aware Footer component
interface RTLFooterProps {
  children: React.ReactNode;
  backgroundColor?: string;
  paddingHorizontal?: number;
  paddingVertical?: number;
  style?: any;
}

export const RTLFooter: React.FC<RTLFooterProps> = ({
  children,
  backgroundColor = '#FFFFFF',
  paddingHorizontal = 16,
  paddingVertical = 12,
  style
}) => {
  return (
    <View style={[
      styles.footer,
      { 
        backgroundColor, 
        paddingVertical,
        ...getPaddingHorizontal(paddingHorizontal, paddingHorizontal)
      },
      style
    ]}>
      {children}
    </View>
  );
};

// RTL-aware Grid component
interface RTLGridProps {
  children: React.ReactNode;
  columns?: number;
  spacing?: number;
  style?: any;
}

export const RTLGrid: React.FC<RTLGridProps> = ({
  children,
  columns = 2,
  spacing = 8,
  style
}) => {
  const childrenArray = React.Children.toArray(children);
  const rows = [];
  
  for (let i = 0; i < childrenArray.length; i += columns) {
    const rowChildren = childrenArray.slice(i, i + columns);
    rows.push(
      <RTLRow 
        key={i} 
        justify="space-between" 
        style={{ marginBottom: spacing }}
      >
        {rowChildren.map((child, index) => (
          <View 
            key={index} 
            style={{ 
              flex: 1, 
              ...getMarginHorizontal(
                index === 0 ? 0 : spacing / 2, 
                index === rowChildren.length - 1 ? 0 : spacing / 2
              )
            }}
          >
            {child}
          </View>
        ))}
      </RTLRow>
    );
  }
  
  return (
    <View style={style}>
      {rows}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerSide: {
    width: 60,
    alignItems: 'center'
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 2
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  }
});

// Export all components
export default {
  RTLRow,
  RTLColumn,
  RTLContainer,
  RTLSpacer,
  RTLDivider,
  RTLHeader,
  RTLFooter,
  RTLGrid
};