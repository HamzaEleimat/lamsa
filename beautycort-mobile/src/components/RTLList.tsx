/**
 * RTL-Aware List Component
 * Demonstrates proper RTL list layout with proper item alignment and actions
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { 
  getFlexDirection, 
  getTextAlign, 
  getMarginStart, 
  getMarginEnd,
  getPaddingHorizontal,
  getAlignItems,
  getJustifyContent,
  getBorderStart,
  getListItemStyle,
  isRTL
} from '../utils/rtl';

interface RTLListItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

interface RTLListProps {
  data: RTLListItem[];
  renderItem?: (item: RTLListItem, index: number) => React.ReactNode;
  keyExtractor?: (item: RTLListItem, index: number) => string;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  showSeparator?: boolean;
  separatorColor?: string;
  itemPadding?: number;
  style?: any;
  contentContainerStyle?: any;
  horizontal?: boolean;
  numColumns?: number;
}

const RTLList: React.FC<RTLListProps> = ({
  data,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  onRefresh,
  refreshing = false,
  showSeparator = true,
  separatorColor = '#E0E0E0',
  itemPadding = 16,
  style,
  contentContainerStyle,
  horizontal = false,
  numColumns = 1
}) => {
  const defaultKeyExtractor = (item: RTLListItem, index: number) => 
    item.id || index.toString();

  const renderDefaultItem = (item: RTLListItem, index: number) => (
    <RTLListItem
      key={item.id || index.toString()}
      item={item}
      index={index}
      showSeparator={showSeparator && index < data.length - 1}
      separatorColor={separatorColor}
      itemPadding={itemPadding}
    />
  );

  const renderFlatListItem = ({ item, index }: { item: RTLListItem; index: number }) => {
    if (renderItem) {
      return renderItem(item, index);
    }
    return renderDefaultItem(item, index);
  };

  const renderSeparator = () => {
    if (!showSeparator) return null;
    
    return (
      <View style={[styles.separator, { backgroundColor: separatorColor }]} />
    );
  };

  const renderEmptyComponent = () => {
    if (ListEmptyComponent) {
      return ListEmptyComponent;
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { textAlign: getTextAlign('center') }]}>
          No items found
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={renderFlatListItem}
      keyExtractor={keyExtractor || defaultKeyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={renderEmptyComponent}
      ItemSeparatorComponent={renderSeparator}
      onRefresh={onRefresh}
      refreshing={refreshing}
      style={[styles.list, style]}
      contentContainerStyle={[
        styles.contentContainer,
        contentContainerStyle
      ]}
      horizontal={horizontal}
      numColumns={numColumns}
      showsVerticalScrollIndicator={!horizontal}
      showsHorizontalScrollIndicator={horizontal}
    />
  );
};

interface RTLListItemProps {
  item: RTLListItem;
  index: number;
  showSeparator: boolean;
  separatorColor: string;
  itemPadding: number;
}

const RTLListItem: React.FC<RTLListItemProps> = ({
  item,
  index,
  showSeparator,
  separatorColor,
  itemPadding
}) => {
  const renderImage = () => {
    if (!item.image) return null;
    
    return (
      <View style={[styles.imageContainer, getMarginEnd(12)]}>
        {item.image}
      </View>
    );
  };

  const renderBadge = () => {
    if (!item.badge) return null;
    
    return (
      <View style={[styles.badgeContainer, getMarginStart(8)]}>
        {item.badge}
      </View>
    );
  };

  const renderActions = () => {
    if (!item.actions) return null;
    
    return (
      <View style={[styles.actionsContainer, getMarginStart(8)]}>
        {item.actions}
      </View>
    );
  };

  const renderContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.textContainer}>
        <View style={[styles.titleRow, { flexDirection: getFlexDirection('row') }]}>
          <Text 
            style={[styles.title, { textAlign: getTextAlign('left') }]} 
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {renderBadge()}
        </View>
        
        {item.subtitle && (
          <Text 
            style={[styles.subtitle, { textAlign: getTextAlign('left') }]} 
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        )}
        
        {item.description && (
          <Text 
            style={[styles.description, { textAlign: getTextAlign('left') }]} 
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}
      </View>
      
      {renderActions()}
    </View>
  );

  const itemStyle = [
    styles.item,
    getPaddingHorizontal(itemPadding, itemPadding),
    { paddingVertical: itemPadding },
    item.disabled && styles.disabled,
    showSeparator && getBorderStart(0, separatorColor)
  ];

  if (item.onPress && !item.disabled) {
    return (
      <TouchableOpacity
        style={itemStyle}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.itemContent, { flexDirection: getFlexDirection('row') }]}>
          {renderImage()}
          {renderContent()}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={itemStyle}>
      <View style={[styles.itemContent, { flexDirection: getFlexDirection('row') }]}>
        {renderImage()}
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  contentContainer: {
    flexGrow: 1
  },
  item: {
    backgroundColor: '#FFFFFF',
    minHeight: 60
  },
  itemContent: {
    flex: 1,
    alignItems: getAlignItems('flex-start')
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40
  },
  contentContainer: {
    flex: 1,
    flexDirection: getFlexDirection('row'),
    alignItems: getAlignItems('flex-start'),
    justifyContent: getJustifyContent('space-between')
  },
  textContainer: {
    flex: 1
  },
  titleRow: {
    alignItems: getAlignItems('flex-start'),
    justifyContent: getJustifyContent('space-between'),
    marginBottom: 4
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 4
  },
  description: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 18
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionsContainer: {
    flexDirection: getFlexDirection('row'),
    alignItems: 'center',
    justifyContent: 'center'
  },
  disabled: {
    opacity: 0.5
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 16,
    color: '#666666'
  }
});

// Export both components
export { RTLList, RTLListItem };
export default RTLList;