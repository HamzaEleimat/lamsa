import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Chip, ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import HelpContentService from '../../services/help/HelpContentService';

const { width: screenWidth } = Dimensions.get('window');

interface BestPractice {
  id: string;
  category: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  steps: BestPracticeStep[];
  benefits: string[];
  benefitsAr: string[];
  examples: PracticeExample[];
  relatedContent?: string[];
  jordanSpecific: boolean;
  checklist: ChecklistItem[];
  tips: string[];
  tipsAr: string[];
}

interface BestPracticeStep {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  action?: string; // Navigation action or external link
  completed?: boolean;
}

interface PracticeExample {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  imageUrl?: string;
  type: 'success' | 'avoid' | 'neutral';
}

interface ChecklistItem {
  id: string;
  text: string;
  textAr: string;
  completed: boolean;
  optional: boolean;
}

interface CategoryProgress {
  categoryId: string;
  totalPractices: number;
  completedPractices: number;
  percentage: number;
}

export default function BestPracticesScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [practices, setPractices] = useState<BestPractice[]>([]);
  const [filteredPractices, setFilteredPractices] = useState<BestPractice[]>([]);
  const [expandedPractice, setExpandedPractice] = useState<string | null>(null);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [userProgress, setUserProgress] = useState<Map<string, boolean>>(new Map());

  const categories = [
    { id: 'all', name: 'All', nameAr: 'الكل', icon: 'grid', color: colors.primary },
    { id: 'cultural', name: 'Cultural Guidelines', nameAr: 'الإرشادات الثقافية', icon: 'people', color: '#FF9800' },
    { id: 'pricing', name: 'Pricing Strategy', nameAr: 'استراتيجية التسعير', icon: 'pricetag', color: '#4CAF50' },
    { id: 'customer-service', name: 'Customer Service', nameAr: 'خدمة العملاء', icon: 'heart', color: '#E91E63' },
    { id: 'marketing', name: 'Marketing', nameAr: 'التسويق', icon: 'megaphone', color: '#9C27B0' },
    { id: 'operations', name: 'Operations', nameAr: 'العمليات', icon: 'settings', color: '#607D8B' },
    { id: 'growth', name: 'Business Growth', nameAr: 'نمو الأعمال', icon: 'trending-up', color: '#2196F3' },
  ];

  // Jordan market-specific best practices
  const jordanBestPractices: BestPractice[] = [
    {
      id: 'cultural-sensitivity',
      category: 'cultural',
      title: 'Cultural Sensitivity in Beauty Services',
      titleAr: 'الحساسية الثقافية في خدمات الجمال',
      description: 'Understanding and respecting cultural preferences in Jordan\'s conservative market.',
      descriptionAr: 'فهم واحترام التفضيلات الثقافية في السوق المحافظ في الأردن.',
      icon: 'people',
      priority: 'high',
      difficulty: 'beginner',
      estimatedTime: 15,
      jordanSpecific: true,
      steps: [
        {
          id: 'understand-modesty',
          title: 'Understand Modesty Requirements',
          titleAr: 'فهم متطلبات التواضع',
          description: 'Ensure your salon provides privacy and modesty for conservative customers.',
          descriptionAr: 'تأكد من أن صالونك يوفر الخصوصية والتواضع للعملاء المحافظين.',
        },
        {
          id: 'separate-sections',
          title: 'Consider Separate Sections',
          titleAr: 'فكر في أقسام منفصلة',
          description: 'If possible, create separate areas or times for male and female customers.',
          descriptionAr: 'إذا أمكن، أنشئ مناطق أو أوقات منفصلة للعملاء الذكور والإناث.',
        },
        {
          id: 'staff-training',
          title: 'Train Your Staff',
          titleAr: 'درب موظفيك',
          description: 'Ensure staff understand cultural sensitivities and appropriate interactions.',
          descriptionAr: 'تأكد من أن الموظفين يفهمون الحساسيات الثقافية والتفاعلات المناسبة.',
        },
      ],
      benefits: [
        'Attracts conservative customers',
        'Builds trust in the community',
        'Reduces cultural misunderstandings',
        'Increases customer retention',
      ],
      benefitsAr: [
        'يجذب العملاء المحافظين',
        'يبني الثقة في المجتمع',
        'يقلل من سوء الفهم الثقافي',
        'يزيد من الاحتفاظ بالعملاء',
      ],
      examples: [
        {
          id: 'success-example',
          title: 'Successful Implementation',
          titleAr: 'تطبيق ناجح',
          description: 'Salon Nour in Zarqa created separate sections and saw 40% increase in customers.',
          descriptionAr: 'صالون نور في الزرقاء أنشأ أقساماً منفصلة ورأى زيادة 40% في العملاء.',
          type: 'success',
        },
      ],
      checklist: [
        { id: 'privacy-areas', text: 'Create private treatment areas', textAr: 'أنشئ مناطق علاج خاصة', completed: false, optional: false },
        { id: 'staff-guidelines', text: 'Establish staff interaction guidelines', textAr: 'ضع إرشادات تفاعل الموظفين', completed: false, optional: false },
        { id: 'cultural-training', text: 'Complete cultural sensitivity training', textAr: 'أكمل تدريب الحساسية الثقافية', completed: false, optional: true },
      ],
      tips: [
        'Ask customers about their preferences during booking',
        'Display cultural sensitivity certificates',
        'Offer same-gender service providers when possible',
      ],
      tipsAr: [
        'اسأل العملاء عن تفضيلاتهم أثناء الحجز',
        'اعرض شهادات الحساسية الثقافية',
        'اعرض مقدمي خدمات من نفس الجنس عند الإمكان',
      ],
    },
    {
      id: 'whatsapp-communication',
      category: 'customer-service',
      title: 'Mastering WhatsApp Business Communication',
      titleAr: 'إتقان التواصل عبر واتساب بزنس',
      description: 'Leveraging WhatsApp as the primary communication channel in Jordan.',
      descriptionAr: 'الاستفادة من واتساب كقناة التواصل الأساسية في الأردن.',
      icon: 'logo-whatsapp',
      priority: 'high',
      difficulty: 'beginner',
      estimatedTime: 20,
      jordanSpecific: true,
      steps: [
        {
          id: 'setup-business-account',
          title: 'Set Up WhatsApp Business Account',
          titleAr: 'إعداد حساب واتساب بزنس',
          description: 'Create a professional WhatsApp Business account with your salon information.',
          descriptionAr: 'أنشئ حساب واتساب بزنس محترف مع معلومات صالونك.',
          action: 'https://business.whatsapp.com',
        },
        {
          id: 'automated-messages',
          title: 'Set Up Automated Messages',
          titleAr: 'إعداد الرسائل التلقائية',
          description: 'Create welcome messages, away messages, and quick replies in Arabic.',
          descriptionAr: 'أنشئ رسائل ترحيب ورسائل غياب وردود سريعة بالعربية.',
        },
        {
          id: 'business-hours',
          title: 'Configure Business Hours',
          titleAr: 'تكوين ساعات العمل',
          description: 'Set your business hours to match your salon schedule.',
          descriptionAr: 'حدد ساعات عملك لتتطابق مع جدول صالونك.',
        },
      ],
      benefits: [
        '90% of Jordanians use WhatsApp daily',
        'Instant customer communication',
        'Free marketing through status updates',
        'Easy appointment confirmations',
      ],
      benefitsAr: [
        '90% من الأردنيين يستخدمون واتساب يومياً',
        'تواصل فوري مع العملاء',
        'تسويق مجاني من خلال تحديثات الحالة',
        'تأكيدات مواعيد سهلة',
      ],
      examples: [
        {
          id: 'message-template',
          title: 'Professional Message Template',
          titleAr: 'قالب رسالة مهنية',
          description: 'أهلاً وسهلاً! شكراً لتواصلكم مع صالون [اسم الصالون]. نحن متاحون للرد على استفساراتكم من السبت للخميس 9ص-9م.',
          descriptionAr: 'أهلاً وسهلاً! شكراً لتواصلكم مع صالون [اسم الصالون]. نحن متاحون للرد على استفساراتكم من السبت للخميس 9ص-9م.',
          type: 'success',
        },
      ],
      checklist: [
        { id: 'business-profile', text: 'Complete business profile', textAr: 'أكمل الملف التجاري', completed: false, optional: false },
        { id: 'catalog-setup', text: 'Set up service catalog', textAr: 'إعداد كتالوج الخدمات', completed: false, optional: false },
        { id: 'labels-system', text: 'Organize contacts with labels', textAr: 'نظم جهات الاتصال بالتسميات', completed: false, optional: true },
      ],
      tips: [
        'Use voice messages for personal touch',
        'Share before/after photos with customer consent',
        'Post salon updates in your status',
        'Use WhatsApp Pay when available in Jordan',
      ],
      tipsAr: [
        'استخدم الرسائل الصوتية للمسة شخصية',
        'شارك صور قبل وبعد بموافقة العميل',
        'انشر تحديثات الصالون في حالتك',
        'استخدم واتساب باي عند توفره في الأردن',
      ],
    },
    {
      id: 'zarqa-pricing-strategy',
      category: 'pricing',
      title: 'Competitive Pricing for Zarqa Market',
      titleAr: 'التسعير التنافسي لسوق الزرقاء',
      description: 'Strategic pricing approaches for the Zarqa beauty market.',
      descriptionAr: 'نهج التسعير الاستراتيجي لسوق الجمال في الزرقاء.',
      icon: 'pricetag',
      priority: 'high',
      difficulty: 'intermediate',
      estimatedTime: 25,
      jordanSpecific: true,
      steps: [
        {
          id: 'market-research',
          title: 'Conduct Market Research',
          titleAr: 'إجراء بحث السوق',
          description: 'Research competitor prices in Zarqa and surrounding areas.',
          descriptionAr: 'ابحث في أسعار المنافسين في الزرقاء والمناطق المحيطة.',
        },
        {
          id: 'value-proposition',
          title: 'Define Your Value Proposition',
          titleAr: 'حدد اقتراح القيمة الخاص بك',
          description: 'Identify what makes your salon unique and worth the price.',
          descriptionAr: 'حدد ما يجعل صالونك فريداً ويستحق السعر.',
        },
        {
          id: 'pricing-tiers',
          title: 'Create Pricing Tiers',
          titleAr: 'أنشئ مستويات تسعير',
          description: 'Offer different service levels to accommodate various budgets.',
          descriptionAr: 'اعرض مستويات خدمة مختلفة لتناسب الميزانيات المتنوعة.',
        },
      ],
      benefits: [
        'Attracts price-conscious customers',
        'Maximizes revenue per customer',
        'Positions salon appropriately in market',
        'Improves profit margins',
      ],
      benefitsAr: [
        'يجذب العملاء المهتمين بالسعر',
        'يزيد الإيرادات لكل عميل',
        'يضع الصالون بشكل مناسب في السوق',
        'يحسن هوامش الربح',
      ],
      examples: [
        {
          id: 'pricing-example',
          title: 'Zarqa Market Pricing Guide',
          titleAr: 'دليل تسعير السوق في الزرقاء',
          description: 'Basic Haircut: 12-18 JOD, Premium Haircut: 20-25 JOD, Hair Color: 35-60 JOD',
          descriptionAr: 'قص شعر أساسي: 12-18 دينار، قص شعر مميز: 20-25 دينار، صبغة شعر: 35-60 دينار',
          type: 'neutral',
        },
      ],
      checklist: [
        { id: 'competitor-analysis', text: 'Complete competitor price analysis', textAr: 'أكمل تحليل أسعار المنافسين', completed: false, optional: false },
        { id: 'cost-calculation', text: 'Calculate service costs and margins', textAr: 'احسب تكاليف الخدمة والهوامش', completed: false, optional: false },
        { id: 'pricing-strategy', text: 'Document pricing strategy', textAr: 'وثق استراتيجية التسعير', completed: false, optional: true },
      ],
      tips: [
        'Consider offering package deals for multiple services',
        'Use psychological pricing (19 JOD instead of 20 JOD)',
        'Offer loyalty discounts for regular customers',
        'Adjust prices seasonally (higher during wedding season)',
      ],
      tipsAr: [
        'فكر في تقديم عروض باقات لخدمات متعددة',
        'استخدم التسعير النفسي (19 دينار بدلاً من 20 دينار)',
        'اعرض خصومات ولاء للعملاء المنتظمين',
        'اضبط الأسعار موسمياً (أعلى أثناء موسم الأعراس)',
      ],
    },
    {
      id: 'ramadan-operations',
      category: 'operations',
      title: 'Optimizing Operations During Ramadan',
      titleAr: 'تحسين العمليات خلال رمضان',
      description: 'Adapting your beauty business for Ramadan season in Jordan.',
      descriptionAr: 'تكييف عملك في مجال الجمال لموسم رمضان في الأردن.',
      icon: 'moon',
      priority: 'medium',
      difficulty: 'intermediate',
      estimatedTime: 30,
      jordanSpecific: true,
      steps: [
        {
          id: 'schedule-adjustment',
          title: 'Adjust Operating Hours',
          titleAr: 'اضبط ساعات التشغيل',
          description: 'Shift hours to accommodate Ramadan schedule and customer preferences.',
          descriptionAr: 'غيّر الساعات لتتناسب مع جدول رمضان وتفضيلات العملاء.',
        },
        {
          id: 'service-modifications',
          title: 'Modify Service Offerings',
          titleAr: 'عدّل عروض الخدمات',
          description: 'Focus on services popular during Ramadan and Eid preparations.',
          descriptionAr: 'ركز على الخدمات الشائعة خلال رمضان وتحضيرات العيد.',
        },
        {
          id: 'staff-consideration',
          title: 'Support Fasting Staff',
          titleAr: 'ادعم الموظفين الصائمين',
          description: 'Accommodate staff who are fasting with flexible schedules.',
          descriptionAr: 'استوعب الموظفين الصائمين بجداول زمنية مرنة.',
        },
      ],
      benefits: [
        'Increased bookings for Eid preparations',
        'Better staff satisfaction',
        'Community respect and loyalty',
        'Higher revenue during special occasions',
      ],
      benefitsAr: [
        'زيادة الحجوزات لتحضيرات العيد',
        'رضا أفضل للموظفين',
        'احترام وولاء المجتمع',
        'إيرادات أعلى خلال المناسبات الخاصة',
      ],
      examples: [
        {
          id: 'ramadan-hours',
          title: 'Optimal Ramadan Schedule',
          titleAr: 'جدول رمضان الأمثل',
          description: 'Open 11 AM - 3 PM (before Iftar), 8 PM - 11 PM (after Iftar)',
          descriptionAr: 'مفتوح 11 صباحاً - 3 مساءً (قبل الإفطار)، 8 مساءً - 11 مساءً (بعد الإفطار)',
          type: 'success',
        },
      ],
      checklist: [
        { id: 'ramadan-schedule', text: 'Plan Ramadan operating schedule', textAr: 'خطط جدول العمل في رمضان', completed: false, optional: false },
        { id: 'eid-packages', text: 'Create Eid beauty packages', textAr: 'أنشئ باقات جمال العيد', completed: false, optional: false },
        { id: 'iftar-considerations', text: 'Plan break times for Iftar', textAr: 'خطط أوقات الراحة للإفطار', completed: false, optional: true },
      ],
      tips: [
        'Offer special Eid packages starting 2 weeks before',
        'Provide refreshments for breaking fast',
        'Decorate salon with Ramadan themes',
        'Send Ramadan greetings to customers',
      ],
      tipsAr: [
        'اعرض باقات العيد الخاصة قبل أسبوعين',
        'وفر المرطبات لكسر الصيام',
        'زيّن الصالون بمواضيع رمضان',
        'أرسل تهاني رمضان للعملاء',
      ],
    },
  ];

  useEffect(() => {
    setPractices(jordanBestPractices);
    filterPractices();
    calculateProgress();
  }, [selectedCategory]);

  const filterPractices = () => {
    if (selectedCategory === 'all') {
      setFilteredPractices(jordanBestPractices);
    } else {
      setFilteredPractices(jordanBestPractices.filter(practice => practice.category === selectedCategory));
    }
  };

  const calculateProgress = () => {
    const progress: CategoryProgress[] = [];
    
    categories.forEach(category => {
      if (category.id !== 'all') {
        const categoryPractices = jordanBestPractices.filter(p => p.category === category.id);
        const completed = categoryPractices.filter(p => userProgress.get(p.id)).length;
        
        progress.push({
          categoryId: category.id,
          totalPractices: categoryPractices.length,
          completedPractices: completed,
          percentage: categoryPractices.length > 0 ? (completed / categoryPractices.length) * 100 : 0,
        });
      }
    });
    
    setCategoryProgress(progress);
  };

  const togglePracticeExpansion = (practiceId: string) => {
    setExpandedPractice(expandedPractice === practiceId ? null : practiceId);
  };

  const toggleChecklistItem = (practiceId: string, itemId: string) => {
    setPractices(prev => 
      prev.map(practice => 
        practice.id === practiceId
          ? {
              ...practice,
              checklist: practice.checklist.map(item =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              )
            }
          : practice
      )
    );
  };

  const handleExternalLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return colors.success;
      case 'intermediate': return colors.warning;
      case 'advanced': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const renderCategoryChip = (category: any) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryChip,
        { borderColor: category.color },
        selectedCategory === category.id && { backgroundColor: category.color + '20' },
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Ionicons 
        name={category.icon as any} 
        size={16} 
        color={selectedCategory === category.id ? category.color : colors.text.secondary} 
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === category.id && { color: category.color, fontWeight: '600' },
        ]}
      >
        {isRTL ? category.nameAr : category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderPractice = (practice: BestPractice) => {
    const isExpanded = expandedPractice === practice.id;
    const completedItems = practice.checklist.filter(item => item.completed).length;
    const totalItems = practice.checklist.length;
    const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return (
      <Card key={practice.id} style={styles.practiceCard}>
        <TouchableOpacity
          style={styles.practiceHeader}
          onPress={() => togglePracticeExpansion(practice.id)}
          activeOpacity={0.7}
        >
          <View style={styles.practiceHeaderContent}>
            <View style={[styles.practiceIcon, { backgroundColor: getPriorityColor(practice.priority) + '20' }]}>
              <Ionicons 
                name={practice.icon as any} 
                size={24} 
                color={getPriorityColor(practice.priority)} 
              />
            </View>
            
            <View style={styles.practiceInfo}>
              <Text style={styles.practiceTitle}>
                {isRTL ? practice.titleAr : practice.title}
              </Text>
              <Text style={styles.practiceDescription}>
                {isRTL ? practice.descriptionAr : practice.description}
              </Text>
              
              <View style={styles.practiceMeta}>
                <Chip
                  mode="outlined"
                  textStyle={[styles.chipText, { color: getPriorityColor(practice.priority) }]}
                  style={[styles.priorityChip, { borderColor: getPriorityColor(practice.priority) }]}
                >
                  {t(`priority.${practice.priority}`)}
                </Chip>
                
                <Chip
                  mode="outlined"
                  textStyle={[styles.chipText, { color: getDifficultyColor(practice.difficulty) }]}
                  style={[styles.difficultyChip, { borderColor: getDifficultyColor(practice.difficulty) }]}
                >
                  {t(`difficulty.${practice.difficulty}`)}
                </Chip>
                
                <Text style={styles.estimatedTime}>
                  {practice.estimatedTime} {t('minutes')}
                </Text>
                
                {practice.jordanSpecific && (
                  <Chip
                    mode="outlined"
                    textStyle={[styles.chipText, { color: colors.secondary }]}
                    style={[styles.jordanChip, { borderColor: colors.secondary }]}
                  >
                    {t('jordanSpecific')}
                  </Chip>
                )}
              </View>
            </View>
          </View>
          
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.practiceContent}>
            {/* Progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>{t('progress')}</Text>
                <Text style={styles.progressText}>
                  {completedItems}/{totalItems} ({Math.round(progressPercentage)}%)
                </Text>
              </View>
              <ProgressBar
                progress={progressPercentage / 100}
                color={colors.primary}
                style={styles.progressBar}
              />
            </View>

            {/* Benefits */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('benefits')}</Text>
              {(isRTL ? practice.benefitsAr : practice.benefits).map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {/* Steps */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('steps')}</Text>
              {practice.steps.map((step, index) => (
                <View key={step.id} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>
                      {isRTL ? step.titleAr : step.title}
                    </Text>
                    <Text style={styles.stepDescription}>
                      {isRTL ? step.descriptionAr : step.description}
                    </Text>
                    {step.action && (
                      <TouchableOpacity
                        style={styles.stepAction}
                        onPress={() => handleExternalLink(step.action!)}
                      >
                        <Ionicons name="open" size={14} color={colors.primary} />
                        <Text style={styles.stepActionText}>{t('openLink')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Checklist */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('checklist')}</Text>
              {practice.checklist.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.checklistItem}
                  onPress={() => toggleChecklistItem(practice.id, item.id)}
                >
                  <Ionicons
                    name={item.completed ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={item.completed ? colors.success : colors.text.secondary}
                  />
                  <Text style={[
                    styles.checklistText,
                    item.completed && styles.checklistTextCompleted,
                  ]}>
                    {isRTL ? item.textAr : item.text}
                  </Text>
                  {item.optional && (
                    <Chip
                      mode="outlined"
                      textStyle={styles.optionalChipText}
                      style={styles.optionalChip}
                    >
                      {t('optional')}
                    </Chip>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Examples */}
            {practice.examples.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('examples')}</Text>
                {practice.examples.map((example) => (
                  <View key={example.id} style={[
                    styles.exampleItem,
                    { borderLeftColor: example.type === 'success' ? colors.success : 
                                      example.type === 'avoid' ? colors.error : colors.warning }
                  ]}>
                    <Text style={styles.exampleTitle}>
                      {isRTL ? example.titleAr : example.title}
                    </Text>
                    <Text style={styles.exampleDescription}>
                      {isRTL ? example.descriptionAr : example.description}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Tips */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('tips')}</Text>
              {(isRTL ? practice.tipsAr : practice.tips).map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Ionicons name="bulb" size={16} color={colors.warning} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('bestPractices')}</Text>
        <Text style={styles.headerSubtitle}>{t('bestPracticesSubtitle')}</Text>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map(renderCategoryChip)}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredPractices.length > 0 ? (
          <View style={styles.practicesContainer}>
            {filteredPractices.map(renderPractice)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="star" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyText}>{t('noPracticesFound')}</Text>
            <Text style={styles.emptySubtext}>{t('selectDifferentCategory')}</Text>
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
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.surface,
    marginHorizontal: 4,
  },
  categoryText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  practicesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  practiceCard: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  practiceHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  practiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  practiceInfo: {
    flex: 1,
  },
  practiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  practiceDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  practiceMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  priorityChip: {
    height: 24,
    marginRight: 6,
    marginBottom: 4,
  },
  difficultyChip: {
    height: 24,
    marginRight: 6,
    marginBottom: 4,
  },
  jordanChip: {
    height: 24,
    marginRight: 6,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 10,
  },
  estimatedTime: {
    fontSize: 12,
    color: colors.text.secondary,
    marginRight: 6,
    marginBottom: 4,
  },
  practiceContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  progressText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  stepAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  stepActionText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checklistText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  checklistTextCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.secondary,
  },
  optionalChip: {
    height: 20,
  },
  optionalChipText: {
    fontSize: 9,
  },
  exampleItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 8,
    backgroundColor: colors.text.secondary + '05',
    marginBottom: 12,
    borderRadius: 4,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  exampleDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});