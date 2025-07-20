import { Provider } from '../types';
import { Platform, Share } from 'react-native';

interface ShareContent {
  title: string;
  message: string;
  url: string;
  hashtags?: string[];
}

/**
 * Generate optimized share content for different platforms
 */
export const generateShareContent = (
  provider: Provider,
  profileUrl: string,
  language: 'ar' | 'en',
  platform?: 'whatsapp' | 'instagram' | 'facebook' | 'twitter' | 'generic'
): ShareContent => {
  const isRTL = language === 'ar';
  const businessName = isRTL ? provider.businessNameAr || provider.businessName : provider.businessName;
  const cityName = provider.city;

  // Base content
  const baseContent: ShareContent = {
    title: businessName,
    message: '',
    url: profileUrl,
    hashtags: ['Lamsa', 'BeautyJordan', cityName.replace(/\s+/g, '')],
  };

  // Platform-specific content
  switch (platform) {
    case 'whatsapp':
      baseContent.message = isRTL
        ? `✨ ${businessName} ✨\n\n📍 ${cityName}\n⭐ ${provider.rating.toFixed(1)} (${provider.totalReviews} تقييم)\n\n🔗 ${profileUrl}\n\n#Lamsa #جمال_الأردن`
        : `✨ ${businessName} ✨\n\n📍 ${cityName}\n⭐ ${provider.rating.toFixed(1)} (${provider.totalReviews} reviews)\n\n🔗 ${profileUrl}\n\n#Lamsa #BeautyJordan`;
      break;

    case 'instagram':
      // Instagram doesn't support direct link sharing, optimize for caption
      baseContent.message = isRTL
        ? `${businessName} 💅✨\n\n📍 ${cityName}\n⭐ ${provider.rating.toFixed(1)}/5\n\n${provider.bioAr || provider.bio || 'احجزي موعدك الآن!'}\n\n🔗 الرابط في البايو\n\n#Lamsa #صالون_تجميل #${cityName} #جمال_الأردن`
        : `${businessName} 💅✨\n\n📍 ${cityName}\n⭐ ${provider.rating.toFixed(1)}/5\n\n${provider.bio || 'Book your appointment now!'}\n\n🔗 Link in bio\n\n#Lamsa #BeautySalon #${cityName} #BeautyJordan`;
      break;

    case 'facebook':
      baseContent.message = isRTL
        ? `اكتشفي ${businessName} في ${cityName}! ⭐ ${provider.rating.toFixed(1)}/5\n\nاحجزي موعدك الآن على Lamsa`
        : `Discover ${businessName} in ${cityName}! ⭐ ${provider.rating.toFixed(1)}/5\n\nBook your appointment now on Lamsa`;
      break;

    case 'twitter':
      // Twitter has character limits
      const twitterHashtags = baseContent.hashtags?.slice(0, 3).map(tag => `#${tag}`).join(' ') || '';
      baseContent.message = isRTL
        ? `${businessName} في ${cityName} ⭐ ${provider.rating.toFixed(1)}/5\n\n${twitterHashtags}`
        : `${businessName} in ${cityName} ⭐ ${provider.rating.toFixed(1)}/5\n\n${twitterHashtags}`;
      break;

    default:
      // Generic share content
      baseContent.message = isRTL
        ? `تعرفي على ${businessName} في ${cityName}!\n\n⭐ تقييم ${provider.rating.toFixed(1)} من ${provider.totalReviews} زبونة\n📱 احجزي موعدك مباشرة\n\n${profileUrl}`
        : `Check out ${businessName} in ${cityName}!\n\n⭐ ${provider.rating.toFixed(1)} rating from ${provider.totalReviews} customers\n📱 Book your appointment directly\n\n${profileUrl}`;
  }

  return baseContent;
};

/**
 * Share provider profile using native share dialog
 */
export const shareProviderProfile = async (
  provider: Provider,
  profileUrl: string,
  language: 'ar' | 'en'
): Promise<void> => {
  const content = generateShareContent(provider, profileUrl, language, 'generic');
  
  try {
    const result = await Share.share(
      {
        message: content.message,
        url: content.url, // iOS only
        title: content.title, // Android only
      },
      {
        dialogTitle: content.title, // Android only
        subject: content.title, // iOS Mail app
      }
    );

    if (result.action === Share.sharedAction) {
      if (result.activityType) {
        // iOS - shared with activity type
        console.log('Shared with activity:', result.activityType);
      } else {
        // Android - shared
        console.log('Profile shared successfully');
      }
    }
  } catch (error) {
    console.error('Error sharing profile:', error);
    throw error;
  }
};

/**
 * Generate deep link for provider profile
 */
export const generateProviderDeepLink = (
  providerId: string,
  providerSlug?: string,
  source?: string
): string => {
  const baseUrl = 'lamsa://provider/';
  const webUrl = 'https://lamsa.com/provider/';
  
  if (Platform.OS === 'web') {
    return `${webUrl}${providerSlug || providerId}${source ? `?utm_source=${source}` : ''}`;
  }
  
  return `${baseUrl}${providerId}${source ? `?source=${source}` : ''}`;
};

/**
 * Track share analytics
 */
export const trackShareEvent = (
  providerId: string,
  platform: string,
  method: string
): void => {
  // Implement analytics tracking here
  console.log('Share event:', {
    providerId,
    platform,
    method,
    timestamp: new Date().toISOString(),
  });
};