import React, { useState } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  PlatformHeader,
  PlatformBackButton,
  PlatformModal,
} from '@components/navigation';
import {
  SPACING,
  BORDER_RADIUS,
  SHADOW_STYLES,
  FONTS,
  isRTL,
} from '@utils/platform';

export default function NavigationDemo() {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'pageSheet' | 'formSheet' | 'fullScreen'>('pageSheet');
  const [showLargeTitle, setShowLargeTitle] = useState(false);

  const openModal = (type: 'pageSheet' | 'formSheet' | 'fullScreen') => {
    setModalType(type);
    setModalVisible(true);
  };

  const renderSection = (title: string, content: React.ReactNode) => (
    <View style={[styles.section, SHADOW_STYLES.small]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        {title}
      </Text>
      {content}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]} edges={['bottom', 'left', 'right']}>
        <PlatformHeader
          title={showLargeTitle ? "Navigation Demo" : "Platform Navigation"}
          subtitle="Testing navigation components"
          showBackButton={true}
          onBackPress={() => Alert.alert('Back pressed')}
          rightAction={{
            icon: 'dots-vertical',
            onPress: () => Alert.alert('Menu pressed'),
          }}
          largeTitle={showLargeTitle}
        />

        <ScrollView style={styles.content}>
          {renderSection('Header Variations', (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowLargeTitle(!showLargeTitle)}
              >
                <Text style={styles.buttonText}>
                  {showLargeTitle ? 'Regular Title' : 'Large Title (iOS)'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {renderSection('Back Button Variations', (
            <View style={styles.backButtonGroup}>
              <View style={styles.backButtonItem}>
                <Text style={styles.label}>Small:</Text>
                <PlatformBackButton size="small" />
              </View>
              
              <View style={styles.backButtonItem}>
                <Text style={styles.label}>Medium:</Text>
                <PlatformBackButton size="medium" />
              </View>
              
              <View style={styles.backButtonItem}>
                <Text style={styles.label}>Large:</Text>
                <PlatformBackButton size="large" />
              </View>
              
              <View style={styles.backButtonItem}>
                <Text style={styles.label}>Custom:</Text>
                <PlatformBackButton 
                  label={isRTL ? "رجوع" : "Custom"}
                  color={theme.colors.error}
                />
              </View>
              
              <View style={styles.backButtonItem}>
                <Text style={styles.label}>No Label:</Text>
                <PlatformBackButton showLabel={false} />
              </View>
            </View>
          ))}

          {renderSection('Modal Presentations', (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                onPress={() => openModal('pageSheet')}
              >
                <Text style={styles.buttonText}>Page Sheet Modal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.secondary }]}
                onPress={() => openModal('formSheet')}
              >
                <Text style={styles.buttonText}>Form Sheet Modal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.tertiary }]}
                onPress={() => openModal('fullScreen')}
              >
                <Text style={styles.buttonText}>Full Screen Modal</Text>
              </TouchableOpacity>
            </View>
          ))}

          {renderSection('Platform Features', (
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons 
                  name="check-circle" 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.featureText}>
                  iOS: Blur effect on tab bar, large titles, swipe gestures
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialCommunityIcons 
                  name="check-circle" 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.featureText}>
                  Android: Material Design, elevation shadows, ripple effects
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialCommunityIcons 
                  name="check-circle" 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.featureText}>
                  Both: RTL support, haptic feedback, smooth animations
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <PlatformModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={`${modalType} Modal`}
        presentationStyle={modalType}
        showHandle={modalType !== 'fullScreen'}
        enableSwipeDown={true}
      >
        <ScrollView style={styles.modalContent}>
          <Text style={[styles.modalTitle, { color: theme.colors.onBackground }]}>
            Platform Modal Demo
          </Text>
          
          <Text style={[styles.modalText, { color: theme.colors.onSurfaceVariant }]}>
            This is a {modalType} modal presentation.
            {'\n\n'}
            Features:
            {'\n'}• Swipe down to dismiss (iOS)
            {'\n'}• Platform-specific animations
            {'\n'}• Keyboard avoidance
            {'\n'}• Safe area handling
            {'\n'}• RTL support
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Close Modal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </PlatformModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.md,
    margin: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    fontFamily: FONTS.bold,
  },
  buttonGroup: {
    gap: SPACING.sm,
  },
  button: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  backButtonGroup: {
    gap: SPACING.md,
  },
  backButtonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  featureList: {
    gap: SPACING.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  
  // Modal styles
  modalContent: {
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  modalActions: {
    gap: SPACING.md,
  },
  modalButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
  },
});