import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Text, Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useTranslation } from '../../hooks/useTranslation';
import HelpContentService from '../../services/help/HelpContentService';

export interface TooltipContent {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon?: string;
  priority: number;
  showOnScreens?: string[];
  showAfterDelay?: number;
  maxShows?: number;
  dismissAfter?: number;
  triggerConditions?: {
    elementVisible?: string;
    screenTime?: number;
    actionCount?: number;
    userProgress?: string[];
  };
  relatedHelpContent?: string[];
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  targetElement?: string;
}

export interface TooltipPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TooltipManagerProps {
  currentScreen: string;
  userProgress?: any;
  onTooltipAction?: (action: 'dismissed' | 'help-requested' | 'tour-started') => void;
}

interface TooltipState {
  visible: boolean;
  content: TooltipContent | null;
  position: TooltipPosition | null;
  animatedPosition: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export default function TooltipManager({ 
  currentScreen, 
  userProgress, 
  onTooltipAction 
}: TooltipManagerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    content: null,
    position: null,
    animatedPosition: 'center',
  });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const screenDimensions = Dimensions.get('window');
  
  const helpService = HelpContentService.getInstance();
  const tooltipTimers = useRef<NodeJS.Timeout[]>([]);
  const shownTooltips = useRef<Set<string>>(new Set());

  // Default tooltip content for different screens and contexts
  const defaultTooltips: TooltipContent[] = [
    // Dashboard tooltips
    {
      id: 'dashboard-welcome',
      title: 'Welcome to Your Dashboard!',
      titleAr: 'أهلاً بك في لوحة التحكم!',
      description: 'This is your business overview. Tap the help button anytime for assistance.',
      descriptionAr: 'هذه نظرة عامة على عملك. اضغط زر المساعدة في أي وقت للمساعدة.',
      icon: 'information-circle',
      priority: 10,
      showOnScreens: ['ProviderDashboard'],
      showAfterDelay: 2000,
      maxShows: 3,
      dismissAfter: 8000,
      position: 'center',
    },
    {
      id: 'first-service-hint',
      title: 'Add Your First Service',
      titleAr: 'أضف خدمتك الأولى',
      description: 'Start by adding your beauty services. Customers need to see what you offer!',
      descriptionAr: 'ابدأ بإضافة خدمات الجمال الخاصة بك. العملاء بحاجة لرؤية ما تقدمه!',
      icon: 'add-circle',
      priority: 9,
      showOnScreens: ['ServiceList'],
      targetElement: 'addServiceButton',
      triggerConditions: {
        actionCount: 0, // No services added yet
      },
      position: 'bottom',
      relatedHelpContent: ['create-services', 'arabic-service-naming'],
    },
    {
      id: 'whatsapp-setup-hint',
      title: 'Set Up WhatsApp Business',
      titleAr: 'إعداد واتساب بزنس',
      description: 'WhatsApp is essential in Jordan. Set it up to communicate with customers easily.',
      descriptionAr: 'واتساب أساسي في الأردن. قم بإعداده للتواصل مع العملاء بسهولة.',
      icon: 'logo-whatsapp',
      priority: 8,
      showOnScreens: ['NotificationPreferences', 'Profile'],
      targetElement: 'whatsappToggle',
      showAfterDelay: 1000,
      position: 'top',
      relatedHelpContent: ['whatsapp-business'],
    },
    {
      id: 'analytics-insights',
      title: 'Understanding Your Analytics',
      titleAr: 'فهم تحليلاتك',
      description: 'These charts show your business performance. Check them weekly to spot trends.',
      descriptionAr: 'هذه الرسوم البيانية تظهر أداء عملك. تحقق منها أسبوعياً لاكتشاف الاتجاهات.',
      icon: 'bar-chart',
      priority: 7,
      showOnScreens: ['RevenueAnalytics', 'CustomerAnalytics'],
      targetElement: 'analyticsChart',
      showAfterDelay: 3000,
      position: 'bottom',
      relatedHelpContent: ['analytics-insights', 'business-growth'],
    },
    {
      id: 'schedule-management',
      title: 'Smart Schedule Management',
      titleAr: 'إدارة ذكية للجدول',
      description: 'Tip: Set up Friday prayer breaks automatically in your schedule settings.',
      descriptionAr: 'نصيحة: قم بإعداد فترات صلاة الجمعة تلقائياً في إعدادات جدولك.',
      icon: 'calendar',
      priority: 6,
      showOnScreens: ['WeeklyAvailability', 'ExceptionDates'],
      showAfterDelay: 5000,
      position: 'top',
      relatedHelpContent: ['friday-prayer-scheduling', 'schedule-management'],
    },
    {
      id: 'pricing-strategy',
      title: 'Competitive Pricing',
      titleAr: 'التسعير التنافسي',
      description: 'Research shows optimal pricing for your area. Check our pricing guide for tips.',
      descriptionAr: 'الأبحاث تظهر التسعير الأمثل لمنطقتك. تحقق من دليل التسعير للنصائح.',
      icon: 'pricetag',
      priority: 5,
      showOnScreens: ['ServiceForm'],
      targetElement: 'priceInput',
      triggerConditions: {
        screenTime: 10000, // After 10 seconds on screen
      },
      position: 'bottom',
      relatedHelpContent: ['pricing-strategies', 'zarqa-market-tips'],
    },
  ];

  useEffect(() => {
    checkForTooltips();
    return () => {
      // Cleanup timers
      tooltipTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, [currentScreen]);

  useEffect(() => {
    if (tooltipState.visible) {
      showTooltip();
    } else {
      hideTooltip();
    }
  }, [tooltipState.visible]);

  const checkForTooltips = async () => {
    try {
      // Get contextual tooltips based on current screen and user progress
      const relevantTooltips = defaultTooltips.filter(tooltip => {
        // Check if tooltip should show on current screen
        if (tooltip.showOnScreens && !tooltip.showOnScreens.includes(currentScreen)) {
          return false;
        }

        // Check if already shown maximum times
        if (tooltip.maxShows && shownTooltips.current.has(tooltip.id)) {
          return false;
        }

        // Check trigger conditions
        if (tooltip.triggerConditions) {
          return checkTriggerConditions(tooltip.triggerConditions);
        }

        return true;
      });

      // Sort by priority and show the highest priority tooltip
      const sortedTooltips = relevantTooltips.sort((a, b) => b.priority - a.priority);
      
      if (sortedTooltips.length > 0) {
        const tooltipToShow = sortedTooltips[0];
        scheduleTooltip(tooltipToShow);
      }
    } catch (error) {
      console.error('Error checking for tooltips:', error);
    }
  };

  const checkTriggerConditions = (conditions: TooltipContent['triggerConditions']): boolean => {
    if (!conditions) return true;

    // Check user progress conditions
    if (conditions.userProgress && userProgress) {
      const hasRequiredProgress = conditions.userProgress.every(req => 
        userProgress.completedActions?.includes(req)
      );
      if (!hasRequiredProgress) return false;
    }

    // Check action count (e.g., number of services)
    if (conditions.actionCount !== undefined) {
      // This would check actual user data
      return true; // Simplified for now
    }

    return true;
  };

  const scheduleTooltip = (tooltip: TooltipContent) => {
    const delay = tooltip.showAfterDelay || 1000;
    
    const timer = setTimeout(() => {
      showTooltipContent(tooltip);
    }, delay);
    
    tooltipTimers.current.push(timer);
  };

  const showTooltipContent = async (content: TooltipContent) => {
    // Calculate position if target element is specified
    let position: TooltipPosition | null = null;
    let animatedPosition: TooltipState['animatedPosition'] = content.position || 'center';

    if (content.targetElement) {
      // In a real implementation, this would get the actual element coordinates
      position = await getElementPosition(content.targetElement);
      if (position) {
        animatedPosition = calculateOptimalPosition(position);
      }
    }

    setTooltipState({
      visible: true,
      content,
      position,
      animatedPosition,
    });

    // Mark as shown
    shownTooltips.current.add(content.id);

    // Auto-dismiss if specified
    if (content.dismissAfter) {
      const dismissTimer = setTimeout(() => {
        dismissTooltip();
      }, content.dismissAfter);
      
      tooltipTimers.current.push(dismissTimer);
    }
  };

  const getElementPosition = async (elementId: string): Promise<TooltipPosition | null> => {
    // This would use a ref or measurement API to get actual element position
    // For now, return mock position
    return {
      x: 50,
      y: 100,
      width: 200,
      height: 40,
    };
  };

  const calculateOptimalPosition = (targetPos: TooltipPosition): TooltipState['animatedPosition'] => {
    const tooltipHeight = 120;
    const tooltipWidth = 280;
    
    const spaceAbove = targetPos.y;
    const spaceBelow = screenDimensions.height - (targetPos.y + targetPos.height);
    const spaceLeft = targetPos.x;
    const spaceRight = screenDimensions.width - (targetPos.x + targetPos.width);

    // Prefer bottom if enough space, otherwise top
    if (spaceBelow >= tooltipHeight) {
      return 'bottom';
    } else if (spaceAbove >= tooltipHeight) {
      return 'top';
    } else if (spaceRight >= tooltipWidth) {
      return 'right';
    } else if (spaceLeft >= tooltipWidth) {
      return 'left';
    } else {
      return 'center';
    }
  };

  const showTooltip = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideTooltip = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const dismissTooltip = () => {
    setTooltipState(prev => ({ ...prev, visible: false }));
    onTooltipAction?.('dismissed');
  };

  const handleHelpRequest = () => {
    if (tooltipState.content?.relatedHelpContent) {
      // Navigate to related help content
      onTooltipAction?.('help-requested');
    }
    dismissTooltip();
  };

  const handleStartTour = () => {
    // This would trigger a related guided tour
    onTooltipAction?.('tour-started');
    dismissTooltip();
  };

  if (!tooltipState.visible || !tooltipState.content) {
    return null;
  }

  const { content, position, animatedPosition } = tooltipState;
  const tooltipStyle = getTooltipStyle(position, animatedPosition);

  return (
    <Portal>
      <TouchableWithoutFeedback onPress={dismissTooltip}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.tooltip,
                tooltipStyle,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Tooltip Arrow */}
              {position && (
                <View style={[styles.arrow, getArrowStyle(animatedPosition)]} />
              )}

              {/* Tooltip Content */}
              <View style={styles.tooltipContent}>
                {content.icon && (
                  <View style={styles.iconContainer}>
                    <Ionicons 
                      name={content.icon as any} 
                      size={24} 
                      color={colors.primary} 
                    />
                  </View>
                )}
                
                <View style={styles.textContent}>
                  <Text style={styles.tooltipTitle}>
                    {isRTL ? content.titleAr : content.title}
                  </Text>
                  <Text style={styles.tooltipDescription}>
                    {isRTL ? content.descriptionAr : content.description}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={dismissTooltip}
                  >
                    <Ionicons name="close" size={16} color={colors.text.secondary} />
                  </TouchableOpacity>
                  
                  {content.relatedHelpContent && (
                    <TouchableOpacity
                      style={styles.helpButton}
                      onPress={handleHelpRequest}
                    >
                      <Ionicons name="help-circle" size={16} color={colors.primary} />
                      <Text style={styles.helpButtonText}>{t('learnMore')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Portal>
  );
}

const getTooltipStyle = (
  position: TooltipPosition | null, 
  animatedPosition: TooltipState['animatedPosition']
) => {
  const baseStyle = {
    position: 'absolute' as const,
    maxWidth: 280,
    minWidth: 200,
  };

  if (!position) {
    // Center tooltip
    return {
      ...baseStyle,
      top: '40%',
      left: 20,
      right: 20,
    };
  }

  const { x, y, width, height } = position;

  switch (animatedPosition) {
    case 'top':
      return {
        ...baseStyle,
        bottom: Dimensions.get('window').height - y + 10,
        left: Math.max(20, x + width / 2 - 140),
      };
    case 'bottom':
      return {
        ...baseStyle,
        top: y + height + 10,
        left: Math.max(20, x + width / 2 - 140),
      };
    case 'left':
      return {
        ...baseStyle,
        top: y + height / 2 - 60,
        right: Dimensions.get('window').width - x + 10,
      };
    case 'right':
      return {
        ...baseStyle,
        top: y + height / 2 - 60,
        left: x + width + 10,
      };
    default:
      return {
        ...baseStyle,
        top: '40%',
        left: 20,
        right: 20,
      };
  }
};

const getArrowStyle = (position: TooltipState['animatedPosition']) => {
  const arrowSize = 8;
  
  switch (position) {
    case 'top':
      return {
        bottom: -arrowSize,
        left: '50%',
        marginLeft: -arrowSize,
        borderTopColor: colors.surface,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
      };
    case 'bottom':
      return {
        top: -arrowSize,
        left: '50%',
        marginLeft: -arrowSize,
        borderBottomColor: colors.surface,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'transparent',
      };
    case 'left':
      return {
        right: -arrowSize,
        top: '50%',
        marginTop: -arrowSize,
        borderLeftColor: colors.surface,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderRightColor: 'transparent',
      };
    case 'right':
      return {
        left: -arrowSize,
        top: '50%',
        marginTop: -arrowSize,
        borderRightColor: colors.surface,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
      };
    default:
      return { display: 'none' };
  }
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  tooltip: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderWidth: 8,
  },
  tooltipContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    paddingRight: 8,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  tooltipDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.text.secondary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
  },
  helpButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
});