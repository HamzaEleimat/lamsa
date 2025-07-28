import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Searchbar, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import HelpContentService, { HelpContent, HelpSearchResult } from '../../services/help/HelpContentService';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
  id: string;
  question: string;
  questionAr: string;
  answer: string;
  answerAr: string;
  category: string;
  tags: string[];
  tagsAr: string[];
  isPopular: boolean;
  helpfulCount: number;
  relatedFAQs?: string[];
  relatedHelpContent?: string[];
}

interface ExpandedState {
  [key: string]: boolean;
}

export default function FAQScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [filteredFAQs, setFilteredFAQs] = useState<FAQItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<ExpandedState>({});
  const [searchResults, setSearchResults] = useState<HelpSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [popularFAQs, setPopularFAQs] = useState<FAQItem[]>([]);

  const helpService = HelpContentService.getInstance();

  const categories = [
    { id: 'all', name: 'All', nameAr: 'الكل' },
    { id: 'getting-started', name: 'Getting Started', nameAr: 'البداية' },
    { id: 'service-management', name: 'Services', nameAr: 'الخدمات' },
    { id: 'payments', name: 'Payments', nameAr: 'المدفوعات' },
    { id: 'customers', name: 'Customers', nameAr: 'العملاء' },
    { id: 'technical', name: 'Technical', nameAr: 'تقني' },
    { id: 'business', name: 'Business', nameAr: 'الأعمال' },
  ];

  // Jordan market-specific FAQs
  const defaultFAQs: FAQItem[] = [
    {
      id: 'whatsapp-setup',
      question: 'How do I set up WhatsApp Business for my salon?',
      questionAr: 'كيف أقوم بإعداد واتساب بزنس لصالوني؟',
      answer: 'WhatsApp Business is essential in Jordan. Go to Profile > Notification Preferences > Enable WhatsApp notifications. Add your WhatsApp Business number in your profile so customers can contact you directly. You can also set up automated welcome messages.',
      answerAr: 'واتساب بزنس أساسي في الأردن. اذهب إلى الملف الشخصي > تفضيلات الإشعارات > فعّل إشعارات واتساب. أضف رقم واتساب بزنس في ملفك الشخصي حتى يتمكن العملاء من التواصل معك مباشرة. يمكنك أيضاً إعداد رسائل ترحيب تلقائية.',
      category: 'getting-started',
      tags: ['whatsapp', 'business', 'communication', 'setup'],
      tagsAr: ['واتساب', 'أعمال', 'تواصل', 'إعداد'],
      isPopular: true,
      helpfulCount: 456,
      relatedFAQs: ['customer-communication', 'notification-settings'],
      relatedHelpContent: ['whatsapp-business'],
    },
    {
      id: 'friday-prayer-schedule',
      question: 'How do I set up my schedule for Friday prayers?',
      questionAr: 'كيف أقوم بإعداد جدولي لصلاة الجمعة؟',
      answer: 'Go to Schedule > Working Hours > Friday. You can set automatic breaks for Friday prayers. The app will automatically block booking slots during prayer times based on Amman prayer times. You can also set custom break times.',
      answerAr: 'اذهب إلى الجدول > ساعات العمل > الجمعة. يمكنك تعيين فترات راحة تلقائية لصلاة الجمعة. التطبيق سيحجب فترات الحجز تلقائياً خلال أوقات الصلاة بناءً على أوقات صلاة عمان. يمكنك أيضاً تعيين أوقات راحة مخصصة.',
      category: 'getting-started',
      tags: ['schedule', 'friday', 'prayer', 'islam', 'working hours'],
      tagsAr: ['جدول', 'جمعة', 'صلاة', 'إسلام', 'ساعات عمل'],
      isPopular: true,
      helpfulCount: 324,
      relatedFAQs: ['working-hours', 'schedule-management'],
      relatedHelpContent: ['friday-prayer-scheduling'],
    },
    {
      id: 'pricing-zarqa',
      question: 'What are competitive prices for beauty services in Zarqa?',
      questionAr: 'ما هي الأسعار التنافسية لخدمات الجمال في الزرقاء؟',
      answer: 'Based on market research in Zarqa: Haircuts 12-25 JOD, Hair coloring 30-60 JOD, Makeup 25-80 JOD, Manicure 8-15 JOD. Consider your salon location, experience, and service quality when pricing. Check our Analytics section to see how your prices compare to similar providers.',
      answerAr: 'بناءً على أبحاث السوق في الزرقاء: قص الشعر 12-25 دينار، صبغ الشعر 30-60 دينار، المكياج 25-80 دينار، المانيكير 8-15 دينار. ضع في اعتبارك موقع صالونك وخبرتك وجودة الخدمة عند التسعير. تحقق من قسم التحليلات لترى كيف تقارن أسعارك مع مقدمي الخدمات المشابهين.',
      category: 'business',
      tags: ['pricing', 'zarqa', 'competition', 'market', 'rates'],
      tagsAr: ['تسعير', 'الزرقاء', 'منافسة', 'سوق', 'أسعار'],
      isPopular: true,
      helpfulCount: 289,
      relatedFAQs: ['service-pricing', 'market-analysis'],
      relatedHelpContent: ['zarqa-market-tips', 'pricing-strategies'],
    },
    {
      id: 'cash-payments',
      question: 'Most customers want to pay cash. How do I handle this?',
      questionAr: 'معظم العملاء يريدون الدفع نقداً. كيف أتعامل مع هذا؟',
      answer: 'Cash payments are very common in Jordan. In your service settings, make sure "Cash on Site" is enabled as a payment option. You can still track cash payments in the app for your records and analytics. Consider offering a small discount for online payments to encourage digital adoption.',
      answerAr: 'المدفوعات النقدية شائعة جداً في الأردن. في إعدادات خدمتك، تأكد من تفعيل "الدفع نقداً في الموقع" كخيار دفع. لا يزال بإمكانك تتبع المدفوعات النقدية في التطبيق لسجلاتك وتحليلاتك. فكر في تقديم خصم صغير للمدفوعات الإلكترونية لتشجيع التبني الرقمي.',
      category: 'payments',
      tags: ['cash', 'payments', 'jordan', 'customers', 'digital'],
      tagsAr: ['نقد', 'مدفوعات', 'الأردن', 'عملاء', 'رقمي'],
      isPopular: true,
      helpfulCount: 267,
      relatedFAQs: ['payment-methods', 'customer-preferences'],
    },
    {
      id: 'ramadan-schedule',
      question: 'How should I adjust my schedule during Ramadan?',
      questionAr: 'كيف يجب أن أعدل جدولي خلال رمضان؟',
      answer: 'During Ramadan, customer preferences change significantly. Many prefer appointments after Iftar (7-10 PM). Consider opening later (11 AM) and staying open later (11 PM). Enable the Ramadan schedule feature in Settings > Seasonal Schedules to automatically adjust your availability.',
      answerAr: 'خلال رمضان، تتغير تفضيلات العملاء بشكل كبير. كثيرون يفضلون المواعيد بعد الإفطار (7-10 مساءً). فكر في الفتح متأخراً (11 صباحاً) والبقاء مفتوحاً متأخراً (11 مساءً). فعّل ميزة جدول رمضان في الإعدادات > الجداول الموسمية لتعديل توفرك تلقائياً.',
      category: 'business',
      tags: ['ramadan', 'schedule', 'seasonal', 'iftar', 'timing'],
      tagsAr: ['رمضان', 'جدول', 'موسمي', 'إفطار', 'توقيت'],
      isPopular: true,
      helpfulCount: 198,
      relatedFAQs: ['seasonal-changes', 'working-hours'],
      relatedHelpContent: ['ramadan-schedule-tour'],
    },
    {
      id: 'add-services',
      question: 'How do I add my first beauty service?',
      questionAr: 'كيف أضيف خدمة الجمال الأولى؟',
      answer: 'Go to Services tab > Add Service. Fill in both Arabic and English names for better visibility. Set your price, duration, and select the category. Add clear descriptions and photos if possible. Make sure to include keywords customers would search for.',
      answerAr: 'اذهب إلى تبويب الخدمات > إضافة خدمة. املأ الأسماء بالعربية والإنجليزية لرؤية أفضل. حدد السعر والمدة واختر الفئة. أضف أوصافاً واضحة وصوراً إذا أمكن. تأكد من تضمين كلمات مفتاحية يبحث عنها العملاء.',
      category: 'service-management',
      tags: ['services', 'add', 'first time', 'setup', 'pricing'],
      tagsAr: ['خدمات', 'إضافة', 'أول مرة', 'إعداد', 'تسعير'],
      isPopular: true,
      helpfulCount: 445,
      relatedFAQs: ['service-pricing', 'service-photos'],
      relatedHelpContent: ['create-services', 'arabic-service-naming'],
    },
    {
      id: 'app-slow',
      question: 'The app is running slowly. What should I do?',
      questionAr: 'التطبيق يعمل ببطء. ماذا يجب أن أفعل؟',
      answer: 'Try these steps: 1) Close and restart the app 2) Check your internet connection 3) Clear app cache in phone settings 4) Update to the latest version 5) Restart your phone. If issues persist, contact support with your phone model and app version.',
      answerAr: 'جرب هذه الخطوات: 1) أغلق وأعد تشغيل التطبيق 2) تحقق من اتصال الإنترنت 3) امسح ذاكرة التطبيق المؤقتة في إعدادات الهاتف 4) حدّث إلى أحدث إصدار 5) أعد تشغيل هاتفك. إذا استمرت المشاكل، اتصل بالدعم مع نموذج هاتفك وإصدار التطبيق.',
      category: 'technical',
      tags: ['slow', 'performance', 'troubleshooting', 'cache', 'update'],
      tagsAr: ['بطيء', 'أداء', 'استكشاف أخطاء', 'ذاكرة مؤقتة', 'تحديث'],
      isPopular: true,
      helpfulCount: 156,
      relatedFAQs: ['app-crashes', 'internet-issues'],
      relatedHelpContent: ['app-running-slow'],
    },
    {
      id: 'customer-no-show',
      question: 'What should I do when customers don\'t show up?',
      questionAr: 'ماذا يجب أن أفعل عندما لا يحضر العملاء؟',
      answer: 'Send a polite WhatsApp message asking if they need to reschedule. Wait 15 minutes past appointment time, then mark as "No Show" in the app. You can set up automated reminder messages 1 day and 1 hour before appointments to reduce no-shows.',
      answerAr: 'أرسل رسالة واتساب مهذبة تسأل إذا كانوا بحاجة لإعادة الجدولة. انتظر 15 دقيقة بعد وقت الموعد، ثم اتمم كـ "لم يحضر" في التطبيق. يمكنك إعداد رسائل تذكير تلقائية قبل يوم وساعة من المواعيد لتقليل عدم الحضور.',
      category: 'customers',
      tags: ['no show', 'customers', 'appointments', 'reminders', 'whatsapp'],
      tagsAr: ['لم يحضر', 'عملاء', 'مواعيد', 'تذكيرات', 'واتساب'],
      isPopular: false,
      helpfulCount: 89,
      relatedFAQs: ['customer-communication', 'appointment-management'],
    },
  ];

  useEffect(() => {
    loadFAQs();
  }, []);

  useEffect(() => {
    filterFAQs();
  }, [faqs, selectedCategory, searchQuery]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      // In a real app, this would load from the help service
      setFaqs(defaultFAQs);
      setPopularFAQs(defaultFAQs.filter(faq => faq.isPopular));
    } catch (error) {
      console.error('Error loading FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterFAQs = async () => {
    let filtered = faqs;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      setIsSearching(true);
      try {
        const searchTerms = searchQuery.toLowerCase();
        filtered = filtered.filter(faq => {
          const question = isRTL ? faq.questionAr : faq.question;
          const answer = isRTL ? faq.answerAr : faq.answer;
          const tags = isRTL ? faq.tagsAr : faq.tags;
          
          return question.toLowerCase().includes(searchTerms) ||
                 answer.toLowerCase().includes(searchTerms) ||
                 tags.some(tag => tag.toLowerCase().includes(searchTerms));
        });

        // Enhanced Arabic search
        if (isRTL) {
          filtered = enhanceArabicSearch(filtered, searchQuery);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }

    setFilteredFAQs(filtered);
  };

  const enhanceArabicSearch = (faqs: FAQItem[], query: string): FAQItem[] => {
    const arabicPatterns = [
      { pattern: 'خدم', words: ['خدمة', 'خدمات', 'يخدم', 'تخدم'] },
      { pattern: 'عمل', words: ['عمل', 'أعمال', 'يعمل', 'تعمل', 'عامل'] },
      { pattern: 'زبن', words: ['زبون', 'زبائن', 'عميل', 'عملاء'] },
      { pattern: 'سعر', words: ['سعر', 'أسعار', 'تسعير', 'تسعيرة'] },
      { pattern: 'وقت', words: ['وقت', 'أوقات', 'توقيت', 'مواقيت'] },
      { pattern: 'حجز', words: ['حجز', 'حجوزات', 'محجوز', 'احجز'] },
    ];

    // Find relevant patterns
    const relevantPatterns = arabicPatterns.filter(pattern =>
      pattern.words.some(word => query.includes(word))
    );

    if (relevantPatterns.length === 0) return faqs;

    // Score FAQs based on pattern matches
    const scoredFAQs = faqs.map(faq => {
      let score = 0;
      
      for (const pattern of relevantPatterns) {
        if (faq.questionAr.includes(pattern.pattern) || 
            faq.answerAr.includes(pattern.pattern)) {
          score += 2;
        }
        
        for (const word of pattern.words) {
          if (faq.questionAr.includes(word) || faq.answerAr.includes(word)) {
            score += 1;
          }
        }
      }
      
      return { ...faq, searchScore: score };
    });

    // Sort by score and return
    return scoredFAQs
      .filter(faq => faq.searchScore > 0)
      .sort((a, b) => b.searchScore - a.searchScore);
  };

  const toggleExpanded = (faqId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems(prev => ({
      ...prev,
      [faqId]: !prev[faqId],
    }));
  };

  const handleMarkHelpful = async (faqId: string) => {
    // Update helpful count
    setFaqs(prev => prev.map(faq => 
      faq.id === faqId 
        ? { ...faq, helpfulCount: faq.helpfulCount + 1 }
        : faq
    ));
    
    // Track in analytics
    await helpService.saveUserInteraction(faqId, 'helpful');
  };

  const handleViewRelated = (relatedContentId: string) => {
    navigation.navigate('HelpContent', { contentId: relatedContentId });
  };

  const renderFAQItem = (faq: FAQItem) => {
    const isExpanded = expandedItems[faq.id];
    
    return (
      <Card key={faq.id} style={styles.faqCard}>
        <TouchableOpacity
          style={styles.faqHeader}
          onPress={() => toggleExpanded(faq.id)}
          activeOpacity={0.7}
        >
          <View style={styles.faqHeaderContent}>
            <Text style={styles.faqQuestion}>
              {isRTL ? faq.questionAr : faq.question}
            </Text>
            {faq.isPopular && (
              <Chip mode="outlined" textStyle={styles.chipText} style={styles.popularChip}>
                {t('popular')}
              </Chip>
            )}
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.faqContent}>
            <Text style={styles.faqAnswer}>
              {isRTL ? faq.answerAr : faq.answer}
            </Text>

            {/* Tags */}
            <View style={styles.tagsContainer}>
              {(isRTL ? faq.tagsAr : faq.tags).slice(0, 3).map((tag, index) => (
                <Chip key={index} mode="outlined" textStyle={styles.tagText} style={styles.tagChip}>
                  {tag}
                </Chip>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.faqActions}>
              <TouchableOpacity
                style={styles.helpfulButton}
                onPress={() => handleMarkHelpful(faq.id)}
              >
                <Ionicons name="thumbs-up" size={16} color={colors.primary} />
                <Text style={styles.helpfulText}>
                  {t('helpful')} ({faq.helpfulCount})
                </Text>
              </TouchableOpacity>

              {faq.relatedHelpContent && faq.relatedHelpContent.length > 0 && (
                <TouchableOpacity
                  style={styles.learnMoreButton}
                  onPress={() => handleViewRelated(faq.relatedHelpContent![0])}
                >
                  <Ionicons name="book" size={16} color={colors.secondary} />
                  <Text style={styles.learnMoreText}>{t('learnMore')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Related FAQs */}
            {faq.relatedFAQs && faq.relatedFAQs.length > 0 && (
              <View style={styles.relatedSection}>
                <Text style={styles.relatedTitle}>{t('relatedQuestions')}</Text>
                {faq.relatedFAQs.slice(0, 2).map(relatedId => {
                  const relatedFAQ = faqs.find(f => f.id === relatedId);
                  if (!relatedFAQ) return null;
                  
                  return (
                    <TouchableOpacity
                      key={relatedId}
                      style={styles.relatedItem}
                      onPress={() => toggleExpanded(relatedId)}
                    >
                      <Text style={styles.relatedText}>
                        {isRTL ? relatedFAQ.questionAr : relatedFAQ.question}
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.text.secondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('loadingFAQ')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('frequentlyAskedQuestions')}</Text>
        <Text style={styles.headerSubtitle}>{t('faqSubtitle')}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t('searchFAQ')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
          loading={isSearching}
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

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredFAQs.length} {t('questionsFound')}
        </Text>
      </View>

      {/* FAQ List */}
      <ScrollView style={styles.faqList} showsVerticalScrollIndicator={false}>
        {filteredFAQs.length > 0 ? (
          filteredFAQs.map(renderFAQItem)
        ) : (
          <View style={styles.noResultsContainer}>
            <Ionicons name="help-circle" size={48} color={colors.text.secondary} />
            <Text style={styles.noResultsText}>{t('noFAQsFound')}</Text>
            <Text style={styles.noResultsSubtext}>{t('tryDifferentSearch')}</Text>
            
            <TouchableOpacity
              style={styles.contactSupportButton}
              onPress={() => navigation.navigate('SupportScreen')}
            >
              <Ionicons name="headset" size={20} color="white" />
              <Text style={styles.contactSupportText}>{t('contactSupport')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    marginBottom: 16,
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
  resultsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  faqList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  faqCard: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  faqHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 22,
    marginRight: 12,
  },
  popularChip: {
    height: 28,
  },
  chipText: {
    fontSize: 11,
  },
  faqContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tagChip: {
    height: 24,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 10,
  },
  faqActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
  },
  helpfulText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.secondary + '15',
    borderRadius: 8,
  },
  learnMoreText: {
    fontSize: 12,
    color: colors.secondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  relatedSection: {
    borderTopWidth: 1,
    borderTopColor: colors.text.secondary + '20',
    paddingTop: 12,
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  relatedText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
    marginRight: 8,
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
    marginBottom: 24,
  },
  contactSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactSupportText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});