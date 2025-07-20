// Enhanced Service Management Types

export interface ServiceTag {
  id: string;
  name_en: string;
  name_ar: string;
  category?: string;
  icon?: string;
  color?: string;
  is_system: boolean;
  usage_count: number;
}

export interface ServiceVariation {
  id: string;
  service_id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  price_modifier: number;
  duration_modifier: number;
  sort_order: number;
  is_default: boolean;
  active: boolean;
  metadata?: Record<string, any>;
}

export interface ServiceTemplate {
  id: string;
  category_id: string;
  subcategory?: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  typical_duration_minutes?: number;
  typical_price_min?: number;
  typical_price_max?: number;
  suggested_tags?: string[];
  is_popular: boolean;
  market_segment?: 'budget' | 'standard' | 'premium' | 'luxury';
  gender_specific?: 'unisex' | 'male' | 'female';
  sort_order: number;
}

export interface ServicePackage {
  id: string;
  provider_id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  package_type: 'bundle' | 'subscription' | 'promotional';
  total_duration_minutes: number;
  package_price: number;
  original_price: number;
  discount_percentage: number;
  valid_from?: string;
  valid_until?: string;
  max_bookings?: number;
  bookings_used: number;
  image_url?: string;
  tags?: string[];
  sort_order: number;
  featured: boolean;
  active: boolean;
  services?: PackageService[];
}

export interface PackageService {
  id: string;
  package_id: string;
  service_id: string;
  quantity: number;
  sequence_order: number;
  is_optional: boolean;
  notes?: string;
  service?: EnhancedService;
}

export interface EnhancedService {
  id: string;
  provider_id: string;
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  price: number;
  base_price?: number;
  member_price?: number;
  express_price?: number;
  home_service_price?: number;
  duration_minutes: number;
  preparation_time_minutes?: number;
  cleanup_time_minutes?: number;
  max_advance_booking_days?: number;
  min_advance_booking_hours?: number;
  requires_consultation: boolean;
  allow_parallel_booking: boolean;
  max_parallel_bookings?: number;
  gender_preference: 'unisex' | 'male' | 'female';
  age_restrictions?: {
    min_age?: number;
    max_age?: number;
  };
  prerequisites?: string;
  aftercare_instructions_en?: string;
  aftercare_instructions_ar?: string;
  seo_keywords?: string[];
  featured_until?: string;
  boost_score: number;
  image_urls?: string[];
  video_url?: string;
  booking_count: number;
  last_booked_at?: string;
  popularity_score: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  category?: ServiceCategory;
  tags?: ServiceTag[];
  variations?: ServiceVariation[];
  analytics?: ServiceAnalytics;
}

export interface ServiceCategory {
  id: string;
  name_en: string;
  name_ar: string;
  icon?: string;
  display_order: number;
  active: boolean;
}

export interface ServiceAnalytics {
  bookings_count: number;
  revenue_total: number;
  average_rating: number;
  views_count: number;
  cancellation_rate: number;
  popularity_score: number;
  trends?: {
    date: string;
    bookings: number;
    revenue: number;
  }[];
}

export interface ServiceFilters {
  search?: string;
  category_id?: string;
  status?: 'all' | 'active' | 'inactive';
  price_range?: [number, number];
  tags?: string[];
  gender_preference?: 'all' | 'unisex' | 'male' | 'female';
  sort_by?: 'name' | 'price' | 'popularity' | 'bookings' | 'created';
  sort_order?: 'asc' | 'desc';
}

export interface BulkServiceOperation {
  service_ids: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'update_price' | 'update_category';
  data?: {
    price_adjustment?: number;
    price_adjustment_type?: 'fixed' | 'percentage';
    category_id?: string;
    tags?: string[];
  };
}

export interface ServiceFormData {
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  category_id: string;
  price: number;
  duration_minutes: number;
  gender_preference: 'unisex' | 'male' | 'female';
  tags: string[];
  variations: Omit<ServiceVariation, 'id' | 'service_id'>[];
  image_urls?: string[];
  requires_consultation: boolean;
  allow_parallel_booking: boolean;
  max_parallel_bookings?: number;
  preparation_time_minutes?: number;
  cleanup_time_minutes?: number;
  max_advance_booking_days?: number;
  min_advance_booking_hours?: number;
}

export interface ServicePackageFormData {
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  service_ids: Array<{
    service_id: string;
    quantity?: number;
    sequence_order?: number;
    is_optional?: boolean;
  }>;
  package_price: number;
  package_type?: 'bundle' | 'subscription' | 'promotional';
  valid_from?: string;
  valid_until?: string;
  max_bookings?: number;
  featured?: boolean;
  image_url?: string;
}

// Helper type for service management state
export interface ServiceManagementState {
  services: EnhancedService[];
  packages: ServicePackage[];
  templates: ServiceTemplate[];
  categories: ServiceCategory[];
  tags: ServiceTag[];
  filters: ServiceFilters;
  bulkSelection: string[];
  loading: boolean;
  error: string | null;
}

// Price calculation helpers
export interface PriceCalculation {
  base_price: number;
  modifiers: Array<{
    type: 'variation' | 'express' | 'home_service' | 'member';
    amount: number;
    label: string;
  }>;
  final_price: number;
}

// Duration calculation helpers
export interface DurationCalculation {
  service_duration: number;
  preparation_time: number;
  cleanup_time: number;
  variation_modifier: number;
  total_duration: number;
}

// Service search result
export interface ServiceSearchResult {
  service: EnhancedService;
  provider: {
    id: string;
    business_name: string;
    business_name_ar: string;
    location: {
      latitude: number;
      longitude: number;
    };
    rating: number;
    distance?: number;
  };
  relevance_score: number;
}