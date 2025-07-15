import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';

export interface TourStep {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  targetElement?: string; // Element ID to highlight
  targetCoords?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'tap' | 'swipe' | 'scroll' | 'none';
  actionDirection?: 'up' | 'down' | 'left' | 'right';
  delay?: number; // Delay before showing step
  skipable?: boolean;
  isInteractive?: boolean; // User must interact to proceed
  icon?: string;
  animation?: 'pulse' | 'bounce' | 'shake' | 'none';
}

export interface GuidedTour {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: 'onboarding' | 'feature' | 'advanced' | 'seasonal';
  screens: string[]; // Screen names this tour covers
  steps: TourStep[];
  prerequisites?: string[]; // Required completed tours
  estimatedDuration: number; // In minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  isRequired?: boolean;
  triggeredBy?: 'manual' | 'auto' | 'context';
  triggerConditions?: {
    screenVisits?: number;
    daysSinceInstall?: number;
    completedActions?: string[];
  };
}

export interface TourProgress {
  tourId: string;
  currentStep: number;
  completedSteps: string[];
  startedAt: string;
  completedAt?: string;
  skipped?: boolean;
  feedback?: {
    rating: number;
    comment?: string;
  };
}

export interface TourState {
  activeTour: GuidedTour | null;
  currentStep: number;
  isPlaying: boolean;
  isPaused: boolean;
  userInteractionRequired: boolean;
  overlay: {
    visible: boolean;
    targetCoords?: TourStep['targetCoords'];
    content: {
      title: string;
      description: string;
      position: TourStep['position'];
      animation: TourStep['animation'];
    };
  };
}

class GuidedTourService {
  private static instance: GuidedTourService;
  private tours: GuidedTour[] = [];
  private tourState: TourState = {
    activeTour: null,
    currentStep: 0,
    isPlaying: false,
    isPaused: false,
    userInteractionRequired: false,
    overlay: {
      visible: false,
      content: {
        title: '',
        description: '',
        position: 'center',
        animation: 'none',
      },
    },
  };
  private stateChangeListeners: ((state: TourState) => void)[] = [];
  private screenDimensions = Dimensions.get('window');

  private constructor() {
    this.initializeTours();
    Dimensions.addEventListener('change', ({ window }) => {
      this.screenDimensions = window;
    });
  }

  public static getInstance(): GuidedTourService {
    if (!GuidedTourService.instance) {
      GuidedTourService.instance = new GuidedTourService();
    }
    return GuidedTourService.instance;
  }

  private initializeTours() {
    this.tours = [
      // First-time onboarding tour
      {
        id: 'first-time-onboarding',
        name: 'Welcome to BeautyCort',
        nameAr: 'أهلاً بك في بيوتي كورت',
        description: 'Complete walkthrough of the app',
        descriptionAr: 'جولة شاملة في التطبيق',
        category: 'onboarding',
        screens: ['ProviderDashboard', 'ServiceList', 'Analytics', 'Profile'],
        estimatedDuration: 5,
        difficulty: 'beginner',
        icon: 'play-circle',
        isRequired: true,
        triggeredBy: 'auto',
        triggerConditions: {
          screenVisits: 1,
        },
        steps: [
          {
            id: 'welcome',
            title: 'Welcome to BeautyCort!',
            titleAr: 'أهلاً بك في بيوتي كورت!',
            description: 'Let\'s take a quick tour to get you started with your beauty business.',
            descriptionAr: 'دعنا نأخذ جولة سريعة لنبدأ عملك في مجال الجمال.',
            position: 'center',
            action: 'none',
            skipable: true,
            icon: 'hand-left',
            animation: 'bounce',
          },
          {
            id: 'dashboard-overview',
            title: 'Your Dashboard',
            titleAr: 'لوحة التحكم الخاصة بك',
            description: 'This is your business dashboard. Here you can see today\'s revenue, bookings, and customer metrics.',
            descriptionAr: 'هذه لوحة تحكم عملك. هنا يمكنك رؤية إيرادات اليوم والحجوزات ومقاييس العملاء.',
            targetElement: 'dashboardMetrics',
            position: 'bottom',
            action: 'none',
            animation: 'pulse',
          },
          {
            id: 'quick-actions',
            title: 'Quick Actions',
            titleAr: 'الإجراءات السريعة',
            description: 'Use these buttons for common tasks like adding services or checking your schedule.',
            descriptionAr: 'استخدم هذه الأزرار للمهام الشائعة مثل إضافة الخدمات أو فحص جدولك.',
            targetElement: 'quickActions',
            position: 'top',
            action: 'none',
            animation: 'pulse',
          },
          {
            id: 'navigation-tabs',
            title: 'Navigation Tabs',
            titleAr: 'علامات التبويب للتنقل',
            description: 'Navigate between different sections of your business using these tabs.',
            descriptionAr: 'انتقل بين أقسام مختلفة من عملك باستخدام علامات التبويب هذه.',
            targetElement: 'bottomTabs',
            position: 'top',
            action: 'tap',
            isInteractive: true,
            animation: 'bounce',
          },
        ],
      },

      // Service management feature tour
      {
        id: 'service-management-tour',
        name: 'Service Management',
        nameAr: 'إدارة الخدمات',
        description: 'Learn to manage your services effectively',
        descriptionAr: 'تعلم إدارة خدماتك بفعالية',
        category: 'feature',
        screens: ['ServiceList', 'ServiceForm'],
        estimatedDuration: 3,
        difficulty: 'beginner',
        icon: 'cut',
        triggeredBy: 'context',
        triggerConditions: {
          completedActions: ['first-time-onboarding'],
        },
        steps: [
          {
            id: 'service-list-intro',
            title: 'Your Services',
            titleAr: 'خدماتك',
            description: 'Here you can see all your services. You can add, edit, or remove services from this screen.',
            descriptionAr: 'هنا يمكنك رؤية جميع خدماتك. يمكنك إضافة أو تعديل أو إزالة الخدمات من هذه الشاشة.',
            position: 'center',
            action: 'none',
            animation: 'none',
          },
          {
            id: 'add-service-button',
            title: 'Add New Service',
            titleAr: 'إضافة خدمة جديدة',
            description: 'Tap this button to add a new service to your offerings.',
            descriptionAr: 'اضغط على هذا الزر لإضافة خدمة جديدة إلى عروضك.',
            targetElement: 'addServiceButton',
            position: 'bottom',
            action: 'tap',
            isInteractive: true,
            animation: 'pulse',
          },
          {
            id: 'service-form-fields',
            title: 'Service Details',
            titleAr: 'تفاصيل الخدمة',
            description: 'Fill in your service details. Make sure to use clear Arabic and English names.',
            descriptionAr: 'املأ تفاصيل خدمتك. تأكد من استخدام أسماء واضحة بالعربية والإنجليزية.',
            targetElement: 'serviceForm',
            position: 'top',
            action: 'none',
            animation: 'none',
          },
          {
            id: 'pricing-tips',
            title: 'Pricing Strategy',
            titleAr: 'استراتيجية التسعير',
            description: 'Research competitor prices in Zarqa area. Our analytics show the average price for similar services.',
            descriptionAr: 'ابحث عن أسعار المنافسين في منطقة الزرقاء. تحليلاتنا تظهر متوسط سعر الخدمات المشابهة.',
            targetElement: 'priceInput',
            position: 'bottom',
            action: 'none',
            animation: 'pulse',
          },
        ],
      },

      // Analytics feature tour
      {
        id: 'analytics-tour',
        name: 'Business Analytics',
        nameAr: 'تحليلات الأعمال',
        description: 'Understand your business performance',
        descriptionAr: 'فهم أداء عملك',
        category: 'feature',
        screens: ['ProviderDashboard', 'RevenueAnalytics', 'CustomerAnalytics'],
        estimatedDuration: 4,
        difficulty: 'intermediate',
        icon: 'bar-chart',
        triggeredBy: 'manual',
        prerequisites: ['first-time-onboarding'],
        steps: [
          {
            id: 'analytics-intro',
            title: 'Business Insights',
            titleAr: 'رؤى الأعمال',
            description: 'Analytics help you understand your business performance and make better decisions.',
            descriptionAr: 'التحليلات تساعدك على فهم أداء عملك واتخاذ قرارات أفضل.',
            position: 'center',
            action: 'none',
            animation: 'none',
          },
          {
            id: 'revenue-chart',
            title: 'Revenue Trends',
            titleAr: 'اتجاهات الإيرادات',
            description: 'This chart shows your revenue over time. Look for patterns and seasonal trends.',
            descriptionAr: 'هذا الرسم البياني يظهر إيراداتك عبر الوقت. ابحث عن الأنماط والاتجاهات الموسمية.',
            targetElement: 'revenueChart',
            position: 'bottom',
            action: 'none',
            animation: 'pulse',
          },
          {
            id: 'peak-hours',
            title: 'Peak Hours Analysis',
            titleAr: 'تحليل ساعات الذروة',
            description: 'Understand when your customers prefer to book. Adjust your schedule accordingly.',
            descriptionAr: 'افهم متى يفضل عملاؤك الحجز. اضبط جدولك وفقاً لذلك.',
            targetElement: 'peakHoursHeatmap',
            position: 'top',
            action: 'none',
            animation: 'pulse',
          },
          {
            id: 'customer-insights',
            title: 'Customer Insights',
            titleAr: 'رؤى العملاء',
            description: 'Learn about your customer behavior, retention rates, and preferences.',
            descriptionAr: 'تعرف على سلوك العملاء ومعدلات الاحتفاظ والتفضيلات.',
            targetElement: 'customerMetrics',
            position: 'bottom',
            action: 'none',
            animation: 'pulse',
          },
        ],
      },

      // WhatsApp integration tour
      {
        id: 'whatsapp-business-tour',
        name: 'WhatsApp Business Integration',
        nameAr: 'تكامل واتساب بزنس',
        description: 'Set up WhatsApp for customer communication',
        descriptionAr: 'إعداد واتساب للتواصل مع العملاء',
        category: 'feature',
        screens: ['NotificationPreferences', 'Profile'],
        estimatedDuration: 3,
        difficulty: 'beginner',
        icon: 'logo-whatsapp',
        triggeredBy: 'context',
        triggerConditions: {
          completedActions: ['service-management-tour'],
        },
        steps: [
          {
            id: 'whatsapp-importance',
            title: 'WhatsApp in Jordan',
            titleAr: 'واتساب في الأردن',
            description: 'WhatsApp is the preferred communication method in Jordan. Setting it up will improve your customer relationships.',
            descriptionAr: 'واتساب هو وسيلة التواصل المفضلة في الأردن. إعداده سيحسن علاقاتك مع العملاء.',
            position: 'center',
            action: 'none',
            animation: 'none',
          },
          {
            id: 'notification-settings',
            title: 'Notification Preferences',
            titleAr: 'تفضيلات الإشعارات',
            description: 'Enable WhatsApp notifications to receive booking alerts and communicate with customers instantly.',
            descriptionAr: 'فعّل إشعارات واتساب لتلقي تنبيهات الحجز والتواصل مع العملاء فوراً.',
            targetElement: 'whatsappToggle',
            position: 'bottom',
            action: 'tap',
            isInteractive: true,
            animation: 'pulse',
          },
          {
            id: 'whatsapp-number',
            title: 'WhatsApp Business Number',
            titleAr: 'رقم واتساب بزنس',
            description: 'Add your WhatsApp Business number to your profile so customers can contact you directly.',
            descriptionAr: 'أضف رقم واتساب بزنس إلى ملفك الشخصي حتى يتمكن العملاء من التواصل معك مباشرة.',
            targetElement: 'whatsappNumberInput',
            position: 'top',
            action: 'none',
            animation: 'pulse',
          },
        ],
      },

      // Ramadan seasonal tour
      {
        id: 'ramadan-schedule-tour',
        name: 'Ramadan Schedule Management',
        nameAr: 'إدارة جدول رمضان',
        description: 'Adjust your schedule for Ramadan',
        descriptionAr: 'اضبط جدولك لشهر رمضان',
        category: 'seasonal',
        screens: ['WeeklyAvailability', 'RamadanSchedule'],
        estimatedDuration: 2,
        difficulty: 'beginner',
        icon: 'moon',
        triggeredBy: 'manual',
        steps: [
          {
            id: 'ramadan-intro',
            title: 'Ramadan Considerations',
            titleAr: 'اعتبارات رمضان',
            description: 'During Ramadan, customer preferences change. Many prefer appointments after Iftar.',
            descriptionAr: 'خلال رمضان، تتغير تفضيلات العملاء. كثيرون يفضلون المواعيد بعد الإفطار.',
            position: 'center',
            action: 'none',
            animation: 'none',
          },
          {
            id: 'ramadan-hours',
            title: 'Ramadan Working Hours',
            titleAr: 'ساعات العمل في رمضان',
            description: 'Adjust your working hours to accommodate Ramadan schedule. Consider opening later and closing later.',
            descriptionAr: 'اضبط ساعات عملك لتتناسب مع جدول رمضان. فكر في فتح متأخر وإغلاق متأخر.',
            targetElement: 'ramadanHours',
            position: 'bottom',
            action: 'none',
            animation: 'pulse',
          },
        ],
      },
    ];
  }

  // Tour management methods
  public async getTours(): Promise<GuidedTour[]> {
    return this.tours;
  }

  public async getTourById(tourId: string): Promise<GuidedTour | null> {
    return this.tours.find(tour => tour.id === tourId) || null;
  }

  public async getAvailableTours(userId: string, currentScreen?: string): Promise<GuidedTour[]> {
    const userProgress = await this.getUserTourProgress(userId);
    const completedTours = userProgress.map(p => p.tourId);

    return this.tours.filter(tour => {
      // Check if tour is already completed
      if (completedTours.includes(tour.id)) return false;

      // Check prerequisites
      if (tour.prerequisites) {
        const hasPrerequisites = tour.prerequisites.every(prereq => 
          completedTours.includes(prereq)
        );
        if (!hasPrerequisites) return false;
      }

      // Check screen context
      if (currentScreen && tour.screens.length > 0) {
        if (!tour.screens.includes(currentScreen)) return false;
      }

      return true;
    });
  }

  public async shouldTriggerTour(
    tourId: string, 
    userId: string, 
    context: {
      currentScreen?: string;
      screenVisits?: number;
      daysSinceInstall?: number;
      completedActions?: string[];
    }
  ): Promise<boolean> {
    const tour = await this.getTourById(tourId);
    if (!tour || tour.triggeredBy !== 'auto') return false;

    const userProgress = await this.getUserTourProgress(userId);
    const isCompleted = userProgress.some(p => p.tourId === tourId && p.completedAt);
    if (isCompleted) return false;

    if (!tour.triggerConditions) return true;

    const { triggerConditions } = tour;
    
    // Check screen visits
    if (triggerConditions.screenVisits && 
        (!context.screenVisits || context.screenVisits < triggerConditions.screenVisits)) {
      return false;
    }

    // Check days since install
    if (triggerConditions.daysSinceInstall && 
        (!context.daysSinceInstall || context.daysSinceInstall < triggerConditions.daysSinceInstall)) {
      return false;
    }

    // Check completed actions
    if (triggerConditions.completedActions && context.completedActions) {
      const hasRequiredActions = triggerConditions.completedActions.every(action => 
        context.completedActions!.includes(action)
      );
      if (!hasRequiredActions) return false;
    }

    return true;
  }

  // Tour playback methods
  public async startTour(tourId: string, language: 'ar' | 'en' = 'ar'): Promise<boolean> {
    if (this.tourState.isPlaying) {
      await this.stopTour();
    }

    const tour = await this.getTourById(tourId);
    if (!tour) return false;

    this.tourState = {
      activeTour: tour,
      currentStep: 0,
      isPlaying: true,
      isPaused: false,
      userInteractionRequired: false,
      overlay: {
        visible: false,
        content: {
          title: '',
          description: '',
          position: 'center',
          animation: 'none',
        },
      },
    };

    await this.showCurrentStep(language);
    this.notifyStateChange();
    return true;
  }

  public async nextStep(language: 'ar' | 'en' = 'ar'): Promise<boolean> {
    if (!this.tourState.activeTour || !this.tourState.isPlaying) return false;

    this.tourState.currentStep++;
    
    if (this.tourState.currentStep >= this.tourState.activeTour.steps.length) {
      await this.completeTour();
      return false;
    }

    await this.showCurrentStep(language);
    this.notifyStateChange();
    return true;
  }

  public async previousStep(language: 'ar' | 'en' = 'ar'): Promise<boolean> {
    if (!this.tourState.activeTour || !this.tourState.isPlaying || this.tourState.currentStep === 0) {
      return false;
    }

    this.tourState.currentStep--;
    await this.showCurrentStep(language);
    this.notifyStateChange();
    return true;
  }

  public async pauseTour(): Promise<void> {
    if (this.tourState.isPlaying) {
      this.tourState.isPaused = true;
      this.tourState.overlay.visible = false;
      this.notifyStateChange();
    }
  }

  public async resumeTour(language: 'ar' | 'en' = 'ar'): Promise<void> {
    if (this.tourState.isPaused) {
      this.tourState.isPaused = false;
      await this.showCurrentStep(language);
      this.notifyStateChange();
    }
  }

  public async stopTour(): Promise<void> {
    this.tourState = {
      activeTour: null,
      currentStep: 0,
      isPlaying: false,
      isPaused: false,
      userInteractionRequired: false,
      overlay: {
        visible: false,
        content: {
          title: '',
          description: '',
          position: 'center',
          animation: 'none',
        },
      },
    };
    this.notifyStateChange();
  }

  public async skipTour(): Promise<void> {
    if (this.tourState.activeTour) {
      await this.saveTourProgress(this.tourState.activeTour.id, {
        currentStep: this.tourState.currentStep,
        skipped: true,
      });
    }
    await this.stopTour();
  }

  private async showCurrentStep(language: 'ar' | 'en'): Promise<void> {
    if (!this.tourState.activeTour) return;

    const step = this.tourState.activeTour.steps[this.tourState.currentStep];
    if (!step) return;

    // Apply delay if specified
    if (step.delay) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
    }

    this.tourState.overlay = {
      visible: true,
      targetCoords: step.targetCoords,
      content: {
        title: language === 'ar' ? step.titleAr : step.title,
        description: language === 'ar' ? step.descriptionAr : step.description,
        position: step.position,
        animation: step.animation || 'none',
      },
    };

    this.tourState.userInteractionRequired = step.isInteractive || false;
  }

  private async completeTour(): Promise<void> {
    if (!this.tourState.activeTour) return;

    await this.saveTourProgress(this.tourState.activeTour.id, {
      currentStep: this.tourState.currentStep,
      completedAt: new Date().toISOString(),
    });

    await this.stopTour();
  }

  // Progress tracking
  public async getUserTourProgress(userId: string): Promise<TourProgress[]> {
    try {
      const stored = await AsyncStorage.getItem(`tour_progress_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading tour progress:', error);
      return [];
    }
  }

  public async saveTourProgress(tourId: string, progress: Partial<TourProgress>): Promise<void> {
    // This would typically save to the user's progress in a real implementation
    console.log(`Tour progress saved: ${tourId}`, progress);
  }

  // State management
  public getTourState(): TourState {
    return { ...this.tourState };
  }

  public onStateChange(listener: (state: TourState) => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  private notifyStateChange(): void {
    this.stateChangeListeners.forEach(listener => {
      listener({ ...this.tourState });
    });
  }

  // Utility methods
  public async getElementCoordinates(elementId: string): Promise<TourStep['targetCoords'] | null> {
    // This would be implemented to get actual element coordinates
    // For now, return mock coordinates
    return {
      x: 50,
      y: 100,
      width: 200,
      height: 40,
    };
  }

  public calculateOptimalPosition(
    targetCoords: TourStep['targetCoords'], 
    contentSize: { width: number; height: number }
  ): TourStep['position'] {
    if (!targetCoords) return 'center';

    const { x, y, width, height } = targetCoords;
    const { width: screenWidth, height: screenHeight } = this.screenDimensions;

    // Calculate available space in each direction
    const spaceTop = y;
    const spaceBottom = screenHeight - (y + height);
    const spaceLeft = x;
    const spaceRight = screenWidth - (x + width);

    // Determine best position based on available space
    if (spaceBottom >= contentSize.height && spaceBottom > spaceTop) {
      return 'bottom';
    } else if (spaceTop >= contentSize.height) {
      return 'top';
    } else if (spaceRight >= contentSize.width && spaceRight > spaceLeft) {
      return 'right';
    } else if (spaceLeft >= contentSize.width) {
      return 'left';
    } else {
      return 'center';
    }
  }
}

export default GuidedTourService;