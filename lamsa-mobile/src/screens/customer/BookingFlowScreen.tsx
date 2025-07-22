import React, { useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  TextInput,
  useTheme,
  IconButton,
  Divider,
  List,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import i18n from '../../i18n';
import { AuthContext } from '../../contexts/AuthContext';
import ProgressIndicator from '../../components/shared/ProgressIndicator';
import LoadingOverlay from '../../components/shared/LoadingOverlay';

type CustomerStackParamList = {
  BookingFlow: { serviceId: string; providerId: string };
  DateTimeSelection: { 
    serviceId: string; 
    providerId: string;
    serviceName: string;
    providerName: string;
    price: number;
    duration: number;
    specialRequests?: string;
  };
  BookingConfirmation: {
    bookingData: BookingData;
  };
};

type BookingFlowScreenNavigationProp = NativeStackNavigationProp<
  CustomerStackParamList,
  'BookingFlow'
>;

type BookingFlowScreenRouteProp = RouteProp<
  CustomerStackParamList,
  'BookingFlow'
>;

interface Props {
  navigation: BookingFlowScreenNavigationProp;
  route: BookingFlowScreenRouteProp;
}

interface BookingData {
  serviceId: string;
  providerId: string;
  serviceName: string;
  providerName: string;
  price: number;
  duration: number;
  specialRequests?: string;
  selectedDate?: Date;
  selectedTime?: string;
}

const BookingFlowScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const { serviceId, providerId } = route.params;
  const isRTL = i18n.locale === 'ar';

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData>({
    serviceId,
    providerId,
    serviceName: '', // Will be fetched
    providerName: '', // Will be fetched
    price: 0, // Will be fetched
    duration: 0, // Will be fetched
    specialRequests: '',
  });

  // Temporary mock data - replace with actual API call
  React.useEffect(() => {
    fetchServiceAndProviderDetails();
  }, []);

  const fetchServiceAndProviderDetails = async () => {
    setLoading(true);
    // Mock data - replace with actual API calls
    setTimeout(() => {
      setBookingData(prev => ({
        ...prev,
        serviceName: 'Hair Styling & Treatment',
        providerName: 'Elite Beauty Salon',
        price: 45,
        duration: 90,
      }));
      setLoading(false);
    }, 1000);
  };

  const stepLabels = [
    i18n.t('booking.steps.serviceDetails'),
    i18n.t('booking.steps.specialRequests'),
    i18n.t('booking.steps.review'),
  ];

  const handleNext = () => {
    if (currentStep === 3) {
      // Proceed to date/time selection
      navigation.navigate('DateTimeSelection', {
        serviceId: bookingData.serviceId,
        providerId: bookingData.providerId,
        serviceName: bookingData.serviceName,
        providerName: bookingData.providerName,
        price: bookingData.price,
        duration: bookingData.duration,
        specialRequests: bookingData.specialRequests,
      });
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigation.goBack();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderServiceDetails();
      case 2:
        return renderSpecialRequests();
      case 3:
        return renderReview();
      default:
        return null;
    }
  };

  const renderServiceDetails = () => (
    <View style={styles.stepContent}>
      <Text variant="headlineSmall" style={styles.stepTitle}>
        {i18n.t('booking.serviceDetails')}
      </Text>
      
      <Surface style={styles.infoCard} elevation={1}>
        <View style={styles.infoRow}>
          <Text variant="bodyMedium" style={styles.label}>
            {i18n.t('booking.service')}:
          </Text>
          <Text variant="bodyLarge" style={styles.value}>
            {isRTL ? bookingData.serviceName : bookingData.serviceName}
          </Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.infoRow}>
          <Text variant="bodyMedium" style={styles.label}>
            {i18n.t('booking.provider')}:
          </Text>
          <Text variant="bodyLarge" style={styles.value}>
            {isRTL ? bookingData.providerName : bookingData.providerName}
          </Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.infoRow}>
          <Text variant="bodyMedium" style={styles.label}>
            {i18n.t('booking.duration')}:
          </Text>
          <Chip icon="clock-outline" style={styles.chip}>
            {bookingData.duration} {i18n.t('common.minutes')}
          </Chip>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.infoRow}>
          <Text variant="bodyMedium" style={styles.label}>
            {i18n.t('booking.price')}:
          </Text>
          <Text variant="headlineSmall" style={[styles.price, { color: theme.colors.primary }]}>
            {bookingData.price} {i18n.t('common.currency')}
          </Text>
        </View>
      </Surface>

      <List.Section>
        <List.Subheader>{i18n.t('booking.includedInService')}</List.Subheader>
        <List.Item
          title={i18n.t('booking.professionalService')}
          left={(props) => <List.Icon {...props} icon="check-circle" color={theme.colors.primary} />}
        />
        <List.Item
          title={i18n.t('booking.qualityProducts')}
          left={(props) => <List.Icon {...props} icon="check-circle" color={theme.colors.primary} />}
        />
        <List.Item
          title={i18n.t('booking.satisfactionGuarantee')}
          left={(props) => <List.Icon {...props} icon="check-circle" color={theme.colors.primary} />}
        />
      </List.Section>
    </View>
  );

  const renderSpecialRequests = () => (
    <View style={styles.stepContent}>
      <Text variant="headlineSmall" style={styles.stepTitle}>
        {i18n.t('booking.specialRequests')}
      </Text>
      <Text variant="bodyLarge" style={styles.stepSubtitle}>
        {i18n.t('booking.specialRequestsSubtitle')}
      </Text>

      <TextInput
        mode="outlined"
        label={i18n.t('booking.specialRequestsLabel')}
        placeholder={i18n.t('booking.specialRequestsPlaceholder')}
        value={bookingData.specialRequests}
        onChangeText={(text) => setBookingData(prev => ({ ...prev, specialRequests: text }))}
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />

      <View style={styles.examplesContainer}>
        <Text variant="labelLarge" style={styles.examplesTitle}>
          {i18n.t('booking.exampleRequests')}:
        </Text>
        {[
          i18n.t('booking.exampleRequest1'),
          i18n.t('booking.exampleRequest2'),
          i18n.t('booking.exampleRequest3'),
        ].map((example, index) => (
          <Chip
            key={index}
            style={styles.exampleChip}
            onPress={() => setBookingData(prev => ({ 
              ...prev, 
              specialRequests: prev.specialRequests 
                ? `${prev.specialRequests}\n${example}`
                : example
            }))}
          >
            {example}
          </Chip>
        ))}
      </View>
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepContent}>
      <Text variant="headlineSmall" style={styles.stepTitle}>
        {i18n.t('booking.reviewBooking')}
      </Text>

      <Surface style={styles.reviewCard} elevation={2}>
        <Text variant="titleMedium" style={styles.reviewSectionTitle}>
          {i18n.t('booking.bookingSummary')}
        </Text>
        
        <View style={styles.reviewItem}>
          <Text variant="bodyMedium" style={styles.reviewLabel}>
            {i18n.t('booking.service')}
          </Text>
          <Text variant="bodyLarge" style={styles.reviewValue}>
            {bookingData.serviceName}
          </Text>
        </View>

        <View style={styles.reviewItem}>
          <Text variant="bodyMedium" style={styles.reviewLabel}>
            {i18n.t('booking.provider')}
          </Text>
          <Text variant="bodyLarge" style={styles.reviewValue}>
            {bookingData.providerName}
          </Text>
        </View>

        <View style={styles.reviewItem}>
          <Text variant="bodyMedium" style={styles.reviewLabel}>
            {i18n.t('booking.duration')}
          </Text>
          <Text variant="bodyLarge" style={styles.reviewValue}>
            {bookingData.duration} {i18n.t('common.minutes')}
          </Text>
        </View>

        {bookingData.specialRequests && (
          <View style={styles.reviewItem}>
            <Text variant="bodyMedium" style={styles.reviewLabel}>
              {i18n.t('booking.specialRequests')}
            </Text>
            <Text variant="bodyLarge" style={styles.reviewValue}>
              {bookingData.specialRequests}
            </Text>
          </View>
        )}

        <Divider style={styles.priceDivider} />

        <View style={styles.priceRow}>
          <Text variant="titleLarge">{i18n.t('booking.total')}</Text>
          <Text variant="headlineMedium" style={[styles.totalPrice, { color: theme.colors.primary }]}>
            {bookingData.price} {i18n.t('common.currency')}
          </Text>
        </View>
      </Surface>

      <Text variant="bodyMedium" style={styles.nextStepHint}>
        {i18n.t('booking.nextStepHint')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL ? "arrow-right" : "arrow-left"}
          size={24}
          onPress={handleBack}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          {i18n.t('booking.title')}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ProgressIndicator
        currentStep={currentStep}
        totalSteps={3}
        stepLabels={stepLabels}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.nextButton}
          labelStyle={styles.buttonLabel}
          contentStyle={styles.buttonContent}
        >
          {currentStep === 3 
            ? i18n.t('booking.selectDateTime')
            : i18n.t('common.next')
          }
        </Button>
      </View>

      <LoadingOverlay visible={loading} message={i18n.t('common.loading')} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  stepContent: {
    flex: 1,
    paddingVertical: 16,
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    opacity: 0.7,
    marginBottom: 24,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    opacity: 0.7,
  },
  value: {
    fontWeight: '500',
  },
  divider: {
    marginVertical: 8,
  },
  chip: {
    backgroundColor: 'transparent',
  },
  price: {
    fontWeight: 'bold',
  },
  textArea: {
    marginBottom: 16,
  },
  examplesContainer: {
    marginTop: 16,
  },
  examplesTitle: {
    marginBottom: 8,
  },
  exampleChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  reviewCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  reviewSectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  reviewItem: {
    marginBottom: 12,
  },
  reviewLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  reviewValue: {
    fontWeight: '500',
  },
  priceDivider: {
    marginVertical: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPrice: {
    fontWeight: 'bold',
  },
  nextStepHint: {
    textAlign: 'center',
    opacity: 0.7,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  nextButton: {
    borderRadius: 28,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default BookingFlowScreen;