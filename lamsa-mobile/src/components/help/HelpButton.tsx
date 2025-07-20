import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Text, Portal, Modal, Card, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';

interface HelpAction {
  id: string;
  title: string;
  titleAr: string;
  icon: string;
  action: () => void;
  color?: string;
}

interface HelpButtonProps {
  // Screen context for contextual help
  screen?: string;
  // Specific help actions for this screen
  contextualActions?: HelpAction[];
  // Position of the button
  position?: 'floating' | 'header' | 'inline';
  // Size of the button
  size?: 'small' | 'medium' | 'large';
  // Custom style
  style?: any;
  // Show pulse animation for new users
  showPulse?: boolean;
  // Custom help content
  helpContent?: {
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
  };
}

export default function HelpButton({
  screen = 'unknown',
  contextualActions = [],
  position = 'floating',
  size = 'medium',
  style,
  showPulse = false,
  helpContent,
}: HelpButtonProps) {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isRTL = i18n.language === 'ar';

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  React.useEffect(() => {
    if (showPulse) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      // Stop pulse after 10 seconds
      setTimeout(() => pulse.stop(), 10000);
      
      return () => pulse.stop();
    }
  }, [showPulse]);

  const getButtonSize = () => {
    switch (size) {
      case 'small': return 36;
      case 'large': return 56;
      default: return 44;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 18;
      case 'large': return 28;
      default: return 22;
    }
  };

  // Default help actions available on all screens
  const defaultActions: HelpAction[] = [
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      titleAr: 'الأسئلة الشائعة',
      icon: 'help-circle',
      action: () => {
        setShowHelpModal(false);
        navigation.navigate('FAQScreen');
      },
      color: colors.primary,
    },
    {
      id: 'video-tutorials',
      title: 'Video Tutorials',
      titleAr: 'دروس الفيديو',
      icon: 'play-circle',
      action: () => {
        setShowHelpModal(false);
        navigation.navigate('VideoTutorials');
      },
      color: colors.secondary,
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      titleAr: 'أفضل الممارسات',
      icon: 'star',
      action: () => {
        setShowHelpModal(false);
        navigation.navigate('BestPractices');
      },
      color: colors.warning,
    },
    {
      id: 'community-tips',
      title: 'Community Tips',
      titleAr: 'نصائح المجتمع',
      icon: 'people',
      action: () => {
        setShowHelpModal(false);
        navigation.navigate('CommunityTips');
      },
      color: colors.success,
    },
    {
      id: 'support',
      title: 'Contact Support',
      titleAr: 'اتصل بالدعم',
      icon: 'headset',
      action: () => {
        setShowHelpModal(false);
        navigation.navigate('SupportScreen');
      },
      color: colors.error,
    },
  ];

  // Screen-specific contextual actions
  const getContextualActions = (): HelpAction[] => {
    const screenActions: { [key: string]: HelpAction[] } = {
      'ServiceList': [
        {
          id: 'add-service-help',
          title: 'How to Add Services',
          titleAr: 'كيفية إضافة الخدمات',
          icon: 'add-circle',
          action: () => {
            setShowHelpModal(false);
            navigation.navigate('VideoTutorials', { videoId: 'service-creation-guide' });
          },
          color: colors.primary,
        },
        {
          id: 'pricing-guide',
          title: 'Pricing Guide for Jordan',
          titleAr: 'دليل التسعير للأردن',
          icon: 'pricetag',
          action: () => {
            setShowHelpModal(false);
            navigation.navigate('BestPractices', { section: 'pricing' });
          },
          color: colors.warning,
        },
      ],
      'ProviderDashboard': [
        {
          id: 'dashboard-tour',
          title: 'Dashboard Tour',
          titleAr: 'جولة في لوحة التحكم',
          icon: 'map',
          action: () => {
            setShowHelpModal(false);
            // Start guided tour
            navigation.navigate('GuidedTour', { tourId: 'dashboard-overview' });
          },
          color: colors.primary,
        },
        {
          id: 'analytics-help',
          title: 'Understanding Analytics',
          titleAr: 'فهم التحليلات',
          icon: 'bar-chart',
          action: () => {
            setShowHelpModal(false);
            navigation.navigate('VideoTutorials', { videoId: 'analytics-deep-dive' });
          },
          color: colors.secondary,
        },
      ],
      'Profile': [
        {
          id: 'profile-setup',
          title: 'Profile Setup Guide',
          titleAr: 'دليل إعداد الملف الشخصي',
          icon: 'person',
          action: () => {
            setShowHelpModal(false);
            navigation.navigate('VideoTutorials', { videoId: 'setup-profile' });
          },
          color: colors.primary,
        },
        {
          id: 'whatsapp-setup',
          title: 'WhatsApp Business Setup',
          titleAr: 'إعداد واتساب بزنس',
          icon: 'logo-whatsapp',
          action: () => {
            setShowHelpModal(false);
            navigation.navigate('VideoTutorials', { videoId: 'whatsapp-business-setup' });
          },
          color: '#25D366',
        },
      ],
      'WeeklyAvailability': [
        {
          id: 'schedule-help',
          title: 'Schedule Management',
          titleAr: 'إدارة الجدول',
          icon: 'calendar',
          action: () => {
            setShowHelpModal(false);
            navigation.navigate('BestPractices', { section: 'operations' });
          },
          color: colors.primary,
        },
        {
          id: 'friday-prayers',
          title: 'Friday Prayers Setup',
          titleAr: 'إعداد صلاة الجمعة',
          icon: 'time',
          action: () => {
            setShowHelpModal(false);
            navigation.navigate('GuidedTour', { tourId: 'friday-prayer-scheduling' });
          },
          color: colors.success,
        },
      ],
      'BookingManagement': [
        {
          id: 'booking-help',
          title: 'Managing Bookings',
          titleAr: 'إدارة الحجوزات',
          icon: 'calendar',
          action: () => {
            setShowHelpModal(false);
            navigation.navigate('FAQScreen', { category: 'booking_problems' });
          },
          color: colors.primary,
        },
        {
          id: 'customer-communication',
          title: 'Customer Communication',
          titleAr: 'التواصل مع العملاء',
          icon: 'chatbubbles',
          action: () => {
            setShowHelpModal(false);
            navigation.navigate('BestPractices', { section: 'customer-service' });
          },
          color: colors.secondary,
        },
      ],
    };

    return [...(screenActions[screen] || []), ...contextualActions];
  };

  const allActions = [...getContextualActions(), ...defaultActions];

  const renderHelpAction = (action: HelpAction) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.helpActionItem, { borderLeftColor: action.color || colors.primary }]}
      onPress={action.action}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: (action.color || colors.primary) + '15' }]}>
        <Ionicons
          name={action.icon as any}
          size={20}
          color={action.color || colors.primary}
        />
      </View>
      <Text style={styles.actionTitle}>
        {isRTL ? action.titleAr : action.title}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
    </TouchableOpacity>
  );

  const buttonStyle = [
    styles.helpButton,
    position === 'floating' && styles.floatingButton,
    position === 'header' && styles.headerButton,
    position === 'inline' && styles.inlineButton,
    {
      width: getButtonSize(),
      height: getButtonSize(),
      borderRadius: getButtonSize() / 2,
    },
    style,
  ];

  return (
    <>
      <Animated.View
        style={[
          showPulse && {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={buttonStyle}
          onPress={() => setShowHelpModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="help-circle"
            size={getIconSize()}
            color={position === 'floating' ? 'white' : colors.primary}
          />
        </TouchableOpacity>
      </Animated.View>

      <Portal>
        <Modal
          visible={showHelpModal}
          onDismiss={() => setShowHelpModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.helpModal}>
            <View style={styles.modalHeader}>
              <View style={styles.headerContent}>
                <Ionicons name="help-circle" size={32} color={colors.primary} />
                <View style={styles.headerText}>
                  <Text style={styles.modalTitle}>
                    {helpContent ? (isRTL ? helpContent.titleAr : helpContent.title) : t('helpCenter')}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {helpContent 
                      ? (isRTL ? helpContent.descriptionAr : helpContent.description)
                      : t('howCanWeHelpYou')
                    }
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowHelpModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Contextual Actions */}
              {getContextualActions().length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('helpForThisScreen')}</Text>
                  {getContextualActions().map(renderHelpAction)}
                </View>
              )}

              {/* General Help Actions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('generalHelp')}</Text>
                {defaultActions.map(renderHelpAction)}
              </View>

              {/* Quick Access */}
              <View style={styles.quickAccess}>
                <Text style={styles.quickAccessTitle}>{t('quickAccess')}</Text>
                <View style={styles.quickAccessButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setShowHelpModal(false);
                      navigation.navigate('HelpCenter');
                    }}
                    style={styles.quickAccessButton}
                    compact
                  >
                    {t('helpCenter')}
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setShowHelpModal(false);
                      navigation.navigate('TroubleshootingScreen');
                    }}
                    style={styles.quickAccessButton}
                    compact
                  >
                    {t('troubleshooting')}
                  </Button>
                </View>
              </View>
            </View>
          </Card>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  helpButton: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  headerButton: {
    backgroundColor: colors.primary + '15',
    shadowOpacity: 0,
    elevation: 0,
  },
  inlineButton: {
    backgroundColor: colors.primary + '15',
    shadowOpacity: 0,
    elevation: 0,
  },
  modalContainer: {
    margin: 20,
    maxHeight: '85%',
  },
  helpModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: colors.primary + '05',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: 400,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  helpActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTitle: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  quickAccess: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.text.secondary + '20',
  },
  quickAccessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  quickAccessButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAccessButton: {
    flex: 1,
  },
});