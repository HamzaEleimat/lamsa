import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Provider } from '../../types';

interface ProviderMetaTagsProps {
  provider: Provider;
  profileUrl: string;
  language: 'ar' | 'en';
}

/**
 * Component to manage SEO meta tags for provider profiles
 * Note: This mainly works for React Native Web. 
 * For mobile apps, these tags would be used when sharing links.
 */
export default function ProviderMetaTags({
  provider,
  profileUrl,
  language,
}: ProviderMetaTagsProps) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Dynamic meta tag injection for web platform
    const updateMetaTags = () => {
      const isRTL = language === 'ar';
      const businessName = isRTL ? provider.businessNameAr || provider.businessName : provider.businessName;
      const description = isRTL ? provider.bioAr || provider.bio : provider.bio;
      
      // Update page title
      document.title = `${businessName} - BeautyCort ${provider.city}`;

      // Helper function to update or create meta tags
      const setMetaTag = (property: string, content: string, isProperty = false) => {
        const attributeName = isProperty ? 'property' : 'name';
        let element = document.querySelector(`meta[${attributeName}="${property}"]`);
        
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute(attributeName, property);
          document.head.appendChild(element);
        }
        
        element.setAttribute('content', content);
      };

      // Basic SEO meta tags
      setMetaTag('description', description || `${businessName} - Beauty services in ${provider.city}, Jordan. Book appointments online.`);
      setMetaTag('keywords', `${businessName}, beauty salon, ${provider.city}, Jordan, beauty services, حجز صالون, صالون تجميل`);
      setMetaTag('author', 'BeautyCort');
      setMetaTag('robots', 'index, follow');
      setMetaTag('language', language);

      // Open Graph meta tags
      setMetaTag('og:title', `${businessName} - BeautyCort`, true);
      setMetaTag('og:description', description || `Professional beauty services in ${provider.city}. ⭐ ${provider.rating.toFixed(1)} rating from ${provider.totalReviews} reviews.`, true);
      setMetaTag('og:type', 'business.business', true);
      setMetaTag('og:url', profileUrl, true);
      setMetaTag('og:image', provider.coverImageUrl || provider.avatarUrl || 'https://beautycort.com/images/default-salon.jpg', true);
      setMetaTag('og:site_name', 'BeautyCort', true);
      setMetaTag('og:locale', language === 'ar' ? 'ar_JO' : 'en_US', true);

      // Business-specific Open Graph tags
      setMetaTag('business:contact_data:street_address', provider.address, true);
      setMetaTag('business:contact_data:locality', provider.city, true);
      setMetaTag('business:contact_data:country_name', 'Jordan', true);
      setMetaTag('business:contact_data:phone_number', `+962${provider.phone}`, true);
      
      // Twitter Card meta tags
      setMetaTag('twitter:card', 'summary_large_image');
      setMetaTag('twitter:title', `${businessName} - BeautyCort`);
      setMetaTag('twitter:description', description || `Beauty services in ${provider.city}. Book your appointment now!`);
      setMetaTag('twitter:image', provider.coverImageUrl || provider.avatarUrl || 'https://beautycort.com/images/default-salon.jpg');
      setMetaTag('twitter:site', '@beautycort');

      // Geo meta tags for local SEO
      setMetaTag('geo.region', 'JO');
      setMetaTag('geo.placename', provider.city);
      setMetaTag('geo.position', `${provider.location.latitude};${provider.location.longitude}`);
      setMetaTag('ICBM', `${provider.location.latitude}, ${provider.location.longitude}`);

      // Schema.org structured data
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'BeautySalon',
        name: businessName,
        description: description,
        url: profileUrl,
        telephone: `+962${provider.phone}`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: provider.address,
          addressLocality: provider.city,
          addressCountry: 'JO',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: provider.location.latitude,
          longitude: provider.location.longitude,
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: provider.rating.toFixed(1),
          reviewCount: provider.totalReviews,
          bestRating: '5',
          worstRating: '1',
        },
        priceRange: '$$',
        openingHours: generateOpeningHours(provider.workingHours),
        image: [
          provider.coverImageUrl,
          provider.avatarUrl,
        ].filter(Boolean),
        sameAs: provider.socialLinks?.map(link => {
          const baseUrls: Record<string, string> = {
            instagram: 'https://www.instagram.com/',
            facebook: 'https://www.facebook.com/',
            tiktok: 'https://www.tiktok.com/@',
            youtube: 'https://www.youtube.com/c/',
          };
          return link.url || `${baseUrls[link.platform]}${link.username}`;
        }).filter(Boolean) || [],
      };

      // Inject or update structured data
      let scriptElement = document.querySelector('script[type="application/ld+json"]');
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      scriptElement.textContent = JSON.stringify(structuredData);

      // Mobile app deep linking
      setMetaTag('al:ios:app_store_id', '1234567890'); // Replace with actual app ID
      setMetaTag('al:ios:url', `beautycort://provider/${provider.id}`);
      setMetaTag('al:android:package', 'com.beautycort.app');
      setMetaTag('al:android:url', `beautycort://provider/${provider.id}`);
      setMetaTag('al:web:url', profileUrl);
    };

    updateMetaTags();

    // Cleanup function
    return () => {
      // Reset title on unmount
      document.title = 'BeautyCort - Beauty at Your Fingertips';
    };
  }, [provider, profileUrl, language]);

  // Generate opening hours in Schema.org format
  const generateOpeningHours = (workingHours?: any): string[] => {
    if (!workingHours) return [];
    
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const openingHours: string[] = [];
    
    Object.entries(workingHours).forEach(([day, hours]: [string, any]) => {
      if (hours.isOpen) {
        openingHours.push(`${dayNames[parseInt(day)]} ${hours.openTime}-${hours.closeTime}`);
      }
    });
    
    return openingHours;
  };

  // For mobile platforms, return null as meta tags are handled differently
  if (Platform.OS !== 'web') {
    return null;
  }

  // For web platform, the component doesn't render anything visible
  return null;
}

/**
 * Hook to generate shareable metadata for provider profiles
 * This can be used when sharing links on social media
 */
export const useProviderShareMetadata = (
  provider: Provider,
  profileUrl: string,
  language: 'ar' | 'en'
) => {
  const isRTL = language === 'ar';
  const businessName = isRTL ? provider.businessNameAr || provider.businessName : provider.businessName;
  const description = isRTL ? provider.bioAr || provider.bio : provider.bio;

  return {
    title: `${businessName} - BeautyCort`,
    description: description || `Beauty services in ${provider.city}. ⭐ ${provider.rating.toFixed(1)} rating`,
    image: provider.coverImageUrl || provider.avatarUrl,
    url: profileUrl,
    hashtags: ['BeautyCort', 'BeautyJordan', businessName.replace(/\s+/g, '')],
    via: 'beautycort',
  };
};