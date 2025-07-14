import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { format, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface InstagramPost {
  id: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  permalink: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  timestamp: string;
  likeCount?: number;
  commentCount?: number;
}

interface InstagramFeedProps {
  instagramUsername?: string;
  instagramToken?: string; // For Instagram Basic Display API
  posts?: InstagramPost[]; // Mock posts for development
  onPostPress?: (post: InstagramPost) => void;
  maxPosts?: number;
}

export default function InstagramFeed({
  instagramUsername,
  instagramToken,
  posts: mockPosts = [],
  onPostPress,
  maxPosts = 9,
}: InstagramFeedProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? ar : enUS;
  
  const [posts, setPosts] = useState<InstagramPost[]>(mockPosts);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (instagramToken && !mockPosts.length) {
      fetchInstagramPosts();
    }
  }, [instagramToken]);

  const fetchInstagramPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Instagram Basic Display API endpoint
      // In production, this should be proxied through your backend
      const response = await fetch(
        `https://graph.instagram.com/me/media?fields=id,media_url,thumbnail_url,caption,permalink,media_type,timestamp,like_count,comments_count&limit=${maxPosts}&access_token=${instagramToken}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch Instagram posts');
      }
      
      const data = await response.json();
      setPosts(data.data || []);
    } catch (error) {
      console.error('Error fetching Instagram posts:', error);
      setError(t('failedToLoadInstagram'));
      // Use mock posts as fallback
      setPosts(generateMockPosts());
    } finally {
      setLoading(false);
    }
  };

  const generateMockPosts = (): InstagramPost[] => {
    // Generate mock posts for development
    return Array.from({ length: 9 }, (_, i) => ({
      id: `mock-${i}`,
      mediaUrl: `https://picsum.photos/400/400?random=${i}`,
      thumbnailUrl: `https://picsum.photos/200/200?random=${i}`,
      caption: `Beautiful work at our salon! 💅✨ #beautycort #jordanbeauty #ammansalon`,
      permalink: `https://www.instagram.com/p/mock${i}/`,
      mediaType: 'IMAGE' as const,
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      likeCount: Math.floor(Math.random() * 500) + 50,
      commentCount: Math.floor(Math.random() * 50) + 5,
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInstagramPosts();
    setRefreshing(false);
  };

  const handlePostPress = (post: InstagramPost) => {
    if (onPostPress) {
      onPostPress(post);
    } else {
      // Open in Instagram app or browser
      Linking.openURL(post.permalink);
    }
  };

  const handleFollowPress = () => {
    if (instagramUsername) {
      const instagramUrl = `instagram://user?username=${instagramUsername}`;
      Linking.openURL(instagramUrl).catch(() => {
        // Fallback to web if Instagram app is not installed
        Linking.openURL(`https://www.instagram.com/${instagramUsername}/`);
      });
    }
  };

  const renderPost = ({ item }: { item: InstagramPost }) => {
    const postDate = parseISO(item.timestamp);
    
    return (
      <TouchableOpacity
        style={styles.postContainer}
        onPress={() => handlePostPress(item)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: item.thumbnailUrl || item.mediaUrl }}
          style={styles.postImage}
        />
        
        {item.mediaType === 'VIDEO' && (
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={40} color={colors.white} />
          </View>
        )}
        
        {item.mediaType === 'CAROUSEL_ALBUM' && (
          <View style={styles.carouselIndicator}>
            <Ionicons name="albums" size={20} color={colors.white} />
          </View>
        )}
        
        <View style={styles.postOverlay}>
          <View style={styles.postStats}>
            {item.likeCount !== undefined && (
              <View style={styles.statItem}>
                <Ionicons name="heart" size={16} color={colors.white} />
                <Text style={styles.statText}>{formatCount(item.likeCount)}</Text>
              </View>
            )}
            {item.commentCount !== undefined && (
              <View style={styles.statItem}>
                <Ionicons name="chatbubble" size={16} color={colors.white} />
                <Text style={styles.statText}>{formatCount(item.commentCount)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const renderHeader = () => {
    if (!instagramUsername) return null;
    
    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="logo-instagram" size={24} color="#E4405F" />
          <Text style={styles.username}>@{instagramUsername}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.followButton}
          onPress={handleFollowPress}
        >
          <Text style={styles.followText}>{t('follow')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.gray} />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchInstagramPosts}>
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="logo-instagram" size={48} color={colors.gray} />
        <Text style={styles.emptyText}>{t('noInstagramPosts')}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (posts.length === 0) return null;
    
    return (
      <TouchableOpacity
        style={styles.viewMoreButton}
        onPress={handleFollowPress}
      >
        <Text style={styles.viewMoreText}>{t('viewMoreOnInstagram')}</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={posts.slice(0, maxPosts)}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.feedContainer,
          posts.length === 0 && styles.emptyFeedContainer,
        ]}
        columnWrapperStyle={posts.length > 0 ? styles.row : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#E4405F',
    borderRadius: 6,
  },
  followText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  feedContainer: {
    paddingTop: 2,
  },
  emptyFeedContainer: {
    flex: 1,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  postContainer: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  carouselIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
  },
  postStats: {
    flexDirection: 'row',
    gap: 12,
    opacity: 0,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
});