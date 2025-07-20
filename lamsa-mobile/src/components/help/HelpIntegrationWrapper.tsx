import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import TooltipManager from './TooltipManager';
import HelpButton from './HelpButton';
import { useHelp, useScreenHelp } from '../../contexts/HelpContext';

interface HelpIntegrationWrapperProps {
  children: React.ReactNode;
  screenName: string;
  userState?: any;
  // Help button configuration
  showHelpButton?: boolean;
  helpButtonPosition?: 'floating' | 'header' | 'inline';
  helpButtonSize?: 'small' | 'medium' | 'large';
  helpButtonStyle?: any;
  // Tooltip configuration
  showTooltips?: boolean;
  customTooltips?: any[];
  // Screen-specific help content
  helpContent?: {
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
  };
  // Custom help actions for this screen
  customHelpActions?: Array<{
    id: string;
    title: string;
    titleAr: string;
    icon: string;
    action: () => void;
    color?: string;
  }>;
}

export default function HelpIntegrationWrapper({
  children,
  screenName,
  userState,
  showHelpButton = true,
  helpButtonPosition = 'floating',
  helpButtonSize = 'medium',
  helpButtonStyle,
  showTooltips = true,
  customTooltips = [],
  helpContent,
  customHelpActions = [],
}: HelpIntegrationWrapperProps) {
  const help = useHelp();
  const screenHelp = useScreenHelp(screenName, userState);
  const [tooltipKey, setTooltipKey] = useState(0);

  useEffect(() => {
    // Track screen visit for help analytics
    help.trackHelpInteraction('screen_visit', screenName, {
      screen: screenName,
      userState,
      timestamp: new Date().toISOString(),
    });
  }, [screenName]);

  useEffect(() => {
    // Refresh tooltips when screen or user state changes
    setTooltipKey(prev => prev + 1);
  }, [screenName, userState]);

  const handleTooltipAction = (action: 'dismissed' | 'help-requested' | 'tour-started') => {
    switch (action) {
      case 'dismissed':
        help.trackHelpInteraction('tooltip_dismissed', screenName);
        break;
      case 'help-requested':
        help.trackHelpInteraction('help_requested', screenName);
        break;
      case 'tour-started':
        help.trackHelpInteraction('tour_started', screenName);
        break;
    }
  };

  // Determine if we should show first-time user guidance
  const shouldShowOnboarding = help.shouldShowOnboarding();
  const shouldShowHelpPulse = shouldShowOnboarding || (
    help.helpProgress.helpSessionCount < 3 &&
    screenHelp.contextualHelp.length > 0
  );

  return (
    <View style={styles.container}>
      {children}
      
      {/* Contextual Tooltips */}
      {showTooltips && help.isHelpSystemEnabled && (
        <TooltipManager
          key={tooltipKey}
          currentScreen={screenName}
          userProgress={help.helpProgress}
          onTooltipAction={handleTooltipAction}
        />
      )}
      
      {/* Help Button */}
      {showHelpButton && help.isHelpSystemEnabled && (
        <HelpButton
          screen={screenName}
          contextualActions={customHelpActions}
          position={helpButtonPosition}
          size={helpButtonSize}
          style={helpButtonStyle}
          showPulse={shouldShowHelpPulse}
          helpContent={helpContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});