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
  RadioButton,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n from '../../i18n';
import { AuthContext } from '../../contexts/AuthContext';
import LoadingOverlay from '../../components/shared/LoadingOverlay';

type CustomerStackParamList = {
  Checkout: { bookingId: string; amount: number };
  PaymentMethods: { returnTo: 'Checkout' };
  PaymentConfirmation: { 
    paymentId: string;
    bookingId: string;
    amount: number;
    status: 'success' | 'failure';
  };
};

type CheckoutScreenNavigationProp = NativeStackNavigationProp<
  CustomerStackParamList,
  'Checkout'
>;

type CheckoutScreenRouteProp = RouteProp<
  CustomerStackParamList,
  'Checkout'
>;

interface Props {
  navigation: CheckoutScreenNavigationProp;
  route: CheckoutScreenRouteProp;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'cash';
  last4?: string;
  brand?: string;
  isDefault?: boolean;
}

const CheckoutScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const { bookingId, amount } = route.params;
  const isRTL = i18n.locale === 'ar';

  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [discount, setDiscount] = useState(0);

  // Mock payment methods - replace with actual data
  const paymentMethods: PaymentMethod[] = [
    { id: 'cash', type: 'cash' },
    { id: 'card1', type: 'card', last4: '4242', brand: 'Visa', isDefault: true },
    { id: 'card2', type: 'card', last4: '5555', brand: 'Mastercard' },
  ];

  const subtotal = amount;
  const taxRate = 0.16; // 16% tax
  const tax = subtotal * taxRate;
  const total = subtotal - discount + tax;

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'FIRST10') {
      setDiscount(subtotal * 0.1); // 10% discount
      setPromoApplied(true);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setDiscount(0);
    setPromoApplied(false);
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate to payment confirmation
      navigation.navigate('PaymentConfirmation', {
        paymentId: 'PAY-' + Math.random().toString(36).substr(2, 9),
        bookingId,
        amount: total,
        status: 'success',
      });
    } catch (error) {
      console.error('Payment error:', error);
      navigation.navigate('PaymentConfirmation', {
        paymentId: '',
        bookingId,
        amount: total,
        status: 'failure',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedPaymentMethod === method.id;
    
    return (
      <Surface
        key={method.id}
        style={[
          styles.paymentMethodCard,
          isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
        ]}
        elevation={1}
      >
        <RadioButton.Android
          value={method.id}
          status={isSelected ? 'checked' : 'unchecked'}
          onPress={() => setSelectedPaymentMethod(method.id)}
          color={theme.colors.primary}
        />
        <View style={styles.paymentMethodInfo}>
          {method.type === 'cash' ? (
            <>
              <MaterialCommunityIcons
                name="cash"
                size={24}
                color={theme.colors.onSurface}
              />
              <Text variant="bodyLarge" style={styles.paymentMethodText}>
                {i18n.t('checkout.cashPayment')}
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons
                name={method.brand?.toLowerCase() === 'visa' ? 'credit-card' : 'credit-card-outline'}
                size={24}
                color={theme.colors.onSurface}
              />
              <View style={styles.cardInfo}>
                <Text variant="bodyLarge" style={styles.paymentMethodText}>
                  {method.brand} •••• {method.last4}
                </Text>
                {method.isDefault && (
                  <Chip style={styles.defaultChip} textStyle={styles.defaultChipText}>
                    {i18n.t('checkout.default')}
                  </Chip>
                )}
              </View>
            </>
          )}
        </View>
      </Surface>
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
          {i18n.t('checkout.title')}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Summary */}
          <Surface style={styles.summaryCard} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {i18n.t('checkout.orderSummary')}
            </Text>
            
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">{i18n.t('checkout.subtotal')}</Text>
              <Text variant="bodyLarge">{subtotal.toFixed(2)} {i18n.t('common.currency')}</Text>
            </View>
            
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text variant="bodyLarge" style={{ color: theme.colors.primary }}>
                  {i18n.t('checkout.discount')}
                </Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.primary }}>
                  -{discount.toFixed(2)} {i18n.t('common.currency')}
                </Text>
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">{i18n.t('checkout.tax')} (16%)</Text>
              <Text variant="bodyLarge">{tax.toFixed(2)} {i18n.t('common.currency')}</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text variant="titleLarge" style={styles.totalLabel}>
                {i18n.t('checkout.total')}
              </Text>
              <Text variant="headlineMedium" style={[styles.totalAmount, { color: theme.colors.primary }]}>
                {total.toFixed(2)} {i18n.t('common.currency')}
              </Text>
            </View>
          </Surface>

          {/* Promo Code */}
          <Surface style={styles.promoCard} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {i18n.t('checkout.promoCode')}
            </Text>
            
            {!promoApplied ? (
              <View style={styles.promoInputRow}>
                <TextInput
                  mode="outlined"
                  placeholder={i18n.t('checkout.enterPromoCode')}
                  value={promoCode}
                  onChangeText={setPromoCode}
                  style={styles.promoInput}
                  dense
                />
                <Button
                  mode="contained-tonal"
                  onPress={handleApplyPromo}
                  disabled={!promoCode}
                  style={styles.applyButton}
                >
                  {i18n.t('checkout.apply')}
                </Button>
              </View>
            ) : (
              <View style={styles.appliedPromo}>
                <Chip
                  icon="ticket-percent"
                  onClose={handleRemovePromo}
                  style={styles.promoChip}
                >
                  {promoCode} - 10% {i18n.t('checkout.off')}
                </Chip>
              </View>
            )}
          </Surface>

          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <View style={styles.paymentHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {i18n.t('checkout.paymentMethod')}
              </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('PaymentMethods', { returnTo: 'Checkout' })}
              >
                {i18n.t('checkout.addNew')}
              </Button>
            </View>
            
            <View style={styles.paymentMethods}>
              {paymentMethods.map(renderPaymentMethod)}
            </View>
          </View>

          {/* Payment Note */}
          {selectedPaymentMethod === 'cash' && (
            <Surface style={styles.noteCard} elevation={1}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color={theme.colors.primary}
              />
              <Text variant="bodyMedium" style={styles.noteText}>
                {i18n.t('checkout.cashNote')}
              </Text>
            </Surface>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handlePayment}
          style={styles.payButton}
          labelStyle={styles.payButtonLabel}
          contentStyle={styles.payButtonContent}
        >
          {selectedPaymentMethod === 'cash'
            ? i18n.t('checkout.confirmBooking')
            : i18n.t('checkout.payNow', { amount: total.toFixed(2) })
          }
        </Button>
      </View>

      <LoadingOverlay
        visible={loading}
        message={i18n.t('checkout.processingPayment')}
      />
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
    padding: 16,
    paddingBottom: 100,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  totalLabel: {
    fontWeight: '600',
  },
  totalAmount: {
    fontWeight: 'bold',
  },
  promoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  promoInput: {
    flex: 1,
  },
  applyButton: {
    alignSelf: 'center',
  },
  appliedPromo: {
    flexDirection: 'row',
  },
  promoChip: {
    backgroundColor: 'rgba(255, 143, 171, 0.1)',
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentMethodInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  paymentMethodText: {
    fontWeight: '500',
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  defaultChip: {
    height: 24,
    backgroundColor: 'rgba(255, 143, 171, 0.1)',
  },
  defaultChipText: {
    fontSize: 12,
  },
  noteCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 143, 171, 0.05)',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    opacity: 0.8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  payButton: {
    borderRadius: 28,
  },
  payButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  payButtonContent: {
    paddingVertical: 8,
  },
});

export default CheckoutScreen;