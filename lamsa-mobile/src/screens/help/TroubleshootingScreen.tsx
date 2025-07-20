import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Text, Card, Searchbar, Chip, ActivityIndicator, ProgressBar, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';

interface TroubleshootingStep {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  action?: {
    type: 'check' | 'navigate' | 'external' | 'restart' | 'contact_support';
    target?: string;
    parameters?: any;
  };
  expectedResult?: string;
  expectedResultAr?: string;
  alternatives?: TroubleshootingStep[];
  completed?: boolean;
}

interface TroubleshootingGuide {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard';
  steps: TroubleshootingStep[];
  symptoms: string[];
  symptomsAr: string[];
  causes: string[];
  causesAr: string[];
  prevention?: string;
  preventionAr?: string;
  relatedGuides?: string[];
  jordanSpecific?: boolean;
  tags: string[];
  tagsAr: string[];
}

interface TroubleshootingSession {
  guideId: string;
  currentStepIndex: number;
  completedSteps: string[];
  startedAt: string;
  resolved: boolean;
}

export default function TroubleshootingScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [guides, setGuides] = useState<TroubleshootingGuide[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<TroubleshootingGuide[]>([]);
  const [activeSession, setActiveSession] = useState<TroubleshootingSession | null>(null);
  const [currentGuide, setCurrentGuide] = useState<TroubleshootingGuide | null>(null);
  const [stepProgress, setStepProgress] = useState(new Animated.Value(0));

  const categories = [
    { id: 'all', name: 'All Issues', nameAr: 'جميع المشاكل', icon: 'grid' },
    { id: 'app_crashes', name: 'App Crashes', nameAr: 'تعطل التطبيق', icon: 'warning' },
    { id: 'login_issues', name: 'Login Problems', nameAr: 'مشاكل تسجيل الدخول', icon: 'key' },
    { id: 'booking_problems', name: 'Booking Issues', nameAr: 'مشاكل الحجز', icon: 'calendar' },
    { id: 'payment_errors', name: 'Payment Errors', nameAr: 'أخطاء الدفع', icon: 'card' },
    { id: 'notification_issues', name: 'Notifications', nameAr: 'الإشعارات', icon: 'notifications' },
    { id: 'performance', name: 'Slow Performance', nameAr: 'الأداء البطيء', icon: 'speedometer' },
    { id: 'connectivity', name: 'Connection Issues', nameAr: 'مشاكل الاتصال', icon: 'wifi' },
  ];

  // Comprehensive troubleshooting guides
  const troubleshootingGuides: TroubleshootingGuide[] = [
    {
      id: 'app-crashes-android',
      title: 'App Keeps Crashing on Android',
      titleAr: 'التطبيق يتعطل باستمرار على أندرويد',
      description: 'Resolve frequent app crashes and force closes on Android devices',
      descriptionAr: 'حل مشكلة تعطل التطبيق المتكرر والإغلاق القسري على أجهزة أندرويد',
      category: 'app_crashes',
      priority: 'high',
      estimatedTime: 10,
      difficulty: 'easy',
      symptoms: [
        'App closes unexpectedly',
        'Error message appears when opening app',
        'App freezes during use',
        'Black or white screen appears'
      ],
      symptomsAr: [
        'التطبيق يُغلق بشكل غير متوقع',
        'تظهر رسالة خطأ عند فتح التطبيق',
        'التطبيق يتجمد أثناء الاستخدام',
        'تظهر شاشة سوداء أو بيضاء'
      ],
      causes: [
        'Insufficient device memory',
        'Outdated app version',
        'Android system conflicts',
        'Corrupted app data'
      ],
      causesAr: [
        'ذاكرة الجهاز غير كافية',
        'إصدار التطبيق قديم',
        'تعارضات نظام أندرويد',
        'بيانات التطبيق تالفة'
      ],
      steps: [
        {
          id: 'restart-app',
          title: 'Force Close and Restart App',
          titleAr: 'أغلق التطبيق قسرياً وأعد تشغيله',
          description: 'Close the app completely from recent apps and reopen it.',
          descriptionAr: 'أغلق التطبيق تماماً من التطبيقات الحديثة وأعد فتحه.',
          action: {
            type: 'restart',
            target: 'app'
          },
          expectedResult: 'App should open normally without crashing',
          expectedResultAr: 'يجب أن يفتح التطبيق بشكل طبيعي دون تعطل'
        },
        {
          id: 'check-memory',
          title: 'Check Available Storage',
          titleAr: 'تحقق من المساحة المتاحة',
          description: 'Ensure your device has at least 1GB of free storage space.',
          descriptionAr: 'تأكد من أن جهازك لديه على الأقل 1 جيجابايت من المساحة الفارغة.',
          action: {
            type: 'navigate',
            target: 'device_settings',
            parameters: { section: 'storage' }
          },
          expectedResult: 'Device should have sufficient free space',
          expectedResultAr: 'يجب أن يكون للجهاز مساحة فارغة كافية'
        },
        {
          id: 'update-app',
          title: 'Update to Latest Version',
          titleAr: 'حدّث إلى أحدث إصدار',
          description: 'Check Google Play Store for app updates and install if available.',
          descriptionAr: 'تحقق من متجر جوجل بلاي للحصول على تحديثات التطبيق وقم بالتثبيت إذا كانت متاحة.',
          action: {
            type: 'external',
            target: 'play_store'
          },
          expectedResult: 'App should be updated to the latest version',
          expectedResultAr: 'يجب تحديث التطبيق إلى أحدث إصدار'
        },
        {
          id: 'clear-cache',
          title: 'Clear App Cache and Data',
          titleAr: 'امسح ذاكرة التطبيق المؤقتة والبيانات',
          description: 'Go to Settings > Apps > Lamsa > Storage > Clear Cache & Clear Data.',
          descriptionAr: 'اذهب إلى الإعدادات > التطبيقات > لمسة > التخزين > امسح الذاكرة المؤقتة والبيانات.',
          action: {
            type: 'navigate',
            target: 'app_settings',
            parameters: { action: 'clear_cache' }
          },
          expectedResult: 'App should reset to clean state',
          expectedResultAr: 'يجب أن يعود التطبيق إلى حالة نظيفة'
        },
        {
          id: 'restart-device',
          title: 'Restart Your Device',
          titleAr: 'أعد تشغيل جهازك',
          description: 'Turn off your device completely and turn it back on after 30 seconds.',
          descriptionAr: 'أطفئ جهازك تماماً وأعد تشغيله بعد 30 ثانية.',
          action: {
            type: 'restart',
            target: 'device'
          },
          expectedResult: 'Device should restart and app should work normally',
          expectedResultAr: 'يجب أن يعيد الجهاز التشغيل ويعمل التطبيق بشكل طبيعي'
        }
      ],
      prevention: 'Keep your app updated and maintain at least 1GB free storage',
      preventionAr: 'حافظ على تحديث التطبيق واحتفظ بمساحة فارغة لا تقل عن 1 جيجابايت',
      relatedGuides: ['app-slow-performance', 'login-issues'],
      tags: ['crash', 'android', 'force close', 'memory'],
      tagsAr: ['تعطل', 'أندرويد', 'إغلاق قسري', 'ذاكرة']
    },
    {
      id: 'whatsapp-notifications-not-working',
      title: 'WhatsApp Notifications Not Working',
      titleAr: 'إشعارات واتساب لا تعمل',
      description: 'Fix issues with WhatsApp Business notifications for customer bookings',
      descriptionAr: 'إصلاح مشاكل إشعارات واتساب بزنس لحجوزات العملاء',
      category: 'notification_issues',
      priority: 'high',
      estimatedTime: 8,
      difficulty: 'easy',
      jordanSpecific: true,
      symptoms: [
        'Not receiving booking notifications on WhatsApp',
        'WhatsApp messages arrive late',
        'Missing customer inquiry notifications',
        'WhatsApp Business not connected'
      ],
      symptomsAr: [
        'عدم استلام إشعارات الحجز على واتساب',
        'رسائل واتساب تصل متأخرة',
        'إشعارات استفسارات العملاء مفقودة',
        'واتساب بزنس غير متصل'
      ],
      causes: [
        'WhatsApp Business not set up correctly',
        'App notification permissions disabled',
        'WhatsApp number not verified in profile',
        'Phone battery optimization blocking notifications'
      ],
      causesAr: [
        'واتساب بزنس غير مُعدّ بشكل صحيح',
        'أذونات إشعارات التطبيق معطلة',
        'رقم واتساب غير مُحقق في الملف الشخصي',
        'تحسين بطارية الهاتف يحجب الإشعارات'
      ],
      steps: [
        {
          id: 'check-whatsapp-setup',
          title: 'Verify WhatsApp Business Setup',
          titleAr: 'تحقق من إعداد واتساب بزنس',
          description: 'Go to Profile > Notification Preferences and ensure WhatsApp is enabled.',
          descriptionAr: 'اذهب إلى الملف الشخصي > تفضيلات الإشعارات وتأكد من تفعيل واتساب.',
          action: {
            type: 'navigate',
            target: 'notification_preferences'
          },
          expectedResult: 'WhatsApp toggle should be enabled',
          expectedResultAr: 'يجب أن يكون زر واتساب مفعلاً'
        },
        {
          id: 'verify-whatsapp-number',
          title: 'Verify Your WhatsApp Number',
          titleAr: 'تحقق من رقم واتساب الخاص بك',
          description: 'Make sure your WhatsApp Business number is correctly entered in your profile.',
          descriptionAr: 'تأكد من إدخال رقم واتساب بزنس بشكل صحيح في ملفك الشخصي.',
          action: {
            type: 'navigate',
            target: 'profile_edit'
          },
          expectedResult: 'WhatsApp number should be formatted as +962XXXXXXXXX',
          expectedResultAr: 'يجب أن يكون رقم واتساب بصيغة +962XXXXXXXXX'
        },
        {
          id: 'check-app-permissions',
          title: 'Check App Notification Permissions',
          titleAr: 'تحقق من أذونات إشعارات التطبيق',
          description: 'Go to phone Settings > Apps > Lamsa > Notifications and enable all.',
          descriptionAr: 'اذهب إلى إعدادات الهاتف > التطبيقات > لمسة > الإشعارات وفعّل الكل.',
          action: {
            type: 'navigate',
            target: 'app_settings',
            parameters: { section: 'notifications' }
          },
          expectedResult: 'All notification types should be enabled',
          expectedResultAr: 'يجب تفعيل جميع أنواع الإشعارات'
        },
        {
          id: 'disable-battery-optimization',
          title: 'Disable Battery Optimization',
          titleAr: 'عطّل تحسين البطارية',
          description: 'Go to Settings > Battery > Battery Optimization > Lamsa > Don\'t Optimize.',
          descriptionAr: 'اذهب إلى الإعدادات > البطارية > تحسين البطارية > لمسة > لا تحسن.',
          action: {
            type: 'navigate',
            target: 'battery_settings'
          },
          expectedResult: 'App should be excluded from battery optimization',
          expectedResultAr: 'يجب استثناء التطبيق من تحسين البطارية'
        },
        {
          id: 'test-whatsapp-integration',
          title: 'Test WhatsApp Integration',
          titleAr: 'اختبر تكامل واتساب',
          description: 'Send a test notification from the app to verify WhatsApp integration works.',
          descriptionAr: 'أرسل إشعار تجريبي من التطبيق للتحقق من عمل تكامل واتساب.',
          action: {
            type: 'check',
            target: 'test_whatsapp'
          },
          expectedResult: 'You should receive a test message on WhatsApp',
          expectedResultAr: 'يجب أن تستلم رسالة تجريبية على واتساب'
        }
      ],
      prevention: 'Regularly check your WhatsApp Business settings and keep notifications enabled',
      preventionAr: 'تحقق بانتظام من إعدادات واتساب بزنس واحتفظ بالإشعارات مفعلة',
      relatedGuides: ['notification-not-working', 'whatsapp-setup'],
      tags: ['whatsapp', 'notifications', 'business', 'jordan'],
      tagsAr: ['واتساب', 'إشعارات', 'أعمال', 'الأردن']
    },
    {
      id: 'payment-failed-jordan',
      title: 'Payment Failed - Jordan Customers',
      titleAr: 'فشل الدفع - العملاء الأردنيون',
      description: 'Troubleshoot payment issues specific to Jordan payment methods',
      descriptionAr: 'استكشاف أخطاء مشاكل الدفع المحددة لطرق الدفع الأردنية',
      category: 'payment_errors',
      priority: 'critical',
      estimatedTime: 15,
      difficulty: 'medium',
      jordanSpecific: true,
      symptoms: [
        'Customer payment gets declined',
        'Error message during payment process',
        'Payment stuck in pending status',
        'Customer can\'t select preferred payment method'
      ],
      symptomsAr: [
        'دفع العميل يتم رفضه',
        'رسالة خطأ أثناء عملية الدفع',
        'الدفع عالق في حالة الانتظار',
        'العميل لا يستطيع اختيار طريقة الدفع المفضلة'
      ],
      causes: [
        'Bank restrictions on online payments',
        'Insufficient funds in customer account',
        'Credit card not enabled for online use',
        'Customer using unsupported payment method'
      ],
      causesAr: [
        'قيود بنكية على المدفوعات الإلكترونية',
        'أموال غير كافية في حساب العميل',
        'بطاقة ائتمان غير مفعلة للاستخدام الإلكتروني',
        'العميل يستخدم طريقة دفع غير مدعومة'
      ],
      steps: [
        {
          id: 'check-payment-methods',
          title: 'Verify Supported Payment Methods',
          titleAr: 'تحقق من طرق الدفع المدعومة',
          description: 'Check that you have enabled cash payment and common Jordan bank cards.',
          descriptionAr: 'تحقق من تفعيل الدفع النقدي وبطاقات البنوك الأردنية الشائعة.',
          action: {
            type: 'navigate',
            target: 'payment_settings'
          },
          expectedResult: 'Cash on delivery and major Jordan banks should be enabled',
          expectedResultAr: 'يجب تفعيل الدفع عند التسليم والبنوك الأردنية الرئيسية'
        },
        {
          id: 'suggest-alternative-payment',
          title: 'Suggest Alternative Payment to Customer',
          titleAr: 'اقترح طريقة دفع بديلة للعميل',
          description: 'Contact customer via WhatsApp and suggest cash payment or different card.',
          descriptionAr: 'تواصل مع العميل عبر واتساب واقترح الدفع النقدي أو بطاقة مختلفة.',
          action: {
            type: 'external',
            target: 'whatsapp',
            parameters: { 
              message: 'Hi! I noticed there was an issue with your payment. Would you prefer to pay cash when I arrive? Or we can try a different card. - مرحباً! لاحظت وجود مشكلة في الدفع. هل تفضل الدفع نقداً عند وصولي؟ أو يمكننا تجربة بطاقة مختلفة.'
            }
          },
          expectedResult: 'Customer should respond with preferred payment method',
          expectedResultAr: 'يجب أن يرد العميل بطريقة الدفع المفضلة'
        },
        {
          id: 'verify-service-pricing',
          title: 'Double-Check Service Pricing',
          titleAr: 'تحقق مرة أخرى من تسعير الخدمة',
          description: 'Ensure your service prices are reasonable for Jordan market and clearly displayed.',
          descriptionAr: 'تأكد من أن أسعار خدماتك معقولة للسوق الأردني ومعروضة بوضوح.',
          action: {
            type: 'navigate',
            target: 'service_pricing'
          },
          expectedResult: 'Prices should be competitive and clearly shown in JOD',
          expectedResultAr: 'يجب أن تكون الأسعار تنافسية ومعروضة بوضوح بالدينار الأردني'
        },
        {
          id: 'enable-payment-plans',
          title: 'Consider Offering Payment Plans',
          titleAr: 'فكر في تقديم خطط دفع',
          description: 'For expensive services, offer to split payment (50% now, 50% after service).',
          descriptionAr: 'للخدمات المكلفة، قدم تقسيم الدفع (50% الآن، 50% بعد الخدمة).',
          action: {
            type: 'check',
            target: 'payment_plans'
          },
          expectedResult: 'Customer should be more comfortable with split payment',
          expectedResultAr: 'يجب أن يكون العميل أكثر راحة مع الدفع المقسم'
        },
        {
          id: 'contact-payment-support',
          title: 'Contact Payment Support if Issue Persists',
          titleAr: 'اتصل بدعم المدفوعات إذا استمرت المشكلة',
          description: 'If payment issues continue, contact our payment support team for assistance.',
          descriptionAr: 'إذا استمرت مشاكل الدفع، اتصل بفريق دعم المدفوعات للمساعدة.',
          action: {
            type: 'contact_support',
            target: 'payment_support'
          },
          expectedResult: 'Support team should help resolve payment gateway issues',
          expectedResultAr: 'يجب أن يساعد فريق الدعم في حل مشاكل بوابة الدفع'
        }
      ],
      prevention: 'Always offer cash payment option and educate customers about payment methods',
      preventionAr: 'قدم دائماً خيار الدفع النقدي وثقف العملاء حول طرق الدفع',
      relatedGuides: ['payment-setup', 'customer-communication'],
      tags: ['payment', 'jordan', 'bank', 'cash', 'declined'],
      tagsAr: ['دفع', 'الأردن', 'بنك', 'نقد', 'مرفوض']
    },
    {
      id: 'slow-app-performance',
      title: 'App Running Very Slowly',
      titleAr: 'التطبيق يعمل ببطء شديد',
      description: 'Fix performance issues and make the app run faster',
      descriptionAr: 'إصلاح مشاكل الأداء وجعل التطبيق يعمل بشكل أسرع',
      category: 'performance',
      priority: 'medium',
      estimatedTime: 12,
      difficulty: 'easy',
      symptoms: [
        'App takes long time to load',
        'Screens freeze or lag',
        'Scrolling is not smooth',
        'Photos take long time to upload'
      ],
      symptomsAr: [
        'التطبيق يستغرق وقتاً طويلاً للتحميل',
        'الشاشات تتجمد أو تتأخر',
        'التمرير ليس سلساً',
        'الصور تستغرق وقتاً طويلاً للتحميل'
      ],
      causes: [
        'Too many apps running in background',
        'Low device storage space',
        'Weak internet connection',
        'Outdated device or OS'
      ],
      causesAr: [
        'الكثير من التطبيقات تعمل في الخلفية',
        'مساحة تخزين منخفضة في الجهاز',
        'اتصال إنترنت ضعيف',
        'جهاز أو نظام تشغيل قديم'
      ],
      steps: [
        {
          id: 'close-background-apps',
          title: 'Close Background Apps',
          titleAr: 'أغلق التطبيقات في الخلفية',
          description: 'Close all unnecessary apps running in the background to free up memory.',
          descriptionAr: 'أغلق جميع التطبيقات غير الضرورية التي تعمل في الخلفية لتحرير الذاكرة.',
          action: {
            type: 'restart',
            target: 'background_apps'
          },
          expectedResult: 'Device should have more available memory',
          expectedResultAr: 'يجب أن يكون للجهاز ذاكرة متاحة أكثر'
        },
        {
          id: 'check-internet-speed',
          title: 'Test Internet Connection Speed',
          titleAr: 'اختبر سرعة الاتصال بالإنترنت',
          description: 'Run a speed test to ensure you have stable internet connection (at least 1 Mbps).',
          descriptionAr: 'قم بإجراء اختبار سرعة للتأكد من وجود اتصال إنترنت مستقر (على الأقل 1 ميجابت/ثانية).',
          action: {
            type: 'external',
            target: 'speed_test'
          },
          expectedResult: 'Internet speed should be at least 1 Mbps',
          expectedResultAr: 'يجب أن تكون سرعة الإنترنت على الأقل 1 ميجابت/ثانية'
        },
        {
          id: 'free-storage-space',
          title: 'Free Up Storage Space',
          titleAr: 'حرر مساحة التخزين',
          description: 'Delete unnecessary photos, videos, and apps to free up at least 2GB of space.',
          descriptionAr: 'احذف الصور والفيديوهات والتطبيقات غير الضرورية لتحرير مساحة 2 جيجابايت على الأقل.',
          action: {
            type: 'navigate',
            target: 'storage_cleanup'
          },
          expectedResult: 'Device should have at least 2GB free space',
          expectedResultAr: 'يجب أن يكون للجهاز مساحة فارغة لا تقل عن 2 جيجابايت'
        },
        {
          id: 'update-app-and-os',
          title: 'Update App and Operating System',
          titleAr: 'حدّث التطبيق ونظام التشغيل',
          description: 'Install latest app update and check for phone system updates.',
          descriptionAr: 'ثبّت أحدث تحديث للتطبيق وتحقق من تحديثات نظام الهاتف.',
          action: {
            type: 'external',
            target: 'system_update'
          },
          expectedResult: 'Both app and OS should be running latest versions',
          expectedResultAr: 'يجب أن يعمل كل من التطبيق والنظام بأحدث الإصدارات'
        }
      ],
      prevention: 'Regularly clean up storage and close unused apps',
      preventionAr: 'نظف مساحة التخزين بانتظام وأغلق التطبيقات غير المستخدمة',
      relatedGuides: ['app-crashes-android', 'connectivity-issues'],
      tags: ['performance', 'slow', 'lag', 'memory', 'storage'],
      tagsAr: ['أداء', 'بطيء', 'تأخير', 'ذاكرة', 'تخزين']
    }
  ];

  useEffect(() => {
    loadTroubleshootingGuides();
  }, []);

  useEffect(() => {
    filterGuides();
  }, [guides, selectedCategory, searchQuery]);

  const loadTroubleshootingGuides = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGuides(troubleshootingGuides);
    } catch (error) {
      console.error('Error loading troubleshooting guides:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterGuides = () => {
    let filtered = guides;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(guide => guide.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(guide => {
        const title = isRTL ? guide.titleAr : guide.title;
        const description = isRTL ? guide.descriptionAr : guide.description;
        const symptoms = isRTL ? guide.symptomsAr : guide.symptoms;
        const causes = isRTL ? guide.causesAr : guide.causes;
        const tags = isRTL ? guide.tagsAr : guide.tags;
        
        return title.toLowerCase().includes(query) ||
               description.toLowerCase().includes(query) ||
               symptoms.some(symptom => symptom.toLowerCase().includes(query)) ||
               causes.some(cause => cause.toLowerCase().includes(query)) ||
               tags.some(tag => tag.toLowerCase().includes(query));
      });
    }

    // Sort by priority, then by Jordan-specific, then by difficulty
    filtered.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
      
      if (a.priority !== b.priority) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      if (a.jordanSpecific !== b.jordanSpecific) {
        return b.jordanSpecific ? 1 : -1;
      }
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });

    setFilteredGuides(filtered);
  };

  const startTroubleshooting = (guide: TroubleshootingGuide) => {
    const session: TroubleshootingSession = {
      guideId: guide.id,
      currentStepIndex: 0,
      completedSteps: [],
      startedAt: new Date().toISOString(),
      resolved: false,
    };
    
    setActiveSession(session);
    setCurrentGuide(guide);
    
    // Animate progress bar to 0
    Animated.timing(stepProgress, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const completeStep = (stepId: string) => {
    if (!activeSession || !currentGuide) return;

    const updatedSession = {
      ...activeSession,
      completedSteps: [...activeSession.completedSteps, stepId],
    };

    // Move to next step if available
    if (activeSession.currentStepIndex < currentGuide.steps.length - 1) {
      updatedSession.currentStepIndex = activeSession.currentStepIndex + 1;
    }

    setActiveSession(updatedSession);

    // Update progress animation
    const progress = (updatedSession.completedSteps.length / currentGuide.steps.length);
    Animated.timing(stepProgress, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Check if all steps completed
    if (updatedSession.completedSteps.length === currentGuide.steps.length) {
      Alert.alert(
        t('troubleshootingComplete'),
        t('troubleshootingCompleteMessage'),
        [
          {
            text: t('issueResolved'),
            onPress: () => markAsResolved(),
          },
          {
            text: t('stillNeedHelp'),
            onPress: () => contactSupport(),
          },
        ]
      );
    }
  };

  const markAsResolved = () => {
    if (activeSession) {
      setActiveSession({ ...activeSession, resolved: true });
    }
    setCurrentGuide(null);
    setActiveSession(null);
  };

  const contactSupport = () => {
    navigation.navigate('SupportScreen');
    setCurrentGuide(null);
    setActiveSession(null);
  };

  const handleStepAction = async (step: TroubleshootingStep) => {
    if (!step.action) {
      completeStep(step.id);
      return;
    }

    switch (step.action.type) {
      case 'navigate':
        // Navigate to specific screen
        if (step.action.target === 'notification_preferences') {
          navigation.navigate('NotificationPreferences');
        } else if (step.action.target === 'profile_edit') {
          navigation.navigate('ProfileEdit');
        } else if (step.action.target === 'payment_settings') {
          navigation.navigate('PaymentSettings');
        }
        break;

      case 'external':
        // Open external apps/links
        if (step.action.target === 'play_store') {
          Linking.openURL('market://details?id=com.lamsa.app');
        } else if (step.action.target === 'whatsapp') {
          const message = step.action.parameters?.message || '';
          Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
        } else if (step.action.target === 'speed_test') {
          Linking.openURL('https://fast.com');
        }
        break;

      case 'restart':
        Alert.alert(
          t('restartRequired'),
          t('restartRequiredMessage', { target: t(step.action.target || '') }),
          [{ text: t('ok'), onPress: () => completeStep(step.id) }]
        );
        break;

      case 'contact_support':
        Alert.alert(
          t('contactSupport'),
          t('contactSupportMessage'),
          [
            { text: t('cancel') },
            { text: t('contact'), onPress: () => contactSupport() },
          ]
        );
        break;

      case 'check':
        Alert.alert(
          t('checkComplete'),
          t('checkCompleteMessage'),
          [
            { text: t('yes'), onPress: () => completeStep(step.id) },
            { text: t('no'), onPress: () => {} },
          ]
        );
        break;

      default:
        completeStep(step.id);
    }
  };

  const getPriorityColor = (priority: TroubleshootingGuide['priority']) => {
    switch (priority) {
      case 'critical': return colors.error;
      case 'high': return colors.warning;
      case 'medium': return colors.primary;
      case 'low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const getDifficultyIcon = (difficulty: TroubleshootingGuide['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'star';
      case 'medium': return 'star-half';
      case 'hard': return 'star-outline';
      default: return 'help';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('loadingTroubleshootingGuides')}</Text>
      </View>
    );
  }

  // Render active troubleshooting session
  if (currentGuide && activeSession) {
    const currentStep = currentGuide.steps[activeSession.currentStepIndex];
    const progress = activeSession.completedSteps.length / currentGuide.steps.length;

    return (
      <View style={styles.container}>
        {/* Session Header */}
        <View style={styles.sessionHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Alert.alert(
                t('exitTroubleshooting'),
                t('exitTroubleshootingMessage'),
                [
                  { text: t('continue') },
                  { text: t('exit'), onPress: () => { setCurrentGuide(null); setActiveSession(null); } },
                ]
              );
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>
              {isRTL ? currentGuide.titleAr : currentGuide.title}
            </Text>
            <Text style={styles.sessionProgress}>
              {t('step')} {activeSession.currentStepIndex + 1} {t('of')} {currentGuide.steps.length}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: stepProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        <ScrollView style={styles.sessionContent}>
          {/* Current Step */}
          <Card style={styles.currentStepCard}>
            <View style={styles.stepHeader}>
              <Ionicons name="play-circle" size={24} color={colors.primary} />
              <Text style={styles.stepTitle}>
                {isRTL ? currentStep.titleAr : currentStep.title}
              </Text>
            </View>
            <Text style={styles.stepDescription}>
              {isRTL ? currentStep.descriptionAr : currentStep.description}
            </Text>
            
            {currentStep.expectedResult && (
              <View style={styles.expectedResult}>
                <Text style={styles.expectedResultLabel}>{t('expectedResult')}:</Text>
                <Text style={styles.expectedResultText}>
                  {isRTL ? currentStep.expectedResultAr : currentStep.expectedResult}
                </Text>
              </View>
            )}

            <View style={styles.stepActions}>
              <Button
                mode="contained"
                onPress={() => handleStepAction(currentStep)}
                style={styles.actionButton}
              >
                {currentStep.action ? t('performAction') : t('markComplete')}
              </Button>
              
              {currentStep.action && (
                <Button
                  mode="outlined"
                  onPress={() => completeStep(currentStep.id)}
                  style={styles.skipButton}
                >
                  {t('skip')}
                </Button>
              )}
            </View>
          </Card>

          {/* Completed Steps */}
          {activeSession.completedSteps.length > 0 && (
            <View style={styles.completedSteps}>
              <Text style={styles.completedStepsTitle}>{t('completedSteps')}</Text>
              {currentGuide.steps
                .filter(step => activeSession.completedSteps.includes(step.id))
                .map(step => (
                  <View key={step.id} style={styles.completedStep}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.completedStepText}>
                      {isRTL ? step.titleAr : step.title}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Render guide selection
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('troubleshootingGuides')}</Text>
        <Text style={styles.headerSubtitle}>{t('troubleshootingSubtitle')}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t('searchIssues')}
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

      {/* Guides List */}
      <ScrollView style={styles.guidesList} showsVerticalScrollIndicator={false}>
        {filteredGuides.length > 0 ? (
          filteredGuides.map(guide => (
            <Card key={guide.id} style={styles.guideCard}>
              <TouchableOpacity
                style={styles.guideContent}
                onPress={() => startTroubleshooting(guide)}
                activeOpacity={0.8}
              >
                <View style={styles.guideHeader}>
                  <View style={styles.guideInfo}>
                    <Text style={styles.guideTitle}>
                      {isRTL ? guide.titleAr : guide.title}
                    </Text>
                    <Text style={styles.guideDescription}>
                      {isRTL ? guide.descriptionAr : guide.description}
                    </Text>
                  </View>
                  <View style={styles.guideMeta}>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(guide.priority) + '20' }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(guide.priority) }]}>
                        {t(`priority.${guide.priority}`)}
                      </Text>
                    </View>
                    {guide.jordanSpecific && (
                      <View style={styles.jordanBadge}>
                        <Text style={styles.jordanBadgeText}>JO</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.guideDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time" size={16} color={colors.text.secondary} />
                    <Text style={styles.detailText}>
                      {guide.estimatedTime} {t('minutes')}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name={getDifficultyIcon(guide.difficulty)} size={16} color={colors.text.secondary} />
                    <Text style={styles.detailText}>
                      {t(`difficulty.${guide.difficulty}`)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="list" size={16} color={colors.text.secondary} />
                    <Text style={styles.detailText}>
                      {guide.steps.length} {t('steps')}
                    </Text>
                  </View>
                </View>

                <View style={styles.symptomsPreview}>
                  <Text style={styles.symptomsLabel}>{t('commonSymptoms')}:</Text>
                  <Text style={styles.symptomsText}>
                    {(isRTL ? guide.symptomsAr : guide.symptoms).slice(0, 2).join(', ')}
                    {guide.symptoms.length > 2 && '...'}
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>
          ))
        ) : (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search" size={48} color={colors.text.secondary} />
            <Text style={styles.noResultsText}>{t('noGuidesFound')}</Text>
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
  guidesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  guideCard: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  guideContent: {
    padding: 16,
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guideInfo: {
    flex: 1,
    marginRight: 12,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
    lineHeight: 24,
  },
  guideDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  guideMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
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
  guideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  symptomsPreview: {
    marginTop: 8,
  },
  symptomsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  symptomsText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 16,
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
  // Session styles
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.secondary + '20',
  },
  backButton: {
    marginRight: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sessionProgress: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.text.secondary + '20',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sessionContent: {
    flex: 1,
    padding: 20,
  },
  currentStepCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  stepDescription: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 22,
    marginBottom: 16,
  },
  expectedResult: {
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  expectedResultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  expectedResultText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 18,
  },
  stepActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  skipButton: {
    flex: 1,
  },
  completedSteps: {
    marginTop: 20,
  },
  completedStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  completedStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  completedStepText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
});