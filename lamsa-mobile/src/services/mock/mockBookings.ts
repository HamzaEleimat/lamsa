export interface Booking {
  id: string;
  user_id: string;
  provider_id: string;
  service_id: string;
  provider_name: string;
  provider_name_ar: string;
  service_name: string;
  service_name_ar: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total_amount: number;
  platform_fee: number;
  provider_amount: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_method: 'cash' | 'card' | 'mobile';
  notes?: string;
  created_at: string;
  updated_at: string;
  provider_image?: string;
  provider_address?: string;
  provider_phone?: string;
  cancellation_reason?: string;
  rating?: number;
  review?: string;
}

export const mockBookings: Booking[] = [
  {
    id: 'b1',
    user_id: 'user1',
    provider_id: '1',
    service_id: 's1',
    provider_name: 'Rose Beauty Salon',
    provider_name_ar: 'صالون روز للتجميل',
    service_name: 'Classic Haircut & Style',
    service_name_ar: 'قص وتصفيف كلاسيكي',
    booking_date: '2024-01-28',
    booking_time: '14:00',
    duration_minutes: 60,
    status: 'confirmed',
    total_amount: 27,
    platform_fee: 2,
    provider_amount: 25,
    payment_status: 'pending',
    payment_method: 'cash',
    notes: 'Please prepare for long hair treatment',
    created_at: '2024-01-20T10:30:00Z',
    updated_at: '2024-01-20T10:35:00Z',
    provider_image: 'https://via.placeholder.com/100x100/FF8FAB/FFFFFF?text=Rose',
    provider_address: '123 Rainbow Street, Amman',
    provider_phone: '+962791234567'
  },
  {
    id: 'b2',
    user_id: 'user1',
    provider_id: '2',
    service_id: 's7',
    provider_name: 'Jasmine Spa & Wellness',
    provider_name_ar: 'جاسمين سبا ومركز العافية',
    service_name: 'Swedish Massage',
    service_name_ar: 'مساج سويدي',
    booking_date: '2024-01-25',
    booking_time: '18:00',
    duration_minutes: 60,
    status: 'pending',
    total_amount: 65,
    platform_fee: 5,
    provider_amount: 60,
    payment_status: 'pending',
    payment_method: 'card',
    created_at: '2024-01-19T14:20:00Z',
    updated_at: '2024-01-19T14:20:00Z',
    provider_image: 'https://via.placeholder.com/100x100/FFB3C6/FFFFFF?text=Jasmine',
    provider_address: '45 Abdoun Circle, Amman',
    provider_phone: '+962795555888'
  },
  {
    id: 'b3',
    user_id: 'user1',
    provider_id: '3',
    service_id: 's10',
    provider_name: 'Cleopatra Nails Studio',
    provider_name_ar: 'ستوديو كليوباترا للأظافر',
    service_name: 'Nail Art Design',
    service_name_ar: 'تصميم فن الأظافر',
    booking_date: '2024-01-15',
    booking_time: '16:30',
    duration_minutes: 60,
    status: 'completed',
    total_amount: 45,
    platform_fee: 5,
    provider_amount: 40,
    payment_status: 'paid',
    payment_method: 'cash',
    created_at: '2024-01-10T09:15:00Z',
    updated_at: '2024-01-15T17:30:00Z',
    provider_image: 'https://via.placeholder.com/100x100/FF8FAB/FFFFFF?text=Cleo',
    provider_address: '78 Mecca Street, Amman',
    provider_phone: '+962777123456',
    rating: 5,
    review: 'Amazing nail art! Very creative and professional.'
  },
  {
    id: 'b4',
    user_id: 'user1',
    provider_id: '4',
    service_id: 's13',
    provider_name: 'Lana Makeup Artist',
    provider_name_ar: 'لانا فنانة المكياج',
    service_name: 'Evening Makeup',
    service_name_ar: 'مكياج سهرة',
    booking_date: '2024-01-10',
    booking_time: '17:00',
    duration_minutes: 60,
    status: 'completed',
    total_amount: 65,
    platform_fee: 5,
    provider_amount: 60,
    payment_status: 'paid',
    payment_method: 'card',
    created_at: '2024-01-05T11:00:00Z',
    updated_at: '2024-01-10T18:00:00Z',
    provider_image: 'https://via.placeholder.com/100x100/FFB3C6/FFFFFF?text=Lana',
    provider_address: 'Sweifieh Village, Amman',
    provider_phone: '+962796666999',
    rating: 5,
    review: 'رائعة! المكياج كان مثالي للمناسبة'
  },
  {
    id: 'b5',
    user_id: 'user1',
    provider_id: '1',
    service_id: 's2',
    provider_name: 'Rose Beauty Salon',
    provider_name_ar: 'صالون روز للتجميل',
    service_name: 'Hair Color & Highlights',
    service_name_ar: 'صبغة وهايلايت',
    booking_date: '2024-01-20',
    booking_time: '10:00',
    duration_minutes: 120,
    status: 'cancelled',
    total_amount: 85,
    platform_fee: 5,
    provider_amount: 80,
    payment_status: 'refunded',
    payment_method: 'card',
    created_at: '2024-01-15T16:45:00Z',
    updated_at: '2024-01-18T09:00:00Z',
    provider_image: 'https://via.placeholder.com/100x100/FF8FAB/FFFFFF?text=Rose',
    provider_address: '123 Rainbow Street, Amman',
    provider_phone: '+962791234567',
    cancellation_reason: 'Family emergency'
  },
  {
    id: 'b6',
    user_id: 'user1',
    provider_id: '5',
    service_id: 's16',
    provider_name: 'Bloom Hair & Beauty',
    provider_name_ar: 'بلوم للشعر والجمال',
    service_name: 'Balayage Hair Color',
    service_name_ar: 'صبغة بالاياج',
    booking_date: '2023-12-28',
    booking_time: '13:00',
    duration_minutes: 180,
    status: 'completed',
    total_amount: 125,
    platform_fee: 5,
    provider_amount: 120,
    payment_status: 'paid',
    payment_method: 'mobile',
    created_at: '2023-12-20T10:00:00Z',
    updated_at: '2023-12-28T16:00:00Z',
    provider_image: 'https://via.placeholder.com/100x100/FF8FAB/FFFFFF?text=Bloom',
    provider_address: '12 Wakalat Street, Sweifieh',
    provider_phone: '+962785554321',
    rating: 4,
    review: 'Good service but took longer than expected'
  },
  {
    id: 'b7',
    user_id: 'user1',
    provider_id: '6',
    service_id: 's19',
    provider_name: 'Aura Wellness Center',
    provider_name_ar: 'مركز أورا للعافية',
    service_name: 'Aromatherapy Massage',
    service_name_ar: 'مساج بالزيوت العطرية',
    booking_date: '2024-01-30',
    booking_time: '19:00',
    duration_minutes: 60,
    status: 'confirmed',
    total_amount: 75,
    platform_fee: 5,
    provider_amount: 70,
    payment_status: 'pending',
    payment_method: 'cash',
    notes: 'Prefer lavender oil',
    created_at: '2024-01-22T11:30:00Z',
    updated_at: '2024-01-22T11:35:00Z',
    provider_image: 'https://via.placeholder.com/100x100/FFB3C6/FFFFFF?text=Aura',
    provider_address: '234 Gardens Street, Amman',
    provider_phone: '+962799887766'
  },
  {
    id: 'b8',
    user_id: 'user1',
    provider_id: '2',
    service_id: 's6',
    provider_name: 'Jasmine Spa & Wellness',
    provider_name_ar: 'جاسمين سبا ومركز العافية',
    service_name: 'Traditional Hammam',
    service_name_ar: 'حمام تقليدي',
    booking_date: '2023-11-15',
    booking_time: '15:00',
    duration_minutes: 90,
    status: 'completed',
    total_amount: 80,
    platform_fee: 5,
    provider_amount: 75,
    payment_status: 'paid',
    payment_method: 'card',
    created_at: '2023-11-10T14:00:00Z',
    updated_at: '2023-11-15T16:30:00Z',
    provider_image: 'https://via.placeholder.com/100x100/FFB3C6/FFFFFF?text=Jasmine',
    provider_address: '45 Abdoun Circle, Amman',
    provider_phone: '+962795555888',
    rating: 5,
    review: 'تجربة رائعة! الحمام كان مريح جداً والخدمة ممتازة'
  }
];