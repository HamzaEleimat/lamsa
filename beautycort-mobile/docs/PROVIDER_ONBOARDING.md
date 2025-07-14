# BeautyCort Mobile Provider Onboarding Documentation

## Overview

The Provider Onboarding flow is a comprehensive 7-step process that guides beauty service providers through account setup, enabling them to start offering services on the BeautyCort platform. The implementation features Arabic-first design, progressive form saving, and seamless integration with the existing authentication system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Navigation Flow](#navigation-flow)
3. [Screen Details](#screen-details)
4. [Components](#components)
5. [Services Integration](#services-integration)
6. [Internationalization](#internationalization)
7. [Development Guide](#development-guide)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

## Architecture Overview

### Core Technologies
- **React Native**: Mobile application framework
- **React Navigation**: Navigation management
- **React Hook Form**: Form handling and validation
- **React Native Paper**: Material Design components
- **Expo**: Development platform and native APIs
- **AsyncStorage**: Local data persistence
- **i18n-js**: Internationalization

### Key Features
- ✅ **Arabic-first UI/UX** with complete RTL support
- ✅ **Progressive state saving** - users can complete onboarding over multiple sessions
- ✅ **Real-time form validation** with contextual error messages
- ✅ **Document upload** capabilities for professional verification
- ✅ **Interactive map integration** for location setup
- ✅ **Jordan-specific configurations** (working hours, service areas, business regulations)
- ✅ **Accessibility compliance** with screen readers and keyboard navigation

## Navigation Flow

```
AuthNavigator
└── UserTypeSelectionScreen
    └── ProviderOnboardingNavigator
        ├── BusinessInformationScreen (Step 1)
        ├── LocationSetupScreen (Step 2)
        ├── ServiceCategoriesScreen (Step 3)
        ├── WorkingHoursScreen (Step 4)
        ├── LicenseVerificationScreen (Step 5)
        ├── ServiceCreationTutorialScreen (Step 6)
        └── CompletionScreen (Step 7)
```

### Navigation Parameters

```typescript
type ProviderOnboardingStackParamList = {
  BusinessInformation: { phoneNumber: string };
  LocationSetup: { phoneNumber: string };
  ServiceCategories: { phoneNumber: string };
  WorkingHours: { phoneNumber: string };
  LicenseVerification: { phoneNumber: string };
  ServiceCreationTutorial: { phoneNumber: string };
  Completion: { phoneNumber: string };
};
```

## Screen Details

### 1. BusinessInformationScreen

**Purpose**: Collect basic business information and owner details

**Key Features**:
- Owner name and email validation
- Bilingual business name input (English/Arabic)
- Business type selection (Salon, Mobile, Freelancer)
- Business description with RTL support
- Real-time draft saving

**Form Fields**:
```typescript
interface BusinessInformationFormData {
  ownerName: string;           // Required, min 2 characters
  email?: string;              // Optional, email validation
  businessName: string;        // Required, English name
  businessNameAr: string;      // Required, Arabic name
  businessType: BusinessType;  // Required, enum selection
  description?: string;        // Optional, English description
  descriptionAr?: string;      // Optional, Arabic description
}
```

**Validation Rules**:
- Owner name: Required, minimum 2 characters
- Email: Optional, must be valid email format
- Business names: Required in both languages, minimum 2 characters
- Business type: Required selection from predefined options

### 2. LocationSetupScreen

**Purpose**: Configure business location and service area

**Key Features**:
- Interactive map with Jordan region focus
- Current location detection
- Mobile service radius configuration
- Service area selection for Jordan regions
- Address input with landmark support

**Technical Implementation**:
```typescript
interface LocationSetupFormData {
  address: string;           // Required, detailed address
  addressAr: string;         // Optional, Arabic address
  latitude: number;          // Required, map coordinates
  longitude: number;         // Required, map coordinates
  isMobile: boolean;         // Mobile service toggle
  serviceRadius?: number;    // For mobile services
  serviceAreas?: string[];   // Jordan service areas
  landmark?: string;         // Optional landmark
  landmarkAr?: string;       // Optional Arabic landmark
}
```

**Jordan Service Areas**:
- عمان الشرقية (East Amman)
- عمان الغربية (West Amman)
- الزرقاء (Zarqa)
- إربد (Irbid)
- العقبة (Aqaba)
- الكرك (Karak)
- معان (Ma'an)
- الطفيلة (Tafilah)
- مادبا (Madaba)
- جرش (Jerash)
- عجلون (Ajloun)
- البلقاء (Balqa)

### 3. ServiceCategoriesScreen

**Purpose**: Select beauty service categories offered by the provider

**Key Features**:
- Multi-select category interface
- Search functionality across categories
- Popular categories highlighting
- Selected categories summary
- Category icons and descriptions

**Categories Available**:
```typescript
interface ServiceCategory {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  icon: string;
  color: string;
  serviceCount: number;
  isPopular: boolean;
}
```

**Available Categories**:
1. **Hair Care** (العناية بالشعر) - Cutting, styling, coloring, treatments
2. **Skincare & Facials** (العناية بالبشرة والوجه) - Facial treatments, skincare
3. **Nail Care** (العناية بالأظافر) - Manicure, pedicure, nail art
4. **Makeup & Styling** (المكياج والتجميل) - Bridal makeup, event styling
5. **Body Treatments** (علاجات الجسم) - Massage, body wraps, scrubs
6. **Eyebrows & Lashes** (الحواجب والرموش) - Threading, tinting, extensions
7. **Hair Removal** (إزالة الشعر) - Waxing, threading, laser treatments
8. **Henna & Traditional** (الحناء والتراثي) - Henna designs, traditional treatments

### 4. WorkingHoursScreen

**Purpose**: Configure weekly working schedule with Jordan-specific considerations

**Key Features**:
- Day-by-day schedule configuration
- Time picker integration
- Break time scheduling
- Quick preset templates
- Friday (جمعة) special handling
- Copy schedule to all days

**Schedule Structure**:
```typescript
interface BusinessHours {
  dayOfWeek: number;          // 0-6 (Sunday-Saturday)
  isWorkingDay: boolean;      // Working day toggle
  openingTime: string;        // HH:MM format
  closingTime: string;        // HH:MM format
  breakStartTime?: string;    // Optional break start
  breakEndTime?: string;      // Optional break end
}
```

**Quick Presets**:
1. **Salon Standard**: 9:00 AM - 8:00 PM with lunch break
2. **Mobile Service**: 10:00 AM - 6:00 PM
3. **Evening Only**: 4:00 PM - 10:00 PM

### 5. LicenseVerificationScreen

**Purpose**: Verify professional credentials or collect portfolio evidence

**Key Features**:
- Professional license verification
- Document photo capture and upload
- Portfolio image collection (alternative verification)
- License type selection
- Experience years tracking
- Issuing authority recording

**Verification Options**:

**Option A: Professional License**
```typescript
interface LicenseData {
  hasLicense: true;
  licenseType: string;        // Type of professional license
  licenseNumber: string;      // License number
  licenseExpiry?: string;     // Expiration date
  issuingAuthority?: string;  // Licensing body
  licenseDocument?: string;   // Document image URI
}
```

**Option B: Portfolio Verification**
```typescript
interface PortfolioData {
  hasLicense: false;
  experienceYears: number;    // Years of experience
  portfolioImages: string[];  // 3-10 work samples
  additionalNotes?: string;   // Additional qualifications
}
```

**License Types Available**:
- Beauty License (رخصة تجميل)
- Cosmetology License (رخصة التجميل)
- Hairdressing License (رخصة تصفيف الشعر)
- Business License (رخصة تجارية)
- Health Permit (تصريح صحي)
- Other (أخرى)

### 6. ServiceCreationTutorialScreen

**Purpose**: Guide providers through platform best practices

**Key Features**:
- Tutorial step visualization
- Success tips presentation
- Selected categories recap
- Next steps guidance
- Platform introduction

**Tutorial Steps**:
1. **Create Your Services** - Service setup guidance
2. **Add Service Photos** - Photography best practices
3. **Set Duration & Availability** - Scheduling optimization
4. **Build Your Reputation** - Customer service excellence

### 7. CompletionScreen

**Purpose**: Celebrate successful onboarding and provide next steps

**Key Features**:
- Animated celebration sequence
- Success confirmation message
- Account status explanation
- Next steps roadmap
- Journey initiation

**Animation Sequence**:
- Scale and rotation animations
- Fireworks particle effects
- Progressive opacity reveals
- Celebration icon transformations

## Components

### ProgressIndicator

**Purpose**: Visual progress tracking throughout the onboarding flow

**Features**:
- Step completion visualization
- Progress percentage display
- Current step highlighting
- Step titles in user's language
- Responsive design for all screen sizes

**Usage**:
```tsx
<ProgressIndicator
  currentStep={3}
  totalSteps={7}
  stepTitles={stepTitles}
/>
```

**Props**:
```typescript
interface ProgressIndicatorProps {
  currentStep: number;      // Current step (1-7)
  totalSteps: number;       // Total steps (7)
  stepTitles: string[];     // Localized step titles
  className?: string;       // Optional styling class
}
```

## Services Integration

### ProviderOnboardingService

**Purpose**: Handle data persistence, validation, and API communication

**Key Methods**:

```typescript
class ProviderOnboardingService {
  // State Management
  static async getCurrentOnboardingState(): Promise<OnboardingState | null>
  static async saveOnboardingState(data: any): Promise<void>
  
  // Flow Control
  static async initializeOnboarding(phone: string): Promise<OnboardingData>
  static async updateOnboardingStep(stepNumber: number, data: Record<string, any>, isCompleted: boolean): Promise<StepResult>
  static async completeOnboarding(): Promise<Provider>
  
  // Step-Specific Methods
  static async updatePersonalInformation(data: PersonalInformationData): Promise<any>
  static async updateLocationSetup(data: LocationSetupData): Promise<any>
  static async updateServiceCategories(data: ServiceCategoriesData): Promise<any>
  static async updateWorkingHours(data: WorkingHoursData): Promise<any>
  static async updateLicenseVerification(data: LicenseVerificationData): Promise<any>
  
  // Utility Methods
  static async uploadVerificationDocument(documentType: string, file: any, documentNumber?: string): Promise<any>
  static getDefaultBusinessHours(businessType: BusinessType): { [key: number]: BusinessHours }
  static validateStepData(stepNumber: number, data: any): { isValid: boolean; errors: string[] }
}
```

**Draft State Management**:
- Automatic saving on form field changes
- Step completion tracking
- Recovery from interruptions
- Data validation before progression

### API Integration

**Endpoints Used**:
```
POST /providers/onboarding/initialize
PUT  /providers/onboarding/step
POST /providers/onboarding/upload-document
POST /providers/onboarding/complete
GET  /providers/service-templates
```

## Internationalization

### Language Support

The onboarding flow supports Arabic (primary) and English (secondary) with complete RTL support.

**Translation Keys Structure**:
```json
{
  "providerOnboarding": {
    "progress": { "title": "تقدم التسجيل", "step": "الخطوة {{current}} من {{total}}" },
    "steps": { "businessInfo": "معلومات العمل", "location": "الموقع" },
    "buttons": { "continue": "متابعة", "finish": "إنهاء" },
    "fields": { "ownerName": "اسم المالكة", "email": "البريد الإلكتروني" },
    "validation": { "ownerNameRequired": "اسم المالكة مطلوب" },
    "errors": { "locationSave": "حدث خطأ في حفظ معلومات الموقع" }
  }
}
```

### RTL Support Features

- **Text Direction**: Automatic text direction based on content language
- **Layout Mirroring**: Navigation buttons, icons, and layouts mirror for RTL
- **Input Handling**: Proper text alignment and cursor behavior
- **Date/Time**: Localized time formats and calendar systems

### Usage Example

```typescript
import i18n, { isRTL } from '../../../i18n';

// Get localized text
const title = i18n.t('providerOnboarding.businessInfo.title');

// Apply RTL styling conditionally
<TextInput
  style={[styles.input, isRTL() && styles.inputRTL]}
  label={i18n.t('providerOnboarding.fields.ownerName')}
/>
```

## Development Guide

### Prerequisites

```bash
# Required dependencies
npm install expo-image-picker
npm install @react-native-community/datetimepicker
npm install react-native-maps
npm install react-hook-form
```

### Project Structure

```
src/
├── screens/auth/onboarding/
│   ├── BusinessInformationScreen.tsx
│   ├── LocationSetupScreen.tsx
│   ├── ServiceCategoriesScreen.tsx
│   ├── WorkingHoursScreen.tsx
│   ├── LicenseVerificationScreen.tsx
│   ├── ServiceCreationTutorialScreen.tsx
│   └── CompletionScreen.tsx
├── components/onboarding/
│   └── ProgressIndicator.tsx
├── navigation/
│   ├── AuthNavigator.tsx
│   └── ProviderOnboardingNavigator.tsx
├── services/
│   └── ProviderOnboardingService.ts
└── i18n/translations/
    ├── ar.json
    └── en.json
```

### Adding New Onboarding Steps

1. **Create Screen Component**:
```typescript
const NewStepScreen: React.FC<Props> = ({ navigation, route }) => {
  // Implementation
};
```

2. **Update Navigation Types**:
```typescript
type ProviderOnboardingStackParamList = {
  // ... existing screens
  NewStep: { phoneNumber: string };
};
```

3. **Add to Navigator**:
```typescript
<Stack.Screen 
  name="NewStep" 
  component={NewStepScreen}
  initialParams={{ phoneNumber: userData.phone }}
/>
```

4. **Update Service**:
```typescript
static async updateNewStep(data: NewStepData): Promise<any> {
  return this.updateOnboardingStep(8, data, true);
}
```

5. **Add Translations**:
```json
{
  "providerOnboarding": {
    "newStep": {
      "title": "New Step Title",
      "subtitle": "New step description"
    }
  }
}
```

### Form Implementation Pattern

```typescript
const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
  mode: 'onChange',
  defaultValues: { /* default values */ }
});

// Auto-save draft
const saveDraft = async (data: Partial<FormData>) => {
  await ProviderOnboardingService.updateStepName({ ...data, isCompleted: false });
};

// Form submission
const onSubmit = async (data: FormData) => {
  setIsLoading(true);
  try {
    const validation = ProviderOnboardingService.validateStepData(stepNumber, data);
    if (!validation.isValid) {
      Alert.alert('Error', validation.errors.join('\n'));
      return;
    }
    
    await ProviderOnboardingService.updateStepName({ ...data, isCompleted: true });
    navigation.navigate('NextStep', { phoneNumber });
  } catch (error) {
    console.error('Submission error:', error);
  } finally {
    setIsLoading(false);
  }
};
```

### Styling Guidelines

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',  // Consistent background
  },
  content: {
    padding: 20,                 // Standard padding
  },
  formContainer: {
    borderRadius: 16,            // Consistent border radius
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,            // Consistent spacing
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  inputRTL: {
    textAlign: 'right',          // RTL text alignment
    writingDirection: 'rtl',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,                     // Modern gap property
  },
});
```

## Testing

### Unit Testing

```typescript
// Example test for BusinessInformationScreen
describe('BusinessInformationScreen', () => {
  it('should validate required fields', async () => {
    const { getByText, getByLabelText } = render(<BusinessInformationScreen />);
    
    // Test form validation
    fireEvent.press(getByText('Continue'));
    expect(getByText('Owner name is required')).toBeTruthy();
  });
  
  it('should save draft data on input change', async () => {
    const saveSpy = jest.spyOn(ProviderOnboardingService, 'updatePersonalInformation');
    const { getByLabelText } = render(<BusinessInformationScreen />);
    
    fireEvent.changeText(getByLabelText('Owner Name'), 'Test Owner');
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
      ownerName: 'Test Owner',
      isCompleted: false
    }));
  });
});
```

### Integration Testing

```typescript
// Test complete onboarding flow
describe('Provider Onboarding Flow', () => {
  it('should complete full onboarding process', async () => {
    const navigation = createMockNavigation();
    
    // Step 1: Business Information
    const screen1 = render(<BusinessInformationScreen navigation={navigation} />);
    // ... fill form and continue
    
    // Step 2: Location Setup
    const screen2 = render(<LocationSetupScreen navigation={navigation} />);
    // ... set location and continue
    
    // Continue through all steps...
    
    expect(navigation.navigate).toHaveBeenCalledWith('Completion');
  });
});
```

### Manual Testing Checklist

- [ ] **Navigation**: Can navigate forward and backward between steps
- [ ] **Form Validation**: All required fields properly validated
- [ ] **Draft Saving**: Data persists when leaving and returning
- [ ] **RTL Support**: All text and layouts work correctly in Arabic
- [ ] **Image Upload**: Document and portfolio uploads function properly
- [ ] **Map Integration**: Location selection works accurately
- [ ] **Time Selection**: Working hours can be set correctly
- [ ] **Categories**: Service categories can be selected and searched
- [ ] **Completion**: Final step triggers proper authentication flow

### Performance Testing

- **Bundle Size**: Monitor JavaScript bundle impact
- **Memory Usage**: Track memory consumption during image uploads
- **Animation Performance**: Ensure 60fps during celebration animations
- **Load Times**: Measure screen transition times
- **Storage Usage**: Monitor AsyncStorage usage for draft data

## Troubleshooting

### Common Issues

#### 1. Map Not Loading
**Symptoms**: Blank map view or location services not working
**Solutions**:
- Verify location permissions in app settings
- Check Google Maps API key configuration
- Ensure device location services are enabled
- Test on physical device (maps may not work in simulator)

#### 2. Image Upload Failures
**Symptoms**: Document uploads fail or images don't display
**Solutions**:
- Check camera and photo library permissions
- Verify image picker configuration
- Test file size limitations
- Ensure proper image format handling

#### 3. Form Data Loss
**Symptoms**: Draft data not persisting between sessions
**Solutions**:
- Verify AsyncStorage permissions
- Check ProviderOnboardingService integration
- Test saveDraft function calls
- Monitor storage quota limitations

#### 4. Navigation Issues
**Symptoms**: Screen transitions fail or incorrect parameter passing
**Solutions**:
- Verify navigation parameter types
- Check screen registration in navigator
- Test deep linking scenarios
- Validate authentication state handling

#### 5. RTL Layout Problems
**Symptoms**: Text or layout issues in Arabic mode
**Solutions**:
- Check i18n configuration
- Verify RTL style applications
- Test text input behaviors
- Validate icon and button orientations

### Debug Tools

```typescript
// Enable debug logging
const DEBUG_ONBOARDING = __DEV__ && true;

const debugLog = (step: string, data: any) => {
  if (DEBUG_ONBOARDING) {
    console.log(`[Onboarding ${step}]:`, JSON.stringify(data, null, 2));
  }
};

// Usage in components
debugLog('BusinessInfo', formData);
```

### Performance Monitoring

```typescript
// Monitor screen load times
const startTime = Date.now();

useEffect(() => {
  const loadTime = Date.now() - startTime;
  if (loadTime > 1000) {
    console.warn(`Slow screen load: ${loadTime}ms`);
  }
}, []);
```

## Security Considerations

### Data Protection
- **Personal Information**: All PII encrypted in transit and at rest
- **Document Images**: Secure upload with file type validation
- **Location Data**: Precise coordinates only stored with user consent
- **Draft Data**: Local storage with appropriate access controls

### Input Validation
- **Server-Side Validation**: All data validated on backend
- **XSS Prevention**: Proper input sanitization
- **File Upload Security**: Document type and size restrictions
- **Form Injection**: Protection against malicious input

### Privacy Compliance
- **GDPR**: Right to erasure and data portability
- **Local Regulations**: Jordan data protection compliance
- **Consent Management**: Explicit consent for data collection
- **Audit Trail**: Complete onboarding action logging

## Future Enhancements

### Planned Features
1. **Video Introduction**: Welcome video for new providers
2. **AI Assistance**: Smart form completion suggestions
3. **Social Verification**: LinkedIn/Facebook professional verification
4. **Advanced Analytics**: Onboarding completion insights
5. **Mentor Program**: Experienced provider guidance integration

### Technical Improvements
1. **Progressive Web App**: Web-based onboarding option
2. **Offline Support**: Complete onboarding without internet
3. **Voice Input**: Arabic voice-to-text capabilities
4. **Biometric Verification**: Fingerprint/face ID for document verification
5. **AR Preview**: Augmented reality service demonstration

---

## Support

For technical support or questions about the Provider Onboarding implementation:

- **Documentation**: This guide and inline code comments
- **Code Review**: Peer review process for modifications
- **Issue Tracking**: GitHub issues for bug reports and feature requests
- **Team Communication**: Slack channels for real-time support

**Last Updated**: July 2025
**Version**: 1.0.0
**Maintainers**: BeautyCort Mobile Development Team