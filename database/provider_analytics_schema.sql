-- Provider Analytics and Dashboard Schema
-- This schema supports comprehensive provider analytics, real-time metrics, and gamification

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search and similarity
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE; -- For time-series data (optional but recommended)

-- Reviews table (if not exists)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES providers(id),
    service_id UUID NOT NULL REFERENCES services(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    response TEXT,
    response_at TIMESTAMP WITH TIME ZONE,
    -- Additional fields for analytics
    sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
    aspects JSONB DEFAULT '[]'::jsonb, -- ['cleanliness', 'punctuality', 'skill', 'value']
    is_verified BOOLEAN DEFAULT TRUE, -- Verified completion
    photos TEXT[], -- Review photos
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Provider analytics cache for fast dashboard loading
CREATE TABLE IF NOT EXISTS provider_analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'day', 'week', 'month', 'quarter', 'year'
    
    -- Booking metrics
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    no_show_bookings INTEGER DEFAULT 0,
    
    -- Revenue metrics
    gross_revenue DECIMAL(10,2) DEFAULT 0.00,
    net_revenue DECIMAL(10,2) DEFAULT 0.00,
    platform_fees DECIMAL(10,2) DEFAULT 0.00,
    refunds DECIMAL(10,2) DEFAULT 0.00,
    
    -- Customer metrics
    unique_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    
    -- Rating metrics
    avg_rating DECIMAL(3,2),
    total_reviews INTEGER DEFAULT 0,
    five_star_reviews INTEGER DEFAULT 0,
    
    -- Time metrics
    avg_booking_duration INTEGER, -- minutes
    total_service_hours DECIMAL(10,2),
    busiest_hour INTEGER, -- 0-23
    busiest_day_of_week INTEGER, -- 0-6
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, metric_date, period_type)
);

-- Customer retention metrics
CREATE TABLE IF NOT EXISTS customer_retention_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Visit tracking
    first_visit_date DATE NOT NULL,
    last_visit_date DATE NOT NULL,
    total_visits INTEGER DEFAULT 1,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    
    -- Preferences
    favorite_service_id UUID REFERENCES services(id),
    preferred_time_slot VARCHAR(20), -- 'morning', 'afternoon', 'evening'
    preferred_day_of_week INTEGER[], -- Array of preferred days
    
    -- Engagement
    avg_days_between_visits INTEGER,
    is_vip BOOLEAN DEFAULT FALSE,
    churn_risk_score DECIMAL(3,2), -- 0-1 probability
    last_communication_date DATE,
    
    -- Calculated fields
    lifetime_value DECIMAL(10,2) DEFAULT 0.00,
    segment VARCHAR(20), -- 'new', 'regular', 'vip', 'at_risk', 'lost'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, customer_id)
);

-- Service performance metrics
CREATE TABLE IF NOT EXISTS service_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    
    -- Performance metrics
    bookings_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    cancelled_count INTEGER DEFAULT 0,
    revenue_total DECIMAL(10,2) DEFAULT 0.00,
    
    -- Quality metrics
    avg_rating DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    rebooking_rate DECIMAL(5,2), -- Percentage
    
    -- Efficiency metrics
    avg_duration_minutes INTEGER,
    on_time_rate DECIMAL(5,2), -- Percentage
    
    -- Ranking
    popularity_rank INTEGER, -- Among provider's services
    revenue_rank INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, service_id, metric_date)
);

-- Provider achievements and gamification
CREATE TABLE IF NOT EXISTS provider_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    achievement_level INTEGER DEFAULT 1, -- Bronze=1, Silver=2, Gold=3, Platinum=4
    
    -- Achievement details
    description_en TEXT,
    description_ar TEXT,
    icon_url TEXT,
    points_earned INTEGER DEFAULT 0,
    
    -- Progress tracking
    current_value DECIMAL(10,2),
    target_value DECIMAL(10,2),
    progress_percentage DECIMAL(5,2),
    
    earned_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, achievement_type, achievement_level)
);

-- Revenue summaries for quick access
CREATE TABLE IF NOT EXISTS revenue_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    
    -- Daily totals
    cash_revenue DECIMAL(10,2) DEFAULT 0.00,
    card_revenue DECIMAL(10,2) DEFAULT 0.00,
    wallet_revenue DECIMAL(10,2) DEFAULT 0.00,
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    
    -- Fees and deductions
    platform_fees DECIMAL(10,2) DEFAULT 0.00,
    payment_processing_fees DECIMAL(10,2) DEFAULT 0.00,
    refunds DECIMAL(10,2) DEFAULT 0.00,
    net_revenue DECIMAL(10,2) DEFAULT 0.00,
    
    -- Booking breakdown
    service_revenue DECIMAL(10,2) DEFAULT 0.00,
    product_revenue DECIMAL(10,2) DEFAULT 0.00,
    tip_revenue DECIMAL(10,2) DEFAULT 0.00,
    
    -- Payout status
    payout_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processed', 'paid'
    payout_id UUID,
    payout_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, summary_date)
);

-- Booking patterns for optimization insights
CREATE TABLE IF NOT EXISTS booking_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'weekly', 'seasonal'
    pattern_key VARCHAR(50) NOT NULL, -- e.g., '14' for 2PM, 'monday', 'summer'
    
    -- Metrics
    avg_bookings DECIMAL(10,2) DEFAULT 0,
    avg_revenue DECIMAL(10,2) DEFAULT 0,
    avg_occupancy_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
    peak_score DECIMAL(3,2) DEFAULT 0, -- 0-1, how "peak" this time is
    
    -- Recommendations
    suggested_staff_count INTEGER,
    suggested_price_modifier DECIMAL(5,2), -- Percentage adjustment
    
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, pattern_type, pattern_key)
);

-- Provider performance scores for leaderboards
CREATE TABLE IF NOT EXISTS provider_performance_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    score_month DATE NOT NULL, -- First day of month
    
    -- Individual scores (0-100)
    booking_score DECIMAL(5,2) DEFAULT 0,
    revenue_score DECIMAL(5,2) DEFAULT 0,
    rating_score DECIMAL(5,2) DEFAULT 0,
    response_score DECIMAL(5,2) DEFAULT 0,
    retention_score DECIMAL(5,2) DEFAULT 0,
    
    -- Composite scores
    overall_score DECIMAL(5,2) DEFAULT 0,
    growth_score DECIMAL(5,2) DEFAULT 0, -- Month-over-month improvement
    
    -- Rankings
    city_rank INTEGER,
    category_rank INTEGER,
    overall_rank INTEGER,
    
    -- Badges earned this month
    badges_earned TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, score_month)
);

-- Daily goals and challenges
CREATE TABLE IF NOT EXISTS provider_daily_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    goal_date DATE NOT NULL,
    
    -- Goals
    goals JSONB DEFAULT '[]'::jsonb, /* [{
        type: 'bookings',
        target: 10,
        current: 5,
        reward_points: 50,
        completed: false
    }] */
    
    -- Streaks
    booking_streak INTEGER DEFAULT 0,
    perfect_rating_streak INTEGER DEFAULT 0,
    response_streak INTEGER DEFAULT 0,
    
    -- Points
    points_earned_today INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, goal_date)
);

-- Real-time metrics for live dashboard
CREATE TABLE IF NOT EXISTS provider_realtime_metrics (
    provider_id UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Today's live metrics
    todays_bookings INTEGER DEFAULT 0,
    todays_revenue DECIMAL(10,2) DEFAULT 0.00,
    todays_new_customers INTEGER DEFAULT 0,
    todays_rating_sum INTEGER DEFAULT 0,
    todays_rating_count INTEGER DEFAULT 0,
    
    -- Current status
    is_online BOOLEAN DEFAULT FALSE,
    current_booking_id UUID,
    next_booking_time TIMESTAMP WITH TIME ZONE,
    
    -- Live occupancy
    current_occupancy_rate DECIMAL(5,2) DEFAULT 0,
    available_slots_today INTEGER DEFAULT 0,
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_reviews_provider_date ON reviews(provider_id, created_at DESC);
CREATE INDEX idx_reviews_sentiment ON reviews(provider_id, sentiment) WHERE sentiment IS NOT NULL;
CREATE INDEX idx_analytics_cache_lookup ON provider_analytics_cache(provider_id, period_type, metric_date DESC);
CREATE INDEX idx_retention_metrics_segment ON customer_retention_metrics(provider_id, segment);
CREATE INDEX idx_retention_metrics_churn ON customer_retention_metrics(provider_id, churn_risk_score DESC) WHERE churn_risk_score > 0.7;
CREATE INDEX idx_service_performance_date ON service_performance_metrics(provider_id, metric_date DESC);
CREATE INDEX idx_achievements_active ON provider_achievements(provider_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_revenue_summaries_date ON revenue_summaries(provider_id, summary_date DESC);
CREATE INDEX idx_revenue_summaries_payout ON revenue_summaries(payout_status, provider_id) WHERE payout_status = 'pending';
CREATE INDEX idx_booking_patterns_lookup ON booking_patterns(provider_id, pattern_type);
CREATE INDEX idx_performance_scores_month ON provider_performance_scores(score_month DESC);
CREATE INDEX idx_performance_scores_rank ON provider_performance_scores(overall_rank) WHERE overall_rank IS NOT NULL;
CREATE INDEX idx_daily_goals_date ON provider_daily_goals(provider_id, goal_date DESC);

-- Functions for analytics calculations

-- Function to update provider analytics cache
CREATE OR REPLACE FUNCTION update_provider_analytics_cache(
    p_provider_id UUID,
    p_date DATE,
    p_period_type VARCHAR(20)
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_metrics RECORD;
BEGIN
    -- Determine date range based on period type
    CASE p_period_type
        WHEN 'day' THEN
            v_start_date := p_date;
            v_end_date := p_date;
        WHEN 'week' THEN
            v_start_date := date_trunc('week', p_date);
            v_end_date := v_start_date + INTERVAL '6 days';
        WHEN 'month' THEN
            v_start_date := date_trunc('month', p_date);
            v_end_date := v_start_date + INTERVAL '1 month' - INTERVAL '1 day';
        WHEN 'quarter' THEN
            v_start_date := date_trunc('quarter', p_date);
            v_end_date := v_start_date + INTERVAL '3 months' - INTERVAL '1 day';
        WHEN 'year' THEN
            v_start_date := date_trunc('year', p_date);
            v_end_date := v_start_date + INTERVAL '1 year' - INTERVAL '1 day';
    END CASE;
    
    -- Calculate metrics
    WITH booking_metrics AS (
        SELECT
            COUNT(*) as total_bookings,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
            COUNT(*) FILTER (WHERE status = 'no_show') as no_show_bookings,
            SUM(total_price) as gross_revenue,
            SUM(provider_earnings) as net_revenue,
            SUM(platform_fee) as platform_fees,
            COUNT(DISTINCT user_id) as unique_customers,
            AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60)::INTEGER as avg_duration
        FROM bookings
        WHERE provider_id = p_provider_id
        AND booking_date BETWEEN v_start_date AND v_end_date
    ),
    review_metrics AS (
        SELECT
            AVG(rating)::DECIMAL(3,2) as avg_rating,
            COUNT(*) as total_reviews,
            COUNT(*) FILTER (WHERE rating = 5) as five_star_reviews
        FROM reviews
        WHERE provider_id = p_provider_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
    ),
    customer_metrics AS (
        SELECT
            COUNT(*) FILTER (WHERE is_new) as new_customers
        FROM (
            SELECT 
                user_id,
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY booking_date) = 1 as is_new
            FROM bookings
            WHERE provider_id = p_provider_id
            AND booking_date BETWEEN v_start_date AND v_end_date
        ) t
        WHERE is_new
    )
    INSERT INTO provider_analytics_cache (
        provider_id, metric_date, period_type,
        total_bookings, completed_bookings, cancelled_bookings, no_show_bookings,
        gross_revenue, net_revenue, platform_fees,
        unique_customers, new_customers, returning_customers,
        avg_rating, total_reviews, five_star_reviews,
        avg_booking_duration
    )
    SELECT
        p_provider_id, p_date, p_period_type,
        bm.total_bookings, bm.completed_bookings, bm.cancelled_bookings, bm.no_show_bookings,
        COALESCE(bm.gross_revenue, 0), COALESCE(bm.net_revenue, 0), COALESCE(bm.platform_fees, 0),
        bm.unique_customers, COALESCE(cm.new_customers, 0), 
        bm.unique_customers - COALESCE(cm.new_customers, 0),
        rm.avg_rating, rm.total_reviews, rm.five_star_reviews,
        bm.avg_duration
    FROM booking_metrics bm
    CROSS JOIN review_metrics rm
    CROSS JOIN customer_metrics cm
    ON CONFLICT (provider_id, metric_date, period_type) 
    DO UPDATE SET
        total_bookings = EXCLUDED.total_bookings,
        completed_bookings = EXCLUDED.completed_bookings,
        cancelled_bookings = EXCLUDED.cancelled_bookings,
        no_show_bookings = EXCLUDED.no_show_bookings,
        gross_revenue = EXCLUDED.gross_revenue,
        net_revenue = EXCLUDED.net_revenue,
        platform_fees = EXCLUDED.platform_fees,
        unique_customers = EXCLUDED.unique_customers,
        new_customers = EXCLUDED.new_customers,
        returning_customers = EXCLUDED.returning_customers,
        avg_rating = EXCLUDED.avg_rating,
        total_reviews = EXCLUDED.total_reviews,
        five_star_reviews = EXCLUDED.five_star_reviews,
        avg_booking_duration = EXCLUDED.avg_booking_duration,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- Function to calculate customer lifetime value
CREATE OR REPLACE FUNCTION calculate_customer_lifetime_value(
    p_provider_id UUID,
    p_customer_id UUID
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_spent DECIMAL(10,2);
    v_visit_count INTEGER;
    v_months_active INTEGER;
    v_avg_monthly_value DECIMAL(10,2);
    v_predicted_lifetime_months INTEGER := 24; -- Default 2 years
BEGIN
    -- Get historical data
    SELECT 
        COALESCE(SUM(total_price), 0),
        COUNT(*),
        EXTRACT(MONTH FROM AGE(MAX(booking_date), MIN(booking_date))) + 1
    INTO v_total_spent, v_visit_count, v_months_active
    FROM bookings
    WHERE provider_id = p_provider_id
    AND user_id = p_customer_id
    AND status = 'completed';
    
    IF v_months_active > 0 THEN
        v_avg_monthly_value := v_total_spent / v_months_active;
        -- Simple CLV = Average monthly value * Predicted lifetime
        RETURN v_avg_monthly_value * v_predicted_lifetime_months;
    ELSE
        RETURN v_total_spent;
    END IF;
END;
$$;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_provider_achievements(p_provider_id UUID)
RETURNS TABLE(new_achievements TEXT[])
LANGUAGE plpgsql
AS $$
DECLARE
    v_achievements TEXT[] := ARRAY[]::TEXT[];
    v_metrics RECORD;
BEGIN
    -- Get current metrics
    SELECT * INTO v_metrics
    FROM provider_analytics_cache
    WHERE provider_id = p_provider_id
    AND period_type = 'month'
    AND metric_date = date_trunc('month', CURRENT_DATE)
    LIMIT 1;
    
    -- Check various achievement conditions
    
    -- 5-star champion
    IF v_metrics.avg_rating >= 4.8 AND v_metrics.total_reviews >= 10 THEN
        INSERT INTO provider_achievements (
            provider_id, achievement_type, achievement_name, 
            achievement_level, points_earned, earned_at
        ) VALUES (
            p_provider_id, 'rating', '5-Star Champion', 
            CASE 
                WHEN v_metrics.avg_rating >= 4.95 THEN 3
                WHEN v_metrics.avg_rating >= 4.9 THEN 2
                ELSE 1
            END,
            100, CURRENT_TIMESTAMP
        )
        ON CONFLICT (provider_id, achievement_type, achievement_level) DO NOTHING
        RETURNING achievement_name INTO v_achievements[array_length(v_achievements, 1) + 1];
    END IF;
    
    -- Revenue milestone
    IF v_metrics.gross_revenue >= 10000 THEN
        INSERT INTO provider_achievements (
            provider_id, achievement_type, achievement_name,
            achievement_level, points_earned, earned_at
        ) VALUES (
            p_provider_id, 'revenue', 'Revenue Master',
            CASE
                WHEN v_metrics.gross_revenue >= 50000 THEN 4
                WHEN v_metrics.gross_revenue >= 25000 THEN 3
                WHEN v_metrics.gross_revenue >= 15000 THEN 2
                ELSE 1
            END,
            500, CURRENT_TIMESTAMP
        )
        ON CONFLICT (provider_id, achievement_type, achievement_level) DO NOTHING
        RETURNING achievement_name INTO v_achievements[array_length(v_achievements, 1) + 1];
    END IF;
    
    RETURN QUERY SELECT v_achievements;
END;
$$;

-- Triggers for real-time updates

-- Update realtime metrics on booking changes
CREATE OR REPLACE FUNCTION update_realtime_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        -- Update today's metrics
        UPDATE provider_realtime_metrics
        SET 
            todays_bookings = todays_bookings + 
                CASE WHEN NEW.booking_date = CURRENT_DATE THEN 1 ELSE 0 END,
            todays_revenue = todays_revenue + 
                CASE WHEN NEW.booking_date = CURRENT_DATE AND NEW.status = 'completed' 
                THEN NEW.total_price ELSE 0 END,
            last_updated = CURRENT_TIMESTAMP
        WHERE provider_id = NEW.provider_id;
        
        -- Create entry if doesn't exist
        IF NOT FOUND THEN
            INSERT INTO provider_realtime_metrics (provider_id)
            VALUES (NEW.provider_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_realtime_metrics
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_realtime_metrics();

-- Update review sentiment on insert
CREATE OR REPLACE FUNCTION analyze_review_sentiment()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple sentiment analysis based on rating and keywords
    IF NEW.rating >= 4 THEN
        NEW.sentiment := 'positive';
    ELSIF NEW.rating = 3 THEN
        NEW.sentiment := 'neutral';
    ELSE
        NEW.sentiment := 'negative';
    END IF;
    
    -- Extract aspects from comment (simplified)
    IF NEW.comment IS NOT NULL THEN
        NEW.aspects := '[]'::jsonb;
        IF NEW.comment ~* 'clean|tidy|hygiene' THEN
            NEW.aspects := NEW.aspects || '"cleanliness"'::jsonb;
        END IF;
        IF NEW.comment ~* 'time|late|early|punctual' THEN
            NEW.aspects := NEW.aspects || '"punctuality"'::jsonb;
        END IF;
        IF NEW.comment ~* 'skill|professional|expert' THEN
            NEW.aspects := NEW.aspects || '"skill"'::jsonb;
        END IF;
        IF NEW.comment ~* 'price|value|worth|expensive|cheap' THEN
            NEW.aspects := NEW.aspects || '"value"'::jsonb;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_analyze_review_sentiment
BEFORE INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION analyze_review_sentiment();

-- Update timestamp triggers
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_cache_updated_at
BEFORE UPDATE ON provider_analytics_cache
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retention_metrics_updated_at
BEFORE UPDATE ON customer_retention_metrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_scores_updated_at
BEFORE UPDATE ON provider_performance_scores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_goals_updated_at
BEFORE UPDATE ON provider_daily_goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial data for achievement types
INSERT INTO provider_achievements (
    provider_id, achievement_type, achievement_name, 
    description_en, description_ar, icon_url, points_earned
)
SELECT 
    p.id,
    'welcome',
    'Welcome to BeautyCort',
    'Joined the BeautyCort family',
    'انضم إلى عائلة BeautyCort',
    '/icons/welcome.png',
    50
FROM providers p
WHERE NOT EXISTS (
    SELECT 1 FROM provider_achievements 
    WHERE provider_id = p.id AND achievement_type = 'welcome'
);

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Provider analytics schema created successfully with comprehensive metrics and gamification!';
END$$;