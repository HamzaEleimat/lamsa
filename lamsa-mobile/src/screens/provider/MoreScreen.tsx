import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Text, 
  List, 
  useTheme,
  Divider,
  Card,
  IconButton,
  Badge
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { isRTL } from '../../i18n';

const MoreScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useTranslation();

  const menuSections = [
    {
      title: t('more.business_tools'),
      items: [
        // TODO: Implement AnalyticsDashboard screen
        // {
        //   title: t('more.analytics_dashboard'),
        //   description: t('more.analytics_dashboard_description'),
        //   icon: 'chart-line',
        //   route: 'AnalyticsDashboard',
        //   badge: null,
        // },
        {
          title: t('more.service_management'),
          description: t('more.service_management_description'),
          icon: 'format-list-bulleted',
          route: 'ServiceList',
          badge: null,
        },
        {
          title: t('more.availability_settings'),
          description: t('more.availability_settings_description'),
          icon: 'calendar-clock',
          route: 'AvailabilityDashboard',
          badge: null,
        },
        {
          title: t('more.quick_service'),
          description: t('more.quick_service_description'),
          icon: 'lightning-bolt',
          route: 'QuickService',
          badge: 'NEW',
        },
        {
          title: t('more.service_packages'),
          description: t('more.service_packages_description'),
          icon: 'package-variant',
          route: 'ServicePackage',
          badge: null,
        },
      ],
    },
    {
      title: t('more.performance_insights'),
      items: [
        {
          title: t('more.revenue_analytics'),
          description: t('more.revenue_analytics_description'),
          icon: 'cash-multiple',
          route: 'RevenueAnalytics',
          badge: null,
        },
        {
          title: t('more.customer_analytics'),
          description: t('more.customer_analytics_description'),
          icon: 'account-group',
          route: 'CustomerAnalytics',
          badge: null,
        },
        {
          title: t('more.booking_analytics'),
          description: t('more.booking_analytics_description'),
          icon: 'calendar-check',
          route: 'BookingAnalytics',
          badge: null,
        },
        {
          title: t('more.service_analytics'),
          description: t('more.service_analytics_description'),
          icon: 'chart-donut',
          route: 'ServiceAnalytics',
          badge: null,
        },
        {
          title: t('more.performance_metrics'),
          description: t('more.performance_metrics_description'),
          icon: 'speedometer',
          route: 'PerformanceAnalytics',
          badge: null,
        },
      ],
    },
    {
      title: t('more.scheduling_tools'),
      items: [
        {
          title: t('more.weekly_availability'),
          description: t('more.weekly_availability_description'),
          icon: 'calendar-week',
          route: 'WeeklyAvailability',
          badge: null,
        },
        {
          title: t('more.exception_dates'),
          description: t('more.exception_dates_description'),
          icon: 'calendar-remove',
          route: 'ExceptionDates',
          badge: null,
        },
        {
          title: t('more.ramadan_schedule'),
          description: t('more.ramadan_schedule_description'),
          icon: 'moon-waning-crescent',
          route: 'RamadanSchedule',
          badge: null,
        },
        {
          title: t('more.bulk_actions'),
          description: t('more.bulk_actions_description'),
          icon: 'checkbox-multiple-marked',
          route: 'BulkActions',
          badge: null,
        },
      ],
    },
    {
      title: t('more.marketing_growth'),
      items: [
        {
          title: t('more.notification_campaigns'),
          description: t('more.notification_campaigns_description'),
          icon: 'bullhorn',
          route: 'NotificationAnalytics',
          badge: null,
        },
        {
          title: t('more.service_templates'),
          description: t('more.service_templates_description'),
          icon: 'content-copy',
          route: 'ServiceTemplates',
          badge: null,
        },
      ],
    },
    {
      title: t('more.support_resources'),
      items: [
        {
          title: t('more.help_center'),
          description: t('more.help_center_description'),
          icon: 'help-circle',
          route: 'HelpCenter',
          badge: null,
        },
        {
          title: t('more.best_practices'),
          description: t('more.best_practices_description'),
          icon: 'lightbulb',
          route: 'BestPractices',
          badge: null,
        },
        {
          title: t('more.video_tutorials'),
          description: t('more.video_tutorials_description'),
          icon: 'play-circle',
          route: 'VideoTutorials',
          badge: null,
        },
        {
          title: t('more.community_tips'),
          description: t('more.community_tips_description'),
          icon: 'account-group-outline',
          route: 'CommunityTips',
          badge: null,
        },
      ],
    },
  ];

  const renderMenuItem = (item: any) => (
    <List.Item
      key={item.route}
      title={item.title}
      description={item.description}
      descriptionNumberOfLines={2}
      left={props => <List.Icon {...props} icon={item.icon} />}
      right={props => (
        <View style={styles.rightContent}>
          {item.badge && (
            <Badge style={[styles.badge, { backgroundColor: theme.colors.primary }]}>{item.badge}</Badge>
          )}
          <MaterialCommunityIcons 
            name={isRTL() ? "chevron-left" : "chevron-right"} 
            size={24} 
            color={theme.colors.onSurfaceVariant} 
          />
        </View>
      )}
      onPress={() => navigation.navigate(item.route)}
      style={styles.listItem}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.scrollContent}
      >
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('navigation.more')}
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {t('more.subtitle')}
        </Text>
      </View>

      {menuSections.map((section, index) => (
        <View key={index}>
          <List.Section>
            <List.Subheader style={styles.sectionHeader}>
              {section.title}
            </List.Subheader>
            <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={item.route}>
                  {renderMenuItem(item)}
                  {itemIndex < section.items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Card>
          </List.Section>
        </View>
      ))}

      <View style={styles.footer}>
        <Text variant="bodySmall" style={[styles.footerText, { color: theme.colors.onSurfaceDisabled }]}>
          {t('more.footer_text')}
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 48,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 0,
  },
  title: {
    marginBottom: 4,
    textAlign: isRTL() ? 'right' : 'left',
  },
  subtitle: {
    textAlign: isRTL() ? 'right' : 'left',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 1,
  },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    fontSize: 10,
    paddingHorizontal: 6,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    textAlign: 'center',
  },
});

export default MoreScreen;