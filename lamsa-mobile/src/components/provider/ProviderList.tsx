import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  I18nManager,
} from 'react-native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { ProviderWithDistance } from '../../services/providerService';
import ProviderCard from './ProviderCard';
import { Ionicons } from '@expo/vector-icons';

interface ProviderListProps {
  providers: ProviderWithDistance[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onProviderPress: (provider: ProviderWithDistance) => void;
  currentLocation?: { latitude: number; longitude: number };
  emptyMessage?: string;
  ListHeaderComponent?: React.ReactElement;
  contentContainerStyle?: any;
}

export default function ProviderList({
  providers,
  loading = false,
  refreshing = false,
  onRefresh,
  onLoadMore,
  hasMore = false,
  onProviderPress,
  currentLocation,
  emptyMessage,
  ListHeaderComponent,
  contentContainerStyle,
}: ProviderListProps) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || loadingMore || !hasMore || loading) return;

    setLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setLoadingMore(false);
    }
  }, [onLoadMore, loadingMore, hasMore, loading]);

  const renderProvider = useCallback(
    ({ item }: { item: ProviderWithDistance }) => (
      <ProviderCard
        provider={item}
        onPress={() => onProviderPress(item)}
        showDistance={!!currentLocation}
        currentLocation={currentLocation}
      />
    ),
    [onProviderPress, currentLocation]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('loadingProviders')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="business-outline" size={64} color={colors.gray} />
        <Text style={styles.emptyTitle}>
          {emptyMessage || t('noProvidersFound')}
        </Text>
        <Text style={styles.emptySubtitle}>
          {t('tryAdjustingFilters')}
        </Text>
      </View>
    );
  }, [loading, emptyMessage, t]);

  const keyExtractor = useCallback((item: ProviderWithDistance) => item.id, []);

  return (
    <FlatList
      data={providers}
      renderItem={renderProvider}
      keyExtractor={keyExtractor}
      contentContainerStyle={[
        styles.container,
        providers.length === 0 && styles.emptyListContainer,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      ListHeaderComponent={ListHeaderComponent}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={5}
      updateCellsBatchingPeriod={50}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});