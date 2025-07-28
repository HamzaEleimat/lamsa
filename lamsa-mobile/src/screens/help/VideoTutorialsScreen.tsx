import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Searchbar, Chip, ActivityIndicator, ProgressBar, Portal, Modal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import VideoService, { VideoTutorial, VideoCategory, PlaylistInfo, DownloadProgress } from '../../services/help/VideoService';

const { width: screenWidth } = Dimensions.get('window');

interface VideoItemProps {
  video: VideoTutorial;
  onPress: (video: VideoTutorial) => void;
  onDownload?: (video: VideoTutorial) => void;
  downloadProgress?: DownloadProgress;
  isDownloaded?: boolean;
}

const VideoItem: React.FC<VideoItemProps> = ({ 
  video, 
  onPress, 
  onDownload, 
  downloadProgress,
  isDownloaded 
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return colors.success;
      case 'intermediate': return colors.warning;
      case 'advanced': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const handleDownloadPress = () => {
    if (downloadProgress?.status === 'downloading') {
      Alert.alert(
        t('downloading'),
        t('videoDownloadInProgress'),
        [{ text: t('ok') }]
      );
      return;
    }

    if (isDownloaded) {
      Alert.alert(
        t('deleteDownload'),
        t('deleteDownloadConfirm'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('delete'), style: 'destructive', onPress: () => onDownload?.(video) },
        ]
      );
    } else {
      Alert.alert(
        t('downloadVideo'),
        t('downloadVideoConfirm', { size: video.downloadSize }),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('download'), onPress: () => onDownload?.(video) },
        ]
      );
    }
  };

  return (
    <Card style={styles.videoCard}>
      <TouchableOpacity onPress={() => onPress(video)} activeOpacity={0.8}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} />
          
          {/* Play icon overlay */}
          <View style={styles.playIconOverlay}>
            <Ionicons name="play" size={24} color="white" />
          </View>
          
          {/* Duration badge */}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
          
          {/* Featured badge */}
          {video.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="white" />
            </View>
          )}
          
          {/* Download status */}
          {isDownloaded && (
            <View style={styles.downloadedBadge}>
              <Ionicons name="download" size={12} color={colors.success} />
            </View>
          )}
        </View>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {isRTL ? video.titleAr : video.title}
          </Text>
          <Text style={styles.videoDescription} numberOfLines={2}>
            {isRTL ? video.descriptionAr : video.description}
          </Text>
          
          {/* Video Meta */}
          <View style={styles.videoMeta}>
            <View style={styles.leftMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="eye" size={14} color={colors.text.secondary} />
                <Text style={styles.metaText}>{video.viewCount}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="heart" size={14} color={colors.text.secondary} />
                <Text style={styles.metaText}>{video.likes}</Text>
              </View>
            </View>
            
            <View style={styles.rightMeta}>
              <Chip
                mode="outlined"
                textStyle={[styles.chipText, { color: getDifficultyColor(video.difficulty) }]}
                style={[styles.difficultyChip, { borderColor: getDifficultyColor(video.difficulty) }]}
              >
                {t(`difficulty.${video.difficulty}`)}
              </Chip>
            </View>
          </View>

          {/* Download Progress */}
          {downloadProgress && downloadProgress.status === 'downloading' && (
            <View style={styles.downloadProgressContainer}>
              <ProgressBar
                progress={downloadProgress.progress / 100}
                color={colors.primary}
                style={styles.downloadProgressBar}
              />
              <Text style={styles.downloadProgressText}>
                {downloadProgress.progress}% - {t('downloading')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Download Button */}
      {video.isOfflineAvailable && (
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={handleDownloadPress}
          disabled={downloadProgress?.status === 'downloading'}
        >
          <Ionicons
            name={isDownloaded ? "trash" : "download"}
            size={20}
            color={downloadProgress?.status === 'downloading' ? colors.text.secondary : colors.primary}
          />
        </TouchableOpacity>
      )}
    </Card>
  );
};

export default function VideoTutorialsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoTutorial[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<VideoTutorial[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [downloadedVideos, setDownloadedVideos] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  const videoService = VideoService.getInstance();

  useEffect(() => {
    loadVideoData();
    setupDownloadListener();
  }, []);

  useEffect(() => {
    filterVideos();
  }, [videos, selectedCategory, searchQuery]);

  const loadVideoData = async () => {
    try {
      setLoading(true);
      
      const [
        categoriesData,
        featuredData,
        playlistsData,
        downloadedData,
      ] = await Promise.all([
        videoService.getCategories(),
        videoService.getFeaturedVideos(),
        videoService.getPlaylists(),
        videoService.getDownloadedVideos(),
      ]);

      setCategories([{ id: 'all', name: 'All', nameAr: 'الكل', description: '', descriptionAr: '', icon: '', color: '', order: 0, videoCount: 0 }, ...categoriesData]);
      setFeaturedVideos(featuredData);
      setPlaylists(playlistsData);
      setDownloadedVideos(new Set(downloadedData.map(v => v.id)));

      // Load all videos
      const allVideos: VideoTutorial[] = [];
      for (const category of categoriesData) {
        const categoryVideos = await videoService.getVideosByCategory(category.id);
        allVideos.push(...categoryVideos);
      }
      setVideos(allVideos);
    } catch (error) {
      console.error('Error loading video data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupDownloadListener = () => {
    const unsubscribe = videoService.onDownloadProgress((progress) => {
      setDownloadProgress(prev => new Map(prev.set(progress.videoId, progress)));
      
      if (progress.status === 'completed') {
        setDownloadedVideos(prev => new Set(prev.add(progress.videoId)));
      } else if (progress.status === 'failed') {
        Alert.alert(
          t('downloadFailed'),
          t('downloadFailedMessage'),
          [{ text: t('ok') }]
        );
      }
    });

    return unsubscribe;
  };

  const filterVideos = async () => {
    let filtered = videos;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(video => video.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      filtered = await videoService.searchVideos(searchQuery, i18n.language as 'ar' | 'en');
    }

    setFilteredVideos(filtered);
  };

  const handleVideoPress = (video: VideoTutorial) => {
    navigation.navigate('VideoPlayer', { 
      videoId: video.id,
      isOffline: downloadedVideos.has(video.id),
    });
  };

  const handleDownload = async (video: VideoTutorial) => {
    if (downloadedVideos.has(video.id)) {
      // Delete downloaded video
      const success = await videoService.deleteDownloadedVideo(video.id);
      if (success) {
        setDownloadedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(video.id);
          return newSet;
        });
        setDownloadProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(video.id);
          return newMap;
        });
      }
    } else {
      // Download video
      await videoService.downloadVideo(video.id, 'hd');
    }
  };

  const handlePlaylistPress = (playlist: PlaylistInfo) => {
    navigation.navigate('PlaylistVideos', { 
      playlistId: playlist.id,
      playlistName: isRTL ? playlist.nameAr : playlist.name,
    });
  };

  const handleOfflinePress = () => {
    setShowOfflineModal(true);
  };

  const renderCategoryChip = (category: VideoCategory) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryChip,
        selectedCategory === category.id && styles.selectedCategoryChip,
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === category.id && styles.selectedCategoryText,
        ]}
      >
        {isRTL ? category.nameAr : category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderPlaylistItem = ({ item }: { item: PlaylistInfo }) => (
    <TouchableOpacity
      style={styles.playlistCard}
      onPress={() => handlePlaylistPress(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.playlistThumbnail} />
      <View style={styles.playlistOverlay}>
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistTitle} numberOfLines={2}>
            {isRTL ? item.nameAr : item.name}
          </Text>
          <Text style={styles.playlistDescription} numberOfLines={1}>
            {isRTL ? item.descriptionAr : item.description}
          </Text>
          <View style={styles.playlistMeta}>
            <Text style={styles.playlistDuration}>
              {Math.floor(item.duration / 60)} {t('minutes')}
            </Text>
            <Text style={styles.playlistVideoCount}>
              {item.videoIds.length} {t('videos')}
            </Text>
          </View>
        </View>
        <View style={styles.playlistPlayIcon}>
          <Ionicons name="play" size={20} color="white" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('loadingVideos')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('videoTutorials')}</Text>
          <TouchableOpacity
            style={styles.offlineButton}
            onPress={handleOfflinePress}
          >
            <Ionicons name="download" size={24} color={colors.primary} />
            <Text style={styles.offlineButtonText}>{downloadedVideos.size}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>{t('videoTutorialsSubtitle')}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder={t('searchVideos')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
          />
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map(renderCategoryChip)}
        </ScrollView>

        {/* Featured Videos */}
        {!searchQuery.trim() && featuredVideos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('featuredVideos')}</Text>
            <FlatList
              data={featuredVideos}
              renderItem={({ item }) => (
                <VideoItem
                  video={item}
                  onPress={handleVideoPress}
                  onDownload={handleDownload}
                  downloadProgress={downloadProgress.get(item.id)}
                  isDownloaded={downloadedVideos.has(item.id)}
                />
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Playlists */}
        {!searchQuery.trim() && playlists.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('playlists')}</Text>
            <FlatList
              data={playlists}
              renderItem={renderPlaylistItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* All Videos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {searchQuery.trim() ? t('searchResults') : t('allVideos')} ({filteredVideos.length})
          </Text>
          
          {filteredVideos.length > 0 ? (
            <FlatList
              data={filteredVideos}
              renderItem={({ item }) => (
                <VideoItem
                  video={item}
                  onPress={handleVideoPress}
                  onDownload={handleDownload}
                  downloadProgress={downloadProgress.get(item.id)}
                  isDownloaded={downloadedVideos.has(item.id)}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.videosList}
            />
          ) : (
            <View style={styles.noResultsContainer}>
              <Ionicons name="videocam" size={48} color={colors.text.secondary} />
              <Text style={styles.noResultsText}>{t('noVideosFound')}</Text>
              <Text style={styles.noResultsSubtext}>{t('tryDifferentSearch')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Offline Videos Modal */}
      <Portal>
        <Modal
          visible={showOfflineModal}
          onDismiss={() => setShowOfflineModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="download" size={32} color={colors.primary} />
              <Text style={styles.modalTitle}>{t('offlineVideos')}</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              {t('offlineVideosDescription', { count: downloadedVideos.size })}
            </Text>
            
            <View style={styles.modalStats}>
              <Text style={styles.modalStatsText}>
                {t('totalDownloaded')}: {downloadedVideos.size} {t('videos')}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.viewOfflineButton]}
              onPress={() => {
                setShowOfflineModal(false);
                navigation.navigate('OfflineVideos');
              }}
            >
              <Text style={styles.viewOfflineButtonText}>{t('viewOfflineVideos')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={() => setShowOfflineModal(false)}
            >
              <Text style={styles.closeButtonText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  offlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  offlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  searchInput: {
    fontSize: 16,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginHorizontal: 4,
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: 'white',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  videosList: {
    paddingHorizontal: 20,
  },
  videoCard: {
    width: screenWidth - 40,
    marginHorizontal: 4,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    height: 180,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.text.secondary + '20',
  },
  playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  videoDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  difficultyChip: {
    height: 24,
  },
  chipText: {
    fontSize: 11,
  },
  downloadProgressContainer: {
    marginTop: 12,
  },
  downloadProgressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  downloadProgressText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  downloadButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistCard: {
    width: 280,
    height: 160,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  playlistThumbnail: {
    width: '100%',
    height: '100%',
  },
  playlistOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
    justifyContent: 'space-between',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  playlistDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  playlistMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playlistDuration: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  playlistVideoCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  playlistPlayIcon: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  modalContainer: {
    margin: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  modalStats: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalStatsText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  viewOfflineButton: {
    backgroundColor: colors.primary,
  },
  viewOfflineButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: colors.text.secondary + '15',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
});