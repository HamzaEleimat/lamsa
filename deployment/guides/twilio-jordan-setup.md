# Twilio SMS Setup for Jordan (+962) - Production Guide

This guide provides step-by-step instructions for setting up Twilio SMS service for Jordan market in the BeautyCort application.

## Prerequisites

- Twilio account with verified identity
- Jordan business registration (for toll-free numbers)
- Understanding of Jordan telecommunications regulations

## Step 1: Twilio Account Setup

### Create Twilio Account

1. **Sign up**: Visit https://www.twilio.com/try-twilio
2. **Verify phone number**: Use your Jordan phone number (+962)
3. **Complete identity verification**: Required for production
4. **Upgrade to paid account**: Free trial has limitations

### Get Account Credentials

```bash
# Navigate to Twilio Console
# Go to Settings > General
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
```

## Step 2: Phone Number Configuration

### Purchase Jordan-Compatible Numbers

1. **Go to Phone Numbers > Manage > Buy a number**
2. **Select country**: Jordan (+962) or international toll-free
3. **Choose number type**:
   - **Local number**: For Jordan residents
   - **Toll-free**: For better deliverability
   - **Short code**: For high volume (requires approval)

### Recommended Number Types for Jordan

```bash
# Option 1: Jordan local number
TWILIO_PHONE_NUMBER=+962xxxxxxxxx

# Option 2: International toll-free (better for business)
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Option 3: Short code (high volume, requires approval)
TWILIO_SHORT_CODE=xxxxx
```

## Step 3: Configure SMS Settings

### Geographic Permissions

1. **Go to Settings > General > Geography**
2. **Enable SMS for**:
   - Jordan (+962)
   - Any other target markets
3. **Set messaging limits**:
   - Daily SMS limit: 1000+ (adjust based on expected volume)
   - Monthly SMS limit: 30,000+ (adjust based on expected volume)

### Message Templates (Optional)

```javascript
// OTP message template for Jordan
const jordanOTPTemplate = {
  en: "Your BeautyCort verification code is: {code}. Valid for 5 minutes.",
  ar: "رمز التحقق الخاص بك في BeautyCort هو: {code}. صالح لمدة 5 دقائق."
};

// Booking confirmation template
const bookingConfirmationTemplate = {
  en: "Your booking at {providerName} on {date} at {time} is confirmed. Reference: {bookingId}",
  ar: "تم تأكيد حجزك في {providerName} في {date} في {time}. المرجع: {bookingId}"
};
```

## Step 4: Jordan-Specific Configuration

### Phone Number Formatting

```javascript
// BeautyCort API - Phone number validation for Jordan
const jordanPhoneRegex = /^\+962[7-9]\d{8}$/;

// Valid Jordan mobile prefixes
const validPrefixes = ['77', '78', '79'];

// Format phone number for Jordan
function formatJordanPhone(phone) {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Add +962 if missing
  if (cleaned.startsWith('962')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('7') && cleaned.length === 9) {
    return '+962' + cleaned;
  }
  
  throw new Error('Invalid Jordan phone number');
}
```

### SMS Delivery Optimization

```javascript
// Twilio configuration for Jordan
const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID, // Optional
  
  // Jordan-specific settings
  settings: {
    // Use messaging service for better deliverability
    useMessagingService: true,
    
    // Retry configuration
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    
    // Delivery callback
    statusCallback: `${process.env.API_URL}/api/webhooks/twilio/status`,
    
    // Optimize for Jordan networks
    deliveryOptimization: {
      // Use long code for better deliverability in Jordan
      preferLongCode: true,
      
      // Set message priority
      priority: 'high',
      
      // Smart encoding for Arabic text
      smartEncoding: true
    }
  }
};
```

## Step 5: Implement SMS Service

### Create SMS Service Class

```javascript
// beautycort-api/src/services/smsService.js
class SMSService {
  constructor() {
    this.client = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async sendOTP(phoneNumber, code, language = 'ar') {
    try {
      const message = this.formatOTPMessage(code, language);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber,
        
        // Jordan-specific optimizations
        statusCallback: `${process.env.API_URL}/api/webhooks/twilio/status`,
        provideFeedback: true,
        
        // For Arabic text
        ...(language === 'ar' && {
          contentSid: process.env.TWILIO_CONTENT_SID_AR
        })
      });

      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('SMS send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  formatOTPMessage(code, language) {
    const messages = {
      en: `Your BeautyCort verification code is: ${code}. Valid for 5 minutes.`,
      ar: `رمز التحقق الخاص بك في BeautyCort هو: ${code}. صالح لمدة 5 دقائق.`
    };
    
    return messages[language] || messages.en;
  }

  async sendBookingConfirmation(phoneNumber, bookingDetails, language = 'ar') {
    try {
      const message = this.formatBookingMessage(bookingDetails, language);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber,
        statusCallback: `${process.env.API_URL}/api/webhooks/twilio/status`
      });

      return {
        success: true,
        messageId: result.sid
      };
    } catch (error) {
      console.error('Booking SMS error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  formatBookingMessage(details, language) {
    const messages = {
      en: `Your booking at ${details.providerName} on ${details.date} at ${details.time} is confirmed. Reference: ${details.bookingId}`,
      ar: `تم تأكيد حجزك في ${details.providerName} في ${details.date} في ${details.time}. المرجع: ${details.bookingId}`
    };
    
    return messages[language] || messages.en;
  }
}

module.exports = new SMSService();
```

## Step 6: Webhook Configuration

### Set up Status Webhooks

```javascript
// beautycort-api/src/routes/webhooks/twilio.js
const express = require('express');
const router = express.Router();

router.post('/status', (req, res) => {
  const {
    MessageSid,
    MessageStatus,
    To,
    From,
    ErrorCode,
    ErrorMessage
  } = req.body;

  // Log message status
  console.log('SMS Status Update:', {
    messageId: MessageSid,
    status: MessageStatus,
    to: To,
    from: From,
    error: ErrorCode ? { code: ErrorCode, message: ErrorMessage } : null
  });

  // Update database with delivery status
  // This helps track delivery success rates
  
  res.status(200).send('OK');
});

module.exports = router;
```

## Step 7: Testing and Validation

### Test SMS Delivery

```bash
# Test OTP sending
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+962791234567",
    "language": "ar"
  }'

# Test booking confirmation
curl -X POST http://localhost:3000/api/bookings/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "123",
    "phoneNumber": "+962791234567",
    "language": "ar"
  }'
```

### Monitor Delivery Rates

```javascript
// Add to your monitoring dashboard
const getSMSMetrics = async () => {
  const messages = await twilio.messages.list({
    dateSentAfter: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    to: '+962*' // Jordan numbers only
  });

  const metrics = {
    total: messages.length,
    delivered: messages.filter(m => m.status === 'delivered').length,
    failed: messages.filter(m => m.status === 'failed').length,
    pending: messages.filter(m => m.status === 'queued' || m.status === 'sent').length
  };

  return {
    ...metrics,
    deliveryRate: (metrics.delivered / metrics.total * 100).toFixed(2) + '%'
  };
};
```

## Step 8: Production Environment Variables

```bash
# Add to .env.production
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+962xxxxxxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Content SIDs for pre-approved templates
TWILIO_CONTENT_SID_AR=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_CONTENT_SID_EN=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook URL
TWILIO_WEBHOOK_URL=https://api.beautycort.com/api/webhooks/twilio/status
```

## Step 9: Cost Optimization

### Monitor Usage and Costs

```javascript
// Daily cost monitoring
const getDailySMSCost = async () => {
  const usage = await twilio.usage.records.list({
    category: 'sms',
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

  return {
    messages: usage.reduce((total, record) => total + parseInt(record.usage), 0),
    cost: usage.reduce((total, record) => total + parseFloat(record.price), 0)
  };
};
```

### Cost-Effective Strategies

1. **Use messaging services**: Better deliverability and cost
2. **Implement smart retry**: Avoid sending duplicate messages
3. **Use templates**: Pre-approved content templates
4. **Monitor delivery rates**: Optimize for better success rates

## Step 10: Compliance and Best Practices

### Jordan Telecommunications Compliance

1. **Register with TRC**: Jordan Telecommunications Regulatory Commission
2. **Opt-in consent**: Always get explicit consent
3. **Opt-out mechanism**: Provide unsubscribe option
4. **Data protection**: Comply with Jordan data protection laws

### Message Content Guidelines

```javascript
// Best practices for Jordan SMS
const smsGuidelines = {
  // Length limits
  maxLength: {
    arabic: 70, // Due to Unicode encoding
    english: 160
  },
  
  // Required elements
  required: {
    senderName: 'BeautyCort',
    optOut: 'Reply STOP to unsubscribe',
    validity: 'Valid for 5 minutes' // For OTP
  },
  
  // Prohibited content
  prohibited: [
    'Promotional content without consent',
    'Misleading information',
    'Spam or unsolicited messages'
  ]
};
```

## Troubleshooting

### Common Issues

1. **Message not delivered**:
   - Check phone number format
   - Verify account balance
   - Check geographic permissions

2. **Arabic text issues**:
   - Ensure UTF-8 encoding
   - Use proper Unicode characters
   - Consider message length limits

3. **High failure rates**:
   - Check with Jordan carriers
   - Verify sender reputation
   - Consider using messaging service

### Support

- **Twilio Support**: https://support.twilio.com
- **Jordan TRC**: https://trc.gov.jo
- **Documentation**: https://www.twilio.com/docs/sms

## Next Steps

1. Set up monitoring alerts for delivery failures
2. Implement A/B testing for message templates
3. Configure auto-scaling for high volume periods
4. Set up backup SMS providers for redundancy
5. Monitor and optimize delivery rates regularly

Remember to test thoroughly in staging environment with Jordan phone numbers before production deployment!