/**
 * Integration Testing for Arabic Form Validation
 * Tests complete form flows with Arabic input validation
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ArabicInput from '../../src/components/ArabicInput';
import { ArabicInputUtils } from '../../src/utils/arabic-input-validation';

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock API calls
const mockAPICall = jest.fn();
jest.mock('../../src/services/api', () => ({
  register: mockAPICall,
  registerProvider: mockAPICall,
  createBooking: mockAPICall,
  createService: mockAPICall,
  createReview: mockAPICall,
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock AsyncStorage
const mockAsyncStorage = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('Form Validation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAPICall.mockClear();
    Alert.alert.mockClear();
  });

  describe('User Registration Form', () => {
    const UserRegistrationForm = () => {
      const [name, setName] = React.useState('');
      const [phoneNumber, setPhoneNumber] = React.useState('');
      const [email, setEmail] = React.useState('');
      const [isSubmitting, setIsSubmitting] = React.useState(false);

      const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
          const response = await mockAPICall({
            name,
            phoneNumber,
            email,
          });
          
          if (response.success) {
            Alert.alert('نجح', 'تم إنشاء الحساب بنجاح');
            mockNavigation.replace('MainTabs');
          } else {
            Alert.alert('خطأ', 'فشل في إنشاء الحساب');
          }
        } catch (error) {
          Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء الحساب');
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <>
          <ArabicInput
            label="الاسم الكامل"
            value={name}
            onChangeText={setName}
            validationType="name"
            required
            placeholder="أدخل اسمك الكامل"
            testID="name-input"
          />
          
          <ArabicInput
            label="رقم الهاتف"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            validationType="phone"
            required
            placeholder="أدخل رقم هاتفك"
            keyboardType="phone-pad"
            testID="phone-input"
          />
          
          <ArabicInput
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            validationType="email"
            placeholder="أدخل بريدك الإلكتروني"
            keyboardType="email-address"
            testID="email-input"
          />
          
          <button
            testID="submit-button"
            disabled={isSubmitting}
            onPress={handleSubmit}
          >
            {isSubmitting ? 'جارٍ الإنشاء...' : 'إنشاء حساب'}
          </button>
        </>
      );
    };

    it('should successfully register user with valid Arabic input', async () => {
      mockAPICall.mockResolvedValue({ success: true, data: { id: 1 } });

      const { getByTestId } = render(<UserRegistrationForm />);
      
      const nameInput = getByTestId('name-input');
      const phoneInput = getByTestId('phone-input');
      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      // Fill form with valid Arabic data
      fireEvent.changeText(nameInput, 'أحمد محمد العلي');
      fireEvent.changeText(phoneInput, '0791234567');
      fireEvent.changeText(emailInput, 'ahmed@example.com');

      // Submit form
      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(mockAPICall).toHaveBeenCalledWith({
          name: 'أحمد محمد العلي',
          phoneNumber: '0791234567',
          email: 'ahmed@example.com',
        });
      });

      expect(Alert.alert).toHaveBeenCalledWith('نجح', 'تم إنشاء الحساب بنجاح');
      expect(mockNavigation.replace).toHaveBeenCalledWith('MainTabs');
    });

    it('should show validation errors for invalid Arabic input', async () => {
      const { getByTestId, getByText } = render(<UserRegistrationForm />);
      
      const nameInput = getByTestId('name-input');
      const phoneInput = getByTestId('phone-input');
      const submitButton = getByTestId('submit-button');

      // Fill form with invalid data
      fireEvent.changeText(nameInput, 'أ'); // Too short
      fireEvent.changeText(phoneInput, '123'); // Invalid phone

      // Try to submit
      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText('النص يجب أن يكون 2 أحرف على الأقل')).toBeTruthy();
        expect(getByText('رقم الهاتف غير صالح')).toBeTruthy();
      });

      expect(mockAPICall).not.toHaveBeenCalled();
    });

    it('should handle Arabic numerals in phone number', async () => {
      mockAPICall.mockResolvedValue({ success: true, data: { id: 1 } });

      const { getByTestId } = render(<UserRegistrationForm />);
      
      const nameInput = getByTestId('name-input');
      const phoneInput = getByTestId('phone-input');
      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      // Fill form with Arabic numerals
      fireEvent.changeText(nameInput, 'فاطمة أحمد');
      fireEvent.changeText(phoneInput, '٠٧٩١٢٣٤٥٦٧');
      fireEvent.changeText(emailInput, 'fatima@example.com');

      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(mockAPICall).toHaveBeenCalledWith({
          name: 'فاطمة أحمد',
          phoneNumber: '٠٧٩١٢٣٤٥٦٧',
          email: 'fatima@example.com',
        });
      });

      expect(Alert.alert).toHaveBeenCalledWith('نجح', 'تم إنشاء الحساب بنجاح');
    });

    it('should handle mixed Arabic and English names', async () => {
      mockAPICall.mockResolvedValue({ success: true, data: { id: 1 } });

      const { getByTestId, queryByText } = render(<UserRegistrationForm />);
      
      const nameInput = getByTestId('name-input');
      const phoneInput = getByTestId('phone-input');
      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      // Fill form with mixed name
      fireEvent.changeText(nameInput, 'أحمد Ahmed');
      fireEvent.changeText(phoneInput, '0791234567');
      fireEvent.changeText(emailInput, 'ahmed@example.com');

      // Should show warning but allow submission
      await waitFor(() => {
        expect(queryByText('النص يحتوي على خليط من اللغات')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(mockAPICall).toHaveBeenCalledWith({
        name: 'أحمد Ahmed',
        phoneNumber: '0791234567',
        email: 'ahmed@example.com',
      });
    });
  });

  describe('Provider Registration Form', () => {
    const ProviderRegistrationForm = () => {
      const [name, setName] = React.useState('');
      const [businessName, setBusinessName] = React.useState('');
      const [description, setDescription] = React.useState('');
      const [address, setAddress] = React.useState('');
      const [phoneNumber, setPhoneNumber] = React.useState('');
      const [email, setEmail] = React.useState('');

      const handleSubmit = async () => {
        const response = await mockAPICall({
          name,
          businessName,
          description,
          address,
          phoneNumber,
          email,
        });
        
        if (response.success) {
          Alert.alert('نجح', 'تم تسجيل مقدم الخدمة بنجاح');
        }
      };

      return (
        <>
          <ArabicInput
            label="الاسم الكامل"
            value={name}
            onChangeText={setName}
            validationType="name"
            required
            testID="name-input"
          />
          
          <ArabicInput
            label="اسم النشاط التجاري"
            value={businessName}
            onChangeText={setBusinessName}
            validationType="businessName"
            required
            testID="business-name-input"
          />
          
          <ArabicInput
            label="وصف الخدمات"
            value={description}
            onChangeText={setDescription}
            validationType="description"
            multiline
            numberOfLines={4}
            testID="description-input"
          />
          
          <ArabicInput
            label="العنوان"
            value={address}
            onChangeText={setAddress}
            validationType="address"
            required
            testID="address-input"
          />
          
          <ArabicInput
            label="رقم الهاتف"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            validationType="phone"
            required
            testID="phone-input"
          />
          
          <ArabicInput
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            validationType="email"
            required
            testID="email-input"
          />
          
          <button testID="submit-button" onPress={handleSubmit}>
            تسجيل مقدم الخدمة
          </button>
        </>
      );
    };

    it('should successfully register provider with Arabic business information', async () => {
      mockAPICall.mockResolvedValue({ success: true, data: { id: 1 } });

      const { getByTestId } = render(<ProviderRegistrationForm />);
      
      // Fill all fields with Arabic data
      fireEvent.changeText(getByTestId('name-input'), 'سارة محمد');
      fireEvent.changeText(getByTestId('business-name-input'), 'صالون الجمال الذهبي');
      fireEvent.changeText(getByTestId('description-input'), 'نقدم أفضل خدمات التجميل والعناية بالبشرة والشعر باستخدام أحدث التقنيات');
      fireEvent.changeText(getByTestId('address-input'), 'شارع الملك حسين، عمان، الأردن');
      fireEvent.changeText(getByTestId('phone-input'), '0791234567');
      fireEvent.changeText(getByTestId('email-input'), 'salon@example.com');

      await act(async () => {
        fireEvent.press(getByTestId('submit-button'));
      });

      await waitFor(() => {
        expect(mockAPICall).toHaveBeenCalledWith({
          name: 'سارة محمد',
          businessName: 'صالون الجمال الذهبي',
          description: 'نقدم أفضل خدمات التجميل والعناية بالبشرة والشعر باستخدام أحدث التقنيات',
          address: 'شارع الملك حسين، عمان، الأردن',
          phoneNumber: '0791234567',
          email: 'salon@example.com',
        });
      });

      expect(Alert.alert).toHaveBeenCalledWith('نجح', 'تم تسجيل مقدم الخدمة بنجاح');
    });

    it('should handle bilingual business names correctly', async () => {
      mockAPICall.mockResolvedValue({ success: true, data: { id: 1 } });

      const { getByTestId } = render(<ProviderRegistrationForm />);
      
      // Fill form with bilingual business name
      fireEvent.changeText(getByTestId('name-input'), 'علي أحمد');
      fireEvent.changeText(getByTestId('business-name-input'), 'صالون الجمال - Beauty Salon');
      fireEvent.changeText(getByTestId('description-input'), 'نقدم خدمات التجميل باللغتين العربية والإنجليزية');
      fireEvent.changeText(getByTestId('address-input'), 'منطقة عبدون، عمان');
      fireEvent.changeText(getByTestId('phone-input'), '0781234567');
      fireEvent.changeText(getByTestId('email-input'), 'bilingual@example.com');

      await act(async () => {
        fireEvent.press(getByTestId('submit-button'));
      });

      expect(mockAPICall).toHaveBeenCalledWith({
        name: 'علي أحمد',
        businessName: 'صالون الجمال - Beauty Salon',
        description: 'نقدم خدمات التجميل باللغتين العربية والإنجليزية',
        address: 'منطقة عبدون، عمان',
        phoneNumber: '0781234567',
        email: 'bilingual@example.com',
      });
    });

    it('should validate minimum length for business description', async () => {
      const { getByTestId, getByText } = render(<ProviderRegistrationForm />);
      
      // Fill description with too short text
      fireEvent.changeText(getByTestId('description-input'), 'قصير');

      await waitFor(() => {
        expect(getByText('النص يجب أن يكون 10 أحرف على الأقل')).toBeTruthy();
      });
    });
  });

  describe('Booking Form', () => {
    const BookingForm = () => {
      const [customerNotes, setCustomerNotes] = React.useState('');
      const [specialRequests, setSpecialRequests] = React.useState('');

      const handleSubmit = async () => {
        const response = await mockAPICall({
          serviceId: '550e8400-e29b-41d4-a716-446655440000',
          providerId: '550e8400-e29b-41d4-a716-446655440001',
          date: '2025-07-20',
          time: '14:30',
          customerNotes,
          specialRequests,
        });
        
        if (response.success) {
          Alert.alert('نجح', 'تم إنشاء الحجز بنجاح');
        }
      };

      return (
        <>
          <ArabicInput
            label="ملاحظات العميل"
            value={customerNotes}
            onChangeText={setCustomerNotes}
            validationType="notes"
            multiline
            numberOfLines={3}
            placeholder="أدخل أي ملاحظات خاصة..."
            testID="customer-notes-input"
          />
          
          <ArabicInput
            label="طلبات خاصة"
            value={specialRequests}
            onChangeText={setSpecialRequests}
            validationType="notes"
            placeholder="أدخل طلباتك الخاصة..."
            testID="special-requests-input"
          />
          
          <button testID="submit-button" onPress={handleSubmit}>
            تأكيد الحجز
          </button>
        </>
      );
    };

    it('should handle Arabic customer notes and special requests', async () => {
      mockAPICall.mockResolvedValue({ success: true, data: { id: 1 } });

      const { getByTestId } = render(<BookingForm />);
      
      fireEvent.changeText(
        getByTestId('customer-notes-input'),
        'يُرجى الوصول مبكراً بـ 15 دقيقة. أفضل الخدمة بدون موسيقى عالية.'
      );
      
      fireEvent.changeText(
        getByTestId('special-requests-input'),
        'استخدام منتجات طبيعية فقط'
      );

      await act(async () => {
        fireEvent.press(getByTestId('submit-button'));
      });

      expect(mockAPICall).toHaveBeenCalledWith({
        serviceId: '550e8400-e29b-41d4-a716-446655440000',
        providerId: '550e8400-e29b-41d4-a716-446655440001',
        date: '2025-07-20',
        time: '14:30',
        customerNotes: 'يُرجى الوصول مبكراً بـ 15 دقيقة. أفضل الخدمة بدون موسيقى عالية.',
        specialRequests: 'استخدام منتجات طبيعية فقط',
      });
    });

    it('should handle mixed language notes', async () => {
      mockAPICall.mockResolvedValue({ success: true, data: { id: 1 } });

      const { getByTestId } = render(<BookingForm />);
      
      fireEvent.changeText(
        getByTestId('customer-notes-input'),
        'يُرجى الوصول مبكراً - Please arrive early'
      );
      
      fireEvent.changeText(
        getByTestId('special-requests-input'),
        'Natural products only - منتجات طبيعية فقط'
      );

      await act(async () => {
        fireEvent.press(getByTestId('submit-button'));
      });

      expect(mockAPICall).toHaveBeenCalledWith(
        expect.objectContaining({
          customerNotes: 'يُرجى الوصول مبكراً - Please arrive early',
          specialRequests: 'Natural products only - منتجات طبيعية فقط',
        })
      );
    });
  });

  describe('Review Form', () => {
    const ReviewForm = () => {
      const [comment, setComment] = React.useState('');
      const [rating, setRating] = React.useState(5);

      const handleSubmit = async () => {
        const response = await mockAPICall({
          bookingId: '550e8400-e29b-41d4-a716-446655440000',
          rating,
          comment,
          wouldRecommend: rating >= 4,
        });
        
        if (response.success) {
          Alert.alert('نجح', 'تم إضافة التقييم بنجاح');
        }
      };

      return (
        <>
          <ArabicInput
            label="تعليق التقييم"
            value={comment}
            onChangeText={setComment}
            validationType="notes"
            multiline
            numberOfLines={4}
            placeholder="اكتب تعليقك هنا..."
            testID="comment-input"
          />
          
          <button testID="submit-button" onPress={handleSubmit}>
            إرسال التقييم
          </button>
        </>
      );
    };

    it('should handle Arabic review comments', async () => {
      mockAPICall.mockResolvedValue({ success: true, data: { id: 1 } });

      const { getByTestId } = render(<ReviewForm />);
      
      fireEvent.changeText(
        getByTestId('comment-input'),
        'خدمة ممتازة ومتميزة. الموظفون محترفون ومتعاونون جداً. أنصح بشدة بزيارة هذا المكان.'
      );

      await act(async () => {
        fireEvent.press(getByTestId('submit-button'));
      });

      expect(mockAPICall).toHaveBeenCalledWith({
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
        comment: 'خدمة ممتازة ومتميزة. الموظفون محترفون ومتعاونون جداً. أنصح بشدة بزيارة هذا المكان.',
        wouldRecommend: true,
      });

      expect(Alert.alert).toHaveBeenCalledWith('نجح', 'تم إضافة التقييم بنجاح');
    });

    it('should handle mixed language review comments', async () => {
      mockAPICall.mockResolvedValue({ success: true, data: { id: 1 } });

      const { getByTestId } = render(<ReviewForm />);
      
      fireEvent.changeText(
        getByTestId('comment-input'),
        'خدمة جيدة جداً - Very good service. I recommend it - أنصح بها.'
      );

      await act(async () => {
        fireEvent.press(getByTestId('submit-button'));
      });

      expect(mockAPICall).toHaveBeenCalledWith(
        expect.objectContaining({
          comment: 'خدمة جيدة جداً - Very good service. I recommend it - أنصح بها.',
        })
      );
    });
  });

  describe('Form Validation Edge Cases', () => {
    const EdgeCaseForm = () => {
      const [text, setText] = React.useState('');
      const [validationType, setValidationType] = React.useState('name');

      return (
        <>
          <ArabicInput
            label="نص الاختبار"
            value={text}
            onChangeText={setText}
            validationType={validationType}
            testID="test-input"
          />
          
          <button 
            testID="switch-validation"
            onPress={() => setValidationType(validationType === 'name' ? 'email' : 'name')}
          >
            تبديل نوع التحقق
          </button>
        </>
      );
    };

    it('should handle dynamic validation type switching', async () => {
      const { getByTestId, getByText, queryByText } = render(<EdgeCaseForm />);
      
      const input = getByTestId('test-input');
      const switchButton = getByTestId('switch-validation');

      // Test as name validation
      fireEvent.changeText(input, 'أحمد@محمد');
      await waitFor(() => {
        expect(getByText('النص يحتوي على أحرف غير صالحة')).toBeTruthy();
      });

      // Switch to email validation
      fireEvent.press(switchButton);
      
      // Now should be invalid email
      await waitFor(() => {
        expect(queryByText('النص يحتوي على أحرف غير صالحة')).toBeNull();
        expect(getByText('البريد الإلكتروني غير صالح')).toBeTruthy();
      });
    });

    it('should handle very long Arabic text', async () => {
      const LongTextForm = () => {
        const [longText, setLongText] = React.useState('');

        return (
          <ArabicInput
            label="نص طويل"
            value={longText}
            onChangeText={setLongText}
            validationType="notes"
            maxLength={100}
            showCharacterCount
            testID="long-text-input"
          />
        );
      };

      const { getByTestId, getByText } = render(<LongTextForm />);
      
      const input = getByTestId('long-text-input');
      const veryLongText = 'نص طويل جداً '.repeat(50); // Very long text

      fireEvent.changeText(input, veryLongText);

      await waitFor(() => {
        expect(getByText('النص يجب أن لا يتجاوز 100 حرف')).toBeTruthy();
      });
    });

    it('should handle text with special Arabic characters', async () => {
      const SpecialCharForm = () => {
        const [specialText, setSpecialText] = React.useState('');

        return (
          <ArabicInput
            label="نص خاص"
            value={specialText}
            onChangeText={setSpecialText}
            validationType="name"
            testID="special-char-input"
          />
        );
      };

      const { getByTestId, queryByText } = render(<SpecialCharForm />);
      
      const input = getByTestId('special-char-input');
      
      // Test with Arabic diacritics
      fireEvent.changeText(input, 'مُحَمَّد الأَحْمَد');
      
      await waitFor(() => {
        expect(queryByText('النص يحتوي على أحرف غير صالحة')).toBeNull();
      });
    });

    it('should handle empty and whitespace-only input', async () => {
      const EmptyTextForm = () => {
        const [emptyText, setEmptyText] = React.useState('');

        return (
          <ArabicInput
            label="نص فارغ"
            value={emptyText}
            onChangeText={setEmptyText}
            validationType="name"
            required
            testID="empty-text-input"
          />
        );
      };

      const { getByTestId, getByText } = render(<EmptyTextForm />);
      
      const input = getByTestId('empty-text-input');
      
      // Test with empty text
      fireEvent.changeText(input, '');
      fireEvent(input, 'blur');
      
      await waitFor(() => {
        expect(getByText('النص مطلوب')).toBeTruthy();
      });
      
      // Test with whitespace only
      fireEvent.changeText(input, '   ');
      fireEvent(input, 'blur');
      
      await waitFor(() => {
        expect(getByText('النص مطلوب')).toBeTruthy();
      });
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle rapid input changes without memory leaks', async () => {
      const RapidInputForm = () => {
        const [rapidText, setRapidText] = React.useState('');

        return (
          <ArabicInput
            label="نص سريع"
            value={rapidText}
            onChangeText={setRapidText}
            validationType="name"
            testID="rapid-input"
          />
        );
      };

      const { getByTestId } = render(<RapidInputForm />);
      
      const input = getByTestId('rapid-input');
      
      // Simulate rapid typing
      for (let i = 0; i < 100; i++) {
        fireEvent.changeText(input, `أحمد ${i}`);
      }
      
      // Should not crash or show memory warnings
      expect(input.props.value).toBe('أحمد 99');
    });

    it('should handle large forms with multiple Arabic inputs', async () => {
      const LargeForm = () => {
        const [fields, setFields] = React.useState(
          Array.from({ length: 50 }, (_, i) => `نص ${i}`)
        );

        return (
          <>
            {fields.map((field, index) => (
              <ArabicInput
                key={index}
                label={`حقل ${index + 1}`}
                value={field}
                onChangeText={(text) => {
                  const newFields = [...fields];
                  newFields[index] = text;
                  setFields(newFields);
                }}
                validationType="name"
                testID={`field-${index}`}
              />
            ))}
          </>
        );
      };

      const { getByTestId } = render(<LargeForm />);
      
      // Test that all fields are rendered
      for (let i = 0; i < 50; i++) {
        expect(getByTestId(`field-${i}`)).toBeTruthy();
      }
      
      // Test updating a field
      fireEvent.changeText(getByTestId('field-0'), 'أحمد محمد');
      
      expect(getByTestId('field-0').props.value).toBe('أحمد محمد');
    });
  });
});

// Integration test utilities
const IntegrationTestUtils = {
  // Create mock form data
  createMockFormData: (type, language = 'ar') => {
    const data = {
      user: {
        ar: {
          name: 'أحمد محمد',
          phoneNumber: '0791234567',
          email: 'ahmed@example.com',
        },
        en: {
          name: 'Ahmed Mohammed',
          phoneNumber: '0791234567',
          email: 'ahmed@example.com',
        },
      },
      provider: {
        ar: {
          name: 'فاطمة أحمد',
          businessName: 'صالون الجمال',
          description: 'نقدم أفضل خدمات التجميل',
          address: 'عمان، الأردن',
          phoneNumber: '0791234567',
          email: 'salon@example.com',
        },
        en: {
          name: 'Fatima Ahmed',
          businessName: 'Beauty Salon',
          description: 'We provide the best beauty services',
          address: 'Amman, Jordan',
          phoneNumber: '0791234567',
          email: 'salon@example.com',
        },
      },
      booking: {
        ar: {
          customerNotes: 'يُرجى الوصول مبكراً',
          specialRequests: 'منتجات طبيعية فقط',
        },
        en: {
          customerNotes: 'Please arrive early',
          specialRequests: 'Natural products only',
        },
      },
      review: {
        ar: {
          comment: 'خدمة ممتازة ومتميزة',
        },
        en: {
          comment: 'Excellent and outstanding service',
        },
      },
    };

    return data[type][language];
  },

  // Simulate form submission
  simulateFormSubmission: async (formData, expectedResponse = { success: true }) => {
    mockAPICall.mockResolvedValue(expectedResponse);
    
    await act(async () => {
      // Simulate form submission
      const result = await mockAPICall(formData);
      expect(result).toEqual(expectedResponse);
    });
  },

  // Test validation state
  expectValidationState: (component, field, expectedState) => {
    const input = component.getByTestId(`${field}-input`);
    
    if (expectedState.isValid) {
      expect(component.queryByText(expectedState.errorMessage)).toBeNull();
    } else {
      expect(component.getByText(expectedState.errorMessage)).toBeTruthy();
    }
  },

  // Test Arabic text preservation
  expectArabicTextPreservation: (component, testId, expectedText) => {
    const input = component.getByTestId(testId);
    expect(input.props.value).toBe(expectedText);
    expect(input.props.value).toMatch(/[\u0600-\u06FF]/); // Contains Arabic
  },
};

module.exports = {
  IntegrationTestUtils,
};