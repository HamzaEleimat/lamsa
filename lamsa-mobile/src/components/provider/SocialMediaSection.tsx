import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import InstagramFeed from './InstagramFeed';

interface SocialMediaLink {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'snapchat' | 'youtube';
  username?: string;
  url?: string;
  verified?: boolean;
}

interface SocialMediaSectionProps {
  socialLinks?: SocialMediaLink[];
  instagramToken?: string;
  showInstagramFeed?: boolean;
}

export default function SocialMediaSection({
  socialLinks = [],
  instagramToken,
  showInstagramFeed = true,
}: SocialMediaSectionProps) {
  const { t } = useTranslation();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram');

  const platformConfig = {
    instagram: {
      icon: 'logo-instagram',
      color: '#E4405F',
      baseUrl: 'https://www.instagram.com/',
      appUrl: (username: string) => `instagram://user?username=${username}`,
    },
    facebook: {
      icon: 'logo-facebook',
      color: '#1877F2',
      baseUrl: 'https://www.facebook.com/',
      appUrl: (username: string) => `fb://profile/${username}`,
    },
    tiktok: {
      icon: 'logo-tiktok',
      color: '#000000',
      baseUrl: 'https://www.tiktok.com/@',
      appUrl: (username: string) => `tiktok://user?username=${username}`,
    },
    snapchat: {
      icon: 'logo-snapchat',
      color: '#FFFC00',
      baseUrl: 'https://www.snapchat.com/add/',
      appUrl: (username: string) => `snapchat://add/${username}`,
    },
    youtube: {
      icon: 'logo-youtube',
      color: '#FF0000',
      baseUrl: 'https://www.youtube.com/c/',
      appUrl: (username: string) => `youtube://channel/${username}`,
    },
  };

  const handleSocialLinkPress = (link: SocialMediaLink) => {
    const config = platformConfig[link.platform];
    if (!config) return;

    const url = link.url || (link.username && config.appUrl(link.username));
    if (!url) return;

    Linking.openURL(url).catch(() => {
      // Fallback to web URL
      const webUrl = link.url || `${config.baseUrl}${link.username}`;
      Linking.openURL(webUrl);
    });
  };

  const renderSocialLinks = () => {
    if (socialLinks.length === 0) return null;

    return (
      <View style={styles.socialLinksContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.socialLinksScroll}
        >
          {socialLinks.map((link, index) => {
            const config = platformConfig[link.platform];
            if (!config) return null;

            const isSelected = selectedPlatform === link.platform;

            return (
              <TouchableOpacity
                key={`${link.platform}-${index}`}
                style={[
                  styles.socialLinkButton,
                  isSelected && styles.selectedSocialLink,
                ]}
                onPress={() => {
                  setSelectedPlatform(link.platform);
                  if (!showInstagramFeed || link.platform !== 'instagram') {
                    handleSocialLinkPress(link);
                  }
                }}
              >
                <View
                  style={[
                    styles.socialIconContainer,
                    { backgroundColor: config.color + '20' },
                  ]}
                >
                  <Ionicons
                    name={config.icon as any}
                    size={24}
                    color={config.color}
                  />
                  {link.verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={colors.primary}
                      />
                    </View>
                  )}
                </View>
                <Text style={styles.socialUsername}>
                  @{link.username || link.platform}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const instagramLink = socialLinks.find(link => link.platform === 'instagram');
  const showFeed = showInstagramFeed && selectedPlatform === 'instagram' && instagramLink;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('socialMedia')}</Text>
        <Text style={styles.headerSubtitle}>{t('followOurWork')}</Text>
      </View>

      {renderSocialLinks()}

      {showFeed && (
        <View style={styles.feedContainer}>
          <InstagramFeed
            instagramUsername={instagramLink.username}
            instagramToken={instagramToken}
            maxPosts={9}
          />
        </View>
      )}

      {!showFeed && socialLinks.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="share-social" size={48} color={colors.gray} />
          <Text style={styles.emptyText}>{t('noSocialMediaLinked')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  socialLinksContainer: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  socialLinksScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  socialLinkButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
  },
  selectedSocialLink: {
    backgroundColor: colors.lightPrimary,
  },
  socialIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.white,
    borderRadius: 7,
    padding: 1,
  },
  socialUsername: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  feedContainer: {
    flex: 1,
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
});