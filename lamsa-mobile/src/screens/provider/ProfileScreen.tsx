import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Avatar, 
  Button, 
  Card, 
  List, 
  Switch,
  useTheme,
  IconButton,
  Divider,
  ProgressBar,
  Chip,
  Badge
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { providerService } from '../../services/providerService';
import { Provider, VerificationStatus, QualityTier } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { isRTL } from '../../i18n';
import { supabase } from '../../services/supabase';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadProviderProfile();
  }, []);

  const loadProviderProfile = async () => {
    if (!user?.id) return;

    try {
      const providerData = await providerService.getProviderById(user.id);
      setProvider(providerData);
      setIsOnline(providerData.active);
    } catch (error) {
      console.error('Error loading provider profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleOnlineStatus = async () => {
    if (!provider) return;

    try {
      const newStatus = !isOnline;
      const { error } = await supabase
        .from('providers')
        .update({ active: newStatus })
        .eq('id', provider.id);

      if (error) throw error;
      
      setIsOnline(newStatus);
      Alert.alert(
        t('profile.status_updated'),
        newStatus ? t('profile.you_are_online') : t('profile.you_are_offline')
      );
    } catch (error) {
      console.error('Error updating online status:', error);
      Alert.alert(t('common.error'), t('profile.status_update_failed'));
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      t('profile.sign_out'),
      t('profile.sign_out_confirmation'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.confirm'), 
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  const getVerificationStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return theme.colors.success;
      case VerificationStatus.PENDING:
      case VerificationStatus.DOCUMENTS_SUBMITTED:
      case VerificationStatus.UNDER_REVIEW:
        return theme.colors.warning;
      case VerificationStatus.REJECTED:
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getQualityTierInfo = (tier: QualityTier) => {
    switch (tier) {
      case QualityTier.PREMIUM:
        return { label: t('profile.tier.premium'), icon: 'star', color: theme.colors.warning };
      case QualityTier.VERIFIED:
        return { label: t('profile.tier.verified'), icon: 'check-decagram', color: theme.colors.primary };
      default:
        return { label: t('profile.tier.basic'), icon: 'account', color: theme.colors.onSurfaceVariant };
    }
  };

  if (isLoading || !provider) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  const tierInfo = getQualityTierInfo(provider.qualityTier);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Avatar.Image 
            size={100} 
            source={{ uri: provider.avatarUrl || 'https://via.placeholder.com/100' }} 
          />
          <IconButton
            icon="camera"
            mode="contained"
            size={20}
            style={styles.cameraButton}
            onPress={() => navigation.navigate('EditProfile')}
          />
        </View>
        
        <Text variant="headlineSmall" style={styles.businessName}>
          {provider.businessName}
        </Text>
        
        <View style={styles.tierContainer}>
          <Chip 
            icon={tierInfo.icon}
            style={[styles.tierChip, { backgroundColor: tierInfo.color }]}
            textStyle={{ color: 'white' }}
          >
            {tierInfo.label}
          </Chip>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text variant="headlineMedium">{provider.rating.toFixed(1)}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('profile.rating')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="headlineMedium">{provider.totalReviews}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('profile.reviews')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="headlineMedium">{provider.totalCustomers || 0}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('profile.customers')}</Text>
          </View>
        </View>
      </View>

      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <Text variant="titleMedium">{t('profile.online_status')}</Text>
              <Text variant="bodySmall" style={styles.statusDescription}>
                {isOnline ? t('profile.accepting_bookings') : t('profile.not_accepting_bookings')}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnlineStatus}
              color={theme.colors.primary}
            />
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.verificationCard}>
        <Card.Content>
          <View style={styles.verificationHeader}>
            <Text variant="titleMedium">{t('profile.verification_status')}</Text>
            <Chip 
              mode="flat"
              style={{ backgroundColor: getVerificationStatusColor(provider.verificationStatus) }}
              textStyle={{ color: 'white' }}
            >
              {t(`profile.verification.${provider.verificationStatus}`)}
            </Chip>
          </View>
          
          <Text variant="bodySmall" style={styles.completionText}>
            {t('profile.profile_completion', { percentage: provider.profileCompletionPercentage })}
          </Text>
          <ProgressBar 
            progress={provider.profileCompletionPercentage / 100} 
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          
          {provider.verificationStatus !== VerificationStatus.VERIFIED && (
            <Button 
              mode="contained-tonal"
              onPress={() => navigation.navigate('VerificationCenter')}
              style={styles.verifyButton}
            >
              {t('profile.complete_verification')}
            </Button>
          )}
        </Card.Content>
      </Card>

      <List.Section>
        <List.Subheader>{t('profile.account_settings')}</List.Subheader>
        
        <List.Item
          title={t('profile.edit_profile')}
          description={t('profile.edit_profile_description')}
          left={props => <List.Icon {...props} icon="account-edit" />}
          onPress={() => navigation.navigate('EditProfile')}
        />
        
        <List.Item
          title={t('profile.business_hours')}
          description={t('profile.business_hours_description')}
          left={props => <List.Icon {...props} icon="clock-outline" />}
          onPress={() => navigation.navigate('WeeklyAvailability')}
        />
        
        <List.Item
          title={t('profile.payment_settings')}
          description={t('profile.payment_settings_description')}
          left={props => <List.Icon {...props} icon="credit-card" />}
          onPress={() => navigation.navigate('PaymentSettings')}
        />
        
        <List.Item
          title={t('profile.notification_preferences')}
          description={t('profile.notification_preferences_description')}
          left={props => <List.Icon {...props} icon="bell" />}
          onPress={() => navigation.navigate('NotificationPreferences')}
        />
        
        <Divider style={styles.divider} />
        
        <List.Item
          title={t('profile.help_support')}
          description={t('profile.help_support_description')}
          left={props => <List.Icon {...props} icon="help-circle" />}
          onPress={() => navigation.navigate('HelpCenter')}
        />
        
        <List.Item
          title={t('profile.terms_conditions')}
          left={props => <List.Icon {...props} icon="file-document" />}
          onPress={() => navigation.navigate('Terms')}
        />
        
        <List.Item
          title={t('profile.privacy_policy')}
          left={props => <List.Icon {...props} icon="shield-lock" />}
          onPress={() => navigation.navigate('Privacy')}
        />
        
        <Divider style={styles.divider} />
        
        <List.Item
          title={t('profile.sign_out')}
          titleStyle={{ color: theme.colors.error }}
          left={props => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
          onPress={handleSignOut}
        />
      </List.Section>

      <View style={styles.versionContainer}>
        <Text variant="bodySmall" style={styles.versionText}>
          {t('profile.app_version', { version: '1.0.0' })}
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileSection: {
    position: 'relative',
    marginBottom: 16,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    elevation: 2,
  },
  businessName: {
    marginBottom: 8,
    textAlign: 'center',
  },
  tierContainer: {
    marginBottom: 20,
  },
  tierChip: {
    paddingHorizontal: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  statusCard: {
    margin: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusDescription: {
    color: '#666',
    marginTop: 4,
  },
  verificationCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  completionText: {
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  verifyButton: {
    marginTop: 16,
  },
  divider: {
    marginVertical: 8,
  },
  versionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    color: '#999',
  },
});

export default ProfileScreen;