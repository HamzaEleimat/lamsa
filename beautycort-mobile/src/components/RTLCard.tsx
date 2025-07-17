/**
 * RTL-Aware Card Component
 * Demonstrates proper RTL card layout with proper spacing and alignment
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  getCardStyle, 
  getFlexDirection, 
  getTextAlign, 
  getMarginStart, 
  getMarginEnd,
  getPaddingHorizontal,
  getBorderStart,
  getAlignItems,
  getJustifyContent
} from '../utils/rtl';

interface RTLCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  image?: React.ReactNode;
  actions?: React.ReactNode;
  onPress?: () => void;
  style?: any;
  elevation?: number;
  padding?: number;
  borderRadius?: number;
  showBorder?: boolean;
  borderColor?: string;
  imagePosition?: 'left' | 'right' | 'top';
}

const RTLCard: React.FC<RTLCardProps> = ({
  title,
  subtitle,
  description,
  image,
  actions,
  onPress,
  style,
  elevation = 2,
  padding = 16,
  borderRadius = 12,
  showBorder = false,
  borderColor = '#E0E0E0',
  imagePosition = 'left'
}) => {
  const cardStyle = getCardStyle(elevation);
  
  const renderImage = () => {
    if (!image) return null;
    
    const imageStyle = imagePosition === 'left' 
      ? getMarginEnd(12) 
      : imagePosition === 'right' 
        ? getMarginStart(12) 
        : { marginBottom: 12 };
    
    return (
      <View style={[styles.imageContainer, imageStyle]}>
        {image}
      </View>
    );
  };

  const renderContent = () => (
    <View style={styles.content}>
      <Text style={[styles.title, { textAlign: getTextAlign('left') }]} numberOfLines={2}>
        {title}
      </Text>
      
      {subtitle && (
        <Text style={[styles.subtitle, { textAlign: getTextAlign('left') }]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
      
      {description && (
        <Text style={[styles.description, { textAlign: getTextAlign('left') }]} numberOfLines={3}>
          {description}
        </Text>
      )}
    </View>
  );

  const renderActions = () => {
    if (!actions) return null;
    
    return (
      <View style={[styles.actions, { flexDirection: getFlexDirection('row') }]}>
        {actions}
      </View>
    );
  };

  const getContainerStyle = () => {
    if (imagePosition === 'top') {
      return {
        flexDirection: 'column' as const,
        alignItems: getAlignItems('flex-start')
      };
    }
    
    return {
      flexDirection: getFlexDirection('row'),
      alignItems: getAlignItems('flex-start')
    };
  };

  const CardContent = () => (
    <View style={[styles.container, getContainerStyle()]}>
      {(imagePosition === 'left' || imagePosition === 'top') && renderImage()}
      
      <View style={[styles.textContainer, imagePosition === 'top' && { width: '100%' }]}>
        {renderContent()}
        {renderActions()}
      </View>
      
      {imagePosition === 'right' && renderImage()}
    </View>
  );

  const cardContainerStyle = [
    styles.card,
    cardStyle,
    getPaddingHorizontal(padding, padding),
    { 
      borderRadius, 
      paddingVertical: padding 
    },
    showBorder && getBorderStart(1, borderColor),
    style
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardContainerStyle}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <CardContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardContainerStyle}>
      <CardContent />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginVertical: 4,
    marginHorizontal: 0
  },
  container: {
    flex: 1
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  content: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8
  },
  description: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 20
  },
  actions: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: getJustifyContent('flex-end')
  }
});

export default RTLCard;