/**
 * Comprehensive Arabic Input Component Testing
 * Tests Arabic text input validation, RTL support, and user interactions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ArabicInput from '../../src/components/ArabicInput';
import { ArabicInputUtils } from '../../src/utils/arabic-input-validation';

// Mock the i18n module
jest.mock('../../src/i18n', () => ({
  isRTL: jest.fn(() => false),
}));

// Mock the RTL utilities
jest.mock('../../src/utils/rtl', () => ({
  getTextAlign: jest.fn((align) => align),
  getFlexDirection: jest.fn((direction) => direction),
  getMarginStart: jest.fn((value) => ({ marginLeft: value })),
  getMarginEnd: jest.fn((value) => ({ marginRight: value })),
}));

describe('ArabicInput Component', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
    placeholder: 'Enter text...',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render correctly with default props', () => {
      const { getByPlaceholderText } = render(<ArabicInput {...defaultProps} />);
      
      expect(getByPlaceholderText('Enter text...')).toBeTruthy();
    });

    it('should display label when provided', () => {
      const { getByText } = render(
        <ArabicInput {...defaultProps} label="Test Label" />
      );
      
      expect(getByText('Test Label')).toBeTruthy();
    });

    it('should show required asterisk when required', () => {
      const { getByText } = render(
        <ArabicInput {...defaultProps} label="Test Label" required />
      );
      
      expect(getByText('*')).toBeTruthy();
    });

    it('should call onChangeText when text changes', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <ArabicInput {...defaultProps} onChangeText={mockOnChangeText} />
      );
      
      const input = getByPlaceholderText('Enter text...');
      fireEvent.changeText(input, 'test text');
      
      expect(mockOnChangeText).toHaveBeenCalledWith('test text');
    });

    it('should handle multiline input correctly', () => {
      const { getByPlaceholderText } = render(
        <ArabicInput
          {...defaultProps}
          multiline
          numberOfLines={4}
          placeholder="Multi-line input"
        />
      );
      
      const input = getByPlaceholderText('Multi-line input');
      expect(input.props.multiline).toBe(true);
      expect(input.props.numberOfLines).toBe(4);
    });
  });

  describe('Arabic Text Validation', () => {
    it('should validate Arabic name input correctly', async () => {
      const { getByPlaceholderText, queryByText } = render(
        <ArabicInput
          {...defaultProps}
          validationType="name"
          placeholder="Arabic name"
          showValidation
        />
      );
      
      const input = getByPlaceholderText('Arabic name');
      
      // Test valid Arabic name
      fireEvent.changeText(input, 'أحمد محمد');
      await waitFor(() => {
        expect(queryByText(/النص يحتوي على أحرف غير صالحة/)).toBeNull();
      });
      
      // Test invalid input (Latin letters)
      fireEvent.changeText(input, 'John Smith');
      await waitFor(() => {
        expect(queryByText(/النص يجب أن يكون باللغة العربية فقط/)).toBeTruthy();
      });
    });

    it('should validate Arabic business name input correctly', async () => {
      const { getByPlaceholderText, queryByText } = render(
        <ArabicInput
          {...defaultProps}
          validationType="businessName"
          placeholder="Business name"
          showValidation
        />
      );
      
      const input = getByPlaceholderText('Business name');
      
      // Test valid business name with mixed content
      fireEvent.changeText(input, 'صالون الجمال - Beauty Salon');
      await waitFor(() => {
        expect(queryByText(/النص يحتوي على أحرف غير صالحة/)).toBeNull();
      });
      
      // Test too short business name
      fireEvent.changeText(input, 'ص');
      await waitFor(() => {
        expect(queryByText(/النص يجب أن يكون/)).toBeTruthy();
      });
    });

    it('should validate Arabic phone number correctly', async () => {
      const { getByPlaceholderText, queryByText } = render(
        <ArabicInput
          {...defaultProps}
          validationType="phone"
          placeholder="Phone number"
          showValidation
        />
      );
      
      const input = getByPlaceholderText('Phone number');
      
      // Test valid Jordan phone number
      fireEvent.changeText(input, '0791234567');
      await waitFor(() => {
        expect(queryByText(/رقم الهاتف غير صالح/)).toBeNull();
      });
      
      // Test invalid phone number
      fireEvent.changeText(input, '123456');
      await waitFor(() => {
        expect(queryByText(/رقم الهاتف غير صالح/)).toBeTruthy();
      });
      
      // Test Arabic numerals in phone number
      fireEvent.changeText(input, '٠٧٩١٢٣٤٥٦٧');
      await waitFor(() => {
        expect(queryByText(/رقم الهاتف غير صالح/)).toBeNull();
      });
    });

    it('should validate Arabic email correctly', async () => {
      const { getByPlaceholderText, queryByText } = render(
        <ArabicInput
          {...defaultProps}
          validationType="email"
          placeholder="Email"
          showValidation
        />
      );
      
      const input = getByPlaceholderText('Email');
      
      // Test valid email
      fireEvent.changeText(input, 'user@example.com');
      await waitFor(() => {
        expect(queryByText(/البريد الإلكتروني غير صالح/)).toBeNull();
      });
      
      // Test invalid email
      fireEvent.changeText(input, 'invalid-email');
      await waitFor(() => {
        expect(queryByText(/البريد الإلكتروني غير صالح/)).toBeTruthy();
      });
      
      // Test email with Arabic characters (should be invalid)
      fireEvent.changeText(input, 'مستخدم@example.com');
      await waitFor(() => {
        expect(queryByText(/الجزء المحلي من البريد الإلكتروني/)).toBeTruthy();
      });
    });

    it('should handle custom validation correctly', async () => {
      const customValidator = jest.fn(() => ({
        isValid: false,
        errors: ['خطأ مخصص'],
        warnings: ['تحذير مخصص']
      }));
      
      const { getByPlaceholderText, getByText } = render(
        <ArabicInput
          {...defaultProps}
          customValidation={customValidator}
          placeholder="Custom validation"
          showValidation
        />
      );
      
      const input = getByPlaceholderText('Custom validation');
      fireEvent.changeText(input, 'test');
      
      await waitFor(() => {
        expect(customValidator).toHaveBeenCalledWith('test');
        expect(getByText('خطأ مخصص')).toBeTruthy();
        expect(getByText('تحذير مخصص')).toBeTruthy();
      });
    });
  });

  describe('RTL Support', () => {
    it('should auto-detect RTL based on content', async () => {
      const { getByPlaceholderText } = render(
        <ArabicInput
          {...defaultProps}
          autoDetectRTL
          placeholder="Auto RTL"
        />
      );
      
      const input = getByPlaceholderText('Auto RTL');
      
      // Test with Arabic text
      fireEvent.changeText(input, 'النص العربي');
      await waitFor(() => {
        expect(input.props.style.writingDirection).toBe('rtl');
      });
      
      // Test with English text
      fireEvent.changeText(input, 'English text');
      await waitFor(() => {
        expect(input.props.style.writingDirection).toBe('ltr');
      });
    });

    it('should force RTL when specified', () => {
      const { getByPlaceholderText } = render(
        <ArabicInput
          {...defaultProps}
          forceRTL
          placeholder="Force RTL"
        />
      );
      
      const input = getByPlaceholderText('Force RTL');
      expect(input.props.style.writingDirection).toBe('rtl');
    });

    it('should handle RTL placeholder correctly', () => {
      const { getByPlaceholderText } = render(
        <ArabicInput
          {...defaultProps}
          forceRTL
          placeholder="أدخل النص"
        />
      );
      
      const input = getByPlaceholderText('\u200Fأدخل النص');
      expect(input.props.placeholder).toContain('\u200F');
    });
  });

  describe('Text Processing', () => {
    it('should convert Western numerals to Arabic numerals when enabled', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <ArabicInput
          {...defaultProps}
          onChangeText={mockOnChangeText}
          arabicNumerals
          placeholder="Arabic numerals"
        />
      );
      
      const input = getByPlaceholderText('Arabic numerals');
      fireEvent.changeText(input, '12345');
      
      expect(mockOnChangeText).toHaveBeenCalledWith('١٢٣٤٥');
    });

    it('should normalize Arabic text when enabled', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <ArabicInput
          {...defaultProps}
          onChangeText={mockOnChangeText}
          normalizeText
          placeholder="Normalize text"
        />
      );
      
      const input = getByPlaceholderText('Normalize text');
      fireEvent.changeText(input, 'أحمد   محمد'); // Multiple spaces
      
      expect(mockOnChangeText).toHaveBeenCalledWith('أحمد محمد');
    });
  });

  describe('Password Input', () => {
    it('should toggle password visibility', () => {
      const { getByPlaceholderText, getByLabelText } = render(
        <ArabicInput
          {...defaultProps}
          secureTextEntry
          placeholder="Password"
        />
      );
      
      const input = getByPlaceholderText('Password');
      const toggleButton = getByLabelText('visibility');
      
      // Initially hidden
      expect(input.props.secureTextEntry).toBe(true);
      
      // Toggle to show
      fireEvent.press(toggleButton);
      expect(input.props.secureTextEntry).toBe(false);
      
      // Toggle to hide
      fireEvent.press(toggleButton);
      expect(input.props.secureTextEntry).toBe(true);
    });
  });

  describe('Character Count', () => {
    it('should display character count when enabled', () => {
      const { getByPlaceholderText, getByText } = render(
        <ArabicInput
          {...defaultProps}
          value="test"
          showCharacterCount
          maxLength={10}
          placeholder="Character count"
        />
      );
      
      expect(getByText('4 / 10')).toBeTruthy();
    });

    it('should display Arabic numerals in character count', () => {
      const { getByPlaceholderText, getByText } = render(
        <ArabicInput
          {...defaultProps}
          value="test"
          showCharacterCount
          maxLength={10}
          arabicNumerals
          placeholder="Arabic character count"
        />
      );
      
      expect(getByText('٤ / ١٠')).toBeTruthy();
    });

    it('should highlight over-limit character count', () => {
      const { getByPlaceholderText, getByText } = render(
        <ArabicInput
          {...defaultProps}
          value="this is a very long text"
          showCharacterCount
          maxLength={10}
          placeholder="Over limit"
        />
      );
      
      const countText = getByText('25 / 10');
      expect(countText.props.style.color).toBe('#FF3B30');
    });
  });

  describe('Icons and Interactions', () => {
    it('should render left and right icons', () => {
      const mockLeftPress = jest.fn();
      const mockRightPress = jest.fn();
      
      const { getByLabelText } = render(
        <ArabicInput
          {...defaultProps}
          leftIcon="search"
          rightIcon="clear"
          onLeftIconPress={mockLeftPress}
          onRightIconPress={mockRightPress}
          placeholder="Icons"
        />
      );
      
      const leftIcon = getByLabelText('search');
      const rightIcon = getByLabelText('clear');
      
      expect(leftIcon).toBeTruthy();
      expect(rightIcon).toBeTruthy();
      
      fireEvent.press(leftIcon);
      expect(mockLeftPress).toHaveBeenCalled();
      
      fireEvent.press(rightIcon);
      expect(mockRightPress).toHaveBeenCalled();
    });

    it('should show validation icons correctly', async () => {
      const { getByPlaceholderText, getByLabelText } = render(
        <ArabicInput
          {...defaultProps}
          validationType="name"
          required
          showValidation
          placeholder="Validation icons"
        />
      );
      
      const input = getByPlaceholderText('Validation icons');
      
      // Test error icon
      fireEvent.changeText(input, 'a'); // Too short
      await waitFor(() => {
        expect(getByLabelText('error')).toBeTruthy();
      });
    });
  });

  describe('Focus and Blur Handling', () => {
    it('should handle focus and blur events', () => {
      const mockFocus = jest.fn();
      const mockBlur = jest.fn();
      
      const { getByPlaceholderText } = render(
        <ArabicInput
          {...defaultProps}
          onFocus={mockFocus}
          onBlur={mockBlur}
          placeholder="Focus blur"
        />
      );
      
      const input = getByPlaceholderText('Focus blur');
      
      fireEvent(input, 'focus');
      expect(mockFocus).toHaveBeenCalled();
      
      fireEvent(input, 'blur');
      expect(mockBlur).toHaveBeenCalled();
    });

    it('should validate on blur when validateOnChange is false', async () => {
      const { getByPlaceholderText, queryByText } = render(
        <ArabicInput
          {...defaultProps}
          validationType="name"
          validateOnChange={false}
          showValidation
          placeholder="Validate on blur"
        />
      );
      
      const input = getByPlaceholderText('Validate on blur');
      
      fireEvent.changeText(input, 'John'); // Invalid Arabic name
      expect(queryByText(/النص يجب أن يكون باللغة العربية فقط/)).toBeNull();
      
      fireEvent(input, 'blur');
      await waitFor(() => {
        expect(queryByText(/النص يجب أن يكون باللغة العربية فقط/)).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <ArabicInput
          {...defaultProps}
          label="Test Label"
          accessibilityLabel="Custom accessibility label"
          accessibilityHint="Custom hint"
          placeholder="Accessibility"
        />
      );
      
      const input = getByLabelText('Custom accessibility label');
      expect(input.props.accessibilityHint).toBe('Custom hint');
    });

    it('should use label as accessibility label when not provided', () => {
      const { getByLabelText } = render(
        <ArabicInput
          {...defaultProps}
          label="Test Label"
          placeholder="Default accessibility"
        />
      );
      
      expect(getByLabelText('Test Label')).toBeTruthy();
    });

    it('should have testID for testing', () => {
      const { getByTestId } = render(
        <ArabicInput
          {...defaultProps}
          testID="arabic-input-test"
          placeholder="Test ID"
        />
      );
      
      expect(getByTestId('arabic-input-test')).toBeTruthy();
    });
  });

  describe('Integration with Arabic Validation Utils', () => {
    it('should use Arabic validation patterns correctly', () => {
      const spy = jest.spyOn(ArabicInputUtils, 'validateName');
      
      const { getByPlaceholderText } = render(
        <ArabicInput
          {...defaultProps}
          validationType="name"
          placeholder="Arabic validation"
        />
      );
      
      const input = getByPlaceholderText('Arabic validation');
      fireEvent.changeText(input, 'أحمد');
      
      expect(spy).toHaveBeenCalledWith('أحمد');
      spy.mockRestore();
    });
  });
});