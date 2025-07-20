/**
 * RTL (Right-to-Left) Layout Utilities
 * Provides comprehensive RTL support for Arabic language layouts
 */

import { I18nManager, StyleSheet } from 'react-native';
import { isRTL } from '../i18n';

// RTL-aware style properties
export interface RTLStyleProps {
  marginLeft?: number;
  marginRight?: number;
  paddingLeft?: number;
  paddingRight?: number;
  left?: number;
  right?: number;
  borderLeftWidth?: number;
  borderRightWidth?: number;
  borderLeftColor?: string;
  borderRightColor?: string;
  textAlign?: 'left' | 'right' | 'center' | 'justify';
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
}

// RTL-aware text alignment
export const getTextAlign = (align: 'left' | 'right' | 'center' | 'justify' = 'left'): 'left' | 'right' | 'center' | 'justify' => {
  if (align === 'center' || align === 'justify') {
    return align;
  }
  
  if (isRTL()) {
    return align === 'left' ? 'right' : 'left';
  }
  
  return align;
};

// RTL-aware flex direction
export const getFlexDirection = (direction: 'row' | 'row-reverse' | 'column' | 'column-reverse' = 'row'): 'row' | 'row-reverse' | 'column' | 'column-reverse' => {
  if (direction === 'column' || direction === 'column-reverse') {
    return direction;
  }
  
  if (isRTL()) {
    return direction === 'row' ? 'row-reverse' : 'row';
  }
  
  return direction;
};

// RTL-aware margin utilities
export const getMarginHorizontal = (left: number, right: number) => {
  if (isRTL()) {
    return { marginLeft: right, marginRight: left };
  }
  return { marginLeft: left, marginRight: right };
};

export const getMarginLeft = (value: number) => {
  return isRTL() ? { marginRight: value } : { marginLeft: value };
};

export const getMarginRight = (value: number) => {
  return isRTL() ? { marginLeft: value } : { marginRight: value };
};

export const getMarginStart = (value: number) => {
  return isRTL() ? { marginRight: value } : { marginLeft: value };
};

export const getMarginEnd = (value: number) => {
  return isRTL() ? { marginLeft: value } : { marginRight: value };
};

// RTL-aware padding utilities
export const getPaddingHorizontal = (left: number, right: number) => {
  if (isRTL()) {
    return { paddingLeft: right, paddingRight: left };
  }
  return { paddingLeft: left, paddingRight: right };
};

export const getPaddingLeft = (value: number) => {
  return isRTL() ? { paddingRight: value } : { paddingLeft: value };
};

export const getPaddingRight = (value: number) => {
  return isRTL() ? { paddingLeft: value } : { paddingRight: value };
};

export const getPaddingStart = (value: number) => {
  return isRTL() ? { paddingRight: value } : { paddingLeft: value };
};

export const getPaddingEnd = (value: number) => {
  return isRTL() ? { paddingLeft: value } : { paddingRight: value };
};

// RTL-aware position utilities
export const getPositionHorizontal = (left: number, right: number) => {
  if (isRTL()) {
    return { left: right, right: left };
  }
  return { left: left, right: right };
};

export const getPositionLeft = (value: number) => {
  return isRTL() ? { right: value } : { left: value };
};

export const getPositionRight = (value: number) => {
  return isRTL() ? { left: value } : { right: value };
};

export const getPositionStart = (value: number) => {
  return isRTL() ? { right: value } : { left: value };
};

export const getPositionEnd = (value: number) => {
  return isRTL() ? { left: value } : { right: value };
};

// RTL-aware border utilities
export const getBorderHorizontal = (leftWidth: number, rightWidth: number, leftColor?: string, rightColor?: string) => {
  if (isRTL()) {
    return {
      borderLeftWidth: rightWidth,
      borderRightWidth: leftWidth,
      ...(leftColor && { borderRightColor: leftColor }),
      ...(rightColor && { borderLeftColor: rightColor })
    };
  }
  return {
    borderLeftWidth: leftWidth,
    borderRightWidth: rightWidth,
    ...(leftColor && { borderLeftColor: leftColor }),
    ...(rightColor && { borderRightColor: rightColor })
  };
};

export const getBorderLeft = (width: number, color?: string) => {
  const borderSide = isRTL() ? 'Right' : 'Left';
  return {
    [`border${borderSide}Width`]: width,
    ...(color && { [`border${borderSide}Color`]: color })
  };
};

export const getBorderRight = (width: number, color?: string) => {
  const borderSide = isRTL() ? 'Left' : 'Right';
  return {
    [`border${borderSide}Width`]: width,
    ...(color && { [`border${borderSide}Color`]: color })
  };
};

export const getBorderStart = (width: number, color?: string) => {
  const borderSide = isRTL() ? 'Right' : 'Left';
  return {
    [`border${borderSide}Width`]: width,
    ...(color && { [`border${borderSide}Color`]: color })
  };
};

export const getBorderEnd = (width: number, color?: string) => {
  const borderSide = isRTL() ? 'Left' : 'Right';
  return {
    [`border${borderSide}Width`]: width,
    ...(color && { [`border${borderSide}Color`]: color })
  };
};

// RTL-aware transform utilities
export const getTransformX = (value: number) => {
  return isRTL() ? -value : value;
};

export const getRotateY = (degrees: number) => {
  return isRTL() ? `${180 + degrees}deg` : `${degrees}deg`;
};

export const getScaleX = (value: number) => {
  return isRTL() ? -value : value;
};

// RTL-aware icon utilities
export const getIconRotation = (iconName: string) => {
  const shouldRotate = [
    'arrow-left',
    'arrow-right',
    'chevron-left',
    'chevron-right',
    'caret-left',
    'caret-right',
    'angle-left',
    'angle-right',
    'back',
    'forward',
    'next',
    'previous'
  ];
  
  if (isRTL() && shouldRotate.some(name => iconName.includes(name))) {
    return { transform: [{ scaleX: -1 }] };
  }
  
  return {};
};

// RTL-aware animation utilities
export const getSlideAnimation = (direction: 'left' | 'right' | 'up' | 'down') => {
  if (direction === 'up' || direction === 'down') {
    return direction;
  }
  
  if (isRTL()) {
    return direction === 'left' ? 'right' : 'left';
  }
  
  return direction;
};

// RTL-aware layout utilities
export const getAlignItems = (align: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline') => {
  if (align === 'center' || align === 'stretch' || align === 'baseline') {
    return align;
  }
  
  if (isRTL()) {
    return align === 'flex-start' ? 'flex-end' : 'flex-start';
  }
  
  return align;
};

export const getJustifyContent = (justify: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly') => {
  if (justify === 'center' || justify === 'space-between' || justify === 'space-around' || justify === 'space-evenly') {
    return justify;
  }
  
  if (isRTL()) {
    return justify === 'flex-start' ? 'flex-end' : 'flex-start';
  }
  
  return justify;
};

// RTL-aware style creator
export const createRTLStyle = (styles: any) => {
  return StyleSheet.create({
    ...styles,
    // Add RTL-specific overrides
    container: {
      ...styles.container,
      flexDirection: getFlexDirection(styles.container?.flexDirection)
    },
    text: {
      ...styles.text,
      textAlign: getTextAlign(styles.text?.textAlign)
    },
    row: {
      ...styles.row,
      flexDirection: getFlexDirection('row')
    },
    rowReverse: {
      ...styles.rowReverse,
      flexDirection: getFlexDirection('row-reverse')
    }
  });
};

// RTL-aware component style helpers
export const RTLStyles = {
  // Common layouts
  row: {
    flexDirection: getFlexDirection('row')
  },
  rowReverse: {
    flexDirection: getFlexDirection('row-reverse')
  },
  rowCenter: {
    flexDirection: getFlexDirection('row'),
    alignItems: 'center'
  },
  rowBetween: {
    flexDirection: getFlexDirection('row'),
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rowAround: {
    flexDirection: getFlexDirection('row'),
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  
  // Text alignment
  textLeft: {
    textAlign: getTextAlign('left')
  },
  textRight: {
    textAlign: getTextAlign('right')
  },
  textStart: {
    textAlign: getTextAlign('left')
  },
  textEnd: {
    textAlign: getTextAlign('right')
  },
  
  // Common margins
  marginStart: (value: number) => getMarginStart(value),
  marginEnd: (value: number) => getMarginEnd(value),
  marginLeft: (value: number) => getMarginLeft(value),
  marginRight: (value: number) => getMarginRight(value),
  
  // Common paddings
  paddingStart: (value: number) => getPaddingStart(value),
  paddingEnd: (value: number) => getPaddingEnd(value),
  paddingLeft: (value: number) => getPaddingLeft(value),
  paddingRight: (value: number) => getPaddingRight(value),
  
  // Common positions
  positionStart: (value: number) => getPositionStart(value),
  positionEnd: (value: number) => getPositionEnd(value),
  positionLeft: (value: number) => getPositionLeft(value),
  positionRight: (value: number) => getPositionRight(value),
  
  // Icon styles
  iconLeft: {
    ...getMarginRight(8),
    ...getIconRotation('left')
  },
  iconRight: {
    ...getMarginLeft(8),
    ...getIconRotation('right')
  },
  iconStart: {
    ...getMarginEnd(8),
    ...getIconRotation('left')
  },
  iconEnd: {
    ...getMarginStart(8),
    ...getIconRotation('right')
  }
};

// RTL-aware component props helpers
export const getRTLProps = (props: any) => {
  return {
    ...props,
    style: [
      props.style,
      isRTL() && props.rtlStyle
    ]
  };
};

// RTL-aware image handling
export const getImageStyle = (style: any) => {
  return {
    ...style,
    transform: [
      ...(style.transform || []),
      ...(isRTL() && style.flipRTL ? [{ scaleX: -1 }] : [])
    ]
  };
};

// RTL-aware list item styles
export const getListItemStyle = (isFirst: boolean, isLast: boolean) => {
  return {
    ...getBorderStart(isFirst ? 0 : 1, '#E0E0E0'),
    ...getBorderEnd(isLast ? 0 : 1, '#E0E0E0')
  };
};

// RTL-aware card styles
export const getCardStyle = (elevation: number = 2) => {
  return {
    shadowOffset: {
      width: isRTL() ? -2 : 2,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: elevation,
    elevation: elevation
  };
};

// RTL-aware input styles
export const getInputStyle = (focused: boolean = false) => {
  return {
    textAlign: getTextAlign('left'),
    ...getBorderStart(focused ? 2 : 1, focused ? '#007AFF' : '#E0E0E0')
  };
};

// RTL-aware button styles
export const getButtonStyle = (variant: 'primary' | 'secondary' | 'text' = 'primary') => {
  const baseStyle = {
    flexDirection: getFlexDirection('row'),
    alignItems: 'center',
    justifyContent: 'center'
  };
  
  if (variant === 'text') {
    return {
      ...baseStyle,
      ...getPaddingHorizontal(16, 16)
    };
  }
  
  return {
    ...baseStyle,
    ...getPaddingHorizontal(24, 24),
    ...getCardStyle(1)
  };
};

// RTL-aware tab styles
export const getTabStyle = (active: boolean = false) => {
  return {
    ...getBorderEnd(active ? 3 : 0, '#007AFF'),
    ...getPaddingHorizontal(16, 16),
    alignItems: 'center'
  };
};

// RTL-aware modal styles
export const getModalStyle = () => {
  return {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(isRTL() && { transform: [{ scaleX: -1 }] })
  };
};

// RTL-aware navigation styles
export const getNavigationStyle = () => {
  return {
    headerTitleAlign: 'center',
    headerStyle: {
      backgroundColor: '#FFFFFF'
    },
    headerTitleStyle: {
      color: '#000000',
      fontSize: 18,
      fontWeight: 'bold'
    },
    headerBackTitleVisible: false,
    headerTintColor: '#007AFF',
    ...(isRTL() && {
      headerLeft: () => null, // Custom back button for RTL
      headerRight: () => null // Custom menu button for RTL
    })
  };
};

// Debug utilities
export const debugRTL = () => {
  console.log('RTL Debug Info:', {
    isRTL: isRTL(),
    forcedRTL: I18nManager.isRTL,
    allowRTL: I18nManager.allowRTL,
    doLeftAndRightSwapInRTL: I18nManager.doLeftAndRightSwapInRTL
  });
};

// Export all utilities
export default {
  // Core utilities
  isRTL,
  getTextAlign,
  getFlexDirection,
  
  // Spacing utilities
  getMarginHorizontal,
  getMarginLeft,
  getMarginRight,
  getMarginStart,
  getMarginEnd,
  getPaddingHorizontal,
  getPaddingLeft,
  getPaddingRight,
  getPaddingStart,
  getPaddingEnd,
  
  // Position utilities
  getPositionHorizontal,
  getPositionLeft,
  getPositionRight,
  getPositionStart,
  getPositionEnd,
  
  // Border utilities
  getBorderHorizontal,
  getBorderLeft,
  getBorderRight,
  getBorderStart,
  getBorderEnd,
  
  // Transform utilities
  getTransformX,
  getRotateY,
  getScaleX,
  
  // Component utilities
  getIconRotation,
  getSlideAnimation,
  getAlignItems,
  getJustifyContent,
  
  // Style creators
  createRTLStyle,
  RTLStyles,
  getRTLProps,
  getImageStyle,
  getListItemStyle,
  getCardStyle,
  getInputStyle,
  getButtonStyle,
  getTabStyle,
  getModalStyle,
  getNavigationStyle,
  
  // Debug
  debugRTL
};