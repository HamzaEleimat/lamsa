import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { Text, Card, ActivityIndicator, Portal, Modal, TextInput, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';

interface SupportOption {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  action: string;
  priority: number;
  available: boolean;
  estimatedResponseTime?: string;
  estimatedResponseTimeAr?: string;
  color: string;
  jordanSpecific?: boolean;
}

interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  lastUpdated: string;
  responses: SupportResponse[];
}

interface SupportResponse {
  id: string;
  from: 'user' | 'support';
  message: string;
  timestamp: string;
  attachments?: string[];
}

export default function SupportScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    category: '',
    subject: '',
    description: '',
    priority: 'medium' as const,
  });
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  // Support options with Jordan market focus
  const supportOptions: SupportOption[] = [
    {
      id: 'whatsapp-support',
      title: 'WhatsApp Support',
      titleAr: 'دعم واتساب',
      description: 'Chat with our support team on WhatsApp. Most popular in Jordan!',
      descriptionAr: 'تحدث مع فريق الدعم على واتساب. الأكثر شعبية في الأردن!',
      icon: 'logo-whatsapp',
      action: 'whatsapp',
      priority: 10,
      available: true,
      estimatedResponseTime: 'Usually within 30 minutes',
      estimatedResponseTimeAr: 'عادة خلال 30 دقيقة',
      color: '#25D366',
      jordanSpecific: true,
    },
    {
      id: 'phone-support',
      title: 'Phone Support',
      titleAr: 'الدعم الهاتفي',
      description: 'Call us directly. Available in Arabic and English.',
      descriptionAr: 'اتصل بنا مباشرة. متوفر بالعربية والإنجليزية.',
      icon: 'call',
      action: 'phone',
      priority: 9,
      available: true,
      estimatedResponseTime: 'Sun-Thu: 9 AM - 6 PM',
      estimatedResponseTimeAr: 'الأحد-الخميس: 9 ص - 6 م',
      color: colors.primary,
    },
    {
      id: 'video-call',
      title: 'Video Call Support',
      titleAr: 'دعم المكالمة المرئية',
      description: 'Schedule a video call for personalized help with your salon setup.',
      descriptionAr: 'احجز مكالمة مرئية للحصول على مساعدة شخصية في إعداد صالونك.',
      icon: 'videocam',
      action: 'video-call',
      priority: 8,
      available: true,
      estimatedResponseTime: 'Book 24 hours ahead',
      estimatedResponseTimeAr: 'احجز قبل 24 ساعة',
      color: '#9C27B0',
    },
    {
      id: 'email-support',
      title: 'Email Support',
      titleAr: 'دعم البريد الإلكتروني',
      description: 'Send us a detailed message. Perfect for complex issues.',
      descriptionAr: 'أرسل لنا رسالة مفصلة. مثالي للمشاكل المعقدة.',
      icon: 'mail',
      action: 'email',
      priority: 7,
      available: true,
      estimatedResponseTime: 'Within 24 hours',
      estimatedResponseTimeAr: 'خلال 24 ساعة',
      color: '#FF9800',
    },
    {
      id: 'ticket-system',
      title: 'Submit Support Ticket',
      titleAr: 'إرسال تذكرة دعم',
      description: 'Create a support ticket to track your issue until resolved.',
      descriptionAr: 'أنشئ تذكرة دعم لتتبع مشكلتك حتى يتم حلها.',
      icon: 'ticket',
      action: 'ticket',
      priority: 6,
      available: true,
      estimatedResponseTime: 'Within 48 hours',
      estimatedResponseTimeAr: 'خلال 48 ساعة',
      color: '#607D8B',
    },
    {
      id: 'community-forum',
      title: 'Community Forum',
      titleAr: 'منتدى المجتمع',
      description: 'Ask questions and get help from other beauty providers in Jordan.',
      descriptionAr: 'اطرح الأسئلة واحصل على المساعدة من مقدمي خدمات الجمال الآخرين في الأردن.',
      icon: 'people',
      action: 'forum',
      priority: 5,
      available: true,
      estimatedResponseTime: 'Community answers',
      estimatedResponseTimeAr: 'إجابات من المجتمع',
      color: '#4CAF50',
    },
  ];

  const ticketCategories = [
    { id: 'technical', name: 'Technical Issue', nameAr: 'مشكلة تقنية' },
    { id: 'billing', name: 'Billing & Payments', nameAr: 'الفواتير والمدفوعات' },
    { id: 'account', name: 'Account Management', nameAr: 'إدارة الحساب' },
    { id: 'services', name: 'Service Management', nameAr: 'إدارة الخدمات' },
    { id: 'customers', name: 'Customer Issues', nameAr: 'مشاكل العملاء' },
    { id: 'feature', name: 'Feature Request', nameAr: 'طلب ميزة' },
    { id: 'other', name: 'Other', nameAr: 'أخرى' },
  ];

  useEffect(() => {
    loadUserTickets();
  }, []);

  const loadUserTickets = async () => {
    try {
      setLoading(true);
      // Mock data - in real app, this would fetch from API
      const mockTickets: SupportTicket[] = [
        {
          id: 'ticket-1',
          category: 'technical',
          subject: 'App crashes when adding photos',
          description: 'The app crashes every time I try to add photos to my services.',
          status: 'in_progress',
          priority: 'high',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          responses: [
            {
              id: 'response-1',
              from: 'user',
              message: 'The app crashes every time I try to add photos to my services.',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'response-2',
              from: 'support',
              message: 'Hi! We\'re looking into this issue. Can you tell us what phone model you\'re using?',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        },
      ];
      setUserTickets(mockTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSupportAction = async (action: string) => {
    switch (action) {
      case 'whatsapp':
        const whatsappNumber = '+962791234567'; // Jordan phone number format
        const message = encodeURIComponent(
          `مرحباً! أحتاج مساعدة في تطبيق بيوتي كورت.\nHello! I need help with BeautyCort app.\n\nProvider ID: ${user?.id || 'N/A'}`
        );
        const whatsappUrl = `whatsapp://send?phone=${whatsappNumber}&text=${message}`;
        
        try {
          const supported = await Linking.canOpenURL(whatsappUrl);
          if (supported) {
            await Linking.openURL(whatsappUrl);
          } else {
            Alert.alert(
              t('whatsappNotInstalled'),
              t('whatsappNotInstalledMessage'),
              [{ text: t('ok') }]
            );
          }
        } catch (error) {
          console.error('Error opening WhatsApp:', error);
        }
        break;

      case 'phone':
        const phoneNumber = '+962791234567';
        const phoneUrl = `tel:${phoneNumber}`;
        
        try {
          const supported = await Linking.canOpenURL(phoneUrl);
          if (supported) {
            await Linking.openURL(phoneUrl);
          } else {
            Alert.alert(
              t('cannotMakeCall'),
              t('cannotMakeCallMessage'),
              [{ text: t('ok') }]
            );
          }
        } catch (error) {
          console.error('Error making phone call:', error);
        }
        break;

      case 'video-call':
        // Navigate to video call booking screen
        navigation.navigate('VideoCallBooking');
        break;

      case 'email':
        const emailUrl = `mailto:support@beautycort.com?subject=${encodeURIComponent('BeautyCort Support Request')}&body=${encodeURIComponent(`Provider ID: ${user?.id || 'N/A'}\n\nPlease describe your issue:\n\n`)}`;
        
        try {
          const supported = await Linking.canOpenURL(emailUrl);
          if (supported) {
            await Linking.openURL(emailUrl);
          } else {
            Alert.alert(
              t('emailNotSetup'),
              t('emailNotSetupMessage'),
              [{ text: t('ok') }]
            );
          }
        } catch (error) {
          console.error('Error opening email:', error);
        }
        break;

      case 'ticket':
        setShowTicketModal(true);
        break;

      case 'forum':
        navigation.navigate('CommunityForum');
        break;

      default:
        console.warn('Unknown support action:', action);
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketForm.category || !ticketForm.subject || !ticketForm.description) {
      Alert.alert(t('incompleteForm'), t('incompleteFormMessage'), [{ text: t('ok') }]);
      return;
    }

    try {
      setLoading(true);
      
      // Create new ticket (mock implementation)
      const newTicket: SupportTicket = {
        id: `ticket-${Date.now()}`,
        category: ticketForm.category,
        subject: ticketForm.subject,
        description: ticketForm.description,
        status: 'open',
        priority: ticketForm.priority,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        responses: [
          {
            id: `response-${Date.now()}`,
            from: 'user',
            message: ticketForm.description,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      setUserTickets(prev => [newTicket, ...prev]);
      setShowTicketModal(false);
      setTicketForm({ category: '', subject: '', description: '', priority: 'medium' });

      Alert.alert(
        t('ticketSubmitted'),
        t('ticketSubmittedMessage'),
        [{ text: t('ok') }]
      );
    } catch (error) {
      console.error('Error submitting ticket:', error);
      Alert.alert(t('error'), t('ticketSubmissionError'), [{ text: t('ok') }]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return colors.warning;
      case 'in_progress': return colors.primary;
      case 'resolved': return colors.success;
      case 'closed': return colors.text.secondary;
      default: return colors.text.secondary;
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'urgent': return colors.error;
      case 'high': return colors.warning;
      case 'medium': return colors.primary;
      case 'low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-JO' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSupportOption = (option: SupportOption) => (
    <Card key={option.id} style={styles.supportCard}>
      <TouchableOpacity
        style={styles.supportOption}
        onPress={() => handleSupportAction(option.action)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
          <Ionicons name={option.icon as any} size={24} color={option.color} />
          {option.jordanSpecific && (
            <View style={styles.jordanBadge}>
              <Text style={styles.jordanBadgeText}>JO</Text>
            </View>
          )}
        </View>

        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>
            {isRTL ? option.titleAr : option.title}
          </Text>
          <Text style={styles.optionDescription}>
            {isRTL ? option.descriptionAr : option.description}
          </Text>
          {option.estimatedResponseTime && (
            <Text style={styles.responseTime}>
              ⏱️ {isRTL ? option.estimatedResponseTimeAr : option.estimatedResponseTime}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    </Card>
  );

  const renderTicketItem = (ticket: SupportTicket) => {
    const isExpanded = expandedTicket === ticket.id;
    const categoryName = ticketCategories.find(c => c.id === ticket.category);

    return (
      <Card key={ticket.id} style={styles.ticketCard}>
        <TouchableOpacity
          style={styles.ticketHeader}
          onPress={() => setExpandedTicket(isExpanded ? null : ticket.id)}
          activeOpacity={0.8}
        >
          <View style={styles.ticketHeaderContent}>
            <Text style={styles.ticketSubject} numberOfLines={1}>
              {ticket.subject}
            </Text>
            <View style={styles.ticketMeta}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                  {t(`ticketStatus.${ticket.status}`)}
                </Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) + '20' }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(ticket.priority) }]}>
                  {t(`priority.${ticket.priority}`)}
                </Text>
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
          <View style={styles.ticketContent}>
            <View style={styles.ticketDetails}>
              <Text style={styles.detailLabel}>{t('category')}: {isRTL ? categoryName?.nameAr : categoryName?.name}</Text>
              <Text style={styles.detailLabel}>{t('created')}: {formatDate(ticket.createdAt)}</Text>
              <Text style={styles.detailLabel}>{t('lastUpdated')}: {formatDate(ticket.lastUpdated)}</Text>
            </View>

            <View style={styles.responsesContainer}>
              <Text style={styles.responsesTitle}>{t('conversation')}</Text>
              {ticket.responses.map(response => (
                <View
                  key={response.id}
                  style={[
                    styles.responseItem,
                    response.from === 'user' ? styles.userResponse : styles.supportResponse,
                  ]}
                >
                  <View style={styles.responseHeader}>
                    <Text style={styles.responseFrom}>
                      {response.from === 'user' ? t('you') : t('support')}
                    </Text>
                    <Text style={styles.responseTime}>
                      {formatDate(response.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.responseMessage}>{response.message}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('customerSupport')}</Text>
        <Text style={styles.headerSubtitle}>{t('supportSubtitle')}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Emergency Support Banner */}
        <Card style={styles.emergencyBanner}>
          <View style={styles.emergencyContent}>
            <Ionicons name="warning" size={24} color={colors.warning} />
            <View style={styles.emergencyText}>
              <Text style={styles.emergencyTitle}>{t('urgentIssue')}</Text>
              <Text style={styles.emergencySubtitle}>{t('urgentIssueSubtitle')}</Text>
            </View>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={() => handleSupportAction('whatsapp')}
            >
              <Text style={styles.emergencyButtonText}>{t('contactNow')}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Support Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('howCanWeHelp')}</Text>
          {supportOptions
            .filter(option => option.available)
            .sort((a, b) => b.priority - a.priority)
            .map(renderSupportOption)}
        </View>

        {/* Recent Tickets */}
        {userTickets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('yourSupportTickets')}</Text>
            {userTickets.map(renderTicketItem)}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
          
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('FAQScreen')}
          >
            <Ionicons name="help-circle" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>{t('checkFAQ')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('VideoTutorials')}
          >
            <Ionicons name="play-circle" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>{t('watchTutorials')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('BestPractices')}
          >
            <Ionicons name="star" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>{t('bestPractices')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Support Ticket Modal */}
      <Portal>
        <Modal
          visible={showTicketModal}
          onDismiss={() => setShowTicketModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{t('submitSupportTicket')}</Text>
            <Text style={styles.modalSubtitle}>{t('submitTicketSubtitle')}</Text>

            {/* Category Selection */}
            <Text style={styles.fieldLabel}>{t('category')} *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {ticketCategories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    ticketForm.category === category.id && styles.selectedCategoryChip,
                  ]}
                  onPress={() => setTicketForm(prev => ({ ...prev, category: category.id }))}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      ticketForm.category === category.id && styles.selectedCategoryText,
                    ]}
                  >
                    {isRTL ? category.nameAr : category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Subject */}
            <Text style={styles.fieldLabel}>{t('subject')} *</Text>
            <TextInput
              mode="outlined"
              value={ticketForm.subject}
              onChangeText={(text) => setTicketForm(prev => ({ ...prev, subject: text }))}
              placeholder={t('subjectPlaceholder')}
              style={styles.textInput}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>{t('description')} *</Text>
            <TextInput
              mode="outlined"
              value={ticketForm.description}
              onChangeText={(text) => setTicketForm(prev => ({ ...prev, description: text }))}
              placeholder={t('descriptionPlaceholder')}
              multiline
              numberOfLines={4}
              style={[styles.textInput, styles.textArea]}
            />

            {/* Priority */}
            <Text style={styles.fieldLabel}>{t('priority')}</Text>
            <View style={styles.priorityContainer}>
              {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityChip,
                    ticketForm.priority === priority && styles.selectedPriorityChip,
                    { borderColor: getPriorityColor(priority) },
                  ]}
                  onPress={() => setTicketForm(prev => ({ ...prev, priority }))}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      ticketForm.priority === priority && { color: getPriorityColor(priority) },
                    ]}
                  >
                    {t(`priority.${priority}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowTicketModal(false)}
                style={styles.cancelButton}
              >
                {t('cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmitTicket}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
              >
                {t('submitTicket')}
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
  scrollView: {
    flex: 1,
  },
  emergencyBanner: {
    margin: 20,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  emergencyText: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  emergencySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emergencyButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  supportCard: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  jordanBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jordanBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  responseTime: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  ticketCard: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  ticketHeaderContent: {
    flex: 1,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  ticketMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ticketContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  ticketDetails: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.secondary + '20',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  responsesContainer: {
    marginTop: 8,
  },
  responsesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  responseItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  userResponse: {
    backgroundColor: colors.primary + '10',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  supportResponse: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: colors.text.secondary + '20',
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  responseFrom: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  responseTime: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  responseMessage: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 18,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 12,
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
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.text.secondary + '30',
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: 'white',
  },
  textInput: {
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  textArea: {
    height: 100,
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  priorityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  selectedPriorityChip: {
    backgroundColor: colors.background,
  },
  priorityChipText: {
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