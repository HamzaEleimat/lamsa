# Lamsa Data Seeding Plan - Complete Documentation

## Overview

This comprehensive data seeding plan provides realistic, culturally appropriate test data for the Lamsa platform, covering all business scenarios, edge cases, and performance testing requirements.

## File Structure

### Primary Seeding Scripts

1. **`seed_test_data.sql`** - Foundation data (Providers, Services, Users)
2. **`seed_test_data_part2.sql`** - Transactional data (Bookings, Reviews, Loyalty)
3. **`seed_edge_cases.sql`** - Edge cases and performance testing data

### Execution Order

```bash
# Run in the following sequence:
psql -f database/optimized_schema.sql          # Create schema first
psql -f database/seed_test_data.sql           # Foundation data
psql -f database/seed_test_data_part2.sql     # Transactional data
psql -f database/seed_edge_cases.sql          # Edge cases & performance
```

## Data Categories

### 1. Service Providers (8 Primary + 50 Performance Test)

#### **Premium Providers**
- **Amman Hair Studio** (استوديو عمان للشعر) - Abdoun location, high-end services
- **Advanced Aesthetics Clinic** (عيادة التجميل المتقدمة) - Medical beauty treatments
- **Serenity Spa Amman** (منتجع السكينة عمان) - Luxury spa services

#### **Mid-Range Providers**
- **Nail Art Jordan** (فن الأظافر الأردن) - Rainbow Street, artistic nail services
- **Glamour Makeup Studio** (استوديو جلامور للمكياج) - Mobile makeup artist

#### **Budget-Friendly Providers**
- **Beauty Corner Zarqa** (ركن الجمال الزرقاء) - Affordable family services
- **Quick Nails Sweifieh** (الأظافر السريعة السويفية) - Express services

#### **Mobile Providers**
- **Mobile Hair Artist** (فنانة الشعر المتنقلة) - Home hair services
- **Glamour Makeup Studio** - Event and home makeup

### 2. Service Catalog (30+ Services)

#### **Hair Services** (15-200 JOD)
- Basic cuts (15-25 JOD) to premium bridal packages (150-200 JOD)
- Mobile services with location surcharge
- Treatments, coloring, extensions

#### **Nail Services** (8-45 JOD)
- Express services (8-18 JOD) to premium nail art (35-45 JOD)
- Traditional and gel manicures/pedicures

#### **Beauty Clinic** (95-250 JOD)
- Medical aesthetic treatments
- Laser procedures, injectables
- Professional skincare

#### **Spa & Wellness** (55-130 JOD)
- Individual and couples treatments
- Traditional and modern therapies

### 3. Customer Personas (8 Primary + Edge Cases)

#### **Loyalty Tiers Represented**
- **Bronze:** نور أحمد, Sarah Johnson, مريم حسين, Dana Al-Khatib
- **Silver:** نور أحمد, Jessica Williams
- **Gold:** ليلى الزهراء
- **Platinum:** فاطمة النابلسي (Premium customer with high spend)

#### **Language Preferences**
- Arabic-primary users (75%)
- English-primary users (25%)
- Mixed notification preferences

#### **Behavior Patterns**
- Regular customers with booking history
- Price-sensitive customers
- Premium customers with high-value bookings
- Event-focused customers (weddings, parties)

### 4. Booking Scenarios (15+ Scenarios)

#### **Status Coverage**
- `completed` - Historical bookings with reviews
- `confirmed` - Upcoming appointments
- `pending` - Awaiting provider confirmation
- `cancelled` - Customer/provider cancellations
- `no_show` - Customer didn't arrive
- `refunded` - Payment returned

#### **Payment Methods**
- Credit/debit cards (most common)
- Cash payments
- Loyalty points redemption
- Promotional discounts

#### **Timing Scenarios**
- Same-day bookings
- Advance bookings (up to 30-day limit)
- Recurring appointments
- Emergency cancellations

### 5. Geographic Distribution

#### **Real Jordanian Locations**
- **Amman Districts:** Abdoun, Shmeisani, Sweifieh, Jabal Al-Hussein
- **Other Cities:** Zarqa, Irbid (border testing)
- **Mobile Service Coverage:** 5-50km radius testing

#### **Coordinate Accuracy**
- Real GPS coordinates within Jordan boundaries
- PostGIS constraint validation
- Distance calculation testing

## Edge Cases and Boundary Testing

### 1. **Price Boundaries**
- Minimum: 1.00 JOD (Quick nail file)
- Maximum: 9,999.00 JOD (Premium VIP package)
- Platform fee calculation (15%)

### 2. **Duration Boundaries**
- Minimum: 15 minutes (Express services)
- Maximum: 480 minutes (8-hour VIP packages)
- Booking conflict detection

### 3. **Geographic Boundaries**
- Providers at Jordan borders
- Mobile services at maximum travel radius
- International coordinate rejection

### 4. **Unicode and RTL Testing**
- Arabic text with diacritics
- Mixed language content
- Long Arabic names and descriptions
- Special characters in addresses

### 5. **Business Logic Edge Cases**
- Concurrent booking attempts
- Loyalty points near tier boundaries
- Promotion validation scenarios
- Payment failure handling

## Performance Testing Data

### Large Dataset Generation
- 50+ additional providers across Amman
- 150+ additional services
- Geographic clustering for proximity testing
- Random but realistic data distribution

### Query Performance Scenarios
- Location-based searches with varying radii
- Service filtering with multiple criteria
- Provider rating calculations
- Booking availability checks

## Code Path Testing Coverage

### 1. **Authentication Flows**
```sql
-- Valid Jordanian phone patterns
'+96277XXXXXX' -- Zain
'+96278XXXXXX' -- Orange
'+96279XXXXXX' -- Umniah

-- Invalid patterns trigger constraint violations
-- International numbers, wrong prefixes
```

### 2. **Geospatial Operations**
```sql
-- Within service radius
ST_DWithin(provider_location, user_location, radius_km * 1000)

-- Mobile provider travel radius
-- Distance calculations for search results
-- PostGIS index performance
```

### 3. **Business Logic Validation**
```sql
-- Booking availability checks
check_provider_availability(provider_id, date, time, duration)

-- Loyalty points calculation
calculate_loyalty_points(booking_amount) -- 1 point per JOD

-- Platform fee calculation (15%)
provider_earnings = total_price - (total_price * 0.15)
```

### 4. **Financial Workflows**
```sql
-- Settlement generation (monthly)
-- Promotion discount calculations
-- Refund processing
-- Multi-payment method handling
```

## Data Quality Assurance

### 1. **Referential Integrity**
- All foreign keys properly referenced
- Cascade delete testing
- Orphaned record prevention

### 2. **Constraint Validation**
- Phone number format validation
- Price and rating boundaries
- Date and time logical constraints
- Geographic coordinate validation

### 3. **Business Rule Enforcement**
- Booking conflicts prevented
- Provider availability respected
- Loyalty tier calculations accurate
- Platform fee consistency

## Realistic Data Characteristics

### 1. **Cultural Authenticity**
- Real Jordanian names and locations
- Authentic business naming conventions
- Market-appropriate pricing in JOD
- Cultural service preferences (female-only, etc.)

### 2. **Market Representation**
- Premium, mid-range, and budget providers
- Urban and suburban locations
- Traditional and modern service types
- Seasonal and promotional offerings

### 3. **User Behavior Patterns**
- Realistic booking frequencies
- Authentic review sentiment
- Logical loyalty progression
- Cultural notification preferences

## Testing Recommendations

### 1. **Functional Testing**
```bash
# Test booking creation workflow
# Test geospatial search functionality
# Test loyalty points calculation
# Test promotion validation
```

### 2. **Performance Testing**
```bash
# Load test with 1000+ concurrent searches
# Stress test booking conflict detection
# Test PostGIS query performance
# Validate index effectiveness
```

### 3. **Integration Testing**
```bash
# Test Supabase RLS policies
# Test mobile app API calls
# Test web dashboard functionality
# Test notification systems
```

## Data Maintenance

### 1. **Regular Cleanup**
```sql
-- Clean old notifications (30+ days)
-- Expire old loyalty points (2+ years)
-- Archive completed bookings (1+ year)
```

### 2. **Performance Monitoring**
```sql
-- Monitor slow queries
-- Check index usage
-- Validate constraint performance
-- Review data growth patterns
```

### 3. **Data Refreshing**
```bash
# Re-run seeding scripts for fresh test data
# Update promotional periods
# Refresh performance test datasets
```

## Production Considerations

### 1. **Data Privacy**
- All test emails use example domains
- Phone numbers use reserved test ranges
- No real customer information included

### 2. **Scalability**
- Index optimization for production loads
- Partitioning strategies for large tables
- Archive strategies for historical data

### 3. **Security**
- RLS policies thoroughly tested
- Authentication boundaries validated
- Data access patterns verified

## Sample Data Overview

### Provider Distribution by Category
- **Hair Styling:** 3 providers (Premium, Mobile, Budget)
- **Nail Services:** 2 providers (Artistic, Express)
- **Beauty Clinic:** 1 provider (Medical grade)
- **Spa & Wellness:** 1 provider (Luxury)
- **Makeup Artists:** 1 provider (Mobile + Studio)

### Service Price Distribution
- **Budget Range (1-25 JOD):** 40% of services
- **Mid Range (26-100 JOD):** 45% of services
- **Premium Range (101-250 JOD):** 15% of services

### Customer Loyalty Distribution
- **Bronze (0-499 points):** 50% of users
- **Silver (500-1999 points):** 25% of users
- **Gold (2000-4999 points):** 12.5% of users
- **Platinum (5000+ points):** 12.5% of users

### Geographic Coverage
- **Amman Central:** 60% of providers
- **Amman Suburbs:** 25% of providers
- **Other Cities:** 15% of providers

This comprehensive seeding plan ensures that Lamsa is tested against realistic, diverse, and edge-case scenarios while maintaining cultural authenticity and business logic accuracy.
