import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HelpContentService from '../services/help/HelpContentService';
import GuidedTourService from '../services/help/GuidedTourService';
import { useAuth } from './AuthContext';

interface HelpProgress {
  completedTours: string[];
  dismissedTooltips: string[];
  viewedContent: string[];
  lastHelpAccess: string;
  helpSessionCount: number;
  preferredLanguage: 'ar' | 'en';
  onboardingComplete: boolean;
}

interface HelpContextType {
  // Help progress tracking
  helpProgress: HelpProgress;
  updateHelpProgress: (updates: Partial<HelpProgress>) => Promise<void>;
  
  // Tour management
  startTour: (tourId: string) => Promise<void>;
  completeTour: (tourId: string) => Promise<void>;
  isTourCompleted: (tourId: string) => boolean;
  
  // Tooltip management
  dismissTooltip: (tooltipId: string) => Promise<void>;
  isTooltipDismissed: (tooltipId: string) => boolean;
  shouldShowTooltip: (tooltipId: string, conditions?: any) => boolean;
  
  // Content tracking
  markContentViewed: (contentId: string) => Promise<void>;
  isContentViewed: (contentId: string) => boolean;
  
  // Help analytics
  trackHelpInteraction: (type: string, contentId: string, metadata?: any) => Promise<void>;
  getHelpAnalytics: () => Promise<any>;
  
  // User guidance
  shouldShowOnboarding: () => boolean;
  markOnboardingComplete: () => Promise<void>;
  getContextualHelp: (screen: string, userState?: any) => Promise<any[]>;
  
  // Help system state
  isHelpSystemEnabled: boolean;
  setHelpSystemEnabled: (enabled: boolean) => void;
  
  // Jordan-specific features
  isJordanProvider: boolean;
  getJordanSpecificHelp: (category: string) => Promise<any[]>;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

interface HelpProviderProps {
  children: ReactNode;
}

export function HelpProvider({ children }: HelpProviderProps) {
  const { user } = useAuth();
  const [helpProgress, setHelpProgress] = useState<HelpProgress>({
    completedTours: [],
    dismissedTooltips: [],
    viewedContent: [],
    lastHelpAccess: '',
    helpSessionCount: 0,
    preferredLanguage: 'ar',
    onboardingComplete: false,
  });
  
  const [isHelpSystemEnabled, setIsHelpSystemEnabled] = useState(true);
  const [isJordanProvider, setIsJordanProvider] = useState(true);

  const helpService = HelpContentService.getInstance();
  const tourService = GuidedTourService.getInstance();

  useEffect(() => {
    loadHelpProgress();
    detectJordanProvider();
  }, [user]);

  const loadHelpProgress = async () => {
    try {
      const userId = user?.id || 'anonymous';
      const stored = await AsyncStorage.getItem(`help_progress_${userId}`);
      if (stored) {
        const progress = JSON.parse(stored);
        setHelpProgress({
          completedTours: [],
          dismissedTooltips: [],
          viewedContent: [],
          lastHelpAccess: '',
          helpSessionCount: 0,
          preferredLanguage: 'ar',
          onboardingComplete: false,
          ...progress,
        });
      }
    } catch (error) {
      console.error('Error loading help progress:', error);
    }
  };

  const saveHelpProgress = async (progress: HelpProgress) => {
    try {
      const userId = user?.id || 'anonymous';
      await AsyncStorage.setItem(`help_progress_${userId}`, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving help progress:', error);
    }
  };

  const detectJordanProvider = () => {
    // Detect if user is Jordan-based provider
    const jordanIndicators = [
      user?.location?.toLowerCase().includes('jordan'),
      user?.location?.toLowerCase().includes('الأردن'),
      user?.phone?.startsWith('+962'),
      user?.timezone === 'Asia/Amman',
    ];
    
    setIsJordanProvider(jordanIndicators.some(indicator => indicator));
  };

  const updateHelpProgress = async (updates: Partial<HelpProgress>) => {
    const newProgress = { ...helpProgress, ...updates };
    setHelpProgress(newProgress);
    await saveHelpProgress(newProgress);
  };

  // Tour management
  const startTour = async (tourId: string) => {
    try {
      await tourService.startTour(tourId);
      await trackHelpInteraction('tour_started', tourId);
    } catch (error) {
      console.error('Error starting tour:', error);
    }
  };

  const completeTour = async (tourId: string) => {
    try {
      const newCompletedTours = [...helpProgress.completedTours];
      if (!newCompletedTours.includes(tourId)) {
        newCompletedTours.push(tourId);
      }
      
      await updateHelpProgress({ completedTours: newCompletedTours });
      await trackHelpInteraction('tour_completed', tourId);
    } catch (error) {
      console.error('Error completing tour:', error);
    }
  };

  const isTourCompleted = (tourId: string): boolean => {
    return helpProgress.completedTours.includes(tourId);
  };

  // Tooltip management
  const dismissTooltip = async (tooltipId: string) => {
    try {
      const newDismissedTooltips = [...helpProgress.dismissedTooltips];
      if (!newDismissedTooltips.includes(tooltipId)) {
        newDismissedTooltips.push(tooltipId);
      }
      
      await updateHelpProgress({ dismissedTooltips: newDismissedTooltips });
      await trackHelpInteraction('tooltip_dismissed', tooltipId);
    } catch (error) {
      console.error('Error dismissing tooltip:', error);
    }
  };

  const isTooltipDismissed = (tooltipId: string): boolean => {
    return helpProgress.dismissedTooltips.includes(tooltipId);
  };

  const shouldShowTooltip = (tooltipId: string, conditions?: any): boolean => {
    if (!isHelpSystemEnabled) return false;
    if (isTooltipDismissed(tooltipId)) return false;
    
    // Check Jordan-specific conditions
    if (tooltipId.includes('jordan') || tooltipId.includes('whatsapp')) {
      return isJordanProvider;
    }
    
    // Check user progress conditions
    if (conditions?.requiredTours) {
      const requiredCompleted = conditions.requiredTours.every((tourId: string) => 
        isTourCompleted(tourId)
      );
      if (!requiredCompleted) return false;
    }
    
    // Check screen visit count
    if (conditions?.minScreenVisits) {
      // This would need to be tracked separately
      return true; // Simplified for now
    }
    
    return true;
  };

  // Content tracking
  const markContentViewed = async (contentId: string) => {
    try {
      const newViewedContent = [...helpProgress.viewedContent];
      if (!newViewedContent.includes(contentId)) {
        newViewedContent.push(contentId);
      }
      
      await updateHelpProgress({ 
        viewedContent: newViewedContent,
        lastHelpAccess: new Date().toISOString(),
        helpSessionCount: helpProgress.helpSessionCount + 1,
      });
      
      await trackHelpInteraction('content_viewed', contentId);
    } catch (error) {
      console.error('Error marking content as viewed:', error);
    }
  };

  const isContentViewed = (contentId: string): boolean => {
    return helpProgress.viewedContent.includes(contentId);
  };

  // Help analytics
  const trackHelpInteraction = async (type: string, contentId: string, metadata?: any) => {
    try {
      const interaction = {
        type,
        contentId,
        userId: user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        screen: metadata?.screen || 'unknown',
        userAgent: metadata?.userAgent || 'mobile',
        isJordanProvider,
        language: helpProgress.preferredLanguage,
        metadata,
      };
      
      // Store locally for now - in production would send to analytics service
      const analyticsKey = `help_analytics_${user?.id || 'anonymous'}`;
      const existingAnalytics = await AsyncStorage.getItem(analyticsKey);
      const analytics = existingAnalytics ? JSON.parse(existingAnalytics) : [];
      
      analytics.push(interaction);
      
      // Keep only last 1000 interactions
      if (analytics.length > 1000) {
        analytics.splice(0, analytics.length - 1000);
      }
      
      await AsyncStorage.setItem(analyticsKey, JSON.stringify(analytics));
    } catch (error) {
      console.error('Error tracking help interaction:', error);
    }
  };

  const getHelpAnalytics = async () => {
    try {
      const analyticsKey = `help_analytics_${user?.id || 'anonymous'}`;
      const stored = await AsyncStorage.getItem(analyticsKey);
      const analytics = stored ? JSON.parse(stored) : [];
      
      // Process analytics to provide insights
      const totalInteractions = analytics.length;
      const uniqueContent = [...new Set(analytics.map((a: any) => a.contentId))].length;
      const preferredLanguage = analytics.reduce((acc: any, curr: any) => {
        acc[curr.language] = (acc[curr.language] || 0) + 1;
        return acc;
      }, {});
      
      const mostAccessedContent = analytics.reduce((acc: any, curr: any) => {
        acc[curr.contentId] = (acc[curr.contentId] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalInteractions,
        uniqueContent,
        preferredLanguage,
        mostAccessedContent: Object.entries(mostAccessedContent)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10),
        lastAccess: helpProgress.lastHelpAccess,
        sessionCount: helpProgress.helpSessionCount,
      };
    } catch (error) {
      console.error('Error getting help analytics:', error);
      return null;
    }
  };

  // User guidance
  const shouldShowOnboarding = (): boolean => {
    return !helpProgress.onboardingComplete && isHelpSystemEnabled;
  };

  const markOnboardingComplete = async () => {
    await updateHelpProgress({ onboardingComplete: true });
    await trackHelpInteraction('onboarding_completed', 'welcome_tour');
  };

  const getContextualHelp = async (screen: string, userState?: any) => {
    try {
      const allContent = await helpService.getAllContent();
      
      // Filter content relevant to current screen
      const contextualContent = allContent.filter(content => {
        // Check if content is tagged for this screen
        if (content.tags.includes(screen.toLowerCase()) || 
            content.tagsAr.includes(screen.toLowerCase())) {
          return true;
        }
        
        // Check Jordan-specific content
        if (content.tags.includes('jordan') && isJordanProvider) {
          return true;
        }
        
        // Check user state conditions
        if (userState?.serviceCount === 0 && content.tags.includes('first-time')) {
          return true;
        }
        
        return false;
      });
      
      // Sort by priority and relevance
      return contextualContent
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5); // Return top 5 most relevant
    } catch (error) {
      console.error('Error getting contextual help:', error);
      return [];
    }
  };

  const getJordanSpecificHelp = async (category: string) => {
    try {
      const jordanContent = await helpService.searchContent('jordan', 'ar');
      return jordanContent.filter(content => 
        content.category === category || content.tags.includes(category)
      );
    } catch (error) {
      console.error('Error getting Jordan-specific help:', error);
      return [];
    }
  };

  const contextValue: HelpContextType = {
    helpProgress,
    updateHelpProgress,
    startTour,
    completeTour,
    isTourCompleted,
    dismissTooltip,
    isTooltipDismissed,
    shouldShowTooltip,
    markContentViewed,
    isContentViewed,
    trackHelpInteraction,
    getHelpAnalytics,
    shouldShowOnboarding,
    markOnboardingComplete,
    getContextualHelp,
    isHelpSystemEnabled,
    setHelpSystemEnabled,
    isJordanProvider,
    getJordanSpecificHelp,
  };

  return (
    <HelpContext.Provider value={contextValue}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp(): HelpContextType {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}

// Helper hook for screen-specific help
export function useScreenHelp(screenName: string, userState?: any) {
  const help = useHelp();
  const [contextualHelp, setContextualHelp] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    const loadContextualHelp = async () => {
      const content = await help.getContextualHelp(screenName, userState);
      setContextualHelp(content);
    };
    
    loadContextualHelp();
  }, [screenName, userState]);
  
  return {
    ...help,
    contextualHelp,
    shouldShowHelpButton: help.isHelpSystemEnabled,
    shouldShowTooltips: help.isHelpSystemEnabled,
  };
}