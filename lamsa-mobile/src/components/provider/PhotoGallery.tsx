import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Dimensions,
  ScrollView,
  I18nManager,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface GalleryImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'before_after' | 'work' | 'facility' | 'team' | 'certificate';
  caption?: string;
  captionAr?: string;
  beforeUrl?: string; // For before/after images
  serviceCategory?: string;
  createdAt: string;
}

interface PhotoGalleryProps {
  images: GalleryImage[];
  providerId: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function PhotoGallery({
  images,
  providerId,
  onLoadMore,
  hasMore = false,
}: PhotoGalleryProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [beforeAfterPosition, setBeforeAfterPosition] = useState(0.5);
  const [loadingMore, setLoadingMore] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const categories = [
    { key: 'all', label: t('all'), icon: 'grid' },
    { key: 'before_after', label: t('beforeAfter'), icon: 'git-compare' },
    { key: 'work', label: t('ourWork'), icon: 'brush' },
    { key: 'facility', label: t('facility'), icon: 'business' },
    { key: 'team', label: t('team'), icon: 'people' },
  ];

  const filteredImages = selectedCategory === 'all'
    ? images
    : images.filter(img => img.type === selectedCategory);

  const handleImagePress = (index: number) => {
    const filteredIndex = images.indexOf(filteredImages[index]);
    setSelectedImageIndex(filteredIndex);
    setViewerVisible(true);
  };

  const handleLoadMore = async () => {
    if (!onLoadMore || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    await onLoadMore();
    setLoadingMore(false);
  };

  const renderGalleryItem = ({ item, index }: { item: GalleryImage; index: number }) => {
    const isBeforeAfter = item.type === 'before_after' && item.beforeUrl;
    
    return (
      <TouchableOpacity
        style={styles.galleryItem}
        onPress={() => handleImagePress(index)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: item.thumbnailUrl || item.url }}
          style={styles.galleryImage}
        />
        
        {isBeforeAfter && (
          <View style={styles.beforeAfterBadge}>
            <Ionicons name="git-compare" size={16} color={colors.white} />
            <Text style={styles.badgeText}>{t('beforeAfter')}</Text>
          </View>
        )}
        
        {item.caption && (
          <View style={styles.captionOverlay}>
            <Text style={styles.captionText} numberOfLines={2}>
              {isRTL ? item.captionAr || item.caption : item.caption}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderBeforeAfterViewer = (image: GalleryImage) => {
    if (!image.beforeUrl) return null;

    return (
      <View style={styles.beforeAfterContainer}>
        {/* Before Image */}
        <Image
          source={{ uri: image.beforeUrl }}
          style={styles.fullImage}
          resizeMode="contain"
        />
        
        {/* After Image with Mask */}
        <View
          style={[
            styles.afterImageContainer,
            { width: `${beforeAfterPosition * 100}%` },
          ]}
        >
          <Image
            source={{ uri: image.url }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
        
        {/* Slider */}
        <View
          style={[
            styles.sliderLine,
            { left: `${beforeAfterPosition * 100}%` },
          ]}
        >
          <View style={styles.sliderHandle}>
            <Ionicons name="code" size={24} color={colors.white} />
          </View>
        </View>
        
        {/* Labels */}
        <View style={styles.beforeAfterLabels}>
          <View style={styles.labelBadge}>
            <Text style={styles.labelText}>{t('before')}</Text>
          </View>
          <View style={styles.labelBadge}>
            <Text style={styles.labelText}>{t('after')}</Text>
          </View>
        </View>
        
        {/* Gesture Handler for sliding */}
        <View
          style={StyleSheet.absoluteFillObject}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderMove={(event) => {
            const x = event.nativeEvent.locationX;
            const position = Math.max(0, Math.min(1, x / screenWidth));
            setBeforeAfterPosition(position);
          }}
        />
      </View>
    );
  };

  const renderImageViewer = () => {
    const currentImage = images[selectedImageIndex];
    if (!currentImage) return null;

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: focalX.value },
        { translateY: focalY.value },
        { translateX: -screenWidth / 2 },
        { translateY: -screenHeight / 2 },
        { scale: scale.value },
        { translateX: -focalX.value + screenWidth / 2 },
        { translateY: -focalY.value + screenHeight / 2 },
      ],
    }));

    return (
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          {/* Header */}
          <View style={styles.viewerHeader}>
            <TouchableOpacity onPress={() => setViewerVisible(false)}>
              <Ionicons name="close" size={28} color={colors.white} />
            </TouchableOpacity>
            
            <Text style={styles.viewerCounter}>
              {selectedImageIndex + 1} / {images.length}
            </Text>
            
            <TouchableOpacity onPress={() => {/* Share functionality */}}>
              <Ionicons name="share-social" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Image Display */}
          {currentImage.type === 'before_after' && currentImage.beforeUrl ? (
            renderBeforeAfterViewer(currentImage)
          ) : (
            <PinchGestureHandler
              onGestureEvent={(event) => {
                scale.value = event.nativeEvent.scale;
                focalX.value = event.nativeEvent.focalX;
                focalY.value = event.nativeEvent.focalY;
              }}
              onHandlerStateChange={(event) => {
                if (event.nativeEvent.state === State.END) {
                  scale.value = withSpring(1);
                  focalX.value = withSpring(0);
                  focalY.value = withSpring(0);
                }
              }}
            >
              <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <Image
                  source={{ uri: currentImage.url }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </PinchGestureHandler>
          )}

          {/* Caption */}
          {currentImage.caption && (
            <View style={styles.viewerCaption}>
              <Text style={styles.viewerCaptionText}>
                {isRTL ? currentImage.captionAr || currentImage.caption : currentImage.caption}
              </Text>
            </View>
          )}

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, selectedImageIndex === 0 && styles.navButtonDisabled]}
              onPress={() => setSelectedImageIndex(prev => Math.max(0, prev - 1))}
              disabled={selectedImageIndex === 0}
            >
              <Ionicons
                name="chevron-back"
                size={32}
                color={selectedImageIndex === 0 ? colors.gray : colors.white}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                selectedImageIndex === images.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={() => setSelectedImageIndex(prev => Math.min(images.length - 1, prev + 1))}
              disabled={selectedImageIndex === images.length - 1}
            >
              <Ionicons
                name="chevron-forward"
                size={32}
                color={selectedImageIndex === images.length - 1 ? colors.gray : colors.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              selectedCategory === category.key && styles.activeCategoryButton,
            ]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <Ionicons
              name={category.icon as any}
              size={20}
              color={selectedCategory === category.key ? colors.white : colors.gray}
            />
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === category.key && styles.activeCategoryButtonText,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Gallery Grid */}
      <FlatList
        data={filteredImages}
        renderItem={renderGalleryItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.galleryGrid}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore && (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color={colors.gray} />
            <Text style={styles.emptyText}>{t('noPhotosYet')}</Text>
          </View>
        )}
      />

      {/* Image Viewer Modal */}
      {renderImageViewer()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryFilter: {
    marginBottom: 16,
    marginHorizontal: -16,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    marginRight: 8,
  },
  activeCategoryButton: {
    backgroundColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: colors.gray,
  },
  activeCategoryButtonText: {
    color: colors.white,
    fontWeight: '500',
  },
  galleryGrid: {
    paddingBottom: 16,
  },
  galleryItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  beforeAfterBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '500',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
  },
  captionText: {
    fontSize: 11,
    color: colors.white,
    lineHeight: 14,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray,
    marginTop: 16,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  viewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  viewerCounter: {
    fontSize: 16,
    color: colors.white,
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: screenWidth,
    height: '100%',
  },
  viewerCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  viewerCaptionText: {
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
  },
  navigation: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  beforeAfterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  afterImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  sliderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.white,
    transform: [{ translateX: -1 }],
  },
  sliderHandle: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  beforeAfterLabels: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  labelText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: 'bold',
  },
});