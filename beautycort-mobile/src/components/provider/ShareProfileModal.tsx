import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { colors } from '../../constants/colors';
import ShareProfile from './ShareProfile';

interface ShareProfileModalProps {
  visible: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  providerNameAr?: string;
  providerSlug?: string;
  businessType: string;
  city: string;
  rating: number;
  totalReviews: number;
  avatarUrl?: string;
}

export default function ShareProfileModal({
  visible,
  onClose,
  ...profileProps
}: ShareProfileModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <ShareProfile
          {...profileProps}
          onClose={onClose}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
});