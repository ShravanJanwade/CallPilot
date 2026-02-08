-- ============================================
-- CallPilot Supabase Database Schema
-- 5 Tables: users, campaigns, providers, calls, bookings
-- ============================================

-- ============================================
-- 1. USERS TABLE
-- Stores authenticated users (Google OAuth)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    google_access_token TEXT,
    google_refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 2. PROVIDERS TABLE
-- Cached provider data from Google Places
-- ============================================
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT NOT NULL,
    category TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    rating DOUBLE PRECISION,
    total_ratings INTEGER,
    is_preferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_providers_place_id ON providers(place_id);
CREATE INDEX idx_providers_category ON providers(category);

-- ============================================
-- 3. CAMPAIGNS TABLE
-- Calling campaigns initiated by users
-- ============================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Service details
    service_type TEXT NOT NULL,
    description TEXT,
    
    -- Date/time preferences
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    time_preference TEXT DEFAULT 'any',
    duration_minutes INTEGER DEFAULT 60,
    
    -- Location
    location_address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    max_distance DOUBLE PRECISION DEFAULT 10.0,
    
    -- Scoring weights
    weights JSONB DEFAULT '{"availability": 0.4, "rating": 0.3, "distance": 0.2, "preference": 0.1}'::jsonb,
    max_providers INTEGER DEFAULT 5,
    preferred_providers JSONB DEFAULT '[]'::jsonb,
    
    -- AI Agent configuration
    agent_config JSONB DEFAULT '{"name": "Alex", "first_message": "", "system_prompt": null}'::jsonb,
    
    -- Status tracking
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- ============================================
-- 4. CALLS TABLE
-- Individual phone calls made during campaigns
-- ============================================
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id),
    
    -- Call status
    status TEXT DEFAULT 'queued',
    
    -- Conversation data
    transcript JSONB DEFAULT '[]'::jsonb,
    offered_slot TEXT,
    
    -- Scoring
    score DOUBLE PRECISION,
    
    -- Timing
    duration_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_campaign_id ON calls(campaign_id);
CREATE INDEX idx_calls_provider_id ON calls(provider_id);
CREATE INDEX idx_calls_status ON calls(status);

-- ============================================
-- 5. BOOKINGS TABLE
-- Confirmed appointments
-- ============================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    provider_id UUID NOT NULL REFERENCES providers(id),
    
    -- Appointment details
    service_type TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    notes TEXT,
    
    -- Google Calendar integration
    calendar_event_id TEXT,
    
    -- Status
    status TEXT DEFAULT 'confirmed',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX idx_bookings_appointment ON bookings(appointment_date, appointment_time);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Users: own data only
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Campaigns: user's own only
CREATE POLICY "Users can manage own campaigns" ON campaigns
    FOR ALL USING (auth.uid() = user_id);

-- Calls: through campaigns ownership
CREATE POLICY "Users can view calls for own campaigns" ON calls
    FOR SELECT USING (
        campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
    );

-- Bookings: user's own only
CREATE POLICY "Users can manage own bookings" ON bookings
    FOR ALL USING (auth.uid() = user_id);

-- Providers: readable by all authenticated, writable by service role
CREATE POLICY "Authenticated can read providers" ON providers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role manages providers" ON providers
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_providers_updated_at
    BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
