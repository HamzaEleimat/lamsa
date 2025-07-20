import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface Certificate {
  id: string;
  name: string;
  nameAr: string;
  issuer: string;
  issuerAr: string;
  year: number;
  imageUrl?: string;
  verified: boolean;
}

interface TrustIndicatorsProps {
  yearsOfExperience?: number;
  totalCustomers?: number;
  responseTime?: number; // in minutes
  certificates?: Certificate[];
  licenses?: {
    type: string;
    number: string;
    verified: boolean;
  }[];
  awards?: {
    name: string;
    nameAr: string;
    year: number;
    organization: string;
  }[];
  staffCount?: number;
  femaleStaff?: boolean;
  languages?: string[];
  specializations?: string[];
}

export default function TrustIndicators({
  yearsOfExperience,
  totalCustomers,
  responseTime,
  certificates = [],
  licenses = [],
  awards = [],
  staffCount,
  femaleStaff,
  languages = [],
  specializations = [],
}: TrustIndicatorsProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [selectedCertificate, setSelectedCertificate] = React.useState<Certificate | null>(null);

  const trustItems = [
    {
      icon: 'time',
      label: t('yearsExperience'),
      value: yearsOfExperience,
      suffix: t('years'),
      color: colors.primary,
      show: !!yearsOfExperience,
    },
    {
      icon: 'people',
      label: t('happyCustomers'),
      value: totalCustomers,
      suffix: '+',
      color: colors.success,
      show: !!totalCustomers,
    },
    {
      icon: 'flash',
      label: t('responseTime'),
      value: responseTime ? `<${responseTime}` : null,
      suffix: t('min'),
      color: colors.warning,
      show: !!responseTime,
    },
    {
      icon: 'shield-checkmark',
      label: t('verified'),
      value: licenses.filter(l => l.verified).length,
      suffix: t('licenses'),
      color: colors.secondary,
      show: licenses.length > 0,
    },
  ];

  const renderTrustItem = (item: any, index: number) => {
    if (!item.show) return null;

    return (
      <View key={index} style={styles.trustItem}>
        <LinearGradient
          colors={[item.color + '20', item.color + '10']}
          style={styles.trustIconContainer}
        >
          <Ionicons name={item.icon} size={24} color={item.color} />
        </LinearGradient>
        <View style={styles.trustTextContainer}>
          <Text style={styles.trustValue}>
            {item.value}{item.suffix}
          </Text>
          <Text style={styles.trustLabel}>{item.label}</Text>
        </View>
      </View>
    );
  };

  const renderCertificates = () => {
    if (certificates.length === 0) return null;

    return (
      <View style={styles.certificatesSection}>
        <Text style={styles.sectionTitle}>{t('certificationsAndLicenses')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.certificatesScroll}
        >
          {certificates.map((cert) => (
            <TouchableOpacity
              key={cert.id}
              style={styles.certificateCard}
              onPress={() => setSelectedCertificate(cert)}
            >
              <View style={styles.certificateHeader}>
                {cert.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  </View>
                )}
                <Ionicons name="ribbon" size={32} color={colors.primary} />
              </View>
              <Text style={styles.certificateName} numberOfLines={2}>
                {isRTL ? cert.nameAr : cert.name}
              </Text>
              <Text style={styles.certificateIssuer} numberOfLines={1}>
                {isRTL ? cert.issuerAr : cert.issuer}
              </Text>
              <Text style={styles.certificateYear}>{cert.year}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSpecialFeatures = () => {
    const features = [];

    if (femaleStaff) {
      features.push({
        icon: 'woman',
        label: t('femaleStaffAvailable'),
        color: colors.secondary,
      });
    }

    if (staffCount && staffCount >= 5) {
      features.push({
        icon: 'people',
        label: t('teamOf', { count: staffCount }),
        color: colors.primary,
      });
    }

    if (languages.length > 1) {
      features.push({
        icon: 'language',
        label: languages.join(', '),
        color: colors.info,
      });
    }

    if (awards.length > 0) {
      features.push({
        icon: 'trophy',
        label: t('awardsCount', { count: awards.length }),
        color: colors.warning,
      });
    }

    if (features.length === 0) return null;

    return (
      <View style={styles.featuresSection}>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name={feature.icon as any} size={20} color={feature.color} />
              <Text style={styles.featureText}>{feature.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSpecializations = () => {
    if (specializations.length === 0) return null;

    return (
      <View style={styles.specializationsSection}>
        <Text style={styles.sectionTitle}>{t('specializations')}</Text>
        <View style={styles.specializationTags}>
          {specializations.map((spec, index) => (
            <View key={index} style={styles.specializationTag}>
              <Text style={styles.specializationText}>{spec}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCertificateModal = () => {
    if (!selectedCertificate) return null;

    return (
      <Modal
        visible={!!selectedCertificate}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCertificate(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedCertificate(null)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedCertificate(null)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>

            {selectedCertificate.imageUrl ? (
              <Image
                source={{ uri: selectedCertificate.imageUrl }}
                style={styles.certificateImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.certificatePlaceholder}>
                <Ionicons name="ribbon" size={64} color={colors.primary} />
              </View>
            )}

            <Text style={styles.modalCertificateName}>
              {isRTL ? selectedCertificate.nameAr : selectedCertificate.name}
            </Text>
            <Text style={styles.modalCertificateIssuer}>
              {isRTL ? selectedCertificate.issuerAr : selectedCertificate.issuer}
            </Text>
            <Text style={styles.modalCertificateYear}>
              {selectedCertificate.year}
            </Text>

            {selectedCertificate.verified && (
              <View style={styles.verifiedSection}>
                <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                <Text style={styles.verifiedText}>{t('verifiedCertificate')}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Main Trust Indicators */}
      <View style={styles.trustGrid}>
        {trustItems.map((item, index) => renderTrustItem(item, index))}
      </View>

      {/* Special Features */}
      {renderSpecialFeatures()}

      {/* Certificates */}
      {renderCertificates()}

      {/* Specializations */}
      {renderSpecializations()}

      {/* Certificate Modal */}
      {renderCertificateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 16,
  },
  trustItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  trustIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustTextContainer: {
    alignItems: 'flex-start',
  },
  trustValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  trustLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  certificatesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  certificatesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  certificateCard: {
    width: 140,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  certificateHeader: {
    position: 'relative',
    marginBottom: 8,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 2,
  },
  certificateName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  certificateIssuer: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 4,
  },
  certificateYear: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  featuresSection: {
    marginBottom: 16,
  },
  featuresGrid: {
    backgroundColor: colors.lightPrimary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  specializationsSection: {
    marginBottom: 16,
  },
  specializationTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specializationTag: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  specializationText: {
    fontSize: 14,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  certificateImage: {
    width: '100%',
    height: 200,
    marginBottom: 16,
  },
  certificatePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 16,
  },
  modalCertificateName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalCertificateIssuer: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalCertificateYear: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 16,
  },
  verifiedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lightSuccess,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '500',
  },
});