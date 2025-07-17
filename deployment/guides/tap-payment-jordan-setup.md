# Tap Payment Gateway Setup for Jordan - Production Guide

This guide provides comprehensive instructions for integrating Tap Payment Gateway for the Jordan market in the BeautyCort application.

## Prerequisites

- Jordan business registration
- Jordan Central Bank approval for payment processing
- Tap Payment Gateway merchant account
- SSL certificate for production domain

## Step 1: Merchant Account Setup

### Create Tap Merchant Account

1. **Visit**: https://www.tap.company/jordan
2. **Apply for merchant account**:
   - Business registration documents
   - Central Bank of Jordan approval
   - Bank account details
   - Business license
3. **Complete KYC verification**
4. **Wait for approval** (usually 2-3 business days)

### Get API Credentials

```bash
# Test Environment
TAP_SECRET_KEY_TEST=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TAP_PUBLIC_KEY_TEST=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Production Environment
TAP_SECRET_KEY_PROD=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TAP_PUBLIC_KEY_PROD=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 2: Jordan-Specific Configuration

### Supported Payment Methods in Jordan

```javascript
// Supported payment methods for Jordan
const jordanPaymentMethods = {
  cards: {
    visa: true,
    mastercard: true,
    amex: true,
    mada: false // Saudi Arabia only
  },
  
  digitalWallets: {
    applePay: true,
    googlePay: true,
    samsungPay: true
  },
  
  bankTransfers: {
    fawry: false, // Egypt only
    benefit: false, // Bahrain only
    kfast: false // Kuwait only
  },
  
  // Jordan-specific payment methods
  localMethods: {
    postPay: true, // Jordan Post payment
    cashOnDelivery: true // For service-based payments
  }
};
```

### Currency and Pricing

```javascript
// Jordan Dinar (JOD) configuration
const jordanCurrency = {
  code: 'JOD',
  symbol: 'د.أ',
  decimals: 3, // Jordan Dinar has 3 decimal places
  minAmount: 1.000, // Minimum 1 JOD
  maxAmount: 10000.000, // Maximum 10,000 JOD per transaction
  
  // VAT configuration
  vat: {
    rate: 0.16, // 16% VAT in Jordan
    included: true
  }
};
```

## Step 3: Payment Service Implementation

### Create Payment Service Class

```javascript
// beautycort-api/src/services/paymentService.js
const axios = require('axios');

class TapPaymentService {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://api.tap.company/v2' 
      : 'https://api.tap.company/v2';
    
    this.secretKey = process.env.NODE_ENV === 'production'
      ? process.env.TAP_SECRET_KEY_PROD
      : process.env.TAP_SECRET_KEY_TEST;
      
    this.publicKey = process.env.NODE_ENV === 'production'
      ? process.env.TAP_PUBLIC_KEY_PROD
      : process.env.TAP_PUBLIC_KEY_TEST;
  }

  async createPayment(paymentData) {
    try {
      const payload = {
        amount: this.formatAmount(paymentData.amount),
        currency: 'JOD',
        threeDSecure: true,
        save_card: false,
        description: paymentData.description || 'BeautyCort Service Payment',
        
        // Customer information
        customer: {
          first_name: paymentData.customer.firstName,
          last_name: paymentData.customer.lastName,
          email: paymentData.customer.email,
          phone: {
            country_code: '962',
            number: paymentData.customer.phone.replace('+962', '')
          }
        },
        
        // Source (payment method)
        source: {
          id: paymentData.paymentMethodId || 'src_card'
        },
        
        // Post URL for payment completion
        post: {
          url: `${process.env.API_URL}/api/payments/webhook`
        },
        
        // Redirect URLs
        redirect: {
          url: `${process.env.WEB_URL}/payment/result`
        },
        
        // Metadata
        metadata: {
          bookingId: paymentData.bookingId,
          providerId: paymentData.providerId,
          serviceId: paymentData.serviceId
        }
      };

      const response = await axios.post(
        `${this.baseURL}/charges`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        chargeId: response.data.id,
        status: response.data.status,
        paymentUrl: response.data.transaction?.url,
        data: response.data
      };

    } catch (error) {
      console.error('Tap Payment Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async retrievePayment(chargeId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/charges/${chargeId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async refundPayment(chargeId, amount = null) {
    try {
      const payload = {
        charge_id: chargeId,
        amount: amount ? this.formatAmount(amount) : undefined,
        currency: 'JOD',
        description: 'BeautyCort Service Refund',
        metadata: {
          refund_reason: 'service_cancellation'
        }
      };

      const response = await axios.post(
        `${this.baseURL}/refunds`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        refundId: response.data.id,
        status: response.data.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Format amount for JOD (3 decimal places)
  formatAmount(amount) {
    return Math.round(amount * 1000) / 1000;
  }

  // Calculate VAT for Jordan
  calculateVAT(amount) {
    const vatRate = 0.16; // 16% VAT in Jordan
    const baseAmount = amount / (1 + vatRate);
    const vatAmount = amount - baseAmount;
    
    return {
      baseAmount: this.formatAmount(baseAmount),
      vatAmount: this.formatAmount(vatAmount),
      totalAmount: this.formatAmount(amount)
    };
  }
}

module.exports = new TapPaymentService();
```

## Step 4: Webhook Handler

### Payment Webhook Implementation

```javascript
// beautycort-api/src/routes/payments/webhook.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Payment = require('../../models/Payment');
const Booking = require('../../models/Booking');

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-tap-signature'];
    const payload = req.body;
    
    if (!verifyTapSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload);
    
    switch (event.type) {
      case 'charge.succeeded':
        await handlePaymentSuccess(event.data);
        break;
        
      case 'charge.failed':
        await handlePaymentFailure(event.data);
        break;
        
      case 'charge.refunded':
        await handlePaymentRefund(event.data);
        break;
        
      default:
        console.log('Unhandled webhook event:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePaymentSuccess(charge) {
  const { metadata, amount, currency, id } = charge;
  
  // Update payment record
  await Payment.update({
    status: 'completed',
    tapChargeId: id,
    amount: amount / 1000, // Convert back from fils to JOD
    currency,
    completedAt: new Date()
  }, {
    where: { bookingId: metadata.bookingId }
  });

  // Update booking status
  await Booking.update({
    status: 'confirmed',
    paymentStatus: 'paid'
  }, {
    where: { id: metadata.bookingId }
  });

  // Send confirmation notifications
  // (SMS, email, push notification)
}

async function handlePaymentFailure(charge) {
  const { metadata, response } = charge;
  
  // Update payment record
  await Payment.update({
    status: 'failed',
    errorMessage: response.message,
    failedAt: new Date()
  }, {
    where: { bookingId: metadata.bookingId }
  });

  // Update booking status
  await Booking.update({
    status: 'payment_failed',
    paymentStatus: 'failed'
  }, {
    where: { id: metadata.bookingId }
  });

  // Send failure notifications
}

function verifyTapSignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.TAP_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

module.exports = router;
```

## Step 5: Frontend Integration

### Mobile App Integration (React Native)

```javascript
// beautycort-mobile/src/services/paymentService.js
import { WebView } from 'react-native-webview';

class PaymentService {
  async initiatePayment(bookingData) {
    try {
      const response = await fetch(`${API_URL}/api/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          paymentUrl: result.paymentUrl,
          chargeId: result.chargeId
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // React Native Payment Component
  PaymentWebView = ({ paymentUrl, onSuccess, onFailure }) => {
    const handleNavigationStateChange = (navState) => {
      if (navState.url.includes('/payment/success')) {
        onSuccess();
      } else if (navState.url.includes('/payment/failure')) {
        onFailure();
      }
    };

    return (
      <WebView
        source={{ uri: paymentUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        style={{ flex: 1 }}
        startInLoadingState
        scalesPageToFit
      />
    );
  };
}
```

### Web Dashboard Integration

```javascript
// beautycort-web/src/components/PaymentForm.tsx
import { useEffect } from 'react';

declare global {
  interface Window {
    Tap: any;
  }
}

export const PaymentForm = ({ bookingData, onSuccess, onFailure }) => {
  useEffect(() => {
    // Load Tap.js script
    const script = document.createElement('script');
    script.src = 'https://js.tap.company/v1/tap.js';
    script.onload = initializeTap;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initializeTap = () => {
    window.Tap.init({
      public_key: process.env.NEXT_PUBLIC_TAP_PUBLIC_KEY,
      merchant_id: process.env.NEXT_PUBLIC_TAP_MERCHANT_ID,
      currency: 'JOD',
      locale: 'ar'
    });
  };

  const handlePayment = async () => {
    try {
      const charge = await window.Tap.createCharge({
        amount: bookingData.amount,
        currency: 'JOD',
        customer: {
          first_name: bookingData.customer.firstName,
          last_name: bookingData.customer.lastName,
          email: bookingData.customer.email,
          phone: {
            country_code: '962',
            number: bookingData.customer.phone
          }
        },
        source: {
          id: 'src_card'
        },
        post: {
          url: `${process.env.NEXT_PUBLIC_API_URL}/api/payments/webhook`
        },
        redirect: {
          url: `${window.location.origin}/payment/result`
        }
      });

      if (charge.status === 'CAPTURED') {
        onSuccess(charge);
      } else {
        onFailure(charge);
      }
    } catch (error) {
      onFailure(error);
    }
  };

  return (
    <div className="payment-form">
      <button onClick={handlePayment}>
        Pay {bookingData.amount} JOD
      </button>
    </div>
  );
};
```

## Step 6: Testing and Validation

### Test Card Numbers for Jordan

```javascript
// Test cards for Jordan market
const testCards = {
  visa: {
    number: '4000000000000002',
    expiry: '12/25',
    cvv: '123'
  },
  mastercard: {
    number: '5200000000000007',
    expiry: '12/25',
    cvv: '123'
  },
  amex: {
    number: '340000000000009',
    expiry: '12/25',
    cvv: '1234'
  }
};
```

### Integration Testing

```bash
# Test payment creation
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.000,
    "currency": "JOD",
    "description": "Hair styling service",
    "customer": {
      "firstName": "Ahmed",
      "lastName": "Ali",
      "email": "ahmed@example.com",
      "phone": "+962791234567"
    },
    "bookingId": "booking_123"
  }'

# Test payment retrieval
curl -X GET http://localhost:3000/api/payments/chg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer your_secret_key"
```

## Step 7: Production Environment Variables

```bash
# Add to .env.production
TAP_SECRET_KEY_PROD=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TAP_PUBLIC_KEY_PROD=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TAP_MERCHANT_ID=your_merchant_id
TAP_WEBHOOK_SECRET=your_webhook_secret

# URLs
TAP_API_URL=https://api.tap.company/v2
TAP_JS_URL=https://js.tap.company/v1/tap.js

# Jordan-specific settings
PAYMENT_CURRENCY=JOD
PAYMENT_VAT_RATE=0.16
PAYMENT_MIN_AMOUNT=1.000
PAYMENT_MAX_AMOUNT=10000.000
```

## Step 8: Security Best Practices

### PCI Compliance

```javascript
// Never store card details
const securityGuidelines = {
  // What NOT to store
  prohibited: [
    'card_number',
    'cvv',
    'expiry_date',
    'card_holder_name'
  ],
  
  // What you CAN store
  allowed: [
    'charge_id',
    'payment_status',
    'amount',
    'currency',
    'customer_id'
  ],
  
  // Encryption requirements
  encryption: {
    algorithm: 'AES-256-GCM',
    keyRotation: '90_days',
    tlsVersion: 'TLS_1.2_minimum'
  }
};
```

### Rate Limiting

```javascript
// Implement rate limiting for payment endpoints
const rateLimit = require('express-rate-limit');

const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 payment attempts per 15 minutes
  message: 'Too many payment attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/payments', paymentRateLimit);
```

## Step 9: Monitoring and Analytics

### Payment Metrics Dashboard

```javascript
// Payment analytics for Jordan market
const getPaymentAnalytics = async (dateRange) => {
  const payments = await Payment.findAll({
    where: {
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end]
      },
      currency: 'JOD'
    }
  });

  return {
    totalTransactions: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
    successRate: (payments.filter(p => p.status === 'completed').length / payments.length) * 100,
    
    // Jordan-specific metrics
    averageTransactionValue: payments.reduce((sum, p) => sum + p.amount, 0) / payments.length,
    vatCollected: payments.reduce((sum, p) => sum + (p.amount * 0.16), 0),
    
    // Payment method breakdown
    paymentMethods: {
      visa: payments.filter(p => p.cardBrand === 'visa').length,
      mastercard: payments.filter(p => p.cardBrand === 'mastercard').length,
      amex: payments.filter(p => p.cardBrand === 'amex').length
    }
  };
};
```

## Step 10: Compliance and Regulations

### Jordan Central Bank Compliance

```javascript
// Jordan-specific compliance requirements
const complianceRequirements = {
  // Transaction reporting
  reporting: {
    threshold: 10000, // JOD - report transactions above this amount
    frequency: 'monthly',
    authority: 'Jordan Central Bank'
  },
  
  // Data retention
  dataRetention: {
    transactionRecords: '7_years',
    customerData: '5_years',
    auditLogs: '10_years'
  },
  
  // Anti-money laundering
  aml: {
    customerDueDiligence: true,
    transactionMonitoring: true,
    suspiciousActivityReporting: true
  }
};
```

## Troubleshooting

### Common Issues

1. **Payment failures**:
   - Check card details format
   - Verify merchant account limits
   - Check 3D Secure configuration

2. **Webhook issues**:
   - Verify webhook URL is accessible
   - Check signature verification
   - Ensure proper error handling

3. **Currency formatting**:
   - JOD uses 3 decimal places
   - Always format amounts correctly
   - Handle rounding properly

### Support

- **Tap Support**: support@tap.company
- **Jordan Documentation**: https://www.tap.company/jordan/docs
- **API Reference**: https://developers.tap.company

## Next Steps

1. Set up fraud detection rules
2. Implement subscription payments (if needed)
3. Configure multi-currency support
4. Set up automated reporting
5. Implement payment analytics dashboard

Remember to test thoroughly in staging environment before production deployment!