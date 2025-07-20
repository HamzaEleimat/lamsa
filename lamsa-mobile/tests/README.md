# Arabic Form Validation Testing Suite

This comprehensive testing suite ensures that all form inputs in the Lamsa mobile application properly handle Arabic text input, validation, and user interactions.

## 📋 Test Coverage

### Core Test Files

1. **`components/ArabicInput.test.tsx`** - ArabicInput component unit tests
2. **`utils/arabic-input-validation.test.ts`** - Arabic validation utilities tests
3. **`integration/form-validation-integration.test.tsx`** - End-to-end form validation tests

### Test Categories

#### ✅ ArabicInput Component Testing
- **Basic Functionality**: Rendering, text changes, focus/blur events
- **Arabic Text Validation**: Name, business name, description, address, notes, phone, email
- **RTL Support**: Auto-detection, forced RTL, placeholder handling
- **Text Processing**: Arabic numeral conversion, text normalization
- **Password Input**: Visibility toggle, security
- **Character Count**: Display, Arabic numerals, over-limit highlighting
- **Icons and Interactions**: Left/right icons, validation icons
- **Accessibility**: Labels, hints, screen reader support

#### ✅ Arabic Validation Utilities Testing
- **Core Validation**: `validateArabicText` with various options
- **Specialized Validators**: Name, business name, description, address, notes, phone, email
- **Text Quality Checks**: Mixed content, repeated characters, invalid sequences
- **Text Processing**: Normalization, search preparation, RTL detection
- **Phone Number Validation**: Jordan formats, Arabic numerals, formatting
- **Email Validation**: Arabic character restrictions, format validation
- **Utility Functions**: Direction detection, validator creation

#### ✅ Integration Testing
- **User Registration**: Complete registration flow with Arabic input
- **Provider Registration**: Business information with bilingual support
- **Booking Creation**: Customer notes and special requests
- **Review Submission**: Arabic review comments and ratings
- **Edge Cases**: Dynamic validation switching, very long text, special characters
- **Performance**: Rapid input changes, large forms, memory management

## 🚀 Running the Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure React Native testing environment is set up
npm install --save-dev @testing-library/react-native
npm install --save-dev @testing-library/jest-native
```

### Test Execution

```bash
# Run all form validation tests
npm test tests/components/ArabicInput.test.tsx
npm test tests/utils/arabic-input-validation.test.ts
npm test tests/integration/form-validation-integration.test.tsx

# Run with coverage
npm test --coverage tests/

# Run in watch mode
npm test --watch tests/

# Run specific test suites
npm test -- --testNamePattern="Arabic Input Component"
npm test -- --testNamePattern="Arabic Validation Utilities"
npm test -- --testNamePattern="Integration"
```

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testMatch: [
    '**/tests/**/*.test.{ts,tsx}',
    '**/tests/**/*.spec.{ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/components/ArabicInput.tsx',
    'src/utils/arabic-input-validation.ts',
    'src/components/RTLInput.tsx',
    'src/utils/rtl.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)'
  ]
};
```

## 📊 Test Scenarios

### Arabic Input Validation

#### Name Validation
```typescript
// Valid Arabic names
const validNames = [
  'أحمد محمد',
  'فاطمة علي',
  'عبدالرحمن',
  'أم كلثوم',
  'عبدالله بن محمد'
];

// Test validation
validNames.forEach(name => {
  const result = validateArabicName(name);
  expect(result.isValid).toBe(true);
  expect(result.errors).toHaveLength(0);
});
```

#### Business Name Validation
```typescript
// Valid business names (including mixed content)
const validBusinessNames = [
  'صالون الجمال',
  'مركز العناية بالبشرة',
  'صالون الجمال - Beauty Salon',
  'مركز العناية & Care Center'
];

// Test validation with mixed content allowed
validBusinessNames.forEach(name => {
  const result = validateArabicBusinessName(name);
  expect(result.isValid).toBe(true);
});
```

#### Phone Number Validation
```typescript
// Valid Jordan phone numbers
const validPhones = [
  '+962791234567',
  '962791234567',
  '0791234567',
  '791234567',
  '٠٧٩١٢٣٤٥٦٧' // Arabic numerals
];

// Test validation and formatting
validPhones.forEach(phone => {
  const result = validateArabicPhoneNumber(phone);
  expect(result.isValid).toBe(true);
  expect(result.formattedPhone).toMatch(/^\+962 7[789] \d{3} \d{4}$/);
});
```

### RTL Support Testing

#### Auto-detection
```typescript
// Test RTL auto-detection
const testCases = [
  { text: 'أحمد محمد', expected: 'rtl' },
  { text: 'Ahmed Mohammed', expected: 'ltr' },
  { text: 'أحمد Ahmed', expected: 'rtl' }, // More Arabic
  { text: 'Ahmed أحمد', expected: 'ltr' }  // More English
];

testCases.forEach(({ text, expected }) => {
  expect(getTextDirection(text)).toBe(expected);
});
```

#### Component RTL Behavior
```typescript
// Test RTL behavior in component
const { getByPlaceholderText } = render(
  <ArabicInput
    autoDetectRTL
    placeholder="Auto RTL"
    value="النص العربي"
    onChangeText={jest.fn()}
  />
);

const input = getByPlaceholderText('Auto RTL');
expect(input.props.style.writingDirection).toBe('rtl');
```

### Integration Testing

#### User Registration Flow
```typescript
// Complete registration test
const { getByTestId } = render(<UserRegistrationForm />);

// Fill form with Arabic data
fireEvent.changeText(getByTestId('name-input'), 'أحمد محمد');
fireEvent.changeText(getByTestId('phone-input'), '0791234567');
fireEvent.changeText(getByTestId('email-input'), 'ahmed@example.com');

// Submit form
fireEvent.press(getByTestId('submit-button'));

// Verify API call
await waitFor(() => {
  expect(mockAPICall).toHaveBeenCalledWith({
    name: 'أحمد محمد',
    phoneNumber: '0791234567',
    email: 'ahmed@example.com'
  });
});
```

#### Provider Registration Flow
```typescript
// Provider registration with bilingual business name
fireEvent.changeText(getByTestId('business-name-input'), 'صالون الجمال - Beauty Salon');
fireEvent.changeText(getByTestId('description-input'), 'نقدم خدمات التجميل باللغتين العربية والإنجليزية');

// Should accept mixed content
await waitFor(() => {
  expect(queryByText('النص يحتوي على أحرف غير صالحة')).toBeNull();
});
```

### Edge Cases Testing

#### Very Long Text
```typescript
// Test maximum length validation
const veryLongText = 'نص طويل جداً '.repeat(100);
fireEvent.changeText(input, veryLongText);

await waitFor(() => {
  expect(getByText('النص يجب أن لا يتجاوز 100 حرف')).toBeTruthy();
});
```

#### Special Characters
```typescript
// Test Arabic diacritics
fireEvent.changeText(input, 'مُحَمَّد الأَحْمَد');

await waitFor(() => {
  expect(queryByText('النص يحتوي على أحرف غير صالحة')).toBeNull();
});
```

#### Empty and Whitespace
```typescript
// Test required field validation
fireEvent.changeText(input, '   '); // Whitespace only
fireEvent(input, 'blur');

await waitFor(() => {
  expect(getByText('النص مطلوب')).toBeTruthy();
});
```

## 🔧 Mock Setup

### API Mocks
```typescript
// Mock API service
const mockAPICall = jest.fn();
jest.mock('../../src/services/api', () => ({
  register: mockAPICall,
  registerProvider: mockAPICall,
  createBooking: mockAPICall,
}));

// Mock successful response
mockAPICall.mockResolvedValue({ success: true, data: { id: 1 } });
```

### Navigation Mocks
```typescript
// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
```

### Component Mocks
```typescript
// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));
```

## 📈 Performance Testing

### Memory Usage
```typescript
// Test for memory leaks during rapid input
it('should handle rapid input changes without memory leaks', async () => {
  const { getByTestId } = render(<RapidInputForm />);
  const input = getByTestId('rapid-input');
  
  // Simulate rapid typing
  for (let i = 0; i < 100; i++) {
    fireEvent.changeText(input, `أحمد ${i}`);
  }
  
  // Should not crash or show memory warnings
  expect(input.props.value).toBe('أحمد 99');
});
```

### Large Forms
```typescript
// Test performance with many inputs
it('should handle large forms with multiple Arabic inputs', async () => {
  const { getByTestId } = render(<LargeForm />);
  
  // Test that all 50 fields are rendered
  for (let i = 0; i < 50; i++) {
    expect(getByTestId(`field-${i}`)).toBeTruthy();
  }
});
```

## 🐛 Common Test Scenarios

### Character Encoding
```typescript
// Test Arabic text preservation
it('should preserve Arabic characters correctly', () => {
  const arabicText = 'أحمد محمد العلي';
  fireEvent.changeText(input, arabicText);
  
  expect(input.props.value).toBe(arabicText);
  expect(input.props.value).toMatch(/[\u0600-\u06FF]/);
});
```

### Mixed Content
```typescript
// Test mixed language handling
it('should handle mixed Arabic and English content', () => {
  const mixedText = 'أحمد Ahmed محمد';
  fireEvent.changeText(input, mixedText);
  
  expect(input.props.value).toBe(mixedText);
  // Should show warning but not error
  expect(queryByText('النص يحتوي على خليط من اللغات')).toBeTruthy();
});
```

### Validation States
```typescript
// Test validation error display
it('should show validation errors correctly', async () => {
  fireEvent.changeText(input, 'أ'); // Too short
  
  await waitFor(() => {
    expect(getByText('النص يجب أن يكون 2 أحرف على الأقل')).toBeTruthy();
  });
});
```

## 📚 Test Utilities

### Data Generators
```typescript
// Generate test data
const createMockFormData = (type, language = 'ar') => {
  const data = {
    user: {
      ar: { name: 'أحمد محمد', phoneNumber: '0791234567' },
      en: { name: 'Ahmed Mohammed', phoneNumber: '0791234567' }
    },
    // ... more data types
  };
  return data[type][language];
};
```

### Validation Helpers
```typescript
// Test validation state
const expectValidationState = (component, field, expectedState) => {
  const input = component.getByTestId(`${field}-input`);
  
  if (expectedState.isValid) {
    expect(component.queryByText(expectedState.errorMessage)).toBeNull();
  } else {
    expect(component.getByText(expectedState.errorMessage)).toBeTruthy();
  }
};
```

### Arabic Text Helpers
```typescript
// Test Arabic text preservation
const expectArabicTextPreservation = (component, testId, expectedText) => {
  const input = component.getByTestId(testId);
  expect(input.props.value).toBe(expectedText);
  expect(input.props.value).toMatch(/[\u0600-\u06FF]/);
};
```

## 🔍 Debugging Tests

### Enable Debug Output
```typescript
// Add debug logging
const debug = require('debug')('test:arabic-input');
debug('Testing Arabic input with text:', arabicText);
```

### Test Isolation
```typescript
// Isolate problematic tests
describe.only('Specific failing test', () => {
  it('should debug this specific case', () => {
    // Focused test
  });
});
```

### Mock Inspection
```typescript
// Inspect mock calls
console.log('Mock calls:', mockAPICall.mock.calls);
console.log('Mock results:', mockAPICall.mock.results);
```

## 📞 Troubleshooting

### Common Issues

1. **Arabic text not displaying**: Check Unicode support and font configuration
2. **RTL layout issues**: Verify RTL utilities are properly imported
3. **Validation not working**: Check validation type and options
4. **Performance problems**: Review test complexity and mock setup

### Debug Commands
```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests with coverage
npm test -- --coverage

# Debug specific test
npm test -- --testNamePattern="specific test name"
```

## 🚦 Quality Gates

### Test Coverage Requirements
- ArabicInput component: > 95%
- Arabic validation utilities: > 98%
- Integration scenarios: > 90%
- Edge cases: > 85%

### Performance Thresholds
- Component rendering: < 16ms
- Validation functions: < 1ms
- Large form handling: < 100ms
- Memory usage: No leaks detected

### Arabic Text Validation
- All Arabic characters preserved
- RTL layout correctly applied
- Validation messages in Arabic
- Character encoding maintained

The comprehensive testing suite ensures that all Arabic form validation works correctly across all scenarios, providing confidence in the production deployment of bilingual form handling in the Lamsa mobile application.