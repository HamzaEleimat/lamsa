import React, { useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Card, IconButton, Text, Portal, Modal, FAB, useTheme, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootTabParamList } from '../../navigation/types';

type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'ProviderDashboard'>,
  NativeStackNavigationProp<any>
>;

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

interface QuickActionsProps {
  style?: 'inline' | 'floating';
  visible?: boolean;
  onToggle?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const QuickActions: React.FC<QuickActionsProps> = ({ 
  style = 'inline',
  visible = true,
  onToggle
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [modalVisible, setModalVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const actions: QuickAction[] = [
    {
      id: 'booking',
      icon: 'calendar-plus',
      label: t('dashboard.createBooking'),
      color: theme.colors.primary,
      onPress: () => navigation.navigate('ProviderBookings'),
    },
    {
      id: 'clients',
      icon: 'account-group',
      label: t('common.clients'),
      color: theme.colors.secondary,
      onPress: () => navigation.navigate('ProviderClients'),
    },
    {
      id: 'services',
      icon: 'room-service',
      label: t('common.services'),
      color: theme.colors.tertiary,
      onPress: () => navigation.navigate('ProviderServices'),
    },
    {
      id: 'availability',
      icon: 'clock-outline',
      label: t('dashboard.manageAvailability'),
      color: theme.colors.primary,
      onPress: () => navigation.navigate('ProviderAvailability'),
    },
  ];

  if (style === 'floating') {
    return (
      <>
        <FAB.Group
          open={fabOpen}
          visible={visible}
          icon={fabOpen ? 'close' : 'lightning-bolt'}
          actions={actions.map(action => ({
            icon: action.icon,
            label: action.label,
            color: action.color,
            onPress: () => {
              action.onPress();
              setFabOpen(false);
            },
          }))}
          onStateChange={({ open }) => setFabOpen(open)}
          fabStyle={{
            backgroundColor: theme.colors.primary,
          }}
          color={theme.colors.onPrimary}
        />
      </>
    );
  }

  return (
    <Card style={[styles.container, { backgroundColor: theme.colors.elevation.level1 }]}>
      <Card.Title
        title={t('dashboard.quickActions')}
        titleStyle={{ color: theme.colors.onSurface }}
        left={(props) => (
          <MaterialCommunityIcons 
            name="lightning-bolt" 
            size={24} 
            color={theme.colors.primary}
          />
        )}
        right={(props) => (
          <IconButton
            icon="dots-vertical"
            size={20}
            onPress={() => setModalVisible(true)}
          />
        )}
      />
      <Card.Content>
        <View style={styles.grid}>
          {actions.map((action, index) => (
            <View key={action.id} style={styles.actionWrapper}>
              <IconButton
                icon={action.icon}
                mode="contained"
                size={28}
                iconColor={theme.colors.onPrimary}
                containerColor={action.color}
                onPress={action.onPress}
                style={styles.actionButton}
              />
              <Text 
                variant="bodySmall" 
                style={[styles.actionLabel, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </View>
          ))}
        </View>
      </Card.Content>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
            {t('dashboard.customizeQuickActions')}
          </Text>
          <Divider />
          <View style={{ marginTop: 16 }}>
            {actions.map(action => (
              <View key={action.id} style={styles.modalAction}>
                <MaterialCommunityIcons 
                  name={action.icon as any} 
                  size={24} 
                  color={action.color}
                />
                <Text 
                  variant="bodyLarge" 
                  style={{ color: theme.colors.onSurface, marginLeft: 16, flex: 1 }}
                >
                  {action.label}
                </Text>
              </View>
            ))}
          </View>
        </Modal>
      </Portal>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionWrapper: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 4,
  },
  actionLabel: {
    textAlign: 'center',
    fontSize: 11,
  },
  modalContent: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
});