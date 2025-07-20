# Bilingual SMS/Push Notification Testing Suite

This comprehensive testing suite validates the bilingual SMS and push notification system for Lamsa, ensuring proper Arabic and English support across all notification channels.

## 📋 Test Coverage

### Core Test Files

1. **`sms-notification.test.js`** - SMS notification testing
2. **`push-notification.test.js`** - Push notification testing  
3. **`notification-integration.test.js`** - Cross-channel integration testing
4. **`template-validation.test.js`** - Template accuracy and formatting validation

### Test Categories

#### ✅ SMS Notification Testing
- **Arabic SMS Templates**: Booking confirmations, payment notifications, reminders
- **English SMS Templates**: All notification types with proper Western formatting
- **Character Encoding**: UCS2 for Arabic, GSM for English
- **Message Length**: SMS segmentation and length calculation
- **Phone Number Formatting**: Jordan-specific formatting (+962 7X XXX XXXX)
- **Arabic Numerals**: Conversion to Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)
- **Date/Time Formatting**: Arabic month names and proper time display
- **Error Handling**: Invalid phones, missing templates, delivery failures
- **Retry Logic**: Automatic retry with exponential backoff

#### ✅ Push Notification Testing
- **Arabic Push Templates**: Rich notifications with proper RTL formatting
- **English Push Templates**: Standard push notification structure
- **Batch Processing**: Multiple languages in single batch
- **Action Buttons**: Localized action buttons for interactive notifications
- **Image Attachments**: Rich media support with Arabic text
- **Scheduling**: Timezone-aware notification scheduling
- **Analytics**: Delivery tracking and engagement metrics
- **Token Management**: Invalid token handling and cleanup

#### ✅ Integration Testing
- **Multi-Channel Delivery**: SMS + Push + WebSocket coordination
- **Language Consistency**: Same data formatted correctly across channels
- **Failure Handling**: Graceful degradation when channels fail
- **User Preferences**: Respecting notification settings and quiet hours
- **Real-time Sync**: WebSocket synchronization across devices
- **Queue Processing**: Efficient processing of mixed-language queues
- **Load Testing**: High-volume notification delivery

#### ✅ Template Validation
- **Content Accuracy**: Correct Arabic/English text in all templates
- **Variable Substitution**: Proper variable replacement without errors
- **SMS Length Limits**: Compliance with SMS segmentation rules
- **RTL Formatting**: Proper right-to-left text direction
- **Character Encoding**: Arabic text preservation in all channels
- **Cross-Language Consistency**: Same information in both languages
- **Performance**: Fast template rendering and compilation

## 🚀 Running the Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure environment variables are set
export NODE_ENV=test
export SUPABASE_URL=your_test_supabase_url
export SUPABASE_SERVICE_KEY=your_test_service_key
export TWILIO_ACCOUNT_SID=test_account_sid
export TWILIO_AUTH_TOKEN=test_auth_token
export TWILIO_PHONE_NUMBER=test_phone_number
```

### Test Execution

```bash
# Run all bilingual notification tests
npm test tests/bilingual/

# Run specific test files
npm test tests/bilingual/sms-notification.test.js
npm test tests/bilingual/push-notification.test.js
npm test tests/bilingual/notification-integration.test.js
npm test tests/bilingual/template-validation.test.js

# Run with coverage
npm run test:coverage tests/bilingual/

# Run in watch mode for development
npm run test:watch tests/bilingual/
```

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/bilingual/**/*.test.js'],
  collectCoverageFrom: [
    'src/services/notification*.js',
    'src/services/sms*.js',
    'src/utils/arabic-*.js',
    'src/controllers/notification*.js'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

## 📊 Test Scenarios

### Arabic Language Testing

#### SMS Notifications
```javascript
// Example: Arabic booking confirmation
const arabicBooking = {
  id: 'B12345',
  serviceName: 'قص شعر',
  providerName: 'صالون الجمال',
  customerName: 'أحمد محمد',
  date: '2025-07-16',
  time: '14:30',
  totalAmount: 25.500,
  duration: 60
};

// Expected output:
// تم تأكيد حجزك B١٢٣٤٥
// الخدمة: قص شعر
// المزود: صالون الجمال
// التاريخ: ١٦ تموز ٢٠٢٥
// الوقت: ٢:٣٠ مساءً
// المبلغ: ٢٥٫٥٠٠ د.أ
// المدة: ١ ساعة
```

#### Push Notifications
```javascript
// Example: Arabic payment notification
const arabicPayment = {
  title: 'تم الدفع',
  body: 'تم معالجة دفعتك بنجاح بمبلغ ٤٥٫٧٥٠ د.أ',
  data: {
    bookingId: 'B12345',
    amount: 45.750,
    currency: 'JOD',
    language: 'ar'
  }
};
```

### English Language Testing

#### SMS Notifications
```javascript
// Example: English booking confirmation
const englishBooking = {
  id: 'B12345',
  serviceName: 'Hair Cut',
  providerName: 'Beauty Salon',
  customerName: 'John Smith',
  date: '2025-07-16',
  time: '14:30',
  totalAmount: 25.500,
  duration: 60
};

// Expected output:
// Your booking B12345 has been confirmed
// Service: Hair Cut
// Provider: Beauty Salon
// Date: July 16, 2025
// Time: 2:30 PM
// Amount: JOD 25.500
// Duration: 1 hour
```

### Cross-Channel Integration Testing

```javascript
// Example: Multi-channel notification
const user = {
  id: 'user123',
  phoneNumber: '+962791234567',
  expoPushToken: 'ExponentPushToken[abc123]',
  preferredLanguage: 'ar',
  notificationSettings: {
    smsEnabled: true,
    pushEnabled: true,
    webSocketEnabled: true
  }
};

// Sends coordinated notification across all channels
await notificationService.sendMultiChannelNotification(
  user,
  'booking_confirmed',
  booking
);
```

## 🔧 Mock Services

### SMS Service Mock
```javascript
const MockSMSService = require('../mocks/smsService.mock');

// Features:
// - Simulates SMS delivery with configurable failure rates
// - Tracks sent messages for verification
// - Supports character encoding simulation
// - Message length calculation
// - Delivery status tracking
```

### Push Service Mock
```javascript
const MockExpoPushService = require('./push-notification.test');

// Features:
// - Simulates Expo push notification delivery
// - Batch notification processing
// - Token validation
// - Receipt generation
// - Delivery analytics
```

### WebSocket Service Mock
```javascript
const MockWebSocketService = require('./notification-integration.test');

// Features:
// - Simulates real-time WebSocket connections
// - Multi-session user management
// - Message broadcasting
// - Connection state tracking
```

## 📈 Performance Benchmarks

### Target Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| SMS Delivery | < 2 seconds | Average delivery time |
| Push Delivery | < 1 second | Average delivery time |
| Template Rendering | < 10ms | Per template render |
| Queue Processing | > 100 msg/sec | Processing throughput |
| Error Rate | < 1% | Failed deliveries |
| Arabic Encoding | 100% | Character preservation |

### Load Testing Scenarios

```javascript
// High-volume notification test
const users = generateTestUsers(1000, 0.6); // 60% Arabic users
const results = await simulateRealtimeLoad(
  notificationService,
  users,
  60000 // 1 minute duration
);

// Expected results:
// - 1000+ notifications processed
// - < 1% failure rate
// - < 3 second average delivery
// - Proper language distribution
```

## 🐛 Common Issues and Solutions

### Arabic Text Issues

**Problem**: Arabic text appears as question marks
```javascript
// Solution: Ensure proper encoding
expect(smsMessage.encoding).toBe('UCS2');
expect(smsMessage.body).toMatch(/[\u0600-\u06FF]/);
```

**Problem**: Arabic numerals not displaying correctly
```javascript
// Solution: Use Arabic numeral conversion
const arabicAmount = toArabicNumerals(amount.toString());
expect(rendered).toContain(`${arabicAmount} د.أ`);
```

### SMS Length Issues

**Problem**: Arabic SMS being truncated
```javascript
// Solution: Check UCS2 length limits
if (arabicText.length > 70) {
  // Will be segmented into multiple SMS
  const segments = Math.ceil(arabicText.length / 67);
  expect(segments).toBeLessThan(4);
}
```

### Template Issues

**Problem**: Variables not being substituted
```javascript
// Solution: Validate template compilation
const compiled = templatesService.compileTemplate(template);
expect(compiled).not.toContain('{{');
expect(compiled).not.toContain('}}');
```

## 📚 Best Practices

### Test Structure
- Use descriptive test names indicating language and feature
- Group related tests in describe blocks
- Test both success and failure scenarios
- Include edge cases and boundary conditions

### Data Validation
- Always validate Arabic character preservation
- Check numeral formatting in both languages
- Verify date/time formatting consistency
- Test SMS length calculations

### Performance Testing
- Include load testing for high-volume scenarios
- Monitor memory usage during batch processing
- Test concurrent notification delivery
- Validate queue processing efficiency

### Error Handling
- Test all failure scenarios (network, invalid data, etc.)
- Verify graceful degradation
- Check retry mechanisms
- Test fallback language support

## 🔍 Debugging

### Enable Debug Logging
```javascript
// Set environment variable
process.env.DEBUG = 'notification:*';

// Or in test
const debug = require('debug')('notification:test');
debug('Testing Arabic SMS template:', template);
```

### Inspect Generated Content
```javascript
// Log rendered template for debugging
console.log('Rendered Arabic template:', rendered);
console.log('Character count:', rendered.length);
console.log('Encoding needed:', /[\u0600-\u06FF]/.test(rendered) ? 'UCS2' : 'GSM');
```

### Validate Test Data
```javascript
// Helper function to validate test data
const validateTestData = (data, language) => {
  expect(data).toBeDefined();
  expect(data.id).toBeDefined();
  
  if (language === 'ar') {
    expect(data.serviceName).toMatch(/[\u0600-\u06FF]/);
  }
};
```

## 🚦 Continuous Integration

### GitHub Actions Workflow
```yaml
name: Bilingual Notification Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm run test:bilingual
      - run: npm run test:coverage
```

### Test Quality Gates
- All tests must pass
- Coverage > 90% for notification services
- No Arabic text encoding failures
- Performance benchmarks met
- No template compilation errors

## 📞 Support

For issues with bilingual notification testing:

1. Check the test logs for specific error messages
2. Verify environment variables are set correctly
3. Ensure mock services are properly initialized
4. Review character encoding settings
5. Validate template syntax and variables

The testing suite provides comprehensive coverage of all bilingual notification features and ensures reliable delivery across SMS, push, and WebSocket channels for both Arabic and English users.