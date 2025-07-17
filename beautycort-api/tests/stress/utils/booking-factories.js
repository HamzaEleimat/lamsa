/**
 * Booking Test Data Factories
 * Generates realistic test data for stress testing
 */

const { faker } = require('@faker-js/faker');

/**
 * Jordan-specific data generators
 */
const JordanData = {
  // Jordan mobile phone prefixes
  phonePrefix: ['77', '78', '79'],
  
  // Major Jordan cities with coordinates
  cities: [
    { name: 'Amman', nameAr: 'عمان', lat: 31.9566, lng: 35.9457 },
    { name: 'Irbid', nameAr: 'إربد', lat: 32.5556, lng: 35.8500 },
    { name: 'Zarqa', nameAr: 'الزرقاء', lat: 32.0727, lng: 36.0888 },
    { name: 'Aqaba', nameAr: 'العقبة', lat: 29.5267, lng: 35.0072 },
    { name: 'Madaba', nameAr: 'مادبا', lat: 31.7197, lng: 35.7956 }
  ],
  
  // Arabic business names
  businessNames: [
    'صالون الجمال للسيدات',
    'مركز العناية بالبشرة',
    'واحة الجمال الطبيعي',
    'صالون الأناقة العصرية',
    'مركز تجميل الملكة',
    'صالون الورد الدمشقي',
    'مركز العافية والجمال',
    'صالون النور للتجميل'
  ],
  
  // Arabic service names
  serviceNames: [
    'قص وتصفيف الشعر',
    'صبغة الشعر الطبيعية',
    'علاج الوجه والبشرة',
    'العناية بالأظافر',
    'المكياج الطبيعي',
    'إزالة الشعر بالشمع',
    'تدليك استرخائي',
    'تنظيف البشرة العميق'
  ],
  
  // Arabic customer names
  customerNames: [
    'فاطمة الزهراء',
    'عائشة أحمد',
    'مريم خالد',
    'نور الهدى',
    'سارة محمد',
    'ليلى عبدالله',
    'رانيا حسن',
    'زينب علي'
  ]
};

/**
 * Generate Jordan phone number
 */
function generateJordanPhone() {
  const prefix = JordanData.phonePrefix[Math.floor(Math.random() * JordanData.phonePrefix.length)];
  const number = faker.string.numeric(7);
  return `+962${prefix}${number}`;
}

/**
 * Generate Jordan business location
 */
function generateJordanLocation() {
  const city = JordanData.cities[Math.floor(Math.random() * JordanData.cities.length)];
  
  // Add small random offset to coordinates for variety
  const latOffset = (Math.random() - 0.5) * 0.02; // ~1km radius
  const lngOffset = (Math.random() - 0.5) * 0.02;
  
  return {
    city: city.name,
    cityAr: city.nameAr,
    coordinates: {
      lat: parseFloat((city.lat + latOffset).toFixed(6)),
      lng: parseFloat((city.lng + lngOffset).toFixed(6))
    },
    address: `${faker.location.streetAddress()}, ${city.name}`,
    addressAr: `${faker.location.streetAddress()}، ${city.nameAr}`
  };
}

/**
 * Provider Factory
 */
class ProviderFactory {
  static create(overrides = {}) {
    const location = generateJordanLocation();
    const businessNameAr = JordanData.businessNames[Math.floor(Math.random() * JordanData.businessNames.length)];
    
    return {
      id: `provider_${faker.string.uuid()}`,
      businessName: `${faker.company.name()} ${businessNameAr}`,
      businessNameAr,
      ownerName: faker.person.fullName(),
      ownerNameAr: faker.person.fullName(), // In production, this would be actual Arabic
      phone: generateJordanPhone(),
      email: faker.internet.email(),
      businessType: 'beauty_salon',
      location,
      status: 'active',
      tier: faker.helpers.arrayElement(['standard', 'premium']),
      ...overrides
    };
  }
  
  static createMany(count, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

/**
 * Service Factory
 */
class ServiceFactory {
  static create(providerId, overrides = {}) {
    const serviceNameAr = JordanData.serviceNames[Math.floor(Math.random() * JordanData.serviceNames.length)];
    const duration = faker.helpers.arrayElement([30, 45, 60, 90, 120]);
    const basePrice = faker.number.int({ min: 15, max: 100 });
    
    return {
      id: `service_${faker.string.uuid()}`,
      providerId,
      name: `${faker.commerce.productName()} ${serviceNameAr}`,
      nameAr: serviceNameAr,
      description: faker.commerce.productDescription(),
      descriptionAr: `وصف تفصيلي ل${serviceNameAr}`,
      category: faker.helpers.arrayElement([
        'hair_services',
        'facial_services', 
        'nail_services',
        'massage_services',
        'makeup_services'
      ]),
      duration,
      basePrice,
      currency: 'JOD',
      pricing: {
        type: 'fixed',
        basePrice,
        currency: 'JOD'
      },
      isActive: true,
      ...overrides
    };
  }
  
  static createMany(providerId, count, overrides = {}) {
    return Array.from({ length: count }, () => this.create(providerId, overrides));
  }
}

/**
 * Customer Factory
 */
class CustomerFactory {
  static create(overrides = {}) {
    const customerNameAr = JordanData.customerNames[Math.floor(Math.random() * JordanData.customerNames.length)];
    
    return {
      id: `customer_${faker.string.uuid()}`,
      name: faker.person.fullName(),
      nameAr: customerNameAr,
      phone: generateJordanPhone(),
      email: faker.internet.email(),
      location: generateJordanLocation(),
      preferences: {
        language: faker.helpers.arrayElement(['ar', 'en']),
        notifications: {
          sms: true,
          email: true
        }
      },
      ...overrides
    };
  }
  
  static createMany(count, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

/**
 * Booking Factory
 */
class BookingFactory {
  static create(customerId, providerId, serviceId, overrides = {}) {
    const bookingDate = faker.date.future({ days: 30 });
    const workingHours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                         '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
    const time = faker.helpers.arrayElement(workingHours);
    
    return {
      id: `booking_${faker.string.uuid()}`,
      customerId,
      providerId,
      serviceId,
      date: bookingDate.toISOString().split('T')[0],
      time,
      duration: faker.helpers.arrayElement([30, 45, 60, 90]),
      status: faker.helpers.arrayElement(['pending', 'confirmed', 'completed']),
      totalAmount: faker.number.int({ min: 20, max: 80 }),
      currency: 'JOD',
      paymentStatus: 'paid',
      notes: faker.lorem.sentence(),
      notesAr: `ملاحظات باللغة العربية`,
      createdAt: faker.date.recent().toISOString(),
      ...overrides
    };
  }
  
  static createMany(customerId, providerId, serviceId, count, overrides = {}) {
    return Array.from({ length: count }, () => 
      this.create(customerId, providerId, serviceId, overrides)
    );
  }
  
  /**
   * Create booking for specific time slot (useful for concurrent booking tests)
   */
  static createForSlot(customerId, providerId, serviceId, date, time, overrides = {}) {
    return this.create(customerId, providerId, serviceId, {
      date,
      time,
      status: 'pending',
      ...overrides
    });
  }
}

/**
 * Time Slot Factory
 */
class TimeSlotFactory {
  /**
   * Generate realistic Jordan working hours
   */
  static generateJordanWorkingHours() {
    return {
      sunday: {
        isWorking: true,
        shifts: [
          { start: '09:00', end: '13:00' },
          { start: '15:00', end: '19:00' }
        ]
      },
      monday: {
        isWorking: true,
        shifts: [
          { start: '09:00', end: '13:00' },
          { start: '15:00', end: '19:00' }
        ]
      },
      tuesday: {
        isWorking: true,
        shifts: [
          { start: '09:00', end: '13:00' },
          { start: '15:00', end: '19:00' }
        ]
      },
      wednesday: {
        isWorking: true,
        shifts: [
          { start: '09:00', end: '13:00' },
          { start: '15:00', end: '19:00' }
        ]
      },
      thursday: {
        isWorking: true,
        shifts: [
          { start: '09:00', end: '13:00' },
          { start: '15:00', end: '19:00' }
        ]
      },
      friday: {
        isWorking: false, // Friday is day off in Jordan
        note: 'Friday prayer day',
        noteAr: 'يوم صلاة الجمعة'
      },
      saturday: {
        isWorking: true,
        shifts: [
          { start: '10:00', end: '16:00' }
        ]
      }
    };
  }
  
  /**
   * Generate available time slots for a specific date
   */
  static generateAvailableSlots(date, workingHours = null, slotDuration = 30) {
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });
    const hours = workingHours || this.generateJordanWorkingHours();
    const dayConfig = hours[dayOfWeek];
    
    if (!dayConfig || !dayConfig.isWorking) {
      return [];
    }
    
    const slots = [];
    
    dayConfig.shifts.forEach(shift => {
      const startTime = this.timeToMinutes(shift.start);
      const endTime = this.timeToMinutes(shift.end);
      
      for (let time = startTime; time < endTime; time += slotDuration) {
        slots.push({
          time: this.minutesToTime(time),
          duration: slotDuration,
          available: true
        });
      }
    });
    
    return slots;
  }
  
  /**
   * Convert time string to minutes
   */
  static timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * Convert minutes to time string
   */
  static minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

/**
 * Test Scenario Factory
 */
class TestScenarioFactory {
  /**
   * Create concurrent booking scenario
   */
  static createConcurrentBookingScenario(concurrentUsers = 50) {
    const provider = ProviderFactory.create();
    const service = ServiceFactory.create(provider.id);
    const customers = CustomerFactory.createMany(concurrentUsers);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1); // Tomorrow
    const targetTime = '10:00';
    
    const bookings = customers.map(customer => 
      BookingFactory.createForSlot(
        customer.id,
        provider.id,
        service.id,
        targetDate.toISOString().split('T')[0],
        targetTime
      )
    );
    
    return {
      provider,
      service,
      customers,
      bookings,
      targetSlot: {
        date: targetDate.toISOString().split('T')[0],
        time: targetTime
      }
    };
  }
  
  /**
   * Create realistic workload scenario
   */
  static createRealisticWorkload(providers = 10, customersPerProvider = 20) {
    const providersData = ProviderFactory.createMany(providers);
    const scenario = {
      providers: [],
      totalBookings: 0
    };
    
    providersData.forEach(provider => {
      const services = ServiceFactory.createMany(provider.id, 3);
      const customers = CustomerFactory.createMany(customersPerProvider);
      const bookings = [];
      
      // Generate bookings across next 7 days
      for (let day = 1; day <= 7; day++) {
        const bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() + day);
        const dateStr = bookingDate.toISOString().split('T')[0];
        
        // Random bookings per day (0-8)
        const bookingsPerDay = faker.number.int({ min: 0, max: 8 });
        
        for (let i = 0; i < bookingsPerDay; i++) {
          const customer = faker.helpers.arrayElement(customers);
          const service = faker.helpers.arrayElement(services);
          
          bookings.push(BookingFactory.createForSlot(
            customer.id,
            provider.id,
            service.id,
            dateStr,
            faker.helpers.arrayElement(['09:00', '10:00', '11:00', '15:00', '16:00'])
          ));
        }
      }
      
      scenario.providers.push({
        provider,
        services,
        customers,
        bookings
      });
      
      scenario.totalBookings += bookings.length;
    });
    
    return scenario;
  }
  
  /**
   * Create high-volume notification scenario
   */
  static createNotificationScenario(notificationCount = 1000) {
    const notifications = [];
    
    for (let i = 0; i < notificationCount; i++) {
      const customer = CustomerFactory.create();
      const provider = ProviderFactory.create();
      
      notifications.push({
        id: `notification_${faker.string.uuid()}`,
        type: faker.helpers.arrayElement([
          'booking_confirmed',
          'booking_reminder',
          'booking_cancelled',
          'provider_message'
        ]),
        recipientId: customer.id,
        recipientPhone: customer.phone,
        message: faker.lorem.sentence(),
        messageAr: 'رسالة باللغة العربية',
        providerId: provider.id,
        priority: faker.helpers.arrayElement(['low', 'normal', 'high']),
        createdAt: new Date().toISOString()
      });
    }
    
    return notifications;
  }
}

module.exports = {
  JordanData,
  generateJordanPhone,
  generateJordanLocation,
  ProviderFactory,
  ServiceFactory,
  CustomerFactory,
  BookingFactory,
  TimeSlotFactory,
  TestScenarioFactory
};