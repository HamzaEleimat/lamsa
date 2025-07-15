import AsyncStorage from '@react-native-async-storage/async-storage';

// Help content types
export interface HelpContent {
  id: string;
  type: 'faq' | 'guide' | 'tutorial' | 'troubleshooting' | 'best-practice';
  category: string;
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
  tags: string[];
  tagsAr: string[];
  priority: number;
  lastUpdated: string;
  videoUrl?: string;
  images?: string[];
  relatedContent?: string[];
  isPopular?: boolean;
  viewCount?: number;
  helpfulCount?: number;
}

export interface HelpCategory {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  descriptionAr: string;
  color: string;
  order: number;
  contentCount: number;
}

export interface HelpSearchResult {
  content: HelpContent;
  relevanceScore: number;
  matchedTerms: string[];
}

export interface UserHelpProgress {
  userId: string;
  completedTours: string[];
  viewedContent: string[];
  bookmarkedContent: string[];
  lastHelpAccess: string;
  helpPreferences: {
    language: 'ar' | 'en';
    showTooltips: boolean;
    autoplayVideos: boolean;
    offlineDownloads: boolean;
  };
}

class HelpContentService {
  private static instance: HelpContentService;
  private helpContent: HelpContent[] = [];
  private categories: HelpCategory[] = [];
  private userProgress: UserHelpProgress | null = null;

  private constructor() {
    this.initializeDefaultContent();
  }

  public static getInstance(): HelpContentService {
    if (!HelpContentService.instance) {
      HelpContentService.instance = new HelpContentService();
    }
    return HelpContentService.instance;
  }

  private initializeDefaultContent() {
    // Initialize with Jordan market-specific help content
    this.categories = [
      {
        id: 'getting-started',
        name: 'Getting Started',
        nameAr: 'البداية',
        icon: 'play-circle',
        description: 'Essential steps to get your business up and running',
        descriptionAr: 'الخطوات الأساسية لبدء عملك وتشغيله',
        color: '#4CAF50',
        order: 1,
        contentCount: 12,
      },
      {
        id: 'service-management',
        name: 'Service Management',
        nameAr: 'إدارة الخدمات',
        icon: 'cut',
        description: 'Managing your services, pricing, and packages',
        descriptionAr: 'إدارة خدماتك وأسعارك وباقاتك',
        color: '#2196F3',
        order: 2,
        contentCount: 18,
      },
      {
        id: 'customer-communication',
        name: 'Customer Communication',
        nameAr: 'التواصل مع العملاء',
        icon: 'chatbubbles',
        description: 'Best practices for customer interaction',
        descriptionAr: 'أفضل الممارسات للتفاعل مع العملاء',
        color: '#FF9800',
        order: 3,
        contentCount: 15,
      },
      {
        id: 'payments-pricing',
        name: 'Payments & Pricing',
        nameAr: 'المدفوعات والأسعار',
        icon: 'card',
        description: 'Managing payments and competitive pricing',
        descriptionAr: 'إدارة المدفوعات والتسعير التنافسي',
        color: '#9C27B0',
        order: 4,
        contentCount: 10,
      },
      {
        id: 'schedule-management',
        name: 'Schedule Management',
        nameAr: 'إدارة المواعيد',
        icon: 'calendar',
        description: 'Scheduling, availability, and time management',
        descriptionAr: 'الجدولة والتوفر وإدارة الوقت',
        color: '#F44336',
        order: 5,
        contentCount: 14,
      },
      {
        id: 'business-growth',
        name: 'Business Growth',
        nameAr: 'تنمية الأعمال',
        icon: 'trending-up',
        description: 'Marketing, analytics, and growth strategies',
        descriptionAr: 'التسويق والتحليلات واستراتيجيات النمو',
        color: '#607D8B',
        order: 6,
        contentCount: 16,
      },
      {
        id: 'technical-issues',
        name: 'Technical Issues',
        nameAr: 'المشاكل التقنية',
        icon: 'build',
        description: 'Troubleshooting and technical support',
        descriptionAr: 'استكشاف الأخطاء والدعم التقني',
        color: '#795548',
        order: 7,
        contentCount: 8,
      },
    ];

    this.helpContent = this.generateDefaultHelpContent();
  }

  private generateDefaultHelpContent(): HelpContent[] {
    return [
      // Getting Started Content
      {
        id: 'welcome-to-beautycort',
        type: 'guide',
        category: 'getting-started',
        title: 'Welcome to BeautyCort',
        titleAr: 'أهلاً بك في بيوتي كورت',
        content: 'Complete guide to getting started with your beauty business on BeautyCort platform.',
        contentAr: 'دليل شامل للبدء بعملك في مجال الجمال على منصة بيوتي كورت.',
        tags: ['onboarding', 'welcome', 'basics'],
        tagsAr: ['تأهيل', 'ترحيب', 'أساسيات'],
        priority: 10,
        lastUpdated: new Date().toISOString(),
        isPopular: true,
        viewCount: 2450,
        helpfulCount: 1890,
        relatedContent: ['setup-profile', 'add-first-service'],
      },
      {
        id: 'setup-profile',
        type: 'tutorial',
        category: 'getting-started',
        title: 'Setting Up Your Profile',
        titleAr: 'إعداد ملفك الشخصي',
        content: 'Step-by-step guide to create an attractive and professional profile.',
        contentAr: 'دليل خطوة بخطوة لإنشاء ملف شخصي جذاب ومهني.',
        tags: ['profile', 'setup', 'photos', 'description'],
        tagsAr: ['ملف شخصي', 'إعداد', 'صور', 'وصف'],
        priority: 9,
        lastUpdated: new Date().toISOString(),
        videoUrl: 'https://example.com/videos/setup-profile-ar.mp4',
        isPopular: true,
        viewCount: 1875,
        helpfulCount: 1456,
        relatedContent: ['add-photos', 'write-description'],
      },
      {
        id: 'zarqa-market-tips',
        type: 'best-practice',
        category: 'getting-started',
        title: 'Succeeding in Zarqa Beauty Market',
        titleAr: 'النجاح في سوق الجمال في الزرقاء',
        content: 'Local insights and strategies for beauty providers in Zarqa and surrounding areas.',
        contentAr: 'رؤى وإستراتيجيات محلية لمقدمي خدمات الجمال في الزرقاء والمناطق المحيطة.',
        tags: ['zarqa', 'local', 'market', 'competition', 'pricing'],
        tagsAr: ['الزرقاء', 'محلي', 'سوق', 'منافسة', 'تسعير'],
        priority: 8,
        lastUpdated: new Date().toISOString(),
        isPopular: true,
        viewCount: 1243,
        helpfulCount: 987,
      },
      
      // Service Management Content
      {
        id: 'create-services',
        type: 'tutorial',
        category: 'service-management',
        title: 'Creating Your First Services',
        titleAr: 'إنشاء خدماتك الأولى',
        content: 'Learn how to add services with proper pricing and descriptions.',
        contentAr: 'تعلم كيفية إضافة الخدمات مع التسعير والأوصاف المناسبة.',
        tags: ['services', 'pricing', 'descriptions', 'categories'],
        tagsAr: ['خدمات', 'تسعير', 'أوصاف', 'فئات'],
        priority: 9,
        lastUpdated: new Date().toISOString(),
        videoUrl: 'https://example.com/videos/create-services-ar.mp4',
        isPopular: true,
        viewCount: 2156,
        helpfulCount: 1678,
        relatedContent: ['pricing-strategies', 'service-photos'],
      },
      {
        id: 'arabic-service-naming',
        type: 'best-practice',
        category: 'service-management',
        title: 'Best Practices for Arabic Service Names',
        titleAr: 'أفضل الممارسات لأسماء الخدمات بالعربية',
        content: 'Guidelines for creating clear and attractive Arabic service names.',
        contentAr: 'إرشادات لإنشاء أسماء خدمات عربية واضحة وجذابة.',
        tags: ['arabic', 'naming', 'language', 'seo'],
        tagsAr: ['عربي', 'تسمية', 'لغة', 'تحسين البحث'],
        priority: 7,
        lastUpdated: new Date().toISOString(),
        viewCount: 876,
        helpfulCount: 623,
      },

      // Customer Communication Content
      {
        id: 'whatsapp-business',
        type: 'tutorial',
        category: 'customer-communication',
        title: 'Using WhatsApp for Business',
        titleAr: 'استخدام واتساب للأعمال',
        content: 'Leverage WhatsApp Business features for better customer communication.',
        contentAr: 'استخدم ميزات واتساب بزنس للتواصل الأفضل مع العملاء.',
        tags: ['whatsapp', 'communication', 'business', 'messaging'],
        tagsAr: ['واتساب', 'تواصل', 'أعمال', 'مراسلة'],
        priority: 9,
        lastUpdated: new Date().toISOString(),
        videoUrl: 'https://example.com/videos/whatsapp-business-ar.mp4',
        isPopular: true,
        viewCount: 3201,
        helpfulCount: 2567,
        relatedContent: ['customer-service', 'automated-responses'],
      },
      {
        id: 'friday-prayer-scheduling',
        type: 'guide',
        category: 'schedule-management',
        title: 'Managing Friday Prayer Times',
        titleAr: 'إدارة أوقات صلاة الجمعة',
        content: 'How to automatically adjust your schedule for Friday prayers.',
        contentAr: 'كيفية تعديل جدولك تلقائياً لأوقات صلاة الجمعة.',
        tags: ['friday', 'prayer', 'schedule', 'islam', 'culture'],
        tagsAr: ['جمعة', 'صلاة', 'جدول', 'إسلام', 'ثقافة'],
        priority: 8,
        lastUpdated: new Date().toISOString(),
        isPopular: true,
        viewCount: 1654,
        helpfulCount: 1345,
      },

      // Troubleshooting Content
      {
        id: 'app-running-slow',
        type: 'troubleshooting',
        category: 'technical-issues',
        title: 'App Running Slowly',
        titleAr: 'التطبيق يعمل ببطء',
        content: 'Steps to improve app performance and resolve slow loading issues.',
        contentAr: 'خطوات لتحسين أداء التطبيق وحل مشاكل التحميل البطيء.',
        tags: ['performance', 'slow', 'loading', 'technical'],
        tagsAr: ['أداء', 'بطء', 'تحميل', 'تقني'],
        priority: 6,
        lastUpdated: new Date().toISOString(),
        viewCount: 543,
        helpfulCount: 367,
      },
    ];
  }

  // Content retrieval methods
  public async getCategories(): Promise<HelpCategory[]> {
    return this.categories.sort((a, b) => a.order - b.order);
  }

  public async getContentByCategory(categoryId: string): Promise<HelpContent[]> {
    return this.helpContent
      .filter(content => content.category === categoryId)
      .sort((a, b) => b.priority - a.priority);
  }

  public async getPopularContent(): Promise<HelpContent[]> {
    return this.helpContent
      .filter(content => content.isPopular)
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 10);
  }

  public async getContentById(id: string): Promise<HelpContent | null> {
    const content = this.helpContent.find(c => c.id === id);
    if (content) {
      // Increment view count
      content.viewCount = (content.viewCount || 0) + 1;
      await this.saveUserInteraction(id, 'view');
    }
    return content || null;
  }

  public async getRelatedContent(contentId: string): Promise<HelpContent[]> {
    const content = await this.getContentById(contentId);
    if (!content || !content.relatedContent) return [];

    return this.helpContent.filter(c => 
      content.relatedContent!.includes(c.id)
    );
  }

  // Search functionality
  public async searchContent(query: string, language: 'ar' | 'en' = 'ar'): Promise<HelpSearchResult[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const results: HelpSearchResult[] = [];

    for (const content of this.helpContent) {
      let relevanceScore = 0;
      const matchedTerms: string[] = [];

      // Search in title
      const title = language === 'ar' ? content.titleAr : content.title;
      if (title.toLowerCase().includes(normalizedQuery)) {
        relevanceScore += 10;
        matchedTerms.push('title');
      }

      // Search in content
      const contentText = language === 'ar' ? content.contentAr : content.content;
      if (contentText.toLowerCase().includes(normalizedQuery)) {
        relevanceScore += 5;
        matchedTerms.push('content');
      }

      // Search in tags
      const tags = language === 'ar' ? content.tagsAr : content.tags;
      for (const tag of tags) {
        if (tag.toLowerCase().includes(normalizedQuery)) {
          relevanceScore += 3;
          matchedTerms.push(`tag: ${tag}`);
        }
      }

      // Arabic-specific search enhancements
      if (language === 'ar') {
        relevanceScore += this.calculateArabicRelevance(normalizedQuery, content);
      }

      // Boost popular content
      if (content.isPopular) {
        relevanceScore += 2;
      }

      if (relevanceScore > 0) {
        results.push({
          content,
          relevanceScore,
          matchedTerms,
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private calculateArabicRelevance(query: string, content: HelpContent): number {
    // Simple Arabic root matching (could be enhanced with proper Arabic NLP)
    const arabicPatterns = [
      { pattern: 'خدم', words: ['خدمة', 'خدمات', 'يخدم'] },
      { pattern: 'عمل', words: ['عمل', 'أعمال', 'يعمل'] },
      { pattern: 'زبن', words: ['زبون', 'زبائن', 'عميل'] },
      { pattern: 'سعر', words: ['سعر', 'أسعار', 'تسعير'] },
    ];

    let score = 0;
    for (const pattern of arabicPatterns) {
      if (pattern.words.some(word => query.includes(word))) {
        if (content.contentAr.includes(pattern.pattern) || 
            content.titleAr.includes(pattern.pattern)) {
          score += 2;
        }
      }
    }

    return score;
  }

  // User progress tracking
  public async getUserProgress(userId: string): Promise<UserHelpProgress> {
    if (!this.userProgress || this.userProgress.userId !== userId) {
      try {
        const stored = await AsyncStorage.getItem(`help_progress_${userId}`);
        this.userProgress = stored ? JSON.parse(stored) : {
          userId,
          completedTours: [],
          viewedContent: [],
          bookmarkedContent: [],
          lastHelpAccess: new Date().toISOString(),
          helpPreferences: {
            language: 'ar',
            showTooltips: true,
            autoplayVideos: false,
            offlineDownloads: true,
          },
        };
      } catch (error) {
        console.error('Error loading user help progress:', error);
        this.userProgress = {
          userId,
          completedTours: [],
          viewedContent: [],
          bookmarkedContent: [],
          lastHelpAccess: new Date().toISOString(),
          helpPreferences: {
            language: 'ar',
            showTooltips: true,
            autoplayVideos: false,
            offlineDownloads: true,
          },
        };
      }
    }
    return this.userProgress;
  }

  public async updateUserProgress(userId: string, updates: Partial<UserHelpProgress>): Promise<void> {
    const progress = await this.getUserProgress(userId);
    this.userProgress = { ...progress, ...updates };
    
    try {
      await AsyncStorage.setItem(
        `help_progress_${userId}`,
        JSON.stringify(this.userProgress)
      );
    } catch (error) {
      console.error('Error saving user help progress:', error);
    }
  }

  public async markTourCompleted(userId: string, tourId: string): Promise<void> {
    const progress = await this.getUserProgress(userId);
    if (!progress.completedTours.includes(tourId)) {
      progress.completedTours.push(tourId);
      await this.updateUserProgress(userId, progress);
    }
  }

  public async saveUserInteraction(contentId: string, type: 'view' | 'helpful' | 'bookmark'): Promise<void> {
    // This would typically be sent to analytics service
    console.log(`User interaction: ${type} on content ${contentId}`);
  }

  public async toggleBookmark(userId: string, contentId: string): Promise<boolean> {
    const progress = await this.getUserProgress(userId);
    const isBookmarked = progress.bookmarkedContent.includes(contentId);
    
    if (isBookmarked) {
      progress.bookmarkedContent = progress.bookmarkedContent.filter(id => id !== contentId);
    } else {
      progress.bookmarkedContent.push(contentId);
    }
    
    await this.updateUserProgress(userId, progress);
    return !isBookmarked;
  }

  public async getBookmarkedContent(userId: string): Promise<HelpContent[]> {
    const progress = await this.getUserProgress(userId);
    return this.helpContent.filter(content => 
      progress.bookmarkedContent.includes(content.id)
    );
  }

  // Content management
  public async markContentHelpful(contentId: string): Promise<void> {
    const content = this.helpContent.find(c => c.id === contentId);
    if (content) {
      content.helpfulCount = (content.helpfulCount || 0) + 1;
      await this.saveUserInteraction(contentId, 'helpful');
    }
  }

  public async suggestContent(userContext: {
    currentScreen?: string;
    userProgress?: UserHelpProgress;
    recentActions?: string[];
  }): Promise<HelpContent[]> {
    const { currentScreen, userProgress, recentActions } = userContext;
    let suggestions: HelpContent[] = [];

    // Context-based suggestions
    if (currentScreen) {
      const contextMapping: Record<string, string[]> = {
        'ServiceFormScreen': ['create-services', 'arabic-service-naming', 'pricing-strategies'],
        'ProviderDashboardScreen': ['analytics-insights', 'business-growth', 'customer-communication'],
        'ScheduleScreen': ['friday-prayer-scheduling', 'schedule-management', 'availability-tips'],
        'NotificationPreferencesScreen': ['whatsapp-business', 'customer-communication'],
      };

      const contextualIds = contextMapping[currentScreen] || [];
      suggestions = this.helpContent.filter(content => 
        contextualIds.includes(content.id)
      );
    }

    // If no contextual suggestions or need more, add popular content
    if (suggestions.length < 3) {
      const popular = this.helpContent
        .filter(content => content.isPopular && !suggestions.includes(content))
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 5 - suggestions.length);
      
      suggestions = [...suggestions, ...popular];
    }

    return suggestions.slice(0, 5);
  }
}

export default HelpContentService;