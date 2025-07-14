import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
// Note: These libraries need to be installed:
// npm install react-native-qrcode-svg react-native-view-shot expo-media-library expo-sharing expo-clipboard
// For now, we'll create a placeholder QR code component
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface ShareProfileProps {
  providerId: string;
  providerName: string;
  providerNameAr?: string;
  providerSlug?: string;
  businessType: string;
  city: string;
  rating: number;
  totalReviews: number;
  avatarUrl?: string;
  onClose?: () => void;
}

export default function ShareProfile({
  providerId,
  providerName,
  providerNameAr,
  providerSlug,
  businessType,
  city,
  rating,
  totalReviews,
  avatarUrl,
  onClose,
}: ShareProfileProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [saving, setSaving] = useState(false);
  const viewShotRef = useRef<View>(null);

  const profileUrl = `https://beautycort.com/provider/${providerSlug || providerId}`;
  const displayName = isRTL ? providerNameAr || providerName : providerName;

  const shareOptions = [
    {
      id: 'whatsapp',
      icon: 'logo-whatsapp',
      label: t('shareViaWhatsApp'),
      color: '#25D366',
      action: () => shareViaWhatsApp(),
    },
    {
      id: 'instagram',
      icon: 'logo-instagram',
      label: t('shareOnInstagram'),
      color: '#E4405F',
      action: () => shareViaInstagram(),
    },
    {
      id: 'facebook',
      icon: 'logo-facebook',
      label: t('shareOnFacebook'),
      color: '#1877F2',
      action: () => shareViaFacebook(),
    },
    {
      id: 'copy',
      icon: 'copy',
      label: t('copyLink'),
      color: colors.primary,
      action: () => copyToClipboard(),
    },
    {
      id: 'more',
      icon: 'share-social',
      label: t('moreOptions'),
      color: colors.secondary,
      action: () => shareGeneric(),
    },
  ];

  const shareViaWhatsApp = () => {
    const message = t('checkOutProvider', {
      name: displayName,
      rating: rating.toFixed(1),
      city,
      url: profileUrl,
    });
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
    
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert(t('error'), t('whatsappNotInstalled'));
    });
  };

  const shareViaInstagram = async () => {
    try {
      // Instagram doesn't support direct sharing of links
      // We'll save the QR code image and prompt user to share it
      await saveQRCode();
      Alert.alert(
        t('savedToGallery'),
        t('qrCodeSavedShareOnInstagram'),
        [
          { text: t('cancel'), style: 'cancel' },
          { 
            text: t('openInstagram'), 
            onPress: () => Linking.openURL('instagram://app')
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('error'), t('failedToSaveImage'));
    }
  };

  const shareViaFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
    Linking.openURL(facebookUrl);
  };

  const copyToClipboard = async () => {
    try {
      await import('expo-clipboard').then(Clipboard => {
        Clipboard.setStringAsync(profileUrl);
      });
      Alert.alert(t('success'), t('linkCopiedToClipboard'));
    } catch (error) {
      Alert.alert(t('error'), t('failedToCopyLink'));
    }
  };

  const shareGeneric = async () => {
    try {
      const result = await Share.share({
        message: t('checkOutProvider', {
          name: displayName,
          rating: rating.toFixed(1),
          city,
          url: profileUrl,
        }),
        url: profileUrl, // iOS only
        title: displayName, // Android only
      });

      if (result.action === Share.sharedAction) {
        console.log('Profile shared');
      }
    } catch (error) {
      Alert.alert(t('error'), t('failedToShare'));
    }
  };

  const saveQRCode = async () => {
    // Placeholder for QR code save functionality
    // This requires react-native-view-shot and expo-media-library
    Alert.alert(
      t('comingSoon'),
      t('qrCodeSaveFeatureComingSoon'),
      [{ text: t('ok') }]
    );
  };

  const renderQRCode = () => {
    return (
      <View ref={viewShotRef} style={styles.qrContainer}>
        <LinearGradient
          colors={[colors.primary + '10', colors.secondary + '10']}
          style={styles.qrGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.qrHeader}>
            <Text style={styles.businessName}>{displayName}</Text>
            <View style={styles.businessInfo}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({totalReviews})</Text>
              </View>
              <Text style={styles.cityText}>{city}</Text>
            </View>
          </View>

          <View style={styles.qrCodeWrapper}>
            {/* QR Code Placeholder */}
            <View style={styles.qrCodePlaceholder}>
              <Ionicons name="qr-code" size={120} color={colors.primary} />
              <Text style={styles.qrPlaceholderText}>{t('qrCode')}</Text>
            </View>
          </View>

          <Text style={styles.scanText}>{t('scanToViewProfile')}</Text>
          <Text style={styles.urlText}>{profileUrl}</Text>

          <View style={styles.brandingContainer}>
            <Text style={styles.brandingText}>BeautyCort</Text>
            <Text style={styles.taglineText}>{t('beautyAtYourFingertips')}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('shareProfile')}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* QR Code */}
        {renderQRCode()}

        {/* Save QR Code Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveQRCode}
          disabled={saving}
        >
          <Ionicons name="download" size={20} color={colors.white} />
          <Text style={styles.saveButtonText}>
            {saving ? t('saving') : t('saveQRCode')}
          </Text>
        </TouchableOpacity>

        {/* Share Options */}
        <View style={styles.shareSection}>
          <Text style={styles.shareSectionTitle}>{t('shareVia')}</Text>
          <View style={styles.shareGrid}>
            {shareOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.shareOption}
                onPress={option.action}
              >
                <View style={[styles.shareIconContainer, { backgroundColor: option.color + '20' }]}>
                  <Ionicons name={option.icon as any} size={28} color={option.color} />
                </View>
                <Text style={styles.shareOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Marketing Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsSectionTitle}>{t('marketingTips')}</Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={20} color={colors.warning} />
            <Text style={styles.tipText}>
              {t('shareProfileTip1')}
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="camera" size={20} color={colors.primary} />
            <Text style={styles.tipText}>
              {t('shareProfileTip2')}
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="people" size={20} color={colors.secondary} />
            <Text style={styles.tipText}>
              {t('shareProfileTip3')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  qrContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  qrGradient: {
    padding: 24,
    alignItems: 'center',
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.gray,
  },
  cityText: {
    fontSize: 14,
    color: colors.gray,
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 16,
  },
  scanText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  urlText: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 16,
  },
  brandingContainer: {
    alignItems: 'center',
  },
  brandingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  taglineText: {
    fontSize: 12,
    color: colors.gray,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  shareSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  shareSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  shareOption: {
    width: '30%',
    alignItems: 'center',
  },
  shareIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareOptionText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  tipsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  tipsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  qrCodePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrPlaceholderText: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 8,
  },
});