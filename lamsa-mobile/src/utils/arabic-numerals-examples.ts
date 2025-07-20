/**
 * Arabic-Indic Numerals Usage Examples
 * Demonstrates practical usage of Arabic numeral utilities in Lamsa
 */

import { 
  toArabicNumerals, 
  formatCurrency, 
  formatPhoneNumber, 
  formatDuration,
  formatBookingId,
  formatRating,
  formatCount,
  formatServiceCount,
  formatBookingCount,
  formatReviewCount,
  formatDistance,
  parseArabicNumber,
  isValidArabicNumber,
  ArabicNumerals 
} from './arabic-numerals';

import { 
  formatArabicDate, 
  formatArabicTime, 
  formatRelativeTime,
  formatBookingTimeSlot,
  formatTimeRange,
  formatDateRange,
  ArabicDates 
} from './arabic-dates';

// Example usage scenarios for Lamsa app
export const LamsaNumeralExamples = {
  // Service pricing display
  servicePrice: {
    // Hair cut service - 25.500 JOD
    hairCut: formatCurrency(25.500, true, true, 3), // "٢٥٫٥٠٠ د.أ"
    manicure: formatCurrency(15.000, true, true, 3), // "١٥٫٠٠٠ د.أ"
    facial: formatCurrency(35.750, true, true, 3), // "٣٥٫٧٥٠ د.أ"
    massage: formatCurrency(45.000, true, true, 3), // "٤٥٫٠٠٠ د.أ"
  },

  // Phone number formatting
  phoneNumbers: {
    // Jordan mobile numbers
    vodafone: formatPhoneNumber('0791234567', true, true), // "+٩٦٢ ٧٩ ١٢٣ ٤٥٦٧"
    orange: formatPhoneNumber('0781234567', true, true), // "+٩٦٢ ٧٨ ١٢٣ ٤٥٦٧"
    zain: formatPhoneNumber('0771234567', true, true), // "+٩٦٢ ٧٧ ١٢٣ ٤٥٦٧"
    localFormat: formatPhoneNumber('0791234567', true, false), // "٧٩ ١٢٣ ٤٥٦٧"
  },

  // Service duration formatting
  serviceDurations: {
    quickService: formatDuration(30, true, true), // "٣٠ دقيقة"
    standardService: formatDuration(60, true, true), // "١ ساعة"
    extendedService: formatDuration(90, true, true), // "١ ساعة ٣٠ دقائق"
    fullTreatment: formatDuration(120, true, true), // "٢ ساعات"
  },

  // Rating and review formatting
  ratings: {
    excellent: formatRating(4.8, 5, true, 1), // "٤٫٨/٥"
    good: formatRating(4.2, 5, true, 1), // "٤٫٢/٥"
    average: formatRating(3.5, 5, true, 1), // "٣٫٥/٥"
    perfect: formatRating(5.0, 5, true, 1), // "٥٫٠/٥"
  },

  // Booking IDs
  bookingIds: {
    recent: formatBookingId('12345', true, 'B'), // "B١٢٣٤٥"
    premium: formatBookingId('67890', true, 'P'), // "P٦٧٨٩٠"
    walk_in: formatBookingId('11111', true, 'W'), // "W١١١١١"
  },

  // Count formatting
  counts: {
    services: formatServiceCount(25, true, true), // "٢٥ خدمات"
    singleService: formatServiceCount(1, true, true), // "١ خدمة"
    bookings: formatBookingCount(150, true, true), // "١٥٠ حجوزات"
    reviews: formatReviewCount(89, true, true), // "٨٩ تقييمات"
  },

  // Distance from user location
  distances: {
    nearby: formatDistance(0.5, true, true, 'km'), // "٠٫٥ كم"
    moderate: formatDistance(2.3, true, true, 'km'), // "٢٫٣ كم"
    far: formatDistance(15.7, true, true, 'km'), // "١٥٫٧ كم"
    walkable: formatDistance(200, true, true, 'm'), // "٢٠٠ م"
  },

  // Input validation examples
  validation: {
    validPrice: isValidArabicNumber('٢٥٫٥٠٠'), // true
    validInteger: isValidArabicNumber('١٢٣'), // true
    invalidInput: isValidArabicNumber('abc'), // false
    mixedInput: isValidArabicNumber('١٢a٣'), // false
  },

  // Parsing examples
  parsing: {
    arabicPrice: parseArabicNumber('٢٥٫٥٠٠'), // 25.500
    arabicInteger: parseArabicNumber('١٢٣'), // 123
    mixedNumber: parseArabicNumber('١٢٣٬٤٥٦'), // 123456
    invalidParse: parseArabicNumber('invalid'), // 0
  }
};

// Date and time examples
export const LamsaDateExamples = {
  // Appointment booking dates
  appointments: {
    today: formatArabicDate(new Date(), 'full', true), // "الثلاثاء، ١٦ تموز ٢٠٢٥"
    tomorrow: formatArabicDate(new Date(Date.now() + 86400000), 'long', true), // "١٧ تموز ٢٠٢٥"
    nextWeek: formatArabicDate(new Date(Date.now() + 7 * 86400000), 'medium', true), // "٢٣ تموز ٢٠٢٥"
    shortFormat: formatArabicDate(new Date(), 'short', true), // "١٦/٠٧/٢٠٢٥"
  },

  // Appointment times
  appointmentTimes: {
    morning: formatArabicTime(new Date(2025, 6, 16, 9, 30), false, true, true), // "٩:٣٠ صباحاً"
    afternoon: formatArabicTime(new Date(2025, 6, 16, 14, 15), false, true, true), // "٢:١٥ مساءً"
    evening: formatArabicTime(new Date(2025, 6, 16, 18, 45), false, true, true), // "٦:٤٥ مساءً"
    military: formatArabicTime(new Date(2025, 6, 16, 14, 30), true, true, true), // "١٤:٣٠"
  },

  // Booking time slots
  timeSlots: {
    todaySlot: formatBookingTimeSlot(new Date(), 60, true, true), // "اليوم ٩:٠٠ صباحاً - ١٠:٠٠ صباحاً"
    tomorrowSlot: formatBookingTimeSlot(new Date(Date.now() + 86400000), 90, true, true), // "غداً ٢:٠٠ مساءً - ٣:٣٠ مساءً"
    futureSlot: formatBookingTimeSlot(new Date(Date.now() + 7 * 86400000), 45, true, true), // "٢٣ تموز ١٠:٠٠ صباحاً - ١٠:٤٥ صباحاً"
  },

  // Working hours
  workingHours: {
    salon: formatTimeRange(
      new Date(2025, 6, 16, 9, 0),
      new Date(2025, 6, 16, 17, 0),
      false,
      true,
      true
    ), // "٩:٠٠ صباحاً - ٥:٠٠ مساءً"
    
    spa: formatTimeRange(
      new Date(2025, 6, 16, 10, 0),
      new Date(2025, 6, 16, 20, 0),
      false,
      true,
      true
    ), // "١٠:٠٠ صباحاً - ٨:٠٠ مساءً"
  },

  // Relative time for reviews and activities
  relativeTime: {
    justNow: formatRelativeTime(new Date(Date.now() - 30000), true, true), // "منذ قليل"
    fiveMinutes: formatRelativeTime(new Date(Date.now() - 300000), true, true), // "منذ ٥ دقائق"
    oneHour: formatRelativeTime(new Date(Date.now() - 3600000), true, true), // "منذ ساعة"
    yesterday: formatRelativeTime(new Date(Date.now() - 86400000), true, true), // "أمس"
    oneWeek: formatRelativeTime(new Date(Date.now() - 7 * 86400000), true, true), // "منذ أسبوع"
  },

  // Date ranges for promotions
  dateRanges: {
    sameMonth: formatDateRange(
      new Date(2025, 6, 1),
      new Date(2025, 6, 15),
      true,
      true
    ), // "١ - ١٥ تموز ٢٠٢٥"
    
    differentMonths: formatDateRange(
      new Date(2025, 6, 25),
      new Date(2025, 7, 5),
      true,
      true
    ), // "٢٥ تموز ٢٠٢٥ - ٥ آب ٢٠٢٥"
  }
};

// Real-world usage examples for components
export const ComponentUsageExamples = {
  // Provider card component
  providerCard: (provider: any) => ({
    rating: formatRating(provider.rating, 5, true, 1),
    reviewCount: formatReviewCount(provider.reviewCount, true, true),
    distance: formatDistance(provider.distance, true, true, 'km'),
    phoneNumber: formatPhoneNumber(provider.phoneNumber, true, true),
    workingHours: formatTimeRange(
      new Date(`2025-01-01T${provider.openTime}`),
      new Date(`2025-01-01T${provider.closeTime}`),
      false,
      true,
      true
    )
  }),

  // Service card component
  serviceCard: (service: any) => ({
    price: formatCurrency(service.price, true, true, 3),
    duration: formatDuration(service.duration, true, true),
    bookingId: formatBookingId(service.lastBookingId, true, 'B'),
    rating: formatRating(service.rating, 5, true, 1)
  }),

  // Booking confirmation
  bookingConfirmation: (booking: any) => ({
    bookingId: formatBookingId(booking.id, true, 'B'),
    appointmentDate: formatArabicDate(new Date(booking.date), 'full', true),
    appointmentTime: formatArabicTime(new Date(booking.dateTime), false, true, true),
    totalAmount: formatCurrency(booking.totalAmount, true, true, 3),
    duration: formatDuration(booking.duration, true, true),
    providerPhone: formatPhoneNumber(booking.providerPhone, true, true)
  }),

  // Review component
  reviewComponent: (review: any) => ({
    rating: formatRating(review.rating, 5, true, 1),
    reviewDate: formatRelativeTime(new Date(review.createdAt), true, true),
    reviewerPhone: formatPhoneNumber(review.reviewerPhone, true, false) // Hide country code
  }),

  // Dashboard stats
  dashboardStats: (stats: any) => ({
    totalBookings: formatBookingCount(stats.totalBookings, true, true),
    totalRevenue: formatCurrency(stats.totalRevenue, true, true, 3),
    averageRating: formatRating(stats.averageRating, 5, true, 1),
    totalServices: formatServiceCount(stats.totalServices, true, true),
    activeClients: formatCount(stats.activeClients, 'عميل', 'عملاء', 'client', 'clients', true, true)
  })
};

// Testing utilities for Arabic numerals
export const ArabicNumeralTesting = {
  // Test all conversion functions
  testConversions: () => {
    console.log('=== Arabic Numeral Conversion Tests ===');
    
    // Basic conversions
    console.log('Basic conversions:');
    console.log('123 to Arabic:', toArabicNumerals('123'));
    console.log('٤٥٦ to Western:', ArabicNumerals.toWestern('٤٥٦'));
    
    // Currency formatting
    console.log('\nCurrency formatting:');
    console.log('25.500 JOD:', formatCurrency(25.500, true, true, 3));
    console.log('1000 JOD:', formatCurrency(1000, true, true, 3));
    
    // Phone numbers
    console.log('\nPhone number formatting:');
    console.log('0791234567:', formatPhoneNumber('0791234567', true, true));
    console.log('962781234567:', formatPhoneNumber('962781234567', true, true));
    
    // Duration
    console.log('\nDuration formatting:');
    console.log('30 minutes:', formatDuration(30, true, true));
    console.log('90 minutes:', formatDuration(90, true, true));
    console.log('120 minutes:', formatDuration(120, true, true));
    
    // Validation
    console.log('\nValidation tests:');
    console.log('Valid: ٢٥٫٥٠٠', isValidArabicNumber('٢٥٫٥٠٠'));
    console.log('Invalid: abc', isValidArabicNumber('abc'));
    console.log('Parse ٢٥٫٥٠٠:', parseArabicNumber('٢٥٫٥٠٠'));
  },

  // Test all date formatting functions
  testDateFormatting: () => {
    console.log('=== Arabic Date Formatting Tests ===');
    
    const testDate = new Date(2025, 6, 16, 14, 30); // July 16, 2025, 2:30 PM
    
    // Date formatting
    console.log('Date formatting:');
    console.log('Full format:', formatArabicDate(testDate, 'full', true));
    console.log('Long format:', formatArabicDate(testDate, 'long', true));
    console.log('Medium format:', formatArabicDate(testDate, 'medium', true));
    console.log('Short format:', formatArabicDate(testDate, 'short', true));
    
    // Time formatting
    console.log('\nTime formatting:');
    console.log('12-hour format:', formatArabicTime(testDate, false, true, true));
    console.log('24-hour format:', formatArabicTime(testDate, true, true, true));
    
    // Relative time
    console.log('\nRelative time:');
    console.log('5 minutes ago:', formatRelativeTime(new Date(Date.now() - 300000), true, true));
    console.log('1 hour ago:', formatRelativeTime(new Date(Date.now() - 3600000), true, true));
    console.log('1 day ago:', formatRelativeTime(new Date(Date.now() - 86400000), true, true));
    
    // Time ranges
    console.log('\nTime ranges:');
    console.log('9:00 AM - 5:00 PM:', formatTimeRange(
      new Date(2025, 6, 16, 9, 0),
      new Date(2025, 6, 16, 17, 0),
      false,
      true,
      true
    ));
    
    // Booking time slots
    console.log('\nBooking time slots:');
    console.log('Today 60min:', formatBookingTimeSlot(new Date(), 60, true, true));
    console.log('Tomorrow 90min:', formatBookingTimeSlot(new Date(Date.now() + 86400000), 90, true, true));
  },

  // Performance benchmark
  benchmarkPerformance: () => {
    console.log('=== Performance Benchmark ===');
    
    const iterations = 10000;
    const testNumber = '123456789';
    
    // Benchmark toArabicNumerals
    console.time('toArabicNumerals');
    for (let i = 0; i < iterations; i++) {
      toArabicNumerals(testNumber);
    }
    console.timeEnd('toArabicNumerals');
    
    // Benchmark formatCurrency
    console.time('formatCurrency');
    for (let i = 0; i < iterations; i++) {
      formatCurrency(123.456, true, true, 3);
    }
    console.timeEnd('formatCurrency');
    
    // Benchmark formatArabicDate
    const testDate = new Date();
    console.time('formatArabicDate');
    for (let i = 0; i < iterations; i++) {
      formatArabicDate(testDate, 'long', true);
    }
    console.timeEnd('formatArabicDate');
    
    console.log(`All benchmarks completed with ${iterations} iterations`);
  }
};

// Export utility for easy testing
export const runAllTests = () => {
  ArabicNumeralTesting.testConversions();
  console.log('\n');
  ArabicNumeralTesting.testDateFormatting();
  console.log('\n');
  ArabicNumeralTesting.benchmarkPerformance();
};

export default {
  LamsaNumeralExamples,
  LamsaDateExamples,
  ComponentUsageExamples,
  ArabicNumeralTesting,
  runAllTests
};