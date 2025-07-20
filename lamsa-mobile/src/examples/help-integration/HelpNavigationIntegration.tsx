// Example integration of help screens into existing navigation structure
// This shows how to add help screens to your existing React Navigation setup

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useTranslation } from '../../hooks/useTranslation';

// Import help screens
import HelpCenterScreen from '../../screens/help/HelpCenterScreen';
import FAQScreen from '../../screens/help/FAQScreen';
import VideoTutorialsScreen from '../../screens/help/VideoTutorialsScreen';
import BestPracticesScreen from '../../screens/help/BestPracticesScreen';
import SupportScreen from '../../screens/help/SupportScreen';
import CommunityTipsScreen from '../../screens/help/CommunityTipsScreen';
import TroubleshootingScreen from '../../screens/help/TroubleshootingScreen';

// Import help providers
import { HelpProvider } from '../../contexts/HelpContext';

// Import example screens with help integration
import ServiceListScreenWithHelp from './ServiceListScreenWithHelp';
import ProviderDashboardWithHelp from './ProviderDashboardWithHelp';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Help Navigator - Contains all help-related screens
function HelpNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="HelpCenter"
        component={HelpCenterScreen}
        options={{
          title: t('helpCenter'),
          headerShown: false, // Screen handles its own header
        }}
      />
      <Stack.Screen
        name="FAQScreen"
        component={FAQScreen}
        options={{
          title: t('frequentlyAskedQuestions'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="VideoTutorials"
        component={VideoTutorialsScreen}
        options={{
          title: t('videoTutorials'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="BestPractices"
        component={BestPracticesScreen}
        options={{
          title: t('bestPractices'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SupportScreen"
        component={SupportScreen}
        options={{
          title: t('customerSupport'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CommunityTips"
        component={CommunityTipsScreen}
        options={{
          title: t('communityTips'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TroubleshootingScreen"
        component={TroubleshootingScreen}
        options={{
          title: t('troubleshooting'),
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// Main Provider Navigator with Help Integration
function ProviderNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Services':
              iconName = focused ? 'cut' : 'cut-outline';
              break;
            case 'Bookings':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Help':
              iconName = focused ? 'help-circle' : 'help-circle-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.text.secondary + '20',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={ProviderDashboardWithHelp}
        options={{
          title: t('dashboard'),
        }}
      />
      <Tab.Screen
        name="Services"
        component={ServiceListScreenWithHelp}
        options={{
          title: t('services'),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingManagementScreen} // Your existing screen wrapped with HelpIntegrationWrapper
        options={{
          title: t('bookings'),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen} // Your existing screen wrapped with HelpIntegrationWrapper
        options={{
          title: t('analytics'),
        }}
      />
      <Tab.Screen
        name="Help"
        component={HelpNavigator}
        options={{
          title: t('help'),
        }}
      />
    </Tab.Navigator>
  );
}

// Example of how to wrap existing screens with help integration
const BookingManagementScreen = () => {
  // Your existing BookingManagement component logic here
  return (
    <HelpIntegrationWrapper
      screenName="BookingManagement"
      userState={{
        hasActiveBookings: true,
        pendingBookings: 2,
      }}
      showHelpButton={true}
      helpButtonPosition="floating"
      customHelpActions={[
        {
          id: 'booking-help',
          title: 'Managing Bookings',
          titleAr: 'إدارة الحجوزات',
          icon: 'calendar',
          action: () => {
            // Navigate to relevant help content
          },
          color: colors.primary,
        },
      ]}
    >
      {/* Your existing BookingManagement screen content */}
      <div>Booking Management Screen Content</div>
    </HelpIntegrationWrapper>
  );
};

const AnalyticsScreen = () => {
  // Your existing Analytics component logic here
  return (
    <HelpIntegrationWrapper
      screenName="Analytics"
      userState={{
        hasRevenueData: true,
        timeRange: 'week',
      }}
      showHelpButton={true}
      helpButtonPosition="header"
      helpButtonSize="small"
      customHelpActions={[
        {
          id: 'analytics-tutorial',
          title: 'Understanding Analytics',
          titleAr: 'فهم التحليلات',
          icon: 'bar-chart',
          action: () => {
            // Navigate to analytics tutorial
          },
          color: colors.secondary,
        },
      ]}
    >
      {/* Your existing Analytics screen content */}
      <div>Analytics Screen Content</div>
    </HelpIntegrationWrapper>
  );
};

// Root App Navigator with Help Provider
export default function AppWithHelpSystem() {
  return (
    <HelpProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Your existing auth flow */}
        <Stack.Screen name="Auth" component={AuthNavigator} />
        
        {/* Provider flow with help integration */}
        <Stack.Screen name="Provider" component={ProviderNavigator} />
        
        {/* Additional help screens that can be accessed from anywhere */}
        <Stack.Screen 
          name="HelpModal" 
          component={HelpCenterScreen}
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Help Center',
          }}
        />
        
        {/* Guided Tour screens */}
        <Stack.Screen
          name="GuidedTour"
          component={GuidedTourScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        
        {/* Video Player for help videos */}
        <Stack.Screen
          name="VideoPlayer"
          component={VideoPlayerScreen}
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Video Tutorial',
          }}
        />
      </Stack.Navigator>
    </HelpProvider>
  );
}

// Example of how to add help integration to existing screens without major refactoring
export const addHelpToExistingScreen = (ScreenComponent: React.ComponentType, screenName: string) => {
  return (props: any) => (
    <HelpIntegrationWrapper
      screenName={screenName}
      showHelpButton={true}
      helpButtonPosition="floating"
    >
      <ScreenComponent {...props} />
    </HelpIntegrationWrapper>
  );
};

// Usage example:
// const YourExistingScreen = addHelpToExistingScreen(OriginalScreen, 'YourScreenName');

// Example of help menu integration in header
export const HeaderWithHelpMenu = ({ navigation, title }: { navigation: any, title: string }) => {
  const { t } = useTranslation();
  
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
    }}>
      <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text.primary }}>
        {title}
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('HelpModal')}
        style={{
          padding: 8,
          borderRadius: 20,
          backgroundColor: colors.primary + '15',
        }}
      >
        <Ionicons name="help-circle" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

// Global help overlay that can be triggered from anywhere
export const GlobalHelpOverlay = () => {
  const [visible, setVisible] = React.useState(false);
  
  // This could be triggered by a global help gesture or hotkey
  React.useEffect(() => {
    // Listen for global help trigger
    // e.g., shake gesture, key combination, etc.
  }, []);
  
  return (
    <Portal>
      <Modal visible={visible} onDismiss={() => setVisible(false)}>
        <HelpCenterScreen />
      </Modal>
    </Portal>
  );
};