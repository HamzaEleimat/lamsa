import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import QuickBooking from './QuickBooking';
import { ProviderServiceItem } from '../../services/providerService';

interface QuickBookingModalProps {
  visible: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  providerPhone: string;
  services: ProviderServiceItem[];
  workingHours?: { [key: number]: any };
  onBookingComplete?: (bookingData: any) => void;
}

export default function QuickBookingModal({
  visible,
  onClose,
  providerId,
  providerName,
  providerPhone,
  services,
  workingHours,
  onBookingComplete,
}: QuickBookingModalProps) {
  const { t } = useTranslation();

  const handleBookingComplete = (bookingData: any) => {
    if (onBookingComplete) {
      onBookingComplete(bookingData);
    }
    // Don't close immediately to allow user to see confirmation
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('quickBooking')}</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <QuickBooking
              providerId={providerId}
              providerName={providerName}
              providerPhone={providerPhone}
              services={services}
              workingHours={workingHours}
              onBookingComplete={handleBookingComplete}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});