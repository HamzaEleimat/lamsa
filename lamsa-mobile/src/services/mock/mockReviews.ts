export interface Review {
  id: string;
  provider_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  comment: string;
  service_name?: string;
  created_at: string;
  helpful_count: number;
  images?: string[];
}

export const mockReviews: Review[] = [
  // Reviews for Rose Beauty Salon (Provider 1)
  {
    id: 'r1',
    provider_id: '1',
    user_id: 'u1',
    user_name: 'Sara Ahmed',
    user_avatar: 'https://via.placeholder.com/50x50/FFE5EC/50373E?text=SA',
    rating: 5,
    comment: 'Excellent service! The staff is very professional and the salon is clean and modern. My hair looks amazing!',
    service_name: 'Hair Color & Highlights',
    created_at: '2024-01-15T14:30:00Z',
    helpful_count: 12,
    images: ['https://via.placeholder.com/200x150/FF8FAB/FFFFFF?text=Hair+Result']
  },
  {
    id: 'r2',
    provider_id: '1',
    user_id: 'u2',
    user_name: 'فاطمة الخالدي',
    user_avatar: 'https://via.placeholder.com/50x50/FFC2D1/FFFFFF?text=FK',
    rating: 4,
    comment: 'صالون ممتاز والخدمة رائعة. الأسعار معقولة مقارنة بالجودة. أنصح به بشدة',
    service_name: 'قص وتصفيف كلاسيكي',
    created_at: '2024-01-10T11:20:00Z',
    helpful_count: 8
  },
  {
    id: 'r3',
    provider_id: '1',
    user_id: 'u3',
    user_name: 'Hala Mansour',
    user_avatar: 'https://via.placeholder.com/50x50/FFB3C6/FFFFFF?text=HM',
    rating: 5,
    comment: 'Best bridal makeup in Amman! They made me look like a princess on my wedding day. Highly recommend!',
    service_name: 'Bridal Makeup Package',
    created_at: '2024-01-05T16:45:00Z',
    helpful_count: 25,
    images: [
      'https://via.placeholder.com/200x150/FFE5EC/50373E?text=Bridal+1',
      'https://via.placeholder.com/200x150/FF8FAB/FFFFFF?text=Bridal+2'
    ]
  },

  // Reviews for Jasmine Spa (Provider 2)
  {
    id: 'r4',
    provider_id: '2',
    user_id: 'u4',
    user_name: 'Dina Saeed',
    user_avatar: 'https://via.placeholder.com/50x50/FF8FAB/FFFFFF?text=DS',
    rating: 5,
    comment: 'The traditional hammam experience was incredible! So relaxing and rejuvenating. The facilities are top-notch.',
    service_name: 'Traditional Hammam',
    created_at: '2024-01-18T13:00:00Z',
    helpful_count: 15
  },
  {
    id: 'r5',
    provider_id: '2',
    user_id: 'u5',
    user_name: 'مريم العبادي',
    user_avatar: 'https://via.placeholder.com/50x50/FFC2D1/FFFFFF?text=MA',
    rating: 5,
    comment: 'أفضل سبا في عمان! الجو هادئ جداً والموظفات محترفات. المساج السويدي كان ممتاز',
    service_name: 'مساج سويدي',
    created_at: '2024-01-12T10:15:00Z',
    helpful_count: 20
  },

  // Reviews for Cleopatra Nails (Provider 3)
  {
    id: 'r6',
    provider_id: '3',
    user_id: 'u6',
    user_name: 'Lana Qasem',
    user_avatar: 'https://via.placeholder.com/50x50/FFB3C6/FFFFFF?text=LQ',
    rating: 5,
    comment: 'Amazing nail art! They have so many creative designs and the quality lasts for weeks. Love this place!',
    service_name: 'Nail Art Design',
    created_at: '2024-01-20T15:30:00Z',
    helpful_count: 18,
    images: ['https://via.placeholder.com/200x150/FF8FAB/FFFFFF?text=Nails']
  },
  {
    id: 'r7',
    provider_id: '3',
    user_id: 'u7',
    user_name: 'نور الهدى',
    user_avatar: 'https://via.placeholder.com/50x50/FFE5EC/50373E?text=NH',
    rating: 4,
    comment: 'خدمة ممتازة وتصاميم جميلة. الموعد تأخر قليلاً لكن النتيجة كانت تستحق الانتظار',
    service_name: 'تصميم فن الأظافر',
    created_at: '2024-01-08T12:45:00Z',
    helpful_count: 10
  },

  // Reviews for Lana Makeup Artist (Provider 4)
  {
    id: 'r8',
    provider_id: '4',
    user_id: 'u8',
    user_name: 'Rania Hamdan',
    user_avatar: 'https://via.placeholder.com/50x50/FF8FAB/FFFFFF?text=RH',
    rating: 5,
    comment: 'Lana is a true artist! She understood exactly what I wanted and the makeup lasted all night. Professional and talented!',
    service_name: 'Evening Makeup',
    created_at: '2024-01-16T18:00:00Z',
    helpful_count: 30
  },
  {
    id: 'r9',
    provider_id: '4',
    user_id: 'u9',
    user_name: 'سماح البشير',
    user_avatar: 'https://via.placeholder.com/50x50/FFC2D1/FFFFFF?text=SB',
    rating: 5,
    comment: 'لانا فنانة بمعنى الكلمة! مكياج العروس كان خيالي والكل أعجب به. شكراً من القلب',
    service_name: 'باقة مكياج العروس',
    created_at: '2024-01-02T14:20:00Z',
    helpful_count: 45,
    images: [
      'https://via.placeholder.com/200x150/FFB3C6/FFFFFF?text=Bride+1',
      'https://via.placeholder.com/200x150/FFE5EC/50373E?text=Bride+2'
    ]
  },

  // Reviews for Bloom Hair & Beauty (Provider 5)
  {
    id: 'r10',
    provider_id: '5',
    user_id: 'u10',
    user_name: 'Maya Khoury',
    user_avatar: 'https://via.placeholder.com/50x50/FFB3C6/FFFFFF?text=MK',
    rating: 4,
    comment: 'Great balayage results! The colorist really knows what she\'s doing. Only downside was the wait time.',
    service_name: 'Balayage Hair Color',
    created_at: '2024-01-14T16:30:00Z',
    helpful_count: 22
  },
  {
    id: 'r11',
    provider_id: '5',
    user_id: 'u11',
    user_name: 'جمانة عواد',
    user_avatar: 'https://via.placeholder.com/50x50/FFE5EC/50373E?text=JA',
    rating: 5,
    comment: 'علاج الكيراتين كان ممتاز! شعري أصبح ناعم جداً والنتيجة استمرت لأشهر',
    service_name: 'علاج الكيراتين',
    created_at: '2024-01-06T11:00:00Z',
    helpful_count: 16
  },

  // Reviews for Aura Wellness Center (Provider 6)
  {
    id: 'r12',
    provider_id: '6',
    user_id: 'u12',
    user_name: 'Tala Nasser',
    user_avatar: 'https://via.placeholder.com/50x50/FF8FAB/FFFFFF?text=TN',
    rating: 5,
    comment: 'The aromatherapy massage was heavenly! Such a peaceful environment and skilled therapists. Will definitely return!',
    service_name: 'Aromatherapy Massage',
    created_at: '2024-01-19T17:45:00Z',
    helpful_count: 28
  },
  {
    id: 'r13',
    provider_id: '6',
    user_id: 'u13',
    user_name: 'ليلى الحسيني',
    user_avatar: 'https://via.placeholder.com/50x50/FFC2D1/FFFFFF?text=LH',
    rating: 4,
    comment: 'مركز رائع للاسترخاء. العلاج بالطين كان مفيد جداً للبشرة. الأسعار مرتفعة قليلاً لكن الجودة ممتازة',
    service_name: 'لف الجسم للتخلص من السموم',
    created_at: '2024-01-11T13:30:00Z',
    helpful_count: 14
  }
];