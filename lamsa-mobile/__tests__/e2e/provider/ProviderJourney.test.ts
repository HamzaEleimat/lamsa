// End-to-end tests for the complete provider journey
// These tests simulate real user interactions from onboarding to daily operations

import { device, element, by, expect as detoxExpect } from 'detox';
import { newProviderData, testServices } from '../../fixtures/providers';

describe('Provider Journey E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        location: 'always',
        notifications: 'YES',
        camera: 'YES',
        photos: 'YES',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Complete Provider Onboarding Journey', () => {
    it('should complete full onboarding flow from welcome to approval', async () => {
      // Welcome screen
      await detoxExpect(element(by.id('welcomeScreen'))).toBeVisible();
      await element(by.id('providerSignupButton')).tap();

      // Phone verification
      await detoxExpect(element(by.id('phoneVerificationScreen'))).toBeVisible();
      await element(by.id('phoneInput')).typeText(newProviderData.phone);
      await element(by.id('sendCodeButton')).tap();

      // OTP verification (mock successful)
      await detoxExpect(element(by.id('otpScreen'))).toBeVisible();
      await element(by.id('otpInput')).typeText('123456');
      await element(by.id('verifyOtpButton')).tap();

      // Step 1: Personal Information
      await detoxExpect(element(by.id('personalInformationScreen'))).toBeVisible();
      await element(by.id('ownerNameInput')).typeText(newProviderData.ownerName);
      await element(by.id('nextButton')).tap();

      // Step 2: Business Details
      await detoxExpect(element(by.id('businessDetailsScreen'))).toBeVisible();
      await element(by.id('businessNameInput')).typeText(newProviderData.businessName);
      await element(by.id('businessNameArInput')).typeText(newProviderData.businessNameAr);
      await element(by.id('businessTypeSelector')).tap();
      await element(by.text('صالون')).tap();
      await element(by.id('nextButton')).tap();

      // Step 3: Location Setup
      await detoxExpect(element(by.id('locationSetupScreen'))).toBeVisible();
      await element(by.id('addressInput')).typeText(newProviderData.address);
      await element(by.id('addressArInput')).typeText(newProviderData.addressAr);
      await element(by.id('useCurrentLocationButton')).tap();
      
      // Wait for location permission and acquisition
      await waitFor(element(by.id('locationConfirmed'))).toBeVisible().withTimeout(5000);
      await element(by.id('nextButton')).tap();

      // Step 4: Service Categories
      await detoxExpect(element(by.id('serviceCategoriesScreen'))).toBeVisible();
      await element(by.id('category-HAIR')).tap();
      await element(by.id('category-MAKEUP')).tap();
      await element(by.id('nextButton')).tap();

      // Step 5: Add Initial Services
      await detoxExpect(element(by.id('addServicesScreen'))).toBeVisible();
      
      // Add first service
      await element(by.id('addServiceButton')).tap();
      await element(by.id('serviceNameAr')).typeText('قص شعر نسائي');
      await element(by.id('serviceNameEn')).typeText('Women\'s Haircut');
      await element(by.id('servicePriceInput')).typeText('15');
      await element(by.id('serviceDurationInput')).typeText('45');
      await element(by.id('saveServiceButton')).tap();

      // Add second service
      await element(by.id('addServiceButton')).tap();
      await element(by.id('serviceNameAr')).typeText('مكياج سهرة');
      await element(by.id('serviceNameEn')).typeText('Evening Makeup');
      await element(by.id('servicePriceInput')).typeText('35');
      await element(by.id('serviceDurationInput')).typeText('60');
      await element(by.id('saveServiceButton')).tap();

      await element(by.id('nextButton')).tap();

      // Step 6: Working Hours
      await detoxExpect(element(by.id('workingHoursScreen'))).toBeVisible();
      
      // Set working hours for Monday
      await element(by.id('day-1-toggle')).tap();
      await element(by.id('day-1-openTime')).tap();
      await element(by.text('09:00')).tap();
      await element(by.id('day-1-closeTime')).tap();
      await element(by.text('21:00')).tap();

      await element(by.id('nextButton')).tap();

      // Step 7: License Verification
      await detoxExpect(element(by.id('licenseVerificationScreen'))).toBeVisible();
      
      // Try license upload (will fail for testing alternative verification)
      await element(by.id('uploadLicenseButton')).tap();
      await element(by.id('selectImageButton')).tap();
      
      // Simulate upload failure
      await waitFor(element(by.id('uploadFailedMessage'))).toBeVisible().withTimeout(3000);
      
      // Use alternative verification
      await element(by.id('useAlternativeButton')).tap();
      await element(by.id('portfolioImagesButton')).tap();
      await element(by.id('selectMultipleImagesButton')).tap();
      
      // Add business reference
      await element(by.id('addReferenceButton')).tap();
      await element(by.id('referenceName')).typeText('أحمد الخالدي');
      await element(by.id('referencePhone')).typeText('+962791111111');
      await element(by.id('referenceRelationship')).typeText('زميل في المهنة');
      await element(by.id('saveReferenceButton')).tap();

      await element(by.id('nextButton')).tap();

      // Step 8: Review and Submit
      await detoxExpect(element(by.id('reviewSubmitScreen'))).toBeVisible();
      
      // Review all entered information
      await detoxExpect(element(by.text(newProviderData.ownerName))).toBeVisible();
      await detoxExpect(element(by.text(newProviderData.businessName))).toBeVisible();
      
      // Agree to terms
      await element(by.id('termsCheckbox')).tap();
      await element(by.id('marketingConsentCheckbox')).tap();
      
      // Submit application
      await element(by.id('submitApplicationButton')).tap();

      // Success screen
      await detoxExpect(element(by.id('onboardingSuccessScreen'))).toBeVisible();
      await detoxExpect(element(by.text('تم تقديم طلبك بنجاح'))).toBeVisible();
      
      await element(by.id('continueToAppButton')).tap();

      // Should now be in pending approval state
      await detoxExpect(element(by.id('pendingApprovalScreen'))).toBeVisible();
    });

    it('should handle onboarding validation errors', async () => {
      await detoxExpect(element(by.id('welcomeScreen'))).toBeVisible();
      await element(by.id('providerSignupButton')).tap();

      // Skip phone verification for this test
      await element(by.id('skipVerificationButton')).tap();

      // Try to proceed without filling required fields
      await detoxExpect(element(by.id('personalInformationScreen'))).toBeVisible();
      await element(by.id('nextButton')).tap();

      // Should show validation error
      await detoxExpect(element(by.id('ownerNameError'))).toBeVisible();
      await detoxExpect(element(by.text('Owner name is required'))).toBeVisible();

      // Fill the field and proceed
      await element(by.id('ownerNameInput')).typeText('Test Owner');
      await element(by.id('nextButton')).tap();

      // Should proceed to next step
      await detoxExpect(element(by.id('businessDetailsScreen'))).toBeVisible();
    });
  });

  describe('Provider Daily Operations', () => {
    beforeEach(async () => {
      // Setup: Login as approved provider
      await element(by.id('loginButton')).tap();
      await element(by.id('phoneInput')).typeText('+962791234567');
      await element(by.id('sendCodeButton')).tap();
      await element(by.id('otpInput')).typeText('123456');
      await element(by.id('verifyOtpButton')).tap();
      
      // Should land on provider dashboard
      await detoxExpect(element(by.id('providerDashboard'))).toBeVisible();
    });

    it('should view and manage daily schedule', async () => {
      // Navigate to schedule
      await element(by.id('scheduleTab')).tap();
      await detoxExpect(element(by.id('scheduleScreen'))).toBeVisible();

      // Should show today's appointments
      await detoxExpect(element(by.id('todaySchedule'))).toBeVisible();
      await detoxExpect(element(by.id('appointment-1'))).toBeVisible();

      // View appointment details
      await element(by.id('appointment-1')).tap();
      await detoxExpect(element(by.id('appointmentDetailsModal'))).toBeVisible();
      await detoxExpect(element(by.text('سارة أحمد'))).toBeVisible();
      await detoxExpect(element(by.text('قص شعر نسائي'))).toBeVisible();

      // Mark appointment as completed
      await element(by.id('markCompletedButton')).tap();
      await detoxExpect(element(by.id('confirmationModal'))).toBeVisible();
      await element(by.id('confirmButton')).tap();

      // Should update status
      await detoxExpect(element(by.id('completedStatus'))).toBeVisible();
      await element(by.id('closeModalButton')).tap();
    });

    it('should manage services efficiently', async () => {
      // Navigate to services
      await element(by.id('servicesTab')).tap();
      await detoxExpect(element(by.id('servicesScreen'))).toBeVisible();

      // Should show existing services
      await detoxExpect(element(by.text('قص شعر نسائي'))).toBeVisible();
      await detoxExpect(element(by.text('15 JOD'))).toBeVisible();

      // Add new service
      await element(by.id('addServiceButton')).tap();
      await detoxExpect(element(by.id('serviceFormModal'))).toBeVisible();

      await element(by.id('serviceNameAr')).typeText('صبغة شعر كاملة');
      await element(by.id('serviceNameEn')).typeText('Full Hair Coloring');
      await element(by.id('servicePriceInput')).typeText('65');
      await element(by.id('serviceDurationInput')).typeText('180');
      await element(by.id('serviceCategorySelect')).tap();
      await element(by.text('HAIR')).tap();
      await element(by.id('saveServiceButton')).tap();

      // Should appear in services list
      await detoxExpect(element(by.text('صبغة شعر كاملة'))).toBeVisible();
      await detoxExpect(element(by.text('65 JOD'))).toBeVisible();

      // Edit existing service
      await element(by.id('service-1-menu')).tap();
      await element(by.id('editServiceOption')).tap();

      // Update price
      await element(by.id('servicePriceInput')).clearText();
      await element(by.id('servicePriceInput')).typeText('18');
      await element(by.id('saveServiceButton')).tap();

      // Should reflect updated price
      await detoxExpect(element(by.text('18 JOD'))).toBeVisible();
    });

    it('should handle notifications and responses', async () => {
      // Should show notification badge
      await detoxExpect(element(by.id('notificationBadge'))).toBeVisible();

      // Open notification center
      await element(by.id('notificationButton')).tap();
      await detoxExpect(element(by.id('notificationCenter'))).toBeVisible();

      // Should show recent notifications
      await detoxExpect(element(by.text('حجز جديد من سارة أحمد'))).toBeVisible();
      await detoxExpect(element(by.text('تقييم جديد: 5 نجوم'))).toBeVisible();

      // Tap on booking notification
      await element(by.id('notification-new-booking')).tap();
      
      // Should navigate to booking details
      await detoxExpect(element(by.id('bookingDetailsScreen'))).toBeVisible();
      await detoxExpect(element(by.text('سارة أحمد'))).toBeVisible();

      // Accept booking
      await element(by.id('acceptBookingButton')).tap();
      await detoxExpect(element(by.id('bookingAcceptedMessage'))).toBeVisible();

      // Go back and check review notification
      await element(by.id('backButton')).tap();
      await element(by.id('notificationButton')).tap();
      await element(by.id('notification-new-review')).tap();

      // Should show review details
      await detoxExpect(element(by.id('reviewDetailsScreen'))).toBeVisible();
      await detoxExpect(element(by.text('خدمة ممتازة والموظفات محترمات'))).toBeVisible();

      // Respond to review
      await element(by.id('respondToReviewButton')).tap();
      await element(by.id('reviewResponseInput')).typeText('شكراً لك على تقييمك الرائع');
      await element(by.id('submitResponseButton')).tap();

      await detoxExpect(element(by.id('responseSubmittedMessage'))).toBeVisible();
    });

    it('should view analytics and insights', async () => {
      // Navigate to analytics
      await element(by.id('analyticsTab')).tap();
      await detoxExpect(element(by.id('analyticsScreen'))).toBeVisible();

      // Should show key metrics
      await detoxExpect(element(by.id('revenueMetric'))).toBeVisible();
      await detoxExpect(element(by.id('bookingsMetric'))).toBeVisible();
      await detoxExpect(element(by.id('customersMetric'))).toBeVisible();
      await detoxExpect(element(by.id('ratingMetric'))).toBeVisible();

      // Change time period
      await element(by.id('periodSelector')).tap();
      await element(by.text('This Month')).tap();

      // Should update metrics
      await waitFor(element(by.id('metricsUpdated'))).toBeVisible().withTimeout(2000);

      // View detailed revenue analytics
      await element(by.id('revenueDetailButton')).tap();
      await detoxExpect(element(by.id('revenueAnalyticsScreen'))).toBeVisible();
      await detoxExpect(element(by.id('revenueChart'))).toBeVisible();

      // Check booking patterns
      await element(by.id('backButton')).tap();
      await element(by.id('bookingPatternsButton')).tap();
      await detoxExpect(element(by.id('bookingPatternsScreen'))).toBeVisible();
      await detoxExpect(element(by.id('peakHoursHeatmap'))).toBeVisible();

      // View customer analytics
      await element(by.id('backButton')).tap();
      await element(by.id('customerAnalyticsButton')).tap();
      await detoxExpect(element(by.id('customerAnalyticsScreen'))).toBeVisible();
      await detoxExpect(element(by.id('retentionChart'))).toBeVisible();
      await detoxExpect(element(by.id('topCustomersList'))).toBeVisible();
    });
  });

  describe('Provider Profile and Settings', () => {
    beforeEach(async () => {
      // Login as provider
      await element(by.id('loginButton')).tap();
      await element(by.id('phoneInput')).typeText('+962791234567');
      await element(by.id('sendCodeButton')).tap();
      await element(by.id('otpInput')).typeText('123456');
      await element(by.id('verifyOtpButton')).tap();
    });

    it('should update profile information', async () => {
      // Navigate to profile
      await element(by.id('profileTab')).tap();
      await detoxExpected(element(by.id('profileScreen'))).toBeVisible();

      // Edit business information
      await element(by.id('editProfileButton')).tap();
      await detoxExpect(element(by.id('editProfileModal'))).toBeVisible();

      // Update bio
      await element(by.id('bioInput')).clearText();
      await element(by.id('bioInput')).typeText('Updated salon description with 15 years experience');
      
      // Update working hours
      await element(by.id('workingHoursButton')).tap();
      await element(by.id('day-5-closeTime')).tap();
      await element(by.text('22:00')).tap(); // Extend Friday hours

      await element(by.id('saveProfileButton')).tap();
      
      // Should show success message
      await detoxExpect(element(by.id('profileUpdatedMessage'))).toBeVisible();
    });

    it('should manage notification preferences', async () => {
      await element(by.id('profileTab')).tap();
      await element(by.id('settingsButton')).tap();
      await element(by.id('notificationPreferencesOption')).tap();

      await detoxExpected(element(by.id('notificationPreferencesScreen'))).toBeVisible();

      // Toggle SMS notifications off
      await element(by.id('smsNotificationsToggle')).tap();
      
      // Set quiet hours
      await element(by.id('quietHoursToggle')).tap();
      await element(by.id('quietHoursStart')).tap();
      await element(by.text('22:00')).tap();
      await element(by.id('quietHoursEnd')).tap();
      await element(by.text('08:00')).tap();

      // Configure notification types
      await element(by.id('newBookingNotifications')).tap();
      await element(by.id('whatsappChannel')).tap();
      
      await element(by.id('savePreferencesButton')).tap();
      await detoxExpect(element(by.id('preferencesUpdatedMessage'))).toBeVisible();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network connectivity issues', async () => {
      // Simulate network disconnection
      await device.disableEthernet();

      await element(by.id('loginButton')).tap();
      await element(by.id('phoneInput')).typeText('+962791234567');
      await element(by.id('sendCodeButton')).tap();

      // Should show network error
      await detoxExpect(element(by.id('networkErrorMessage'))).toBeVisible();
      await detoxExpected(element(by.text('تحقق من الاتصال بالإنترنت'))).toBeVisible();

      // Retry button should be available
      await detoxExpected(element(by.id('retryButton'))).toBeVisible();

      // Restore network and retry
      await device.enableEthernet();
      await element(by.id('retryButton')).tap();

      // Should proceed normally
      await detoxExpected(element(by.id('otpScreen'))).toBeVisible();
    });

    it('should handle app state changes during onboarding', async () => {
      // Start onboarding
      await element(by.id('providerSignupButton')).tap();
      await element(by.id('phoneInput')).typeText('+962799999999');
      await element(by.id('sendCodeButton')).tap();
      await element(by.id('otpInput')).typeText('123456');
      await element(by.id('verifyOtpButton')).tap();

      // Fill first step
      await element(by.id('ownerNameInput')).typeText('Test Provider');
      await element(by.id('nextButton')).tap();

      // Simulate app backgrounding and foregrounding
      await device.sendToHome();
      await device.launchApp({ newInstance: false });

      // Should restore onboarding state
      await detoxExpected(element(by.id('businessDetailsScreen'))).toBeVisible();
      await detoxExpected(element(by.id('stepIndicator'))).toHaveText('Step 2 of 7');
    });

    it('should handle invalid input gracefully', async () => {
      await element(by.id('servicesTab')).tap();
      await element(by.id('addServiceButton')).tap();

      // Try invalid price
      await element(by.id('servicePriceInput')).typeText('-10');
      await element(by.id('saveServiceButton')).tap();

      await detoxExpected(element(by.id('priceErrorMessage'))).toBeVisible();
      await detoxExpected(element(by.text('Price must be greater than 0'))).toBeVisible();

      // Try invalid duration
      await element(by.id('servicePriceInput')).clearText();
      await element(by.id('servicePriceInput')).typeText('25');
      await element(by.id('serviceDurationInput')).typeText('0');
      await element(by.id('saveServiceButton')).tap();

      await detoxExpected(element(by.id('durationErrorMessage'))).toBeVisible();
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle many services without performance degradation', async () => {
      await element(by.id('servicesTab')).tap();

      // Add multiple services quickly
      for (let i = 1; i <= 20; i++) {
        await element(by.id('addServiceButton')).tap();
        await element(by.id('serviceNameAr')).typeText(`خدمة ${i}`);
        await element(by.id('serviceNameEn')).typeText(`Service ${i}`);
        await element(by.id('servicePriceInput')).typeText('25');
        await element(by.id('serviceDurationInput')).typeText('30');
        await element(by.id('saveServiceButton')).tap();
        
        // Brief wait to prevent overwhelming the system
        await waitFor(element(by.text(`خدمة ${i}`))).toBeVisible().withTimeout(1000);
      }

      // Should still be responsive
      await element(by.id('searchServicesInput')).typeText('خدمة');
      await detoxExpected(element(by.text('خدمة 1'))).toBeVisible();
    });

    it('should handle rapid navigation without crashes', async () => {
      // Rapidly switch between tabs
      for (let i = 0; i < 10; i++) {
        await element(by.id('scheduleTab')).tap();
        await element(by.id('servicesTab')).tap();
        await element(by.id('analyticsTab')).tap();
        await element(by.id('profileTab')).tap();
      }

      // App should remain stable
      await detoxExpected(element(by.id('profileScreen'))).toBeVisible();
    });
  });

  afterAll(async () => {
    await device.terminateApp();
  });
});