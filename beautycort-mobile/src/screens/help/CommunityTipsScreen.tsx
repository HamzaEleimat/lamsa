import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { Text, Card, Searchbar, Chip, ActivityIndicator, FAB, Portal, Modal, TextInput, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';

interface CommunityTip {
  id: string;
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
  author: {
    id: string;
    name: string;
    nameAr: string;
    profileImage?: string;
    location: string;
    locationAr: string;
    providerType: string;
    verified: boolean;
    rating: number;
    totalServices: number;
  };
  category: string;
  tags: string[];
  tagsAr: string[];
  likes: number;
  views: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
  featured: boolean;
  jordanSpecific: boolean;
  helpfulCount: number;
  mediaUrls?: string[];
  relatedTips?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number; // in minutes
}

interface TipComment {
  id: string;
  tipId: string;
  author: {
    id: string;
    name: string;
    nameAr: string;
    profileImage?: string;
    location: string;
    verified: boolean;
  };
  content: string;
  contentAr: string;
  likes: number;
  createdAt: string;
  replies?: TipComment[];
}

interface TipForm {
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
  category: string;
  tags: string[];
  difficulty: CommunityTip['difficulty'];
}

export default function CommunityTipsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tips, setTips] = useState<CommunityTip[]>([]);
  const [filteredTips, setFilteredTips] = useState<CommunityTip[]>([]);
  const [featuredTips, setFeaturedTips] = useState<CommunityTip[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tipForm, setTipForm] = useState<TipForm>({
    title: '',
    titleAr: '',
    content: '',
    contentAr: '',
    category: '',
    tags: [],
    difficulty: 'beginner',
  });
  const [likedTips, setLikedTips] = useState<Set<string>>(new Set());
  const [expandedTip, setExpandedTip] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All Tips', nameAr: 'جميع النصائح', icon: 'grid' },
    { id: 'marketing', name: 'Marketing', nameAr: 'التسويق', icon: 'megaphone' },
    { id: 'customer-service', name: 'Customer Service', nameAr: 'خدمة العملاء', icon: 'heart' },
    { id: 'pricing', name: 'Pricing', nameAr: 'التسعير', icon: 'pricetag' },
    { id: 'operations', name: 'Operations', nameAr: 'العمليات', icon: 'settings' },
    { id: 'growth', name: 'Growth', nameAr: 'النمو', icon: 'trending-up' },
    { id: 'local-insights', name: 'Jordan Insights', nameAr: 'رؤى أردنية', icon: 'location' },
  ];

  // Mock community tips data
  const defaultTips: CommunityTip[] = [
    {
      id: 'tip-1',
      title: 'How I Increased Bookings by 40% Using WhatsApp Business',
      titleAr: 'كيف زدت الحجوزات بنسبة 40% باستخدام واتساب بزنس',
      content: 'I started using WhatsApp Business catalog feature to showcase my work. I create albums for different services and send them to potential customers. Also, I use WhatsApp Status to post before/after photos regularly. This helped me get more bookings especially during weekends.',
      contentAr: 'بدأت باستخدام ميزة كتالوج واتساب بزنس لعرض أعمالي. أنشئ ألبومات لخدمات مختلفة وأرسلها للعملاء المحتملين. كما أستخدم حالة واتساب لنشر صور قبل وبعد بانتظام. هذا ساعدني في الحصول على المزيد من الحجوزات خاصة في عطلات نهاية الأسبوع.',
      author: {
        id: 'user-1',
        name: 'Layla Al-Zahra',
        nameAr: 'ليلى الزهراء',
        location: 'Amman, Jordan',
        locationAr: 'عمان، الأردن',
        providerType: 'Hair Salon',
        verified: true,
        rating: 4.8,
        totalServices: 15,
      },
      category: 'marketing',
      tags: ['whatsapp', 'marketing', 'bookings', 'social media'],
      tagsAr: ['واتساب', 'تسويق', 'حجوزات', 'وسائل التواصل'],
      likes: 89,
      views: 324,
      comments: 12,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      featured: true,
      jordanSpecific: true,
      helpfulCount: 76,
      difficulty: 'beginner',
      estimatedReadTime: 3,
      relatedTips: ['tip-2', 'tip-5'],
    },
    {
      id: 'tip-2',
      title: 'Ramadan Business Strategy That Doubled My Revenue',
      titleAr: 'استراتيجية عمل رمضان التي ضاعفت إيراداتي',
      content: 'During Ramadan, I adjusted my schedule to open from 11 AM to 2 PM, then 8 PM to 11 PM. I offered special Eid packages starting from mid-Ramadan. I also partnered with local Instagram influencers for Eid makeup tutorials featuring my salon. The key was understanding that customers want to look beautiful for Eid but also respect the holy month.',
      contentAr: 'خلال رمضان، عدلت جدولي للفتح من 11 صباحاً إلى 2 ظهراً، ثم من 8 مساءً إلى 11 مساءً. قدمت باقات عيد خاصة بدءاً من منتصف رمضان. تعاونت أيضاً مع مؤثرين محليين على انستغرام لدروس مكياج العيد في صالوني. المفتاح كان فهم أن العملاء يريدون أن يبدوا جميلين للعيد لكن مع احترام الشهر الكريم.',
      author: {
        id: 'user-2',
        name: 'Fatima Qasemi',
        nameAr: 'فاطمة قاسمي',
        location: 'Zarqa, Jordan',
        locationAr: 'الزرقاء، الأردن',
        providerType: 'Beauty Center',
        verified: true,
        rating: 4.9,
        totalServices: 22,
      },
      category: 'growth',
      tags: ['ramadan', 'eid', 'seasonal', 'revenue', 'strategy'],
      tagsAr: ['رمضان', 'عيد', 'موسمي', 'إيرادات', 'استراتيجية'],
      likes: 156,
      views: 567,
      comments: 28,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      featured: true,
      jordanSpecific: true,
      helpfulCount: 142,
      difficulty: 'intermediate',
      estimatedReadTime: 5,
      relatedTips: ['tip-1', 'tip-4'],
    },
    {
      id: 'tip-3',
      title: 'Handling Difficult Customers with Grace',
      titleAr: 'التعامل مع العملاء الصعبين بأناقة',
      content: 'I learned that most "difficult" customers are just stressed or having a bad day. I always greet them with genuine warmth, offer them Arabic coffee or tea, and really listen to their concerns. If they\'re upset about a service, I acknowledge their feelings first before explaining or offering solutions. This approach has turned many complainers into my most loyal customers.',
      contentAr: 'تعلمت أن معظم العملاء "الصعبين" مجرد متوترين أو يمرون بيوم سيء. أرحب بهم دائماً بدفء حقيقي، أقدم لهم قهوة عربية أو شاي، وأستمع حقاً لمخاوفهم. إذا كانوا مستائين من خدمة، أعترف بمشاعرهم أولاً قبل الشرح أو تقديم الحلول. هذا المنهج حول العديد من المشتكين إلى عملائي الأكثر إخلاصاً.',
      author: {
        id: 'user-3',
        name: 'Nour Abdallah',
        nameAr: 'نور عبدالله',
        location: 'Irbid, Jordan',
        locationAr: 'إربد، الأردن',
        providerType: 'Nail Salon',
        verified: false,
        rating: 4.7,
        totalServices: 8,
      },
      category: 'customer-service',
      tags: ['customer service', 'communication', 'hospitality', 'arabic culture'],
      tagsAr: ['خدمة العملاء', 'تواصل', 'ضيافة', 'ثقافة عربية'],
      likes: 67,
      views: 189,
      comments: 15,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      featured: false,
      jordanSpecific: true,
      helpfulCount: 58,
      difficulty: 'beginner',
      estimatedReadTime: 4,
    },
    {
      id: 'tip-4',
      title: 'Pricing Strategy for Zarqa Market',
      titleAr: 'استراتيجية التسعير لسوق الزرقاء',
      content: 'Zarqa customers are very price-conscious but appreciate quality. I offer three tiers: Basic (affordable for students), Standard (for working professionals), and Premium (for special occasions). I also offer payment plans for expensive services like hair treatments. Being transparent about prices and offering value packages helped me build trust.',
      contentAr: 'عملاء الزرقاء واعون جداً بالأسعار لكنهم يقدرون الجودة. أقدم ثلاث فئات: الأساسية (ميسورة للطلاب)، والقياسية (للمهنيين العاملين)، والمميزة (للمناسبات الخاصة). أقدم أيضاً خطط دفع للخدمات المكلفة مثل علاجات الشعر. الشفافية في الأسعار وتقديم باقات القيمة ساعدني في بناء الثقة.',
      author: {
        id: 'user-4',
        name: 'Rania Khoury',
        nameAr: 'رانيا خوري',
        location: 'Zarqa, Jordan',
        locationAr: 'الزرقاء، الأردن',
        providerType: 'Full Service Salon',
        verified: true,
        rating: 4.6,
        totalServices: 18,
      },
      category: 'pricing',
      tags: ['pricing', 'zarqa', 'value', 'tiers', 'payment plans'],
      tagsAr: ['تسعير', 'الزرقاء', 'قيمة', 'فئات', 'خطط دفع'],
      likes: 94,
      views: 278,
      comments: 19,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      featured: false,
      jordanSpecific: true,
      helpfulCount: 81,
      difficulty: 'intermediate',
      estimatedReadTime: 4,
      relatedTips: ['tip-2'],
    },
    {
      id: 'tip-5',
      title: 'Building Your Instagram Following Organically',
      titleAr: 'بناء متابعي انستغرام بشكل طبيعي',
      content: 'I post consistently every day - morning posts showing my setup, afternoon posts with work in progress, and evening posts with final results. I use location tags for Amman areas, relevant hashtags in Arabic and English, and always respond to comments quickly. Stories are great for behind-the-scenes content and polls to engage followers.',
      contentAr: 'أنشر باستمرار كل يوم - منشورات صباحية تظهر إعدادي، منشورات بعد الظهر مع العمل قيد التنفيذ، ومنشورات مسائية مع النتائج النهائية. أستخدم علامات الموقع لمناطق عمان، هاشتاغات ذات صلة بالعربية والإنجليزية، وأرد دائماً على التعليقات بسرعة. القصص رائعة لمحتوى وراء الكواليس والاستطلاعات لإشراك المتابعين.',
      author: {
        id: 'user-5',
        name: 'Maya Salim',
        nameAr: 'مايا سليم',
        location: 'Amman, Jordan',
        locationAr: 'عمان، الأردن',
        providerType: 'Makeup Artist',
        verified: true,
        rating: 4.8,
        totalServices: 12,
      },
      category: 'marketing',
      tags: ['instagram', 'social media', 'organic growth', 'content strategy'],
      tagsAr: ['انستغرام', 'وسائل التواصل', 'نمو طبيعي', 'استراتيجية المحتوى'],
      likes: 112,
      views: 445,
      comments: 22,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      featured: true,
      jordanSpecific: false,
      helpfulCount: 98,
      difficulty: 'beginner',
      estimatedReadTime: 3,
      relatedTips: ['tip-1'],
    },
  ];

  useEffect(() => {
    loadCommunityTips();
  }, []);

  useEffect(() => {
    filterTips();
  }, [tips, selectedCategory, searchQuery]);

  const loadCommunityTips = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTips(defaultTips);
      setFeaturedTips(defaultTips.filter(tip => tip.featured));
    } catch (error) {
      console.error('Error loading community tips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCommunityTips();
    setRefreshing(false);
  };

  const filterTips = () => {
    let filtered = tips;

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'local-insights') {
        filtered = filtered.filter(tip => tip.jordanSpecific);
      } else {
        filtered = filtered.filter(tip => tip.category === selectedCategory);
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tip => {
        const title = isRTL ? tip.titleAr : tip.title;
        const content = isRTL ? tip.contentAr : tip.content;
        const tags = isRTL ? tip.tagsAr : tip.tags;
        
        return title.toLowerCase().includes(query) ||
               content.toLowerCase().includes(query) ||
               tags.some(tag => tag.toLowerCase().includes(query)) ||
               tip.author.name.toLowerCase().includes(query) ||
               tip.author.location.toLowerCase().includes(query);
      });
    }

    // Sort by featured, then by likes, then by date
    filtered.sort((a, b) => {
      if (a.featured !== b.featured) return b.featured ? 1 : -1;
      if (a.likes !== b.likes) return b.likes - a.likes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setFilteredTips(filtered);
  };

  const handleLikeTip = async (tipId: string) => {
    try {
      setLikedTips(prev => {
        const newSet = new Set(prev);
        if (newSet.has(tipId)) {
          newSet.delete(tipId);
        } else {
          newSet.add(tipId);
        }
        return newSet;
      });

      // Update tip likes count
      setTips(prev => prev.map(tip => 
        tip.id === tipId 
          ? { ...tip, likes: likedTips.has(tipId) ? tip.likes - 1 : tip.likes + 1 }
          : tip
      ));
    } catch (error) {
      console.error('Error liking tip:', error);
    }
  };

  const handleShareTip = async (tip: CommunityTip) => {
    try {
      const title = isRTL ? tip.titleAr : tip.title;
      const content = isRTL ? tip.contentAr : tip.content;
      
      await Share.share({
        title: title,
        message: `${title}\n\n${content.substring(0, 200)}...\n\nShared via BeautyCort`,
        url: `https://beautycort.com/tips/${tip.id}`,
      });
    } catch (error) {
      console.error('Error sharing tip:', error);
    }
  };

  const handleCreateTip = async () => {
    if (!tipForm.title || !tipForm.content || !tipForm.category) {
      Alert.alert(t('incompleteForm'), t('pleaseFillAllFields'), [{ text: t('ok') }]);
      return;
    }

    try {
      setLoading(true);
      
      const newTip: CommunityTip = {
        id: `tip-${Date.now()}`,
        title: tipForm.title,
        titleAr: tipForm.titleAr || tipForm.title,
        content: tipForm.content,
        contentAr: tipForm.contentAr || tipForm.content,
        author: {
          id: user?.id || 'current-user',
          name: user?.name || 'Current User',
          nameAr: user?.nameAr || user?.name || 'المستخدم الحالي',
          location: user?.location || 'Amman, Jordan',
          locationAr: user?.locationAr || 'عمان، الأردن',
          providerType: user?.providerType || 'Beauty Provider',
          verified: false,
          rating: 4.5,
          totalServices: 5,
        },
        category: tipForm.category,
        tags: tipForm.tags,
        tagsAr: tipForm.tags, // Would need Arabic translation
        likes: 0,
        views: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        featured: false,
        jordanSpecific: true,
        helpfulCount: 0,
        difficulty: tipForm.difficulty,
        estimatedReadTime: Math.ceil(tipForm.content.split(' ').length / 200),
      };

      setTips(prev => [newTip, ...prev]);
      setShowCreateModal(false);
      setTipForm({
        title: '',
        titleAr: '',
        content: '',
        contentAr: '',
        category: '',
        tags: [],
        difficulty: 'beginner',
      });

      Alert.alert(
        t('tipSubmitted'),
        t('tipSubmittedMessage'),
        [{ text: t('ok') }]
      );
    } catch (error) {
      console.error('Error creating tip:', error);
      Alert.alert(t('error'), t('tipSubmissionError'), [{ text: t('ok') }]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return t('daysAgo', { days: diffDays });
    if (diffDays < 30) return t('weeksAgo', { weeks: Math.ceil(diffDays / 7) });
    return date.toLocaleDateString(isRTL ? 'ar-JO' : 'en-US');
  };

  const getDifficultyColor = (difficulty: CommunityTip['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return colors.success;
      case 'intermediate': return colors.warning;
      case 'advanced': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const renderTipCard = (tip: CommunityTip) => {
    const isExpanded = expandedTip === tip.id;
    const isLiked = likedTips.has(tip.id);

    return (
      <Card key={tip.id} style={styles.tipCard}>
        {/* Author Header */}
        <View style={styles.authorHeader}>
          <View style={styles.authorInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {(isRTL ? tip.author.nameAr : tip.author.name).charAt(0)}
              </Text>
              {tip.author.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={12} color="white" />
                </View>
              )}
            </View>
            <View style={styles.authorDetails}>
              <Text style={styles.authorName}>
                {isRTL ? tip.author.nameAr : tip.author.name}
              </Text>
              <View style={styles.authorMeta}>
                <Ionicons name="location" size={12} color={colors.text.secondary} />
                <Text style={styles.authorLocation}>
                  {isRTL ? tip.author.locationAr : tip.author.location}
                </Text>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.authorType}>{tip.author.providerType}</Text>
              </View>
            </View>
          </View>
          <View style={styles.tipMeta}>
            <Text style={styles.timeAgo}>{formatDate(tip.createdAt)}</Text>
            {tip.featured && (
              <Ionicons name="star" size={16} color={colors.warning} />
            )}
            {tip.jordanSpecific && (
              <View style={styles.jordanBadge}>
                <Text style={styles.jordanBadgeText}>JO</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tip Content */}
        <TouchableOpacity
          style={styles.tipContent}
          onPress={() => setExpandedTip(isExpanded ? null : tip.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.tipTitle}>
            {isRTL ? tip.titleAr : tip.title}
          </Text>
          <Text 
            style={styles.tipText}
            numberOfLines={isExpanded ? undefined : 3}
          >
            {isRTL ? tip.contentAr : tip.content}
          </Text>
          
          {!isExpanded && (
            <Text style={styles.readMore}>{t('readMore')}</Text>
          )}

          {/* Tags */}
          <View style={styles.tagsContainer}>
            <Chip
              mode="outlined"
              textStyle={[styles.difficultyChipText, { color: getDifficultyColor(tip.difficulty) }]}
              style={[styles.difficultyChip, { borderColor: getDifficultyColor(tip.difficulty) }]}
            >
              {t(`difficulty.${tip.difficulty}`)}
            </Chip>
            {(isRTL ? tip.tagsAr : tip.tags).slice(0, 2).map((tag, index) => (
              <Chip key={index} mode="outlined" textStyle={styles.tagText} style={styles.tagChip}>
                {tag}
              </Chip>
            ))}
            <Text style={styles.readTime}>📖 {tip.estimatedReadTime} {t('min')}</Text>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLikeTip(tip.id)}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? colors.error : colors.text.secondary}
            />
            <Text style={[styles.actionText, isLiked && { color: colors.error }]}>
              {tip.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('TipComments', { tipId: tip.id })}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} />
            <Text style={styles.actionText}>{tip.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShareTip(tip)}
          >
            <Ionicons name="share-outline" size={20} color={colors.text.secondary} />
            <Text style={styles.actionText}>{t('share')}</Text>
          </TouchableOpacity>

          <View style={styles.actionButton}>
            <Ionicons name="eye-outline" size={20} color={colors.text.secondary} />
            <Text style={styles.actionText}>{tip.views}</Text>
          </View>
        </View>
      </Card>
    );
  };

  if (loading && tips.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('loadingCommunityTips')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('communityTips')}</Text>
        <Text style={styles.headerSubtitle}>{t('communityTipsSubtitle')}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t('searchTips')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.selectedCategoryChip,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons
              name={category.icon as any}
              size={16}
              color={selectedCategory === category.id ? 'white' : colors.text.secondary}
              style={styles.categoryIcon}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText,
              ]}
            >
              {isRTL ? category.nameAr : category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tips List */}
      <ScrollView
        style={styles.tipsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredTips.length > 0 ? (
          filteredTips.map(renderTipCard)
        ) : (
          <View style={styles.noResultsContainer}>
            <Ionicons name="people" size={48} color={colors.text.secondary} />
            <Text style={styles.noResultsText}>{t('noTipsFound')}</Text>
            <Text style={styles.noResultsSubtext}>{t('beFirstToShare')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Create Tip FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowCreateModal(true)}
        label={t('shareTip')}
      />

      {/* Create Tip Modal */}
      <Portal>
        <Modal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{t('shareYourTip')}</Text>
            <Text style={styles.modalSubtitle}>{t('shareYourTipSubtitle')}</Text>

            {/* Title */}
            <Text style={styles.fieldLabel}>{t('title')} *</Text>
            <TextInput
              mode="outlined"
              value={tipForm.title}
              onChangeText={(text) => setTipForm(prev => ({ ...prev, title: text }))}
              placeholder={t('tipTitlePlaceholder')}
              style={styles.textInput}
            />

            {/* Arabic Title */}
            <Text style={styles.fieldLabel}>{t('titleArabic')}</Text>
            <TextInput
              mode="outlined"
              value={tipForm.titleAr}
              onChangeText={(text) => setTipForm(prev => ({ ...prev, titleAr: text }))}
              placeholder={t('tipTitleArabicPlaceholder')}
              style={styles.textInput}
            />

            {/* Content */}
            <Text style={styles.fieldLabel}>{t('content')} *</Text>
            <TextInput
              mode="outlined"
              value={tipForm.content}
              onChangeText={(text) => setTipForm(prev => ({ ...prev, content: text }))}
              placeholder={t('tipContentPlaceholder')}
              multiline
              numberOfLines={6}
              style={[styles.textInput, styles.textArea]}
            />

            {/* Category Selection */}
            <Text style={styles.fieldLabel}>{t('category')} *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.filter(c => c.id !== 'all').map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.modalCategoryChip,
                    tipForm.category === category.id && styles.selectedModalCategoryChip,
                  ]}
                  onPress={() => setTipForm(prev => ({ ...prev, category: category.id }))}
                >
                  <Text
                    style={[
                      styles.modalCategoryText,
                      tipForm.category === category.id && styles.selectedModalCategoryText,
                    ]}
                  >
                    {isRTL ? category.nameAr : category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Difficulty */}
            <Text style={styles.fieldLabel}>{t('difficulty')}</Text>
            <View style={styles.difficultyContainer}>
              {(['beginner', 'intermediate', 'advanced'] as const).map(difficulty => (
                <TouchableOpacity
                  key={difficulty}
                  style={[
                    styles.difficultyOption,
                    tipForm.difficulty === difficulty && styles.selectedDifficultyOption,
                    { borderColor: getDifficultyColor(difficulty) },
                  ]}
                  onPress={() => setTipForm(prev => ({ ...prev, difficulty }))}
                >
                  <Text
                    style={[
                      styles.difficultyOptionText,
                      tipForm.difficulty === difficulty && { color: getDifficultyColor(difficulty) },
                    ]}
                  >
                    {t(`difficulty.${difficulty}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowCreateModal(false)}
                style={styles.cancelButton}
              >
                {t('cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateTip}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
              >
                {t('shareTip')}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
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
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 22,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginHorizontal: 4,
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: 'white',
  },
  tipsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tipCard: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  authorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 0,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorLocation: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  separator: {
    fontSize: 12,
    color: colors.text.secondary,
    marginHorizontal: 6,
  },
  authorType: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  tipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  jordanBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  jordanBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tipContent: {
    padding: 16,
    paddingTop: 8,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    lineHeight: 24,
  },
  tipText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  readMore: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  difficultyChip: {
    height: 24,
  },
  difficultyChipText: {
    fontSize: 11,
  },
  tagChip: {
    height: 24,
  },
  tagText: {
    fontSize: 11,
  },
  readTime: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.text.secondary + '20',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 6,
    fontWeight: '500',
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary,
  },
  modalContainer: {
    margin: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '90%',
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 24,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  textArea: {
    height: 120,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  modalCategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.text.secondary + '30',
  },
  selectedModalCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalCategoryText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  selectedModalCategoryText: {
    color: 'white',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  selectedDifficultyOption: {
    backgroundColor: colors.background,
  },
  difficultyOptionText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});