export interface ServiceItem {
  id: string;
  provider_id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  category: string;
  price: number;
  duration_minutes: number;
  is_popular: boolean;
  discount_percentage?: number;
  image_url?: string;
}

export const mockServices: ServiceItem[] = [
  // Rose Beauty Salon Services (Provider 1)
  {
    id: 's1',
    provider_id: '1',
    name_en: 'Classic Haircut & Style',
    name_ar: 'قص وتصفيف كلاسيكي',
    description_en: 'Professional haircut with wash, blow-dry and styling',
    description_ar: 'قص شعر احترافي مع غسيل وتجفيف وتصفيف',
    category: 'hair',
    price: 25,
    duration_minutes: 60,
    is_popular: true,
    image_url: 'https://via.placeholder.com/200x200/FF8FAB/FFFFFF?text=Haircut'
  },
  {
    id: 's2',
    provider_id: '1',
    name_en: 'Hair Color & Highlights',
    name_ar: 'صبغة وهايلايت',
    description_en: 'Full hair coloring or highlights with premium products',
    description_ar: 'صبغة كاملة أو هايلايت بمنتجات فاخرة',
    category: 'hair',
    price: 80,
    duration_minutes: 120,
    is_popular: true,
    discount_percentage: 15,
    image_url: 'https://via.placeholder.com/200x200/FFC2D1/FFFFFF?text=Hair+Color'
  },
  {
    id: 's3',
    provider_id: '1',
    name_en: 'Bridal Makeup Package',
    name_ar: 'باقة مكياج العروس',
    description_en: 'Complete bridal makeup with trial session included',
    description_ar: 'مكياج عروس كامل مع جلسة تجريبية',
    category: 'makeup',
    price: 150,
    duration_minutes: 180,
    is_popular: true,
    image_url: 'https://via.placeholder.com/200x200/FFB3C6/FFFFFF?text=Bridal'
  },
  {
    id: 's4',
    provider_id: '1',
    name_en: 'Gel Manicure',
    name_ar: 'مانيكير جل',
    description_en: 'Long-lasting gel polish manicure with nail art options',
    description_ar: 'مانيكير بطلاء الجل طويل الأمد مع خيارات فن الأظافر',
    category: 'nails',
    price: 30,
    duration_minutes: 45,
    is_popular: false,
    image_url: 'https://via.placeholder.com/200x200/FFE5EC/50373E?text=Manicure'
  },
  {
    id: 's5',
    provider_id: '1',
    name_en: 'Deep Cleansing Facial',
    name_ar: 'تنظيف عميق للوجه',
    description_en: 'Professional facial with extraction and hydration',
    description_ar: 'علاج احترافي للوجه مع الاستخراج والترطيب',
    category: 'skincare',
    price: 45,
    duration_minutes: 60,
    is_popular: true,
    image_url: 'https://via.placeholder.com/200x200/FF8FAB/FFFFFF?text=Facial'
  },

  // Jasmine Spa Services (Provider 2)
  {
    id: 's6',
    provider_id: '2',
    name_en: 'Traditional Hammam',
    name_ar: 'حمام تقليدي',
    description_en: 'Authentic Moroccan hammam experience with scrub',
    description_ar: 'تجربة حمام مغربي أصيلة مع التقشير',
    category: 'spa',
    price: 75,
    duration_minutes: 90,
    is_popular: true,
    image_url: 'https://via.placeholder.com/200x200/FFB3C6/FFFFFF?text=Hammam'
  },
  {
    id: 's7',
    provider_id: '2',
    name_en: 'Swedish Massage',
    name_ar: 'مساج سويدي',
    description_en: 'Full body relaxation massage with aromatic oils',
    description_ar: 'مساج استرخاء كامل للجسم بالزيوت العطرية',
    category: 'massage',
    price: 60,
    duration_minutes: 60,
    is_popular: true,
    discount_percentage: 20,
    image_url: 'https://via.placeholder.com/200x200/FFC2D1/FFFFFF?text=Massage'
  },
  {
    id: 's8',
    provider_id: '2',
    name_en: 'Hot Stone Therapy',
    name_ar: 'علاج بالحجارة الساخنة',
    description_en: 'Therapeutic massage using heated volcanic stones',
    description_ar: 'تدليك علاجي باستخدام الأحجار البركانية الساخنة',
    category: 'massage',
    price: 85,
    duration_minutes: 75,
    is_popular: false,
    image_url: 'https://via.placeholder.com/200x200/FFE5EC/50373E?text=Hot+Stone'
  },
  {
    id: 's9',
    provider_id: '2',
    name_en: 'Anti-Aging Facial',
    name_ar: 'علاج مضاد للشيخوخة',
    description_en: 'Advanced facial treatment with collagen boost',
    description_ar: 'علاج متقدم للوجه مع تعزيز الكولاجين',
    category: 'skincare',
    price: 95,
    duration_minutes: 90,
    is_popular: true,
    image_url: 'https://via.placeholder.com/200x200/FF8FAB/FFFFFF?text=Anti-Aging'
  },

  // Cleopatra Nails Services (Provider 3)
  {
    id: 's10',
    provider_id: '3',
    name_en: 'Nail Art Design',
    name_ar: 'تصميم فن الأظافر',
    description_en: 'Creative nail art with custom designs and gems',
    description_ar: 'فن أظافر إبداعي مع تصاميم مخصصة وأحجار كريمة',
    category: 'nails',
    price: 40,
    duration_minutes: 60,
    is_popular: true,
    image_url: 'https://via.placeholder.com/200x200/FF8FAB/FFFFFF?text=Nail+Art'
  },
  {
    id: 's11',
    provider_id: '3',
    name_en: 'Luxury Pedicure',
    name_ar: 'باديكير فاخر',
    description_en: 'Spa pedicure with massage and paraffin treatment',
    description_ar: 'باديكير سبا مع تدليك وعلاج بالبارافين',
    category: 'nails',
    price: 35,
    duration_minutes: 50,
    is_popular: true,
    discount_percentage: 10,
    image_url: 'https://via.placeholder.com/200x200/FFC2D1/FFFFFF?text=Pedicure'
  },
  {
    id: 's12',
    provider_id: '3',
    name_en: 'Acrylic Extensions',
    name_ar: 'تركيبات أكريليك',
    description_en: 'Professional acrylic nail extensions with shaping',
    description_ar: 'تركيبات أظافر أكريليك احترافية مع التشكيل',
    category: 'nails',
    price: 55,
    duration_minutes: 90,
    is_popular: false,
    image_url: 'https://via.placeholder.com/200x200/FFB3C6/FFFFFF?text=Extensions'
  },

  // Lana Makeup Artist Services (Provider 4)
  {
    id: 's13',
    provider_id: '4',
    name_en: 'Evening Makeup',
    name_ar: 'مكياج سهرة',
    description_en: 'Glamorous makeup for special occasions',
    description_ar: 'مكياج ساحر للمناسبات الخاصة',
    category: 'makeup',
    price: 60,
    duration_minutes: 60,
    is_popular: true,
    image_url: 'https://via.placeholder.com/200x200/FFE5EC/50373E?text=Evening'
  },
  {
    id: 's14',
    provider_id: '4',
    name_en: 'Makeup Lesson',
    name_ar: 'درس مكياج',
    description_en: 'Personal makeup tutorial with product recommendations',
    description_ar: 'درس مكياج شخصي مع توصيات للمنتجات',
    category: 'makeup',
    price: 80,
    duration_minutes: 90,
    is_popular: false,
    image_url: 'https://via.placeholder.com/200x200/FF8FAB/FFFFFF?text=Lesson'
  },
  {
    id: 's15',
    provider_id: '4',
    name_en: 'Bridal Trial',
    name_ar: 'تجربة مكياج العروس',
    description_en: 'Complete bridal makeup trial session',
    description_ar: 'جلسة تجربة كاملة لمكياج العروس',
    category: 'makeup',
    price: 100,
    duration_minutes: 120,
    is_popular: true,
    image_url: 'https://via.placeholder.com/200x200/FFC2D1/FFFFFF?text=Trial'
  },

  // Bloom Hair & Beauty Services (Provider 5)
  {
    id: 's16',
    provider_id: '5',
    name_en: 'Balayage Hair Color',
    name_ar: 'صبغة بالاياج',
    description_en: 'Hand-painted highlights for natural sun-kissed look',
    description_ar: 'هايلايت مرسوم يدوياً لمظهر طبيعي مشمس',
    category: 'hair',
    price: 120,
    duration_minutes: 180,
    is_popular: true,
    discount_percentage: 25,
    image_url: 'https://via.placeholder.com/200x200/FFB3C6/FFFFFF?text=Balayage'
  },
  {
    id: 's17',
    provider_id: '5',
    name_en: 'Keratin Treatment',
    name_ar: 'علاج الكيراتين',
    description_en: 'Professional keratin smoothing treatment',
    description_ar: 'علاج احترافي لتنعيم الشعر بالكيراتين',
    category: 'hair',
    price: 150,
    duration_minutes: 150,
    is_popular: true,
    image_url: 'https://via.placeholder.com/200x200/FFE5EC/50373E?text=Keratin'
  },
  {
    id: 's18',
    provider_id: '5',
    name_en: 'Hair Botox',
    name_ar: 'بوتوكس الشعر',
    description_en: 'Deep conditioning treatment for damaged hair',
    description_ar: 'علاج ترطيب عميق للشعر التالف',
    category: 'hair',
    price: 100,
    duration_minutes: 120,
    is_popular: false,
    image_url: 'https://via.placeholder.com/200x200/FF8FAB/FFFFFF?text=Botox'
  },

  // Aura Wellness Center Services (Provider 6)
  {
    id: 's19',
    provider_id: '6',
    name_en: 'Aromatherapy Massage',
    name_ar: 'مساج بالزيوت العطرية',
    description_en: 'Relaxing massage with custom essential oil blend',
    description_ar: 'مساج مريح بمزيج مخصص من الزيوت الأساسية',
    category: 'massage',
    price: 70,
    duration_minutes: 60,
    is_popular: true,
    image_url: 'https://via.placeholder.com/200x200/FFC2D1/FFFFFF?text=Aroma'
  },
  {
    id: 's20',
    provider_id: '6',
    name_en: 'Body Wrap Detox',
    name_ar: 'لف الجسم للتخلص من السموم',
    description_en: 'Detoxifying body wrap with mineral-rich mud',
    description_ar: 'لف الجسم للتخلص من السموم بالطين الغني بالمعادن',
    category: 'body_treatments',
    price: 90,
    duration_minutes: 90,
    is_popular: false,
    discount_percentage: 30,
    image_url: 'https://via.placeholder.com/200x200/FFB3C6/FFFFFF?text=Detox'
  }
];