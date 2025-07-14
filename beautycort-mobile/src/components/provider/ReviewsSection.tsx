import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  I18nManager,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { ProviderReview } from '../../services/providerService';
import { format, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';

interface ReviewsSectionProps {
  reviews: ProviderReview[];
  totalReviews: number;
  averageRating: number;
  ratingDistribution?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  providerId: string;
}

export default function ReviewsSection({
  reviews,
  totalReviews,
  averageRating,
  ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  onLoadMore,
  hasMore = false,
  loading = false,
  providerId,
}: ReviewsSectionProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;
  
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'photos' | 'verified'>('all');
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  // Filter reviews based on selected filter
  const filteredReviews = reviews.filter(review => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'photos') return false; // Would check for review.images
    if (selectedFilter === 'verified') return true; // Would check for review.verified
    return true;
  });

  // Calculate rating percentages
  const totalRatings = Object.values(ratingDistribution).reduce((a, b) => a + b, 0) || 1;
  const ratingPercentages = {
    5: (ratingDistribution[5] / totalRatings) * 100,
    4: (ratingDistribution[4] / totalRatings) * 100,
    3: (ratingDistribution[3] / totalRatings) * 100,
    2: (ratingDistribution[2] / totalRatings) * 100,
    1: (ratingDistribution[1] / totalRatings) * 100,
  };

  const toggleReviewExpansion = (reviewId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const renderRatingStars = (rating: number, size: number = 16) => {
    return (
      <View style={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map(star => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={colors.warning}
          />
        ))}
      </View>
    );
  };

  const renderRatingSummary = () => {
    return (
      <View style={styles.ratingSummary}>
        <View style={styles.ratingOverview}>
          <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          {renderRatingStars(Math.round(averageRating), 20)}
          <Text style={styles.totalReviews}>
            {t('basedOn')} {totalReviews} {t('reviews')}
          </Text>
        </View>

        <View style={styles.ratingDistribution}>
          {[5, 4, 3, 2, 1].map(rating => (
            <View key={rating} style={styles.ratingBar}>
              <Text style={styles.ratingNumber}>{rating}</Text>
              <Ionicons name="star" size={14} color={colors.warning} />
              <View style={styles.progressBarContainer}>
                <LinearGradient
                  colors={[colors.warning, colors.warning + 'CC']}
                  style={[
                    styles.progressBar,
                    { width: `${ratingPercentages[rating as keyof typeof ratingPercentages]}%` },
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.ratingCount}>
                {ratingDistribution[rating as keyof typeof ratingDistribution]}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderReviewFilters = () => {
    const filters = [
      { key: 'all', label: t('allReviews'), count: totalReviews },
      { key: 'photos', label: t('withPhotos'), count: 0 }, // Would be actual count
      { key: 'verified', label: t('verified'), count: reviews.length },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedFilter === filter.key && styles.activeFilterChip,
            ]}
            onPress={() => setSelectedFilter(filter.key as any)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter.key && styles.activeFilterText,
              ]}
            >
              {filter.label}
            </Text>
            {filter.count > 0 && (
              <Text
                style={[
                  styles.filterCount,
                  selectedFilter === filter.key && styles.activeFilterCount,
                ]}
              >
                ({filter.count})
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderReview = (review: ProviderReview) => {
    const isExpanded = expandedReviews.has(review.id);
    const shouldTruncate = review.comment && review.comment.length > 150;

    return (
      <View key={review.id} style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Image
            source={{
              uri: review.customerAvatar || 'https://via.placeholder.com/50',
            }}
            style={styles.reviewerAvatar}
          />
          <View style={styles.reviewerInfo}>
            <View style={styles.reviewerNameRow}>
              <Text style={styles.reviewerName}>{review.customerName}</Text>
              {/* Verified badge would go here */}
            </View>
            <View style={styles.reviewMeta}>
              {renderRatingStars(review.rating, 14)}
              <Text style={styles.reviewDate}>
                {format(parseISO(review.createdAt), 'dd MMM yyyy', { locale })}
              </Text>
            </View>
            {review.serviceName && (
              <Text style={styles.reviewService}>{review.serviceName}</Text>
            )}
          </View>
        </View>

        {review.comment && (
          <TouchableOpacity
            activeOpacity={shouldTruncate ? 0.7 : 1}
            onPress={() => shouldTruncate && toggleReviewExpansion(review.id)}
          >
            <Text
              style={styles.reviewComment}
              numberOfLines={isExpanded ? undefined : 4}
            >
              {review.comment}
            </Text>
            {shouldTruncate && !isExpanded && (
              <Text style={styles.readMore}>{t('readMore')}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Review Images would go here */}

        {/* Provider Response */}
        {review.response && (
          <View style={styles.providerResponse}>
            <View style={styles.responseHeader}>
              <Ionicons name="chatbox" size={16} color={colors.primary} />
              <Text style={styles.responseTitle}>{t('providerResponse')}</Text>
            </View>
            <Text style={styles.responseText}>{review.response.comment}</Text>
            <Text style={styles.responseDate}>
              {format(parseISO(review.response.createdAt), 'dd MMM yyyy', { locale })}
            </Text>
          </View>
        )}

        {/* Helpful/Report buttons */}
        <View style={styles.reviewActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="thumbs-up-outline" size={16} color={colors.gray} />
            <Text style={styles.actionText}>{t('helpful')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="flag-outline" size={16} color={colors.gray} />
            <Text style={styles.actionText}>{t('report')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTestimonial = () => {
    // Pick the highest rated review as testimonial
    const testimonial = reviews.find(r => r.rating === 5 && r.comment && r.comment.length > 100);
    if (!testimonial) return null;

    return (
      <View style={styles.testimonialSection}>
        <LinearGradient
          colors={[colors.primary + '10', colors.primary + '05']}
          style={styles.testimonialCard}
        >
          <Ionicons name="quote" size={32} color={colors.primary} style={styles.quoteIcon} />
          <Text style={styles.testimonialText} numberOfLines={4}>
            {testimonial.comment}
          </Text>
          <View style={styles.testimonialFooter}>
            <Text style={styles.testimonialAuthor}>— {testimonial.customerName}</Text>
            {renderRatingStars(testimonial.rating, 14)}
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Rating Summary */}
      {renderRatingSummary()}

      {/* Testimonial */}
      {renderTestimonial()}

      {/* Review Filters */}
      {renderReviewFilters()}

      {/* Reviews List */}
      <View style={styles.reviewsList}>
        {filteredReviews.map(renderReview)}
      </View>

      {/* Load More */}
      {hasMore && (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={onLoadMore}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Text style={styles.loadMoreText}>{t('loadMoreReviews')}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Write Review CTA */}
      <TouchableOpacity style={styles.writeReviewButton}>
        <Ionicons name="create-outline" size={20} color={colors.white} />
        <Text style={styles.writeReviewText}>{t('writeReview')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ratingSummary: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ratingOverview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.text,
  },
  ratingStars: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: colors.gray,
  },
  ratingDistribution: {
    gap: 8,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingNumber: {
    fontSize: 14,
    color: colors.text,
    width: 15,
    textAlign: 'center',
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: colors.gray,
    width: 30,
    textAlign: 'right',
  },
  testimonialSection: {
    marginBottom: 16,
  },
  testimonialCard: {
    borderRadius: 12,
    padding: 20,
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    opacity: 0.3,
  },
  testimonialText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  testimonialFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testimonialAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  filtersContainer: {
    marginBottom: 16,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    marginRight: 8,
    gap: 4,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.text,
  },
  activeFilterText: {
    color: colors.white,
    fontWeight: '500',
  },
  filterCount: {
    fontSize: 12,
    color: colors.gray,
  },
  activeFilterCount: {
    color: colors.white,
  },
  reviewsList: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.gray,
  },
  reviewService: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  readMore: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  providerResponse: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  responseText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  responseDate: {
    fontSize: 12,
    color: colors.gray,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: colors.gray,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginVertical: 16,
  },
  loadMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  writeReviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});