/**
 * Booking Test Data Factory
 * Generates test booking data for different scenarios
 */

import { faker } from '@faker-js/faker';

export interface TestBooking {
  id?: string;
  user_id: string;
  provider_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_method?: 'cash' | 'card' | 'online';
  amount: number;
  platform_fee: number;
  provider_fee: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export class BookingFactory {
  /**
   * Create a test booking with default values
   */
  static create(
    userId: string,
    providerId: string,
    serviceId: string,
    overrides: Partial<TestBooking> = {}
  ): TestBooking {
    const amount = Number(faker.number.float({ min: 10, max: 100, fractionDigits: 2 }));
    // Fixed fee structure: 2 JOD for services ≤25 JOD, 5 JOD for services >25 JOD
    const platformFee = amount <= 25 ? 2.00 : 5.00;
    const providerFee = Number((amount - platformFee).toFixed(2));

    const bookingDate = faker.date.future({ years: 0.1 }); // ~1 month ahead
    const startTime = this.generateBusinessHourTime();
    const endTime = this.calculateEndTime(startTime, faker.helpers.arrayElement([30, 45, 60, 90, 120]));

    return {
      id: faker.string.uuid(),
      user_id: userId,
      provider_id: providerId,
      service_id: serviceId,
      booking_date: bookingDate.toISOString().split('T')[0],
      start_time: startTime,
      end_time: endTime,
      status: 'pending',
      payment_method: faker.helpers.arrayElement(['cash', 'card', 'online']),
      amount,
      platform_fee: platformFee,
      provider_fee: providerFee,
      notes: faker.lorem.sentence(),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides
    };
  }

  /**
   * Create a booking for today
   */
  static createForToday(
    userId: string,
    providerId: string,
    serviceId: string,
    overrides: Partial<TestBooking> = {}
  ): TestBooking {
    const today = new Date().toISOString().split('T')[0];
    
    return this.create(userId, providerId, serviceId, {
      booking_date: today,
      ...overrides
    });
  }

  /**
   * Create a booking for tomorrow
   */
  static createForTomorrow(
    userId: string,
    providerId: string,
    serviceId: string,
    overrides: Partial<TestBooking> = {}
  ): TestBooking {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.create(userId, providerId, serviceId, {
      booking_date: tomorrow.toISOString().split('T')[0],
      ...overrides
    });
  }

  /**
   * Create a booking for specific date
   */
  static createForDate(
    userId: string,
    providerId: string,
    serviceId: string,
    date: string,
    overrides: Partial<TestBooking> = {}
  ): TestBooking {
    return this.create(userId, providerId, serviceId, {
      booking_date: date,
      ...overrides
    });
  }

  /**
   * Create confirmed booking
   */
  static createConfirmed(
    userId: string,
    providerId: string,
    serviceId: string,
    overrides: Partial<TestBooking> = {}
  ): TestBooking {
    return this.create(userId, providerId, serviceId, {
      status: 'confirmed',
      ...overrides
    });
  }

  /**
   * Create completed booking
   */
  static createCompleted(
    userId: string,
    providerId: string,
    serviceId: string,
    overrides: Partial<TestBooking> = {}
  ): TestBooking {
    const pastDate = faker.date.past({ years: 0.1 }); // ~1 month ago
    
    return this.create(userId, providerId, serviceId, {
      status: 'completed',
      booking_date: pastDate.toISOString().split('T')[0],
      ...overrides
    });
  }

  /**
   * Create cancelled booking
   */
  static createCancelled(
    userId: string,
    providerId: string,
    serviceId: string,
    overrides: Partial<TestBooking> = {}
  ): TestBooking {
    return this.create(userId, providerId, serviceId, {
      status: 'cancelled',
      ...overrides
    });
  }

  /**
   * Create multiple bookings
   */
  static createMany(
    userId: string,
    providerId: string,
    serviceId: string,
    count: number,
    overrides: Partial<TestBooking> = {}
  ): TestBooking[] {
    return Array.from({ length: count }, () => 
      this.create(userId, providerId, serviceId, overrides)
    );
  }

  /**
   * Create bookings with different statuses
   */
  static createWithMixedStatuses(
    userId: string,
    providerId: string,
    serviceId: string,
    count: number
  ): TestBooking[] {
    const statuses: Array<'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'> = 
      ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    
    return Array.from({ length: count }, (_, index) => 
      this.create(userId, providerId, serviceId, {
        status: statuses[index % statuses.length]
      })
    );
  }

  /**
   * Create consecutive bookings (same provider, different times)
   */
  static createConsecutiveBookings(
    userId: string,
    providerId: string,
    serviceId: string,
    date: string,
    count: number
  ): TestBooking[] {
    const bookings: TestBooking[] = [];
    let currentTime = '09:00';

    for (let i = 0; i < count; i++) {
      const endTime = this.calculateEndTime(currentTime, 60);
      
      bookings.push(this.create(userId, providerId, serviceId, {
        booking_date: date,
        start_time: currentTime,
        end_time: endTime
      }));

      // Next booking starts when current one ends
      currentTime = endTime;
    }

    return bookings;
  }

  /**
   * Create overlapping bookings (for conflict testing)
   */
  static createOverlappingBookings(
    userId: string,
    providerId: string,
    serviceId: string,
    date: string
  ): TestBooking[] {
    return [
      this.create(userId, providerId, serviceId, {
        booking_date: date,
        start_time: '10:00',
        end_time: '11:00'
      }),
      this.create(userId, providerId, serviceId, {
        booking_date: date,
        start_time: '10:30',
        end_time: '11:30'
      })
    ];
  }

  /**
   * Create booking with specific payment method
   */
  static createWithPaymentMethod(
    userId: string,
    providerId: string,
    serviceId: string,
    paymentMethod: 'cash' | 'card' | 'online',
    overrides: Partial<TestBooking> = {}
  ): TestBooking {
    return this.create(userId, providerId, serviceId, {
      payment_method: paymentMethod,
      ...overrides
    });
  }

  /**
   * Create booking with specific amount and fees
   */
  static createWithAmount(
    userId: string,
    providerId: string,
    serviceId: string,
    amount: number,
    overrides: Partial<TestBooking> = {}
  ): TestBooking {
    // Fixed fee structure: 2 JOD for services ≤25 JOD, 5 JOD for services >25 JOD
    const platformFee = amount <= 25 ? 2.00 : 5.00;
    const providerFee = Number((amount - platformFee).toFixed(2));

    return this.create(userId, providerId, serviceId, {
      amount,
      platform_fee: platformFee,
      provider_fee: providerFee,
      ...overrides
    });
  }

  /**
   * Create bookings for load testing
   */
  static createForLoadTesting(
    userIds: string[],
    providerIds: string[],
    serviceIds: string[],
    count: number
  ): TestBooking[] {
    return Array.from({ length: count }, (_, index) => {
      const userId = userIds[index % userIds.length];
      const providerId = providerIds[index % providerIds.length];
      const serviceId = serviceIds[index % serviceIds.length];
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(index / 10) + 1);
      
      return this.create(userId, providerId, serviceId, {
        booking_date: futureDate.toISOString().split('T')[0],
        start_time: this.generateTimeSlot(index),
        status: 'confirmed'
      });
    });
  }

  /**
   * Create concurrent bookings (same time slot, different providers)
   */
  static createConcurrentBookings(
    userIds: string[],
    providerIds: string[],
    serviceIds: string[],
    date: string,
    timeSlot: string
  ): TestBooking[] {
    return providerIds.map((providerId, index) => 
      this.create(
        userIds[index % userIds.length],
        providerId,
        serviceIds[index % serviceIds.length],
        {
          booking_date: date,
          start_time: timeSlot,
          end_time: this.calculateEndTime(timeSlot, 60),
          status: 'pending'
        }
      )
    );
  }

  /**
   * Generate business hour time (9 AM - 6 PM)
   */
  private static generateBusinessHourTime(): string {
    const hours = faker.number.int({ min: 9, max: 17 });
    const minutes = faker.helpers.arrayElement(['00', '15', '30', '45']);
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  /**
   * Calculate end time based on start time and duration
   */
  private static calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Generate time slot for load testing
   */
  private static generateTimeSlot(index: number): string {
    const baseHour = 9 + (index % 9); // 9 AM to 5 PM
    const minute = (index % 4) * 15; // 0, 15, 30, 45 minutes
    return `${baseHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  /**
   * Get predefined test bookings for consistent testing
   */
  static getPredefinedBookings(): { [key: string]: TestBooking } {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    return {
      pendingBooking: {
        id: 'booking1-1111-1111-1111-111111111111',
        user_id: '11111111-1111-1111-1111-111111111111',
        provider_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        service_id: 'service1-1111-1111-1111-111111111111',
        booking_date: tomorrowStr,
        start_time: '14:00',
        end_time: '15:00',
        status: 'pending',
        payment_method: 'cash',
        amount: 25.00,
        platform_fee: 2.00,
        provider_fee: 23.00,
        notes: 'Test booking'
      },
      confirmedBooking: {
        id: 'booking2-2222-2222-2222-222222222222',
        user_id: '22222222-2222-2222-2222-222222222222',
        provider_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        service_id: 'service2-2222-2222-2222-222222222222',
        booking_date: tomorrowStr,
        start_time: '15:30',
        end_time: '16:15',
        status: 'confirmed',
        payment_method: 'card',
        amount: 15.00,
        platform_fee: 2.00,
        provider_fee: 13.00
      },
      completedBooking: {
        id: 'booking3-3333-3333-3333-333333333333',
        user_id: '33333333-3333-3333-3333-333333333333',
        provider_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        service_id: 'service3-3333-3333-3333-333333333333',
        booking_date: yesterdayStr,
        start_time: '10:00',
        end_time: '11:30',
        status: 'completed',
        payment_method: 'online',
        amount: 35.00,
        platform_fee: 5.00,
        provider_fee: 30.00
      },
      cancelledBooking: {
        id: 'booking4-4444-4444-4444-444444444444',
        user_id: '11111111-1111-1111-1111-111111111111',
        provider_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        service_id: 'service1-1111-1111-1111-111111111111',
        booking_date: tomorrowStr,
        start_time: '16:00',
        end_time: '17:00',
        status: 'cancelled',
        payment_method: 'cash',
        amount: 25.00,
        platform_fee: 2.00,
        provider_fee: 23.00
      }
    };
  }
}

export default BookingFactory;