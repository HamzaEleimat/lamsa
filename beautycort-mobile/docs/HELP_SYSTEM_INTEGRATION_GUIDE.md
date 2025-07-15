---
title: Help System Integration Guide
author: BeautyCort Development Team
date: 2025-01-14
version: 1.0
---

# Help System Integration Guide

This guide explains how to integrate the comprehensive help system into your BeautyCort mobile app screens and components.

## 🏗️ Architecture Overview

The help system consists of:

1. **Core Services**: `HelpContentService`, `GuidedTourService`, `VideoService`
2. **Context Provider**: `HelpContext` for state management
3. **UI Components**: `HelpButton`, `TooltipManager`, `HelpIntegrationWrapper`
4. **Help Screens**: FAQ, Videos, Best Practices, Support, Community, Troubleshooting

## 🚀 Quick Integration

### Step 1: Wrap Your App with HelpProvider

```tsx
import { HelpProvider } from './src/contexts/HelpContext';

export default function App() {
  return (
    <HelpProvider>
      <NavigationContainer>
        {/* Your existing navigation */}
      </NavigationContainer>
    </HelpProvider>
  );
}
```

### Step 2: Add Help Integration to Screens

#### Option A: Use HelpIntegrationWrapper (Recommended)

```tsx
import HelpIntegrationWrapper from '../components/help/HelpIntegrationWrapper';

export default function YourScreen() {
  return (
    <HelpIntegrationWrapper
      screenName="YourScreenName"
      userState={{ /* relevant user state */ }}
      showHelpButton={true}
      showTooltips={true}
    >
      {/* Your existing screen content */}
    </HelpIntegrationWrapper>
  );
}
```

#### Option B: Add Components Individually

```tsx
import HelpButton from '../components/help/HelpButton';
import TooltipManager from '../components/help/TooltipManager';
import { useScreenHelp } from '../contexts/HelpContext';

export default function YourScreen() {
  const screenHelp = useScreenHelp('YourScreenName');
  
  return (
    <View style={{ flex: 1 }}>
      {/* Your screen content */}
      
      <TooltipManager
        currentScreen="YourScreenName"
        userProgress={screenHelp.helpProgress}
      />
      
      <HelpButton
        screen="YourScreenName"
        position="floating"
      />
    </View>
  );
}
```

## 📱 Screen-Specific Integration Examples

### Dashboard Screen

```tsx
<HelpIntegrationWrapper
  screenName="ProviderDashboard"
  userState={{
    hasBookings: bookings.length > 0,
    weeklyRevenue: revenue,
    isNewProvider: completedServices < 5,
  }}
  customHelpActions={[
    {
      id: 'dashboard-tour',
      title: 'Dashboard Tour',
      titleAr: 'جولة لوحة التحكم',
      icon: 'map',
      action: () => startTour('dashboard-overview'),
    },
  ]}
>
  {/* Dashboard content */}
</HelpIntegrationWrapper>
```

### Service Management Screen

```tsx
<HelpIntegrationWrapper
  screenName="ServiceList"
  userState={{
    serviceCount: services.length,
    isFirstTime: services.length === 0,
  }}
  customHelpActions={[
    {
      id: 'add-service-help',
      title: 'How to Add Services',
      titleAr: 'كيفية إضافة الخدمات',
      icon: 'add-circle',
      action: () => navigation.navigate('VideoTutorials', { videoId: 'service-creation' }),
    },
  ]}
>
  {/* Service list content */}
</HelpIntegrationWrapper>
```

## 🎯 Contextual Help Configuration

### Custom Help Actions

```tsx
const customHelpActions = [
  {
    id: 'screen-specific-help',
    title: 'Screen Help',
    titleAr: 'مساعدة الشاشة',
    icon: 'help-circle',
    action: () => {
      // Navigate to specific help content
      navigation.navigate('FAQScreen', { category: 'specific-category' });
    },
    color: colors.primary,
  },
];
```

### User State for Smart Help

```tsx
const userState = {
  // Progress indicators
  hasCompletedOnboarding: boolean,
  serviceCount: number,
  bookingCount: number,
  
  // Jordan-specific context
  isJordanProvider: boolean,
  hasWhatsAppSetup: boolean,
  usesCashPayments: boolean,
  
  // User preferences
  preferredLanguage: 'ar' | 'en',
  helpSessionCount: number,
  
  // Screen-specific state
  currentTab: string,
  selectedFilters: string[],
};
```

## 🔧 Help Button Configuration

### Floating Help Button (Default)

```tsx
<HelpButton
  screen="YourScreen"
  position="floating"
  size="medium"
  showPulse={isNewUser}
/>
```

### Header Help Button

```tsx
<HelpButton
  screen="YourScreen"
  position="header"
  size="small"
  style={{ marginRight: 10 }}
/>
```

### Inline Help Button

```tsx
<HelpButton
  screen="YourScreen"
  position="inline"
  size="large"
  style={{ alignSelf: 'center', marginVertical: 20 }}
/>
```

## 💡 Tooltip Integration

### Automatic Tooltips

Tooltips are automatically shown based on:
- Screen name
- User progress
- Jordan-specific conditions
- First-time user status

### Custom Tooltips

```tsx
// In TooltipManager or custom tooltip data
const customTooltips = [
  {
    id: 'custom-tooltip',
    title: 'Custom Help',
    titleAr: 'مساعدة مخصصة',
    description: 'This explains a specific feature',
    descriptionAr: 'هذا يشرح ميزة محددة',
    showOnScreens: ['YourScreen'],
    targetElement: 'specificButtonId',
    position: 'bottom',
  },
];
```

## 📊 Help Analytics and Tracking

### Track User Interactions

```tsx
const screenHelp = useScreenHelp('YourScreen');

// Track when user performs important actions
const handleImportantAction = () => {
  screenHelp.trackHelpInteraction('action_performed', 'button_clicked', {
    buttonId: 'important-button',
    userState: getCurrentUserState(),
  });
  
  // Perform the action
};

// Mark content as viewed
const handleHelpContentView = (contentId: string) => {
  screenHelp.markContentViewed(contentId);
};
```

### Help Progress Tracking

```tsx
// Check if user has completed specific tours
if (!screenHelp.isTourCompleted('onboarding-tour')) {
  // Show onboarding hints
}

// Check if tooltips should be shown
if (screenHelp.shouldShowTooltip('feature-explanation', { minScreenVisits: 3 })) {
  // Show tooltip
}
```

## 🌍 Jordan Market Localization

### Arabic-First Content

```tsx
// All help content supports Arabic
const helpContent = {
  title: 'English Title',
  titleAr: 'العنوان العربي',
  description: 'English description',
  descriptionAr: 'الوصف العربي',
};
```

### Jordan-Specific Features

```tsx
// Check if provider is Jordan-based
const { isJordanProvider } = useHelp();

if (isJordanProvider) {
  // Show Jordan-specific help content
  // WhatsApp integration help
  // Friday prayer scheduling
  // Local payment methods
}
```

## 🎮 Guided Tours Integration

### Start Tours Programmatically

```tsx
const { startTour } = useHelp();

// Start onboarding tour for new users
useEffect(() => {
  if (isNewUser && shouldShowOnboarding()) {
    startTour('provider-onboarding');
  }
}, [isNewUser]);

// Start feature-specific tours
const handleFeatureTour = () => {
  startTour('service-management-tour');
};
```

### Custom Tour Steps

```tsx
// In GuidedTourService data
const customTour = {
  id: 'custom-feature-tour',
  name: 'Custom Feature Tour',
  nameAr: 'جولة الميزة المخصصة',
  steps: [
    {
      target: 'feature-button',
      title: 'This is the feature button',
      titleAr: 'هذا زر الميزة',
      content: 'Tap here to access the feature',
      contentAr: 'اضغط هنا للوصول إلى الميزة',
    },
  ],
};
```

## 🚨 Troubleshooting Integration

### Screen-Specific Troubleshooting

```tsx
// Add troubleshooting button for problem-prone screens
<TouchableOpacity
  onPress={() => navigation.navigate('TroubleshootingScreen', { 
    category: 'payment_errors' 
  })}
>
  <Text>Having Issues?</Text>
</TouchableOpacity>
```

### Automatic Problem Detection

```tsx
// Detect common issues and suggest help
useEffect(() => {
  if (hasPaymentErrors) {
    // Show troubleshooting suggestion
    showTroubleshootingSuggestion('payment-failed-jordan');
  }
}, [hasPaymentErrors]);
```

## 📁 File Structure

```
src/
├── components/help/
│   ├── HelpButton.tsx
│   ├── TooltipManager.tsx
│   └── HelpIntegrationWrapper.tsx
├── contexts/
│   └── HelpContext.tsx
├── screens/help/
│   ├── HelpCenterScreen.tsx
│   ├── FAQScreen.tsx
│   ├── VideoTutorialsScreen.tsx
│   ├── BestPracticesScreen.tsx
│   ├── SupportScreen.tsx
│   ├── CommunityTipsScreen.tsx
│   └── TroubleshootingScreen.tsx
├── services/help/
│   ├── HelpContentService.ts
│   ├── GuidedTourService.ts
│   └── VideoService.ts
└── examples/help-integration/
    ├── ServiceListScreenWithHelp.tsx
    ├── ProviderDashboardWithHelp.tsx
    └── HelpNavigationIntegration.tsx
```

## 🔄 Migration Guide

### Existing Screens

1. **Minimal Integration**: Add `HelpIntegrationWrapper`
2. **Enhanced Integration**: Add custom help actions and user state
3. **Full Integration**: Add contextual tooltips and guided tours

### Navigation Updates

```tsx
// Add help screens to your navigator
<Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
<Stack.Screen name="FAQScreen" component={FAQScreen} />
// ... other help screens
```

## ⚡ Performance Considerations

1. **Lazy Loading**: Help screens are loaded only when needed
2. **Caching**: Help content is cached locally
3. **Analytics**: Help interactions are batched for efficiency
4. **Memory**: Tooltip manager cleans up unused tooltips

## 🧪 Testing Help Integration

### Test Cases

1. **Help Button Visibility**: Verify help button appears on all screens
2. **Contextual Help**: Test help content changes based on user state
3. **Tooltip Behavior**: Verify tooltips show/hide correctly
4. **Arabic Content**: Test RTL layout and Arabic translations
5. **Jordan Features**: Test Jordan-specific help content
6. **Offline Support**: Test help system works without internet

### Manual Testing Checklist

- [ ] Help button appears on all integrated screens
- [ ] Help modal opens with relevant actions
- [ ] Tooltips appear for new users
- [ ] Arabic content displays correctly
- [ ] Jordan-specific features work
- [ ] Video tutorials play offline
- [ ] Troubleshooting guides are interactive
- [ ] Help analytics track interactions

## 📚 Best Practices

1. **User-Centric**: Always consider user's current context and needs
2. **Progressive Disclosure**: Show basic help first, advanced help when needed
3. **Cultural Sensitivity**: Respect Jordan market preferences and practices
4. **Performance**: Keep help system lightweight and responsive
5. **Accessibility**: Ensure help content is accessible to all users
6. **Analytics**: Track help usage to improve content and features

## 🔧 Customization Options

### Theme Integration

```tsx
// Help components automatically use your app's color scheme
const helpTheme = {
  primary: colors.primary,
  surface: colors.surface,
  text: colors.text,
  // Components will adapt to your existing theme
};
```

### Content Customization

```tsx
// Override default help content
const customHelpContent = {
  // Add your own help articles, videos, FAQs
  // Customize for your specific business needs
};
```

This comprehensive help system provides a solid foundation for supporting your beauty providers in Jordan while maintaining flexibility for customization and expansion.