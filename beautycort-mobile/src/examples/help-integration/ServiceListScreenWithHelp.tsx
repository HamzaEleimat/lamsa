import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Text, FAB, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import HelpIntegrationWrapper from '../../components/help/HelpIntegrationWrapper';
import { useScreenHelp } from '../../contexts/HelpContext';

// Example integration of help system into ServiceList screen
export default function ServiceListScreenWithHelp() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use screen-specific help
  const screenHelp = useScreenHelp('ServiceList', {
    serviceCount: services.length,
    isFirstTime: services.length === 0,
    hasProfilePhoto: user?.profilePhoto ? true : false,
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      // Load services logic here
      setServices([]); // Mock empty services for demo
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    // Track help interaction when user performs key action
    screenHelp.trackHelpInteraction('action_add_service', 'ServiceList', {
      serviceCount: services.length,
      isFirstService: services.length === 0,
    });
    
    navigation.navigate('AddService');
  };

  // Custom help actions specific to this screen
  const customHelpActions = [
    {
      id: 'add-first-service',
      title: 'Add Your First Service',
      titleAr: 'أضف خدمتك الأولى',
      icon: 'add-circle',
      action: () => {
        screenHelp.markContentViewed('add-first-service-guide');
        navigation.navigate('VideoTutorials', { videoId: 'service-creation-guide' });
      },
      color: colors.primary,
    },
    {
      id: 'service-photos-guide',
      title: 'Adding Service Photos',
      titleAr: 'إضافة صور الخدمات',
      icon: 'camera',
      action: () => {
        screenHelp.markContentViewed('service-photos-guide');
        navigation.navigate('BestPractices', { section: 'service-photos' });
      },
      color: colors.secondary,
    },
    {
      id: 'pricing-strategy',
      title: 'Pricing for Jordan Market',
      titleAr: 'التسعير للسوق الأردني',
      icon: 'pricetag',
      action: () => {
        screenHelp.markContentViewed('jordan-pricing-guide');
        navigation.navigate('BestPractices', { section: 'pricing' });
      },
      color: colors.warning,
    },
  ];

  // Custom help content for this screen
  const helpContent = {
    title: 'Service Management Help',
    titleAr: 'مساعدة إدارة الخدمات',
    description: 'Learn how to add, edit, and manage your beauty services effectively',
    descriptionAr: 'تعلم كيفية إضافة وتحرير وإدارة خدمات الجمال الخاصة بك بفعالية',
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cut" size={64} color={colors.text.secondary} />
      <Text style={styles.emptyStateTitle}>{t('noServicesYet')}</Text>
      <Text style={styles.emptyStateSubtitle}>
        {t('addFirstServiceDescription')}
      </Text>
      
      {/* Show contextual help for first-time users */}
      {screenHelp.contextualHelp.length > 0 && (
        <Card style={styles.helpCard}>
          <View style={styles.helpCardContent}>
            <Ionicons name="lightbulb" size={24} color={colors.warning} />
            <View style={styles.helpCardText}>
              <Text style={styles.helpCardTitle}>{t('needHelp')}</Text>
              <Text style={styles.helpCardDescription}>
                {t('checkOutServiceGuides')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.helpCardButton}
              onPress={() => {
                screenHelp.markContentViewed('service-help-card');
                navigation.navigate('VideoTutorials', { category: 'service-management' });
              }}
            >
              <Text style={styles.helpCardButtonText}>{t('watchGuide')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}
    </View>
  );

  const renderServiceItem = (service: any) => (
    <Card key={service.id} style={styles.serviceCard}>
      <TouchableOpacity
        style={styles.serviceContent}
        onPress={() => navigation.navigate('ServiceDetails', { serviceId: service.id })}
      >
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.servicePrice}>{service.price} {t('jod')}</Text>
          <Text style={styles.serviceDuration}>{service.duration} {t('minutes')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    </Card>
  );

  return (
    <HelpIntegrationWrapper
      screenName="ServiceList"
      userState={{
        serviceCount: services.length,
        isFirstTime: services.length === 0,
        hasProfilePhoto: user?.profilePhoto ? true : false,
      }}
      showHelpButton={true}
      helpButtonPosition="floating"
      helpButtonSize="medium"
      showTooltips={true}
      helpContent={helpContent}
      customHelpActions={customHelpActions}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t('myServices')}</Text>
            {services.length > 0 && (
              <Text style={styles.headerSubtitle}>
                {services.length} {t('services')}
              </Text>
            )}
          </View>
          
          {/* Inline help button for header */}
          {services.length > 0 && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerHelpButton}
                onPress={() => {
                  screenHelp.markContentViewed('service-management-tips');
                  navigation.navigate('BestPractices', { section: 'service-management' });
                }}
              >
                <Ionicons name="help-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {services.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.servicesList}>
              {services.map(renderServiceItem)}
            </View>
          )}
        </ScrollView>

        {/* Add Service FAB */}
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={handleAddService}
          label={services.length === 0 ? t('addFirstService') : t('addService')}
        />
      </View>
    </HelpIntegrationWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerHelpButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingBottom: 100, // Account for FAB
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  helpCard: {
    width: '100%',
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  helpCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  helpCardText: {
    flex: 1,
    marginLeft: 12,
  },
  helpCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  helpCardDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  helpCardButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  helpCardButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  servicesList: {
    padding: 20,
    paddingBottom: 100, // Account for FAB
  },
  serviceCard: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  serviceDuration: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80, // Account for help button
    backgroundColor: colors.primary,
  },
});