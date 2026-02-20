-- ===========================================
-- Wing Scout v2 — Supabase Schema
-- Super Bowl LX War Room Edition
-- ===========================================

-- Enable PostGIS extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ===========================================
-- Wing Spots Table (v2 with flavor_tags + menu_json)
-- ===========================================
CREATE TABLE IF NOT EXISTS wing_spots (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    address         TEXT NOT NULL DEFAULT '',
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    location        GEOGRAPHY(POINT, 4326),  -- PostGIS spatial column

    -- Pricing & Deals
    price_per_wing      DECIMAL(10, 2),
    deal_text           TEXT,

    -- Timing
    delivery_time_mins  INTEGER,
    wait_time_mins      INTEGER,

    -- Availability
    is_in_stock         BOOLEAN NOT NULL DEFAULT true,
    is_open_now         BOOLEAN NOT NULL DEFAULT true,
    opens_during_game   BOOLEAN NOT NULL DEFAULT true,
    hours_today         TEXT,

    -- Contact
    phone               TEXT,
    image_url           TEXT,

    -- Source & Status
    source              TEXT NOT NULL DEFAULT 'google',
    status              TEXT NOT NULL DEFAULT 'yellow',
    zip_code            TEXT NOT NULL,

    -- Platform IDs (for menu fetching)
    platform_ids        JSONB DEFAULT '{}',

    -- v2: Flavor & Menu
    flavor_tags         TEXT[] DEFAULT '{}',
    flavor_match        INTEGER,
    menu_json           JSONB DEFAULT '[]',

    -- Timestamps
    last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for wing_spots
CREATE INDEX IF NOT EXISTS idx_wing_spots_zip ON wing_spots(zip_code);
CREATE INDEX IF NOT EXISTS idx_wing_spots_status ON wing_spots(status);
CREATE INDEX IF NOT EXISTS idx_wing_spots_last_updated ON wing_spots(last_updated);
CREATE INDEX IF NOT EXISTS idx_wing_spots_location ON wing_spots USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_wing_spots_flavor_tags ON wing_spots USING GIN(flavor_tags);

-- Auto-compute PostGIS location from lat/lng
CREATE OR REPLACE FUNCTION update_wing_spot_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::GEOGRAPHY;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_wing_spot_location
    BEFORE INSERT OR UPDATE OF lat, lng ON wing_spots
    FOR EACH ROW
    EXECUTE FUNCTION update_wing_spot_location();

-- ===========================================
-- Geocode Cache
-- ===========================================
CREATE TABLE IF NOT EXISTS geocode_cache (
    zip_code    TEXT PRIMARY KEY,
    city        TEXT NOT NULL DEFAULT 'Unknown',
    state       TEXT NOT NULL DEFAULT 'Unknown',
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    cached_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- Scrape Queue (for background jobs / cron)
-- ===========================================
CREATE TABLE IF NOT EXISTS scrape_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zip_code        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_scrape_queue_status ON scrape_queue(status);

-- ===========================================
-- Menus Table
-- ===========================================
CREATE TABLE IF NOT EXISTS menus (
    spot_id             TEXT PRIMARY KEY REFERENCES wing_spots(id) ON DELETE CASCADE,
    sections            JSONB NOT NULL DEFAULT '[]',
    source              TEXT NOT NULL DEFAULT 'mino_scrape',
    has_wings           BOOLEAN NOT NULL DEFAULT false,
    wing_section_index  INTEGER,
    fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================

-- Enable RLS
ALTER TABLE wing_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- Public read access for wing_spots
CREATE POLICY "Public read wing_spots" ON wing_spots
    FOR SELECT USING (true);

-- Service role full access for wing_spots
CREATE POLICY "Service write wing_spots" ON wing_spots
    FOR ALL USING (true) WITH CHECK (true);

-- Public read access for geocode_cache
CREATE POLICY "Public read geocode_cache" ON geocode_cache
    FOR SELECT USING (true);

-- Service role full access for geocode_cache
CREATE POLICY "Service write geocode_cache" ON geocode_cache
    FOR ALL USING (true) WITH CHECK (true);

-- Service role access for scrape_queue
CREATE POLICY "Service access scrape_queue" ON scrape_queue
    FOR ALL USING (true) WITH CHECK (true);

-- Public read access for menus
CREATE POLICY "Public read menus" ON menus
    FOR SELECT USING (true);

-- Service role full access for menus
CREATE POLICY "Service write menus" ON menus
    FOR ALL USING (true) WITH CHECK (true);
