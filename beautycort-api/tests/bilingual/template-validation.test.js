/**
 * Bilingual Template Validation Testing
 * Tests notification template accuracy, RTL formatting, and cross-language consistency
 */

const { describe, it, expect, beforeEach } = require('jest');
const NotificationTemplatesService = require('../../src/services/notification-templates.service');
const { toArabicNumerals, formatCurrency, formatPhoneNumber, formatDuration } = require('../../src/utils/arabic-numerals');
const { formatArabicDate, formatArabicTime, formatRelativeTime } = require('../../src/utils/arabic-dates');

describe('Bilingual Template Validation Testing', () => {
  let templatesService;

  beforeEach(() => {
    templatesService = new NotificationTemplatesService();
  });

  describe('Template Content Validation', () => {
    it('should validate Arabic booking confirmation template', () => {
      const data = {
        id: 'B12345',
        serviceName: 'قص شعر',
        providerName: 'صالون الجمال',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500,
        duration: 60,
        customerName: 'أحمد محمد'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      const rendered = templatesService.renderTemplate(template, data, 'ar');

      // Check required Arabic elements
      expect(rendered).toContain('تم تأكيد حجزك');
      expect(rendered).toContain('B١٢٣٤٥');
      expect(rendered).toContain('قص شعر');
      expect(rendered).toContain('صالون الجمال');
      expect(rendered).toContain('أحمد محمد');
      expect(rendered).toContain('٢٥٫٥٠٠ د.أ');
      expect(rendered).toContain('١٦ تموز ٢٠٢٥');
      expect(rendered).toContain('٢:٣٠ مساءً');
      expect(rendered).toContain('١ ساعة');

      // Check Arabic text direction markers
      expect(rendered).toMatch(/[\u0600-\u06FF]/); // Contains Arabic characters
      expect(rendered).toMatch(/[٠-٩]/); // Contains Arabic numerals
      expect(rendered.length).toBeLessThan(160); // SMS length limit for Arabic (UCS2)
    });

    it('should validate English booking confirmation template', () => {
      const data = {
        id: 'B12345',
        serviceName: 'Hair Cut',
        providerName: 'Beauty Salon',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500,
        duration: 60,
        customerName: 'John Smith'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'en');
      const rendered = templatesService.renderTemplate(template, data, 'en');

      // Check required English elements
      expect(rendered).toContain('booking confirmed');
      expect(rendered).toContain('B12345');
      expect(rendered).toContain('Hair Cut');
      expect(rendered).toContain('Beauty Salon');
      expect(rendered).toContain('John Smith');
      expect(rendered).toContain('JOD 25.500');
      expect(rendered).toContain('July 16, 2025');
      expect(rendered).toContain('2:30 PM');
      expect(rendered).toContain('1 hour');

      // Check no Arabic characters
      expect(rendered).not.toMatch(/[\u0600-\u06FF]/);
      expect(rendered).not.toMatch(/[٠-٩]/);
      expect(rendered.length).toBeLessThan(320); // SMS length limit for English (GSM)
    });

    it('should validate Arabic payment notification template', () => {
      const data = {
        bookingId: 'B67890',
        amount: 45.750,
        method: 'بطاقة ائتمان',
        transactionId: 'TXN123456789',
        customerName: 'فاطمة أحمد'
      };

      const template = templatesService.getTemplate('payment_processed', 'ar');
      const rendered = templatesService.renderTemplate(template, data, 'ar');

      expect(rendered).toContain('تم معالجة الدفع');
      expect(rendered).toContain('B٦٧٨٩٠');
      expect(rendered).toContain('٤٥٫٧٥٠ د.أ');
      expect(rendered).toContain('بطاقة ائتمان');
      expect(rendered).toContain('TXN١٢٣٤٥٦٧٨٩');
      expect(rendered).toContain('فاطمة أحمد');
    });

    it('should validate Arabic appointment reminder template', () => {
      const data = {
        bookingId: 'B11111',
        serviceName: 'تدليك استرخاء',
        providerName: 'مركز العناية',
        date: '2025-07-17',
        time: '10:00',
        hoursUntil: 2,
        customerName: 'سارة علي'
      };

      const template = templatesService.getTemplate('appointment_reminder', 'ar');
      const rendered = templatesService.renderTemplate(template, data, 'ar');

      expect(rendered).toContain('تذكير بموعدك');
      expect(rendered).toContain('B١١١١١');
      expect(rendered).toContain('تدليك استرخاء');
      expect(rendered).toContain('مركز العناية');
      expect(rendered).toContain('سارة علي');
      expect(rendered).toContain('٢ ساعات');
      expect(rendered).toContain('١٠:٠٠ صباحاً');
      expect(rendered).toContain('١٧ تموز ٢٠٢٥');
    });

    it('should validate template with Arabic special characters', () => {
      const data = {
        serviceName: 'عناية بالبشرة والوجه',
        providerName: 'مركز الجمال والعناية الصحية',
        specialInstructions: 'يُرجى الوصول مبكراً بـ ١٥ دقيقة',
        notes: 'تجنب استخدام مستحضرات التجميل قبل الموعد بيوم واحد'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      const rendered = templatesService.renderTemplate(template, data, 'ar');

      // Check complex Arabic text preservation
      expect(rendered).toContain('عناية بالبشرة والوجه');
      expect(rendered).toContain('مركز الجمال والعناية الصحية');
      expect(rendered).toContain('يُرجى الوصول مبكراً بـ ١٥ دقيقة');
      expect(rendered).toContain('تجنب استخدام مستحضرات التجميل');

      // Check for proper Arabic text encoding
      expect(rendered).toMatch(/[\u064B-\u065F]/); // Arabic diacritics
      expect(rendered).toMatch(/[ء-ي]/); // Arabic letters
    });
  });

  describe('Template Formatting Validation', () => {
    it('should format Arabic numerals correctly in templates', () => {
      const data = {
        id: 'B12345',
        amount: 125.750,
        quantity: 3,
        duration: 90,
        phoneNumber: '+962791234567'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      const rendered = templatesService.renderTemplate(template, data, 'ar');

      // Check Arabic numeral formatting
      expect(rendered).toContain('B١٢٣٤٥');
      expect(rendered).toContain('١٢٥٫٧٥٠ د.أ');
      expect(rendered).toContain('٣');
      expect(rendered).toContain('١ ساعة ٣٠ دقائق');
      expect(rendered).toContain('+٩٦٢ ٧٩ ١٢٣ ٤٥٦٧');
    });

    it('should format Western numerals correctly in English templates', () => {
      const data = {
        id: 'B12345',
        amount: 125.750,
        quantity: 3,
        duration: 90,
        phoneNumber: '+962791234567'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'en');
      const rendered = templatesService.renderTemplate(template, data, 'en');

      // Check Western numeral formatting
      expect(rendered).toContain('B12345');
      expect(rendered).toContain('JOD 125.750');
      expect(rendered).toContain('3');
      expect(rendered).toContain('1 hour 30 minutes');
      expect(rendered).toContain('+962 79 123 4567');
    });

    it('should format dates correctly in Arabic templates', () => {
      const data = {
        date: '2025-07-16',
        time: '14:30',
        createdAt: '2025-07-15T10:00:00Z',
        appointmentDateTime: '2025-07-16T14:30:00Z'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      const rendered = templatesService.renderTemplate(template, data, 'ar');

      // Check Arabic date formatting
      expect(rendered).toContain('١٦ تموز ٢٠٢٥');
      expect(rendered).toContain('٢:٣٠ مساءً');
      
      // Check if relative time is used
      expect(rendered).toMatch(/(أمس|اليوم|منذ)/);
    });

    it('should format dates correctly in English templates', () => {
      const data = {
        date: '2025-07-16',
        time: '14:30',
        createdAt: '2025-07-15T10:00:00Z',
        appointmentDateTime: '2025-07-16T14:30:00Z'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'en');
      const rendered = templatesService.renderTemplate(template, data, 'en');

      // Check English date formatting
      expect(rendered).toContain('July 16, 2025');
      expect(rendered).toContain('2:30 PM');
      
      // Check if relative time is used
      expect(rendered).toMatch(/(yesterday|today|ago)/);
    });
  });

  describe('Template Length and SMS Compliance', () => {
    it('should validate Arabic SMS length limits', () => {
      const longData = {
        id: 'B12345',
        serviceName: 'خدمة شاملة للعناية بالبشرة والوجه والشعر والأظافر',
        providerName: 'مركز الجمال والعناية الصحية المتخصص والمتطور',
        notes: 'يُرجى الوصول مبكراً بـ ١٥ دقيقة لإجراءات التسجيل والاستشارة الأولية',
        specialInstructions: 'نوصي بعدم استخدام أي منتجات تجميل قبل الموعد بيوم واحد',
        customerName: 'عبدالرحمن محمد أحمد العبدالله'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      const rendered = templatesService.renderTemplate(template, longData, 'ar');

      // Arabic SMS uses UCS2 encoding (70 chars per SMS)
      if (rendered.length > 70) {
        // Should be segmented properly
        const segments = Math.ceil(rendered.length / 67); // 67 chars per segment in multi-part
        expect(segments).toBeLessThan(4); // Should not exceed 3 segments
      }

      // Check that essential information is preserved
      expect(rendered).toContain('B١٢٣٤٥');
      expect(rendered).toContain('خدمة شاملة');
      expect(rendered).toContain('مركز الجمال');
    });

    it('should validate English SMS length limits', () => {
      const longData = {
        id: 'B12345',
        serviceName: 'Comprehensive Beauty Treatment Package with Advanced Skincare',
        providerName: 'Premium Beauty and Wellness Center with Specialized Services',
        notes: 'Please arrive 15 minutes early for registration and initial consultation',
        specialInstructions: 'We recommend not using any beauty products one day before appointment',
        customerName: 'Elizabeth Alexandra Johnson-Smith'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'en');
      const rendered = templatesService.renderTemplate(template, longData, 'en');

      // English SMS uses GSM encoding (160 chars per SMS)
      if (rendered.length > 160) {
        // Should be segmented properly
        const segments = Math.ceil(rendered.length / 153); // 153 chars per segment in multi-part
        expect(segments).toBeLessThan(4); // Should not exceed 3 segments
      }

      // Check that essential information is preserved
      expect(rendered).toContain('B12345');
      expect(rendered).toContain('Comprehensive Beauty');
      expect(rendered).toContain('Premium Beauty');
    });

    it('should handle mixed content SMS length correctly', () => {
      const mixedData = {
        id: 'B12345',
        serviceName: 'Hair Cut - قص شعر',
        providerName: 'Beauty Salon - صالون الجمال',
        notes: 'Special instructions: تعليمات خاصة للعناية'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      const rendered = templatesService.renderTemplate(template, mixedData, 'ar');

      // Mixed content should use UCS2 encoding
      expect(rendered).toContain('Hair Cut - قص شعر');
      expect(rendered).toContain('Beauty Salon - صالون الجمال');
      expect(rendered).toContain('Special instructions: تعليمات خاصة');
      
      // Should be within reasonable length limits
      expect(rendered.length).toBeLessThan(200);
    });
  });

  describe('Template Variable Substitution', () => {
    it('should substitute all required variables in Arabic templates', () => {
      const data = {
        id: 'B12345',
        serviceName: 'قص شعر',
        providerName: 'صالون الجمال',
        customerName: 'أحمد محمد',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500,
        duration: 60,
        phoneNumber: '+962791234567',
        address: 'عمان - الأردن',
        notes: 'يُرجى الوصول مبكراً'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      const rendered = templatesService.renderTemplate(template, data, 'ar');

      // Check that no unsubstituted variables remain
      expect(rendered).not.toContain('{{');
      expect(rendered).not.toContain('}}');
      expect(rendered).not.toContain('{id}');
      expect(rendered).not.toContain('{serviceName}');
      expect(rendered).not.toContain('{providerName}');
      expect(rendered).not.toContain('{customerName}');
      expect(rendered).not.toContain('{date}');
      expect(rendered).not.toContain('{time}');
      expect(rendered).not.toContain('{totalAmount}');
      expect(rendered).not.toContain('{duration}');
    });

    it('should handle missing variables gracefully', () => {
      const incompleteData = {
        id: 'B12345',
        serviceName: 'قص شعر',
        // Missing other required fields
      };

      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      const rendered = templatesService.renderTemplate(template, incompleteData, 'ar');

      // Should not crash and should provide fallback values
      expect(rendered).toContain('B١٢٣٤٥');
      expect(rendered).toContain('قص شعر');
      expect(rendered).not.toContain('undefined');
      expect(rendered).not.toContain('null');
    });

    it('should handle special characters in variables', () => {
      const data = {
        id: 'B12345',
        serviceName: 'عناية بالبشرة & الوجه',
        providerName: 'مركز الجمال "الأول"',
        customerName: 'أحمد محمد (العميل المميز)',
        notes: 'تعليمات خاصة: يُرجى الوصول @ الوقت المحدد'
      };

      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      const rendered = templatesService.renderTemplate(template, data, 'ar');

      // Special characters should be preserved
      expect(rendered).toContain('عناية بالبشرة & الوجه');
      expect(rendered).toContain('مركز الجمال "الأول"');
      expect(rendered).toContain('أحمد محمد (العميل المميز)');
      expect(rendered).toContain('تعليمات خاصة: يُرجى الوصول @ الوقت المحدد');
    });
  });

  describe('Cross-Language Template Consistency', () => {
    it('should maintain consistent structure across languages', () => {
      const data = {
        id: 'B12345',
        serviceName: 'Hair Cut',
        providerName: 'Beauty Salon',
        customerName: 'Customer Name',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500,
        duration: 60
      };

      const arabicTemplate = templatesService.getTemplate('booking_confirmed', 'ar');
      const englishTemplate = templatesService.getTemplate('booking_confirmed', 'en');

      const arabicRendered = templatesService.renderTemplate(arabicTemplate, data, 'ar');
      const englishRendered = templatesService.renderTemplate(englishTemplate, data, 'en');

      // Both should contain the same essential information
      expect(arabicRendered).toContain('B١٢٣٤٥');
      expect(englishRendered).toContain('B12345');
      
      expect(arabicRendered).toContain('٢٥٫٥٠٠ د.أ');
      expect(englishRendered).toContain('JOD 25.500');
      
      expect(arabicRendered).toContain('١٦ تموز ٢٠٢٥');
      expect(englishRendered).toContain('July 16, 2025');
    });

    it('should validate all template types in both languages', () => {
      const templates = [
        'booking_confirmed',
        'booking_cancelled',
        'booking_rescheduled',
        'payment_processed',
        'payment_failed',
        'appointment_reminder',
        'review_request',
        'promotion_alert'
      ];

      templates.forEach(templateType => {
        const arabicTemplate = templatesService.getTemplate(templateType, 'ar');
        const englishTemplate = templatesService.getTemplate(templateType, 'en');

        expect(arabicTemplate).toBeDefined();
        expect(englishTemplate).toBeDefined();
        
        expect(arabicTemplate.content).toMatch(/[\u0600-\u06FF]/); // Contains Arabic
        expect(englishTemplate.content).not.toMatch(/[\u0600-\u06FF]/); // No Arabic
      });
    });

    it('should validate template metadata consistency', () => {
      const templateType = 'booking_confirmed';
      
      const arabicTemplate = templatesService.getTemplate(templateType, 'ar');
      const englishTemplate = templatesService.getTemplate(templateType, 'en');

      // Both should have the same metadata structure
      expect(arabicTemplate.type).toBe(englishTemplate.type);
      expect(arabicTemplate.channel).toBe(englishTemplate.channel);
      expect(arabicTemplate.priority).toBe(englishTemplate.priority);
      expect(arabicTemplate.requiredVariables).toEqual(englishTemplate.requiredVariables);
    });
  });

  describe('Template Error Handling', () => {
    it('should handle invalid template types gracefully', () => {
      const invalidTemplate = templatesService.getTemplate('non_existent_template', 'ar');
      expect(invalidTemplate).toBeNull();
    });

    it('should handle invalid languages gracefully', () => {
      const invalidLanguage = templatesService.getTemplate('booking_confirmed', 'fr');
      expect(invalidLanguage).toBeNull();
    });

    it('should validate template syntax', () => {
      const templates = templatesService.getAllTemplates();
      
      templates.forEach(template => {
        // Check for balanced braces
        const openBraces = (template.content.match(/\{/g) || []).length;
        const closeBraces = (template.content.match(/\}/g) || []).length;
        expect(openBraces).toBe(closeBraces);
        
        // Check for proper variable syntax
        const variables = template.content.match(/\{[^}]+\}/g) || [];
        variables.forEach(variable => {
          expect(variable).toMatch(/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/);
        });
      });
    });
  });

  describe('Template Performance', () => {
    it('should render templates efficiently', () => {
      const data = {
        id: 'B12345',
        serviceName: 'قص شعر',
        providerName: 'صالون الجمال',
        customerName: 'أحمد محمد',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500,
        duration: 60
      };

      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      
      // Measure rendering performance
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        templatesService.renderTemplate(template, data, 'ar');
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should render 1000 templates in under 1 second
      expect(totalTime).toBeLessThan(1000);
    });

    it('should cache template compilation efficiently', () => {
      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      
      // First compilation
      const startTime1 = Date.now();
      templatesService.compileTemplate(template);
      const endTime1 = Date.now();
      
      // Second compilation (should be cached)
      const startTime2 = Date.now();
      templatesService.compileTemplate(template);
      const endTime2 = Date.now();
      
      // Cached compilation should be faster
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
    });
  });

  describe('Template Accessibility', () => {
    it('should ensure Arabic templates are RTL-compliant', () => {
      const template = templatesService.getTemplate('booking_confirmed', 'ar');
      const rendered = templatesService.renderTemplate(template, {
        id: 'B12345',
        serviceName: 'قص شعر',
        providerName: 'صالون الجمال'
      }, 'ar');

      // Check RTL markers and formatting
      expect(rendered).toMatch(/[\u0600-\u06FF]/); // Arabic characters
      expect(rendered).toMatch(/[٠-٩]/); // Arabic numerals
      
      // Check that punctuation is properly handled for RTL
      expect(rendered).not.toMatch(/\s:\s/); // No spaces around colons in Arabic
      expect(rendered).not.toMatch(/\s،\s/); // No spaces around Arabic comma
    });

    it('should ensure templates are screen reader friendly', () => {
      const templates = templatesService.getAllTemplates();
      
      templates.forEach(template => {
        const rendered = templatesService.renderTemplate(template, {
          id: 'B12345',
          serviceName: 'Test Service',
          providerName: 'Test Provider'
        }, template.language);

        // Should not contain special characters that confuse screen readers
        expect(rendered).not.toContain('​'); // Zero-width space
        expect(rendered).not.toContain('‌'); // Zero-width non-joiner
        expect(rendered).not.toContain('‍'); // Zero-width joiner
        
        // Should have proper punctuation
        expect(rendered).toMatch(/[.!?]$/); // Ends with proper punctuation
      });
    });
  });
});

// Template validation utilities
const TemplateValidationUtils = {
  validateTemplateStructure: (template) => {
    expect(template).toHaveProperty('type');
    expect(template).toHaveProperty('language');
    expect(template).toHaveProperty('content');
    expect(template).toHaveProperty('channel');
    expect(template).toHaveProperty('requiredVariables');
  },

  validateRenderedContent: (rendered, language) => {
    expect(rendered).toBeDefined();
    expect(rendered).not.toContain('{{');
    expect(rendered).not.toContain('}}');
    expect(rendered).not.toContain('undefined');
    expect(rendered).not.toContain('null');
    
    if (language === 'ar') {
      expect(rendered).toMatch(/[\u0600-\u06FF]/); // Arabic characters
      expect(rendered).toMatch(/[٠-٩]/); // Arabic numerals
    } else {
      expect(rendered).not.toMatch(/[\u0600-\u06FF]/); // No Arabic
      expect(rendered).toMatch(/[0-9]/); // Western numerals
    }
  },

  measureTemplateComplexity: (template) => {
    const variables = (template.content.match(/\{[^}]+\}/g) || []).length;
    const conditionals = (template.content.match(/\{#if/g) || []).length;
    const loops = (template.content.match(/\{#each/g) || []).length;
    
    return {
      variables,
      conditionals,
      loops,
      complexity: variables + conditionals * 2 + loops * 3
    };
  }
};

module.exports = {
  TemplateValidationUtils
};