/**
 * Comprehensive Arabic Input Validation Testing
 * Tests all Arabic text validation utilities and patterns
 */

import {
  validateArabicText,
  validateArabicName,
  validateArabicBusinessName,
  validateArabicDescription,
  validateArabicAddress,
  validateArabicNotes,
  validateArabicPhoneNumber,
  validateArabicEmail,
  isValidArabicText,
  hasMixedContent,
  checkArabicTextQuality,
  normalizeArabicText,
  prepareArabicSearchText,
  shouldUseRTL,
  getTextDirection,
  createArabicInputValidator,
  ArabicInputUtils
} from '../../src/utils/arabic-input-validation';

describe('Arabic Input Validation', () => {
  
  describe('validateArabicText', () => {
    it('should validate basic Arabic text correctly', () => {
      const validArabic = 'أحمد محمد';
      const result = validateArabicText(validArabic);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle empty text based on required option', () => {
      const emptyRequired = validateArabicText('', { required: true });
      expect(emptyRequired.isValid).toBe(false);
      expect(emptyRequired.errors).toContain('النص مطلوب');
      
      const emptyOptional = validateArabicText('', { required: false });
      expect(emptyOptional.isValid).toBe(true);
      expect(emptyOptional.errors).toHaveLength(0);
    });

    it('should validate text length correctly', () => {
      const shortText = validateArabicText('أ', { minLength: 5 });
      expect(shortText.isValid).toBe(false);
      expect(shortText.errors).toContain('النص يجب أن يكون 5 أحرف على الأقل');
      
      const longText = validateArabicText('أحمد محمد علي', { maxLength: 5 });
      expect(longText.isValid).toBe(false);
      expect(longText.errors).toContain('النص يجب أن لا يتجاوز 5 حرف');
    });

    it('should apply custom patterns correctly', () => {
      const customPattern = /^[أحمد\s]+$/; // Only specific letters
      const validCustom = validateArabicText('أحمد محمد', { pattern: customPattern });
      expect(validCustom.isValid).toBe(false);
      expect(validCustom.errors).toContain('النص يحتوي على أحرف غير صالحة');
      
      const validText = validateArabicText('أحمد أحمد', { pattern: customPattern });
      expect(validText.isValid).toBe(true);
    });

    it('should handle mixed content validation', () => {
      const mixedText = 'أحمد Ahmed';
      const strictResult = validateArabicText(mixedText, { allowMixed: false });
      expect(strictResult.warnings).toContain('النص يحتوي على خليط من اللغات');
      
      const allowedResult = validateArabicText(mixedText, { allowMixed: true });
      expect(allowedResult.warnings).not.toContain('النص يحتوي على خليط من اللغات');
    });

    it('should normalize text when requested', () => {
      const textWithExtraSpaces = 'أحمد   محمد';
      const result = validateArabicText(textWithExtraSpaces, { normalize: true });
      
      expect(result.normalizedText).toBe('أحمد محمد');
    });

    it('should validate strict Arabic text', () => {
      const arabicText = 'أحمد محمد';
      const mixedText = 'أحمد Ahmed';
      
      const strictArabic = validateArabicText(arabicText, { strictArabic: true });
      expect(strictArabic.isValid).toBe(true);
      
      const strictMixed = validateArabicText(mixedText, { strictArabic: true });
      expect(strictMixed.isValid).toBe(false);
      expect(strictMixed.errors).toContain('النص يجب أن يكون باللغة العربية فقط');
    });
  });

  describe('validateArabicName', () => {
    it('should validate valid Arabic names', () => {
      const validNames = [
        'أحمد محمد',
        'فاطمة علي',
        'عبدالرحمن',
        'أم كلثوم',
        'عبدالله بن محمد'
      ];
      
      validNames.forEach(name => {
        const result = validateArabicName(name);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid Arabic names', () => {
      const invalidNames = [
        '', // Empty
        'أ', // Too short
        'Ahmed', // Latin characters
        'أحمد123', // Numbers
        'أحمد@محمد', // Special characters
        'أحمد محمد علي عبدالرحمن عبدالله محمد أحمد علي فاطمة زينب خديجة عائشة' // Too long
      ];
      
      invalidNames.forEach(name => {
        const result = validateArabicName(name);
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle Arabic names with common patterns', () => {
      const commonPatterns = [
        'أبو محمد',
        'بنت علي',
        'ام أحمد',
        'عبد الله',
        'عبد الرحمن'
      ];
      
      commonPatterns.forEach(name => {
        const result = validateArabicName(name);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('validateArabicBusinessName', () => {
    it('should validate valid Arabic business names', () => {
      const validBusinessNames = [
        'صالون الجمال',
        'مركز العناية بالبشرة',
        'استوديو الأظافر',
        'شركة الجمال المتقدمة',
        'مجموعة الأناقة والجمال'
      ];
      
      validBusinessNames.forEach(name => {
        const result = validateArabicBusinessName(name);
        expect(result.isValid).toBe(true);
      });
    });

    it('should allow mixed content in business names', () => {
      const mixedBusinessNames = [
        'صالون الجمال - Beauty Salon',
        'مركز العناية & Care Center',
        'استوديو الأظافر (Nail Studio)',
        'شركة الجمال / Beauty Company'
      ];
      
      mixedBusinessNames.forEach(name => {
        const result = validateArabicBusinessName(name);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid business names', () => {
      const invalidBusinessNames = [
        '', // Empty
        'ص', // Too short
        'صالون@الجمال', // Invalid characters
        'صالون#الجمال', // Invalid characters
      ];
      
      invalidBusinessNames.forEach(name => {
        const result = validateArabicBusinessName(name);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateArabicDescription', () => {
    it('should validate valid Arabic descriptions', () => {
      const validDescriptions = [
        'نحن نقدم خدمات التجميل والعناية بالبشرة بأحدث التقنيات والمعدات المتطورة.',
        'خدماتنا تشمل: قص الشعر، العناية بالبشرة، تجميل الأظافر، والتدليك.',
        'فريقنا من المتخصصين يضمن لك أفضل النتائج والخدمة المتميزة.',
        'نستخدم منتجات طبيعية وآمنة للحصول على أفضل النتائج.'
      ];
      
      validDescriptions.forEach(desc => {
        const result = validateArabicDescription(desc);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle optional descriptions', () => {
      const emptyDescription = validateArabicDescription('');
      expect(emptyDescription.isValid).toBe(true);
    });

    it('should reject too short descriptions', () => {
      const shortDescription = validateArabicDescription('قصير');
      expect(shortDescription.isValid).toBe(false);
      expect(shortDescription.errors).toContain('النص يجب أن يكون 10 أحرف على الأقل');
    });
  });

  describe('validateArabicAddress', () => {
    it('should validate valid Arabic addresses', () => {
      const validAddresses = [
        'شارع الملك حسين، عمان، الأردن',
        'منطقة عبدون، عمان 11181',
        'شارع الجامعة الأردنية رقم 123',
        'مجمع الأفنيوز، الطابق الثاني، محل رقم 45'
      ];
      
      validAddresses.forEach(address => {
        const result = validateArabicAddress(address);
        expect(result.isValid).toBe(true);
      });
    });

    it('should allow mixed content in addresses', () => {
      const mixedAddresses = [
        'شارع الملك حسين، Amman, Jordan',
        'منطقة عبدون - Abdoun Area',
        'University Street رقم 123'
      ];
      
      mixedAddresses.forEach(address => {
        const result = validateArabicAddress(address);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid addresses', () => {
      const invalidAddresses = [
        '', // Empty
        'عنوان', // Too short
        'شارع@الملك', // Invalid characters
      ];
      
      invalidAddresses.forEach(address => {
        const result = validateArabicAddress(address);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateArabicNotes', () => {
    it('should validate valid Arabic notes', () => {
      const validNotes = [
        'يُرجى الوصول مبكراً بـ 15 دقيقة.',
        'تجنب استخدام مستحضرات التجميل قبل الموعد.',
        'في حالة الإلغاء، يُرجى الاتصال قبل 24 ساعة.',
        'العميل يفضل الخدمة بدون موسيقى.'
      ];
      
      validNotes.forEach(note => {
        const result = validateArabicNotes(note);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle empty notes', () => {
      const emptyNotes = validateArabicNotes('');
      expect(emptyNotes.isValid).toBe(true);
    });

    it('should allow mixed content in notes', () => {
      const mixedNotes = [
        'يُرجى الوصول مبكراً - Please arrive early',
        'Special request: خدمة خاصة',
        'Customer prefers: موسيقى هادئة'
      ];
      
      mixedNotes.forEach(note => {
        const result = validateArabicNotes(note);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('validateArabicPhoneNumber', () => {
    it('should validate valid Jordan phone numbers', () => {
      const validPhones = [
        '+962791234567',
        '962791234567',
        '0791234567',
        '791234567',
        '+962781234567',
        '0771234567'
      ];
      
      validPhones.forEach(phone => {
        const result = validateArabicPhoneNumber(phone);
        expect(result.isValid).toBe(true);
        expect(result.formattedPhone).toMatch(/^\+962 7[789] \d{3} \d{4}$/);
      });
    });

    it('should validate Arabic numeral phone numbers', () => {
      const arabicPhones = [
        '٠٧٩١٢٣٤٥٦٧',
        '٩٦٢٧٨١٢٣٤٥٦٧',
        '٧٧١٢٣٤٥٦٧'
      ];
      
      arabicPhones.forEach(phone => {
        const result = validateArabicPhoneNumber(phone);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '', // Empty
        '123456', // Too short
        '0591234567', // Invalid prefix
        '0721234567', // Invalid prefix
        'abcdefghij', // Letters
        '+1234567890' // Wrong country code
      ];
      
      invalidPhones.forEach(phone => {
        const result = validateArabicPhoneNumber(phone);
        expect(result.isValid).toBe(false);
      });
    });

    it('should format phone numbers correctly', () => {
      const testCases = [
        { input: '0791234567', expected: '+962 79 123 4567' },
        { input: '962781234567', expected: '+962 78 123 4567' },
        { input: '+962771234567', expected: '+962 77 123 4567' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = validateArabicPhoneNumber(input);
        expect(result.formattedPhone).toBe(expected);
      });
    });
  });

  describe('validateArabicEmail', () => {
    it('should validate valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.org',
        'user+tag@example.co.uk',
        'user123@test-domain.com'
      ];
      
      validEmails.forEach(email => {
        const result = validateArabicEmail(email);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '', // Empty
        'invalid-email', // No @ symbol
        'user@', // No domain
        '@domain.com', // No local part
        'user@domain', // No TLD
        'user space@domain.com' // Space in local part
      ];
      
      invalidEmails.forEach(email => {
        const result = validateArabicEmail(email);
        expect(result.isValid).toBe(false);
      });
    });

    it('should reject emails with Arabic characters in local part', () => {
      const arabicEmails = [
        'مستخدم@example.com',
        'user.عربي@domain.com',
        'أحمد@test.org'
      ];
      
      arabicEmails.forEach(email => {
        const result = validateArabicEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('الجزء المحلي من البريد الإلكتروني لا يمكن أن يحتوي على أحرف عربية');
      });
    });
  });

  describe('isValidArabicText', () => {
    it('should identify valid Arabic text', () => {
      const validTexts = [
        'أحمد محمد',
        'النص العربي',
        'أحمد محمد علي',
        'النص مع الأرقام ١٢٣',
        'النص مع علامات الترقيم، والفواصل.'
      ];
      
      validTexts.forEach(text => {
        expect(isValidArabicText(text)).toBe(true);
      });
    });

    it('should identify invalid Arabic text', () => {
      const invalidTexts = [
        'Ahmed Mohammed', // Latin characters
        'أحمد Ahmed', // Mixed content
        'أحمد@محمد', // Invalid symbols
        'أحمد<محمد>', // HTML tags
        'أحمد[محمد]' // Square brackets
      ];
      
      invalidTexts.forEach(text => {
        expect(isValidArabicText(text)).toBe(false);
      });
    });

    it('should handle empty text', () => {
      expect(isValidArabicText('')).toBe(true);
      expect(isValidArabicText('   ')).toBe(true);
    });
  });

  describe('hasMixedContent', () => {
    it('should detect mixed Arabic and Latin content', () => {
      const mixedTexts = [
        'أحمد Ahmed',
        'صالون Beauty Salon',
        'النص مع English text',
        'Arabic نص مع numbers 123'
      ];
      
      mixedTexts.forEach(text => {
        expect(hasMixedContent(text)).toBe(true);
      });
    });

    it('should not detect mixed content in pure texts', () => {
      const pureTexts = [
        'أحمد محمد', // Pure Arabic
        'Ahmed Mohammed', // Pure Latin
        'النص العربي الكامل', // Pure Arabic
        'Complete English text' // Pure English
      ];
      
      pureTexts.forEach(text => {
        expect(hasMixedContent(text)).toBe(false);
      });
    });
  });

  describe('checkArabicTextQuality', () => {
    it('should detect mixed digits', () => {
      const mixedDigitTexts = [
        'أحمد ١٢٣ محمد 456',
        'النص مع ١٢٣ و 789',
        'رقم ١ و 2'
      ];
      
      mixedDigitTexts.forEach(text => {
        const issues = checkArabicTextQuality(text);
        expect(issues).toContain('يحتوي النص على خليط من الأرقام العربية والإنجليزية');
      });
    });

    it('should detect mixed punctuation', () => {
      const mixedPunctuationTexts = [
        'أحمد، محمد; علي',
        'النص مع الفاصلة، والفاصلة المنقوطة;',
        'سؤال؟ وسؤال آخر?'
      ];
      
      mixedPunctuationTexts.forEach(text => {
        const issues = checkArabicTextQuality(text);
        expect(issues).toContain('يحتوي النص على خليط من علامات الترقيم العربية والإنجليزية');
      });
    });

    it('should detect repeated characters', () => {
      const repeatedCharTexts = [
        'أحمدددددد',
        'النصصصصص',
        'مممممممم'
      ];
      
      repeatedCharTexts.forEach(text => {
        const issues = checkArabicTextQuality(text);
        expect(issues).toContain('يحتوي النص على أحرف متكررة بشكل مفرط');
      });
    });

    it('should detect good quality text', () => {
      const goodQualityTexts = [
        'أحمد محمد',
        'النص العربي الجيد',
        'نص بجودة عالية'
      ];
      
      goodQualityTexts.forEach(text => {
        const issues = checkArabicTextQuality(text);
        expect(issues).toHaveLength(0);
      });
    });
  });

  describe('normalizeArabicText', () => {
    it('should normalize Arabic letters', () => {
      const testCases = [
        { input: 'أحمد', output: 'احمد' }, // Alif variations
        { input: 'محمّد', output: 'محمد' }, // Remove diacritics
        { input: 'فاطمة', output: 'فاطمه' }, // Teh marbuta to heh
        { input: 'هدى', output: 'هدي' } // Alif maksura to yeh
      ];
      
      testCases.forEach(({ input, output }) => {
        expect(normalizeArabicText(input)).toBe(output);
      });
    });

    it('should normalize spaces', () => {
      const testCases = [
        { input: 'أحمد   محمد', output: 'احمد محمد' },
        { input: '  أحمد محمد  ', output: 'احمد محمد' },
        { input: 'أحمد\u00A0محمد', output: 'احمد محمد' } // Non-breaking space
      ];
      
      testCases.forEach(({ input, output }) => {
        expect(normalizeArabicText(input)).toBe(output);
      });
    });

    it('should normalize punctuation', () => {
      const testCases = [
        { input: 'أحمد، محمد', output: 'احمد, محمد' },
        { input: 'النص؛ والنص', output: 'النص; والنص' },
        { input: 'سؤال؟', output: 'سؤال?' }
      ];
      
      testCases.forEach(({ input, output }) => {
        expect(normalizeArabicText(input)).toBe(output);
      });
    });
  });

  describe('prepareArabicSearchText', () => {
    it('should prepare text for search', () => {
      const testCases = [
        { input: 'أحمد محمد', output: 'احمد محمد' },
        { input: 'الأحمد', output: 'الاحمد' },
        { input: 'محمّد', output: 'محمد' }
      ];
      
      testCases.forEach(({ input, output }) => {
        expect(prepareArabicSearchText(input)).toBe(output);
      });
    });
  });

  describe('shouldUseRTL', () => {
    it('should detect RTL for Arabic text', () => {
      const arabicTexts = [
        'أحمد محمد',
        'النص العربي',
        'أحمد Ahmed' // Mixed but more Arabic
      ];
      
      arabicTexts.forEach(text => {
        expect(shouldUseRTL(text)).toBe(true);
      });
    });

    it('should detect LTR for English text', () => {
      const englishTexts = [
        'Ahmed Mohammed',
        'English text',
        'Ahmed أحمد' // Mixed but more English
      ];
      
      englishTexts.forEach(text => {
        expect(shouldUseRTL(text)).toBe(false);
      });
    });

    it('should handle empty text', () => {
      // Mock isRTL to return false for testing
      const mockIsRTL = jest.fn(() => false);
      jest.doMock('../../src/i18n', () => ({
        isRTL: mockIsRTL
      }));
      
      expect(shouldUseRTL('')).toBe(false);
    });
  });

  describe('getTextDirection', () => {
    it('should return correct text direction', () => {
      expect(getTextDirection('أحمد محمد')).toBe('rtl');
      expect(getTextDirection('Ahmed Mohammed')).toBe('ltr');
      expect(getTextDirection('أحمد Ahmed')).toBe('rtl'); // Mixed but more Arabic
      expect(getTextDirection('Ahmed أحمد')).toBe('ltr'); // Mixed but more English
    });
  });

  describe('createArabicInputValidator', () => {
    it('should create validator for different types', () => {
      const nameValidator = createArabicInputValidator({ type: 'name' });
      const emailValidator = createArabicInputValidator({ type: 'email' });
      const phoneValidator = createArabicInputValidator({ type: 'phone' });
      
      expect(nameValidator('أحمد محمد').isValid).toBe(true);
      expect(emailValidator('user@example.com').isValid).toBe(true);
      expect(phoneValidator('0791234567').isValid).toBe(true);
    });

    it('should create custom validator', () => {
      const customValidator = createArabicInputValidator({
        type: 'custom',
        customOptions: {
          minLength: 10,
          maxLength: 50,
          required: true
        }
      });
      
      expect(customValidator('قصير').isValid).toBe(false);
      expect(customValidator('نص طويل بما فيه الكفاية').isValid).toBe(true);
    });
  });

  describe('ArabicInputUtils', () => {
    it('should export all utility functions', () => {
      expect(ArabicInputUtils.validateText).toBeDefined();
      expect(ArabicInputUtils.validateName).toBeDefined();
      expect(ArabicInputUtils.validateBusinessName).toBeDefined();
      expect(ArabicInputUtils.validateDescription).toBeDefined();
      expect(ArabicInputUtils.validateAddress).toBeDefined();
      expect(ArabicInputUtils.validateNotes).toBeDefined();
      expect(ArabicInputUtils.validatePhoneNumber).toBeDefined();
      expect(ArabicInputUtils.validateEmail).toBeDefined();
      expect(ArabicInputUtils.normalizeText).toBeDefined();
      expect(ArabicInputUtils.prepareSearchText).toBeDefined();
      expect(ArabicInputUtils.checkTextQuality).toBeDefined();
      expect(ArabicInputUtils.shouldUseRTL).toBeDefined();
      expect(ArabicInputUtils.getTextDirection).toBeDefined();
      expect(ArabicInputUtils.createValidator).toBeDefined();
      expect(ArabicInputUtils.PATTERNS).toBeDefined();
      expect(ArabicInputUtils.UNICODE_RANGES).toBeDefined();
    });
  });
});