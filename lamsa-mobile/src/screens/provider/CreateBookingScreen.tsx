import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  TextInput,
  useTheme,
  IconButton,
  List,
  Divider,
  Searchbar,
  Avatar,
  Modal,
  Portal,
  RadioButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import bookingService from '../../services/bookingService';
import { serviceManagementService } from '../../services/serviceManagementService';
import LoadingOverlay from '../../components/shared/LoadingOverlay';
import { ProviderStackParamList } from '../../navigation/ProviderStackNavigator';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

type CreateBookingScreenNavigationProp = NativeStackNavigationProp<
  ProviderStackParamList,
  'CreateBooking'
>;

interface Props {
  navigation: CreateBookingScreenNavigationProp;
}

const CreateBookingScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date());
  const [bookingTime, setBookingTime] = useState(new Date());
  const [specialRequests, setSpecialRequests] = useState('');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const providerServices = await serviceManagementService.getProviderServices(user?.id || '');
      setServices(providerServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert(t('common.error'), t('service.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setShowServiceModal(false);
    setServiceSearch('');
  };

  const validatePhoneNumber = (phone: string) => {
    const jordanianPhoneRegex = /^(\+962|0)?7[789]\d{7}$/;
    return jordanianPhoneRegex.test(phone);
  };

  const handleCreateBooking = async () => {
    if (!selectedService) {
      Alert.alert(t('common.error'), t('booking.selectService'));
      return;
    }

    if (!customerName.trim()) {
      Alert.alert(t('common.error'), t('booking.enterCustomerName'));
      return;
    }

    if (!customerPhone.trim()) {
      Alert.alert(t('common.error'), t('booking.enterCustomerPhone'));
      return;
    }

    if (!validatePhoneNumber(customerPhone)) {
      Alert.alert(t('common.error'), t('auth.invalidPhone'));
      return;
    }

    try {
      setLoading(true);

      const bookingData = {
        service_id: selectedService.id,
        provider_id: user?.id || '',
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        booking_date: bookingDate.toISOString().split('T')[0],
        booking_time: `${bookingTime.getHours().toString().padStart(2, '0')}:${bookingTime.getMinutes().toString().padStart(2, '0')}`,
        duration_minutes: selectedService.duration || 60,
        total_amount: selectedService.price,
        special_requests: specialRequests || null,
        payment_method: 'cash' as const,
        status: 'confirmed',
      };

      await bookingService.createBooking(bookingData);
      Alert.alert(
        t('common.success'),
        t('booking.createdSuccessfully'),
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert(t('common.error'), t('booking.errorCreating'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString(isRTL ? 'ar-JO' : 'en-US', options);
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? (isRTL ? 'م' : 'PM') : (isRTL ? 'ص' : 'AM');
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  if (loading && services.length === 0) {
    return <LoadingOverlay visible={true} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL ? 'arrow-right' : 'arrow-left'}
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineSmall">{t('booking.createNew')}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.content}>
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('booking.selectService')}
          </Text>
          <List.Item
            title={selectedService ? selectedService.name : t('booking.tapToSelect')}
            description={
              selectedService
                ? `${selectedService.duration} ${t('common.minutes')} - ${selectedService.price} ${t('common.currency')}`
                : null
            }
            onPress={() => setShowServiceModal(true)}
            left={(props) => <List.Icon {...props} icon="content-cut" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('booking.customerInfo')}
          </Text>
          <TextInput
            mode="outlined"
            label={t('booking.customerName')}
            value={customerName}
            onChangeText={setCustomerName}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label={t('booking.customerPhone')}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label={t('booking.customerEmail')}
            value={customerEmail}
            onChangeText={setCustomerEmail}
            keyboardType="email-address"
            style={styles.input}
          />
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('booking.dateTime')}
          </Text>
          <List.Item
            title={t('booking.date')}
            description={formatDate(bookingDate)}
            onPress={() => setShowDatePicker(true)}
            left={(props) => <List.Icon {...props} icon="calendar" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title={t('booking.time')}
            description={formatTime(bookingTime)}
            onPress={() => setShowTimePicker(true)}
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('booking.additionalInfo')}
          </Text>
          <TextInput
            mode="outlined"
            label={t('booking.specialRequests')}
            value={specialRequests}
            onChangeText={setSpecialRequests}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
        </Surface>

        <Button
          mode="contained"
          onPress={handleCreateBooking}
          style={styles.createButton}
          loading={loading}
          disabled={loading}
        >
          {t('booking.create')}
        </Button>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={bookingDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setBookingDate(selectedDate);
            }
          }}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={bookingTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedTime) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (selectedTime) {
              setBookingTime(selectedTime);
            }
          }}
        />
      )}

      <Portal>
        <Modal
          visible={showServiceModal}
          onDismiss={() => setShowServiceModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {t('booking.selectService')}
          </Text>
          <Searchbar
            placeholder={t('common.search')}
            onChangeText={setServiceSearch}
            value={serviceSearch}
            style={styles.searchbar}
          />
          <ScrollView style={styles.serviceList}>
            {filteredServices.map((service) => (
              <React.Fragment key={service.id}>
                <List.Item
                  title={service.name}
                  description={`${service.duration} ${t('common.minutes')} - ${service.price} ${t('common.currency')}`}
                  onPress={() => handleServiceSelect(service)}
                  left={(props) => (
                    <Avatar.Icon
                      {...props}
                      icon="content-cut"
                      size={40}
                      style={{ backgroundColor: theme.colors.primaryContainer }}
                    />
                  )}
                  right={() => (
                    <RadioButton
                      value={service.id}
                      status={selectedService?.id === service.id ? 'checked' : 'unchecked'}
                      onPress={() => handleServiceSelect(service)}
                    />
                  )}
                />
                <Divider />
              </React.Fragment>
            ))}
          </ScrollView>
          <Button
            mode="text"
            onPress={() => setShowServiceModal(false)}
            style={styles.modalButton}
          >
            {t('common.close')}
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 16,
    color: '#FF8FAB',
  },
  input: {
    marginBottom: 12,
  },
  createButton: {
    margin: 16,
    marginTop: 8,
  },
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    padding: 20,
    paddingBottom: 10,
  },
  searchbar: {
    marginHorizontal: 20,
    marginBottom: 10,
    elevation: 0,
    backgroundColor: '#F5F5F5',
  },
  serviceList: {
    maxHeight: 400,
  },
  modalButton: {
    margin: 10,
  },
});

export default CreateBookingScreen;