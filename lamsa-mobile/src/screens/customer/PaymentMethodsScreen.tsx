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
  IconButton,
  Button,
  useTheme,
  List,
  Divider,
  FAB,
  Portal,
  Modal,
  TextInput,
  RadioButton,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n from '../../i18n';

type StackParamList = {
  PaymentMethods: undefined;
  Settings: undefined;
};

type PaymentMethodsScreenNavigationProp = NativeStackNavigationProp<
  StackParamList,
  'PaymentMethods'
>;

interface Props {
  navigation: PaymentMethodsScreenNavigationProp;
}

interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'amex';
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  holderName: string;
}

const PaymentMethodsScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const isRTL = i18n.locale === 'ar';

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // New card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [errors, setErrors] = useState({
    cardNumber: '',
    cardHolderName: '',
    expiryDate: '',
    cvv: '',
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const saved = await AsyncStorage.getItem('payment_methods');
      if (saved) {
        setPaymentMethods(JSON.parse(saved));
      } else {
        // Mock data for demo
        const mockMethods: PaymentMethod[] = [
          {
            id: '1',
            type: 'visa',
            last4: '4242',
            expiryMonth: '12',
            expiryYear: '25',
            isDefault: true,
            holderName: 'John Doe',
          },
          {
            id: '2',
            type: 'mastercard',
            last4: '5555',
            expiryMonth: '06',
            expiryYear: '26',
            isDefault: false,
            holderName: 'John Doe',
          },
        ];
        setPaymentMethods(mockMethods);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'visa':
        return 'credit-card';
      case 'mastercard':
        return 'credit-card';
      case 'amex':
        return 'credit-card';
      default:
        return 'credit-card-outline';
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ');
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const detectCardType = (number: string): 'visa' | 'mastercard' | 'amex' => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5')) return 'mastercard';
    if (cleaned.startsWith('3')) return 'amex';
    return 'visa';
  };

  const validateCardForm = (): boolean => {
    const newErrors = {
      cardNumber: '',
      cardHolderName: '',
      expiryDate: '',
      cvv: '',
    };

    // Card number validation
    const cleanedNumber = cardNumber.replace(/\s/g, '');
    if (!cleanedNumber) {
      newErrors.cardNumber = i18n.t('paymentMethods.validation.cardNumberRequired');
    } else if (cleanedNumber.length < 15 || cleanedNumber.length > 16) {
      newErrors.cardNumber = i18n.t('paymentMethods.validation.invalidCardNumber');
    }

    // Holder name validation
    if (!cardHolderName.trim()) {
      newErrors.cardHolderName = i18n.t('paymentMethods.validation.holderNameRequired');
    }

    // Expiry date validation
    if (!expiryDate) {
      newErrors.expiryDate = i18n.t('paymentMethods.validation.expiryDateRequired');
    } else {
      const [month, year] = expiryDate.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (!month || !year || parseInt(month) > 12 || parseInt(month) < 1) {
        newErrors.expiryDate = i18n.t('paymentMethods.validation.invalidExpiryDate');
      } else if (parseInt(year) < currentYear || 
                (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiryDate = i18n.t('paymentMethods.validation.cardExpired');
      }
    }

    // CVV validation
    if (!cvv) {
      newErrors.cvv = i18n.t('paymentMethods.validation.cvvRequired');
    } else if (cvv.length < 3 || cvv.length > 4) {
      newErrors.cvv = i18n.t('paymentMethods.validation.invalidCvv');
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleAddCard = async () => {
    if (!validateCardForm()) {
      return;
    }

    setLoading(true);
    try {
      const cleanedNumber = cardNumber.replace(/\s/g, '');
      const [month, year] = expiryDate.split('/');
      
      const newMethod: PaymentMethod = {
        id: Date.now().toString(),
        type: detectCardType(cleanedNumber),
        last4: cleanedNumber.slice(-4),
        expiryMonth: month,
        expiryYear: year,
        isDefault: makeDefault || paymentMethods.length === 0,
        holderName: cardHolderName,
      };

      const updatedMethods = [...paymentMethods];
      if (newMethod.isDefault) {
        updatedMethods.forEach(m => m.isDefault = false);
      }
      updatedMethods.push(newMethod);

      await AsyncStorage.setItem('payment_methods', JSON.stringify(updatedMethods));
      setPaymentMethods(updatedMethods);

      // Reset form
      setCardNumber('');
      setCardHolderName('');
      setExpiryDate('');
      setCvv('');
      setMakeDefault(false);
      setShowAddModal(false);

      setSnackbarMessage(i18n.t('paymentMethods.cardAdded'));
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Error adding card:', error);
      setSnackbarMessage(i18n.t('paymentMethods.addCardError'));
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    const updatedMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === methodId,
    }));
    
    await AsyncStorage.setItem('payment_methods', JSON.stringify(updatedMethods));
    setPaymentMethods(updatedMethods);
    
    setSnackbarMessage(i18n.t('paymentMethods.defaultChanged'));
    setSnackbarVisible(true);
  };

  const handleDeleteCard = (methodId: string) => {
    Alert.alert(
      i18n.t('paymentMethods.deleteCard'),
      i18n.t('paymentMethods.deleteCardConfirmation'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const updatedMethods = paymentMethods.filter(m => m.id !== methodId);
            if (updatedMethods.length > 0 && !updatedMethods.some(m => m.isDefault)) {
              updatedMethods[0].isDefault = true;
            }
            
            await AsyncStorage.setItem('payment_methods', JSON.stringify(updatedMethods));
            setPaymentMethods(updatedMethods);
            
            setSnackbarMessage(i18n.t('paymentMethods.cardDeleted'));
            setSnackbarVisible(true);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL ? "arrow-right" : "arrow-left"}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          {i18n.t('paymentMethods.title')}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="credit-card-off"
              size={64}
              color={theme.colors.onSurfaceVariant}
              style={styles.emptyIcon}
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              {i18n.t('paymentMethods.noCards')}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              {i18n.t('paymentMethods.noCardsDescription')}
            </Text>
            <Button
              mode="contained"
              onPress={() => setShowAddModal(true)}
              style={styles.addFirstButton}
            >
              {i18n.t('paymentMethods.addFirstCard')}
            </Button>
          </View>
        ) : (
          <View style={styles.cardsSection}>
            {paymentMethods.map((method, index) => (
              <React.Fragment key={method.id}>
                <Surface style={styles.cardItem} elevation={1}>
                  <View style={styles.cardContent}>
                    <MaterialCommunityIcons
                      name={getCardIcon(method.type)}
                      size={32}
                      color={theme.colors.primary}
                    />
                    <View style={styles.cardDetails}>
                      <Text variant="titleMedium">
                        •••• {method.last4}
                      </Text>
                      <Text variant="bodyMedium" style={styles.cardInfo}>
                        {method.holderName}
                      </Text>
                      <Text variant="bodySmall" style={styles.cardExpiry}>
                        {i18n.t('paymentMethods.expires')} {method.expiryMonth}/{method.expiryYear}
                      </Text>
                    </View>
                    <View style={styles.cardActions}>
                      {method.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text variant="labelSmall" style={styles.defaultText}>
                            {i18n.t('paymentMethods.default')}
                          </Text>
                        </View>
                      )}
                      <View style={styles.actionButtons}>
                        {!method.isDefault && (
                          <IconButton
                            icon="star-outline"
                            size={20}
                            onPress={() => handleSetDefault(method.id)}
                          />
                        )}
                        <IconButton
                          icon="delete"
                          size={20}
                          onPress={() => handleDeleteCard(method.id)}
                        />
                      </View>
                    </View>
                  </View>
                </Surface>
                {index < paymentMethods.length - 1 && <Divider style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {paymentMethods.length > 0 && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowAddModal(true)}
        />
      )}

      {/* Add Card Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => setShowAddModal(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              {i18n.t('paymentMethods.addCard')}
            </Text>

            <TextInput
              label={i18n.t('paymentMethods.cardNumber')}
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              maxLength={19}
              error={!!errors.cardNumber}
              left={<TextInput.Icon icon={getCardIcon(detectCardType(cardNumber))} />}
            />
            {errors.cardNumber ? (
              <Text variant="bodySmall" style={styles.errorText}>
                {errors.cardNumber}
              </Text>
            ) : null}

            <TextInput
              label={i18n.t('paymentMethods.cardHolderName')}
              value={cardHolderName}
              onChangeText={setCardHolderName}
              mode="outlined"
              style={styles.input}
              error={!!errors.cardHolderName}
            />
            {errors.cardHolderName ? (
              <Text variant="bodySmall" style={styles.errorText}>
                {errors.cardHolderName}
              </Text>
            ) : null}

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  label={i18n.t('paymentMethods.expiryDate')}
                  value={expiryDate}
                  onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="MM/YY"
                  maxLength={5}
                  error={!!errors.expiryDate}
                />
                {errors.expiryDate ? (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {errors.expiryDate}
                  </Text>
                ) : null}
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  label={i18n.t('paymentMethods.cvv')}
                  value={cvv}
                  onChangeText={setCvv}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  error={!!errors.cvv}
                />
                {errors.cvv ? (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {errors.cvv}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.checkboxRow}>
              <RadioButton
                value="default"
                status={makeDefault ? 'checked' : 'unchecked'}
                onPress={() => setMakeDefault(!makeDefault)}
              />
              <Text variant="bodyMedium" onPress={() => setMakeDefault(!makeDefault)}>
                {i18n.t('paymentMethods.setAsDefault')}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowAddModal(false)}
                style={styles.modalButton}
              >
                {i18n.t('common.cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleAddCard}
                loading={loading}
                disabled={loading}
                style={styles.modalButton}
              >
                {i18n.t('paymentMethods.addCard')}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 100,
  },
  emptyIcon: {
    marginBottom: 24,
    opacity: 0.6,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
  },
  addFirstButton: {
    borderRadius: 28,
  },
  cardsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardItem: {
    borderRadius: 12,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardDetails: {
    flex: 1,
    marginLeft: 16,
  },
  cardInfo: {
    opacity: 0.7,
    marginTop: 4,
  },
  cardExpiry: {
    opacity: 0.5,
    marginTop: 2,
  },
  cardActions: {
    alignItems: 'flex-end',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  defaultText: {
    color: 'white',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  divider: {
    marginVertical: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    color: '#B00020',
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    borderRadius: 28,
  },
});

export default PaymentMethodsScreen;