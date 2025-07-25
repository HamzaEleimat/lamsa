import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme, Surface, Avatar, IconButton, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import NotificationCenter from '../../components/notifications/NotificationCenter';
import NotificationBadge from '../../components/notifications/NotificationBadge';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n from '../../i18n';
import RTLButton from '../../components/RTLButton';
import { mockUser } from '../../services/mock/mockDataService';

const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [userStats, setUserStats] = useState({
    bookings_count: 0,
    favorite_services: 0,
    average_rating: 0
  });

  useEffect(() => {
    // In a real app, this would fetch from API
    // For now, use mock data
    setUserStats({
      bookings_count: mockUser.bookings_count,
      favorite_services: mockUser.favorite_services,
      average_rating: mockUser.average_rating
    });
  }, []);

  const renderHeader = () => {
    const displayUser = user || mockUser;
    const userName = displayUser?.name || i18n.t('profile.guest');
    const userPhone = displayUser?.phone || '';
    const memberYear = displayUser?.member_since ? new Date(displayUser.member_since).getFullYear() : new Date().getFullYear();
    
    return (
      <Surface style={styles.headerCard} elevation={1}>
        <View style={styles.headerTop}>
          <View style={styles.profileSection}>
            {displayUser?.avatar ? (
              <Avatar.Image
                size={80}
                source={{ uri: displayUser.avatar }}
              />
            ) : (
              <Avatar.Text
                size={80}
                label={userName.charAt(0).toUpperCase()}
                style={{ backgroundColor: theme.colors.primary }}
              />
            )}
            <View style={styles.profileInfo}>
              <Text variant="headlineSmall" style={styles.userName}>
                {userName}
              </Text>
              <Text variant="bodyMedium" style={styles.userPhone}>
                {userPhone}
              </Text>
              <Text variant="bodySmall" style={styles.memberSince}>
                {i18n.t('profile.memberSince')} {memberYear}
              </Text>
            </View>
          </View>
        <View style={styles.notificationContainer}>
          <TouchableOpacity
            onPress={() => setShowNotifications(!showNotifications)}
            style={styles.notificationButton}
          >
            <NotificationBadge>
              <IconButton
                icon="bell"
                size={24}
                iconColor={theme.colors.onSurfaceVariant}
              />
            </NotificationBadge>
          </TouchableOpacity>
        </View>
      </View>
    </Surface>
    );
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Surface style={styles.statCard} elevation={1}>
        <Text variant="headlineMedium" style={styles.statNumber}>{userStats.bookings_count}</Text>
        <Text variant="bodySmall" style={styles.statLabel}>
          {i18n.t('profile.totalBookings')}
        </Text>
      </Surface>
      <Surface style={styles.statCard} elevation={1}>
        <Text variant="headlineMedium" style={styles.statNumber}>{userStats.favorite_services}</Text>
        <Text variant="bodySmall" style={styles.statLabel}>
          {i18n.t('profile.servicesUsed')}
        </Text>
      </Surface>
      <Surface style={styles.statCard} elevation={1}>
        <Text variant="headlineMedium" style={styles.statNumber}>{userStats.average_rating.toFixed(1)}</Text>
        <Text variant="bodySmall" style={styles.statLabel}>
          {i18n.t('profile.avgRating')}
        </Text>
      </Surface>
    </View>
  );

  const renderQuickActions = () => (
    <Surface style={styles.quickActionsCard} elevation={1}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {i18n.t('profile.quickActions')}
      </Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons
            name="history"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="bodySmall" style={styles.actionLabel}>
            {i18n.t('profile.bookingHistory')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons
            name="heart-outline"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="bodySmall" style={styles.actionLabel}>
            {i18n.t('profile.favorites')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons
            name="star-outline"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="bodySmall" style={styles.actionLabel}>
            {i18n.t('profile.reviews')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons
            name="cog-outline"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="bodySmall" style={styles.actionLabel}>
            {i18n.t('profile.settings')}
          </Text>
        </TouchableOpacity>
      </View>
    </Surface>
  );

  if (showNotifications) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.notificationHeader}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => setShowNotifications(false)}
          />
          <Text variant="titleLarge" style={styles.notificationTitle}>
            {i18n.t('notifications.title')}
          </Text>
          <View style={{ width: 48 }} />
        </View>
        <NotificationCenter />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderStats()}
        {renderQuickActions()}
        
        <View style={styles.signOutContainer}>
          <RTLButton
            title={i18n.t('profile.signOut')}
            onPress={signOut}
            variant="secondary"
            fullWidth
            style={[styles.signOutButton, { borderColor: theme.colors.error }]}
            textStyle={{ color: theme.colors.error }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontWeight: '600',
  },
  userPhone: {
    opacity: 0.7,
    marginTop: 4,
  },
  memberSince: {
    opacity: 0.5,
    marginTop: 4,
  },
  notificationContainer: {
    marginLeft: 16,
  },
  notificationButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
  },
  statLabel: {
    opacity: 0.7,
    marginTop: 4,
    textAlign: 'center',
  },
  quickActionsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionLabel: {
    marginTop: 8,
    textAlign: 'center',
  },
  signOutContainer: {
    padding: 16,
    marginTop: 16,
  },
  signOutButton: {
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  notificationTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default ProfileScreen;