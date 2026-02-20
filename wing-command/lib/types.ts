// ===========================================
// Wing Scout v2 — Type Definitions
// "Super Bowl War Room" Edition
// ===========================================

/**
 * Flavor Persona — user selects before searching
 */
export type FlavorPersona = 'face-melter' | 'classicist' | 'sticky-finger';

export interface FlavorPersonaInfo {
    id: FlavorPersona;
    label: string;
    subtitle: string;
    keywords: string[];
    emoji: string;
    color: string;
}

/**
 * Source platform for wing data
 */
export type WingSource = 'doordash' | 'ubereats' | 'grubhub' | 'google';

/**
 * Pin status color
 */
export type WingStatus = 'green' | 'yellow' | 'red';

/**
 * Main wing spot data structure
 */
export interface WingSpot {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    price_per_wing: number | null;
    cheapest_item_price: number | null;
    estimated_price_per_wing?: number | null;  // Chain lookup or zip-average estimate
    is_price_estimated?: boolean;               // True = price is an estimate, not real
    deal_text: string | null;
    delivery_time_mins: number | null;
    wait_time_mins: number | null;
    is_in_stock: boolean;
    is_open_now: boolean;
    opens_during_game: boolean;
    hours_today: string | null;
    phone: string | null;
    image_url: string | null;
    source: WingSource;
    status: WingStatus;
    zip_code: string;
    last_updated: string;
    created_at?: string;
    platform_ids?: PlatformIds;
    // v2 additions
    flavor_tags?: string[];
    flavor_match?: number; // 0-100 score against selected persona
    menu_json?: MenuItemRaw[];
}

/**
 * Geocoded location data
 */
export interface GeocodedLocation {
    zip_code: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
    cached_at?: string;
}

/**
 * Scrape queue item
 */
export interface ScrapeQueueItem {
    id: string;
    zip_code: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    created_at: string;
    started_at?: string;
    completed_at?: string;
    error?: string;
}

/**
 * Scout API response (v2 — includes flavor)
 */
export interface ScoutResponse {
    success: boolean;
    spots: WingSpot[];
    cached: boolean;
    message: string;
    location?: GeocodedLocation;
    flavor?: FlavorPersona;
}

// Keep ScrapeResponse as alias for backwards compat
export type ScrapeResponse = ScoutResponse;

/**
 * Raw menu item from scraping
 */
export interface MenuItemRaw {
    name: string;
    description?: string;
    price: number | null;
    quantity?: number;
    price_per_wing?: number;
    is_deal: boolean;
    flavor_tags?: string[];
}

/**
 * Menu item extracted from OCR / scraping
 */
export interface MenuItem {
    name: string;
    description?: string;
    price: number | null;
    quantity?: number;
    price_per_wing?: number;
    is_deal: boolean;
}

/**
 * Platform-specific identifiers for menu lookups
 */
export interface PlatformIds {
    doordash_store_id?: string;
    ubereats_store_uuid?: string;
    grubhub_restaurant_id?: string;
    source_url?: string;
    website_url?: string;
    instagram_url?: string;
}

/**
 * Menu section (e.g., "Wings", "Appetizers")
 */
export interface MenuSection {
    name: string;
    items: MenuItem[];
}

/**
 * Result from getCheapestWingPrice() — both per-wing and raw item price
 */
export interface WingPriceResult {
    price_per_wing: number | null;      // Calculated per-wing price (e.g., $1.30)
    cheapest_item_price: number | null;  // Raw cheapest menu item price (e.g., $12.99)
}

/**
 * Full menu structure
 */
export interface Menu {
    spot_id: string;
    sections: MenuSection[];
    fetched_at: string;
    source: 'yelp' | 'mino_scrape' | 'cached';
    has_wings: boolean;
    wing_section_index?: number;
    source_url?: string;
}

/**
 * Menu API response
 */
export interface MenuResponse {
    success: boolean;
    menu: Menu | null;
    cached: boolean;
    message: string;
    scouting?: boolean; // true when menu is being fetched in the background
    source_url?: string; // link to restaurant's page (DoorDash, UberEats, etc.)
}

/**
 * Scraped restaurant data (raw from scraper)
 */
export interface ScrapedRestaurant {
    name: string;
    address: string;
    phone?: string;
    hours?: string;
    delivery_time?: string;
    delivery_fee?: string;
    rating?: number;
    image_url?: string;
    menu_items: MenuItem[];
    is_open?: boolean;
    source: WingSource;
    store_id?: string;
    store_uuid?: string;
    restaurant_id?: string;
    source_url?: string;
    website_url?: string;
    instagram_url?: string;
}

/**
 * AgentQL scrape request
 */
export interface AgentQLRequest {
    url: string;
    query: string;
    wait_for_selector?: string;
    timeout?: number;
    user_agent?: string;
}

/**
 * AgentQL scrape response
 */
export interface AgentQLResponse {
    success: boolean;
    data: unknown;
    screenshot?: string;
    error?: string;
}

/**
 * Map viewport state
 */
export interface MapViewport {
    latitude: number;
    longitude: number;
    zoom: number;
}

/**
 * Popular city for autocomplete
 */
export interface PopularCity {
    name: string;
    state: string;
    zip: string;
}

/**
 * Countdown timer state
 */
export interface CountdownTime {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
}

/**
 * Availability statistics
 */
export interface AvailabilityStats {
    total: number;
    green: number;
    yellow: number;
    red: number;
    percentage: number;
}

/**
 * Super Bowl deal found via aggregator roundup, restaurant website, or social media
 */
export interface SuperBowlDeal {
    description: string;
    source: 'website' | 'instagram' | 'aggregator';
    promo_code?: string;
    pre_order_deadline?: string;
    pre_order_url?: string;
    special_menu_items?: string[];
}

/**
 * Aggregator deal — intermediate structure from scraping deal roundup pages.
 * Groups deals by restaurant name before matching to specific WingSpots.
 */
export interface AggregatorDeal {
    restaurant_name: string;
    deals: SuperBowlDeal[];
}

/**
 * Deals API response
 */
export interface DealsResponse {
    success: boolean;
    deals: SuperBowlDeal[];
    cached: boolean;
    message: string;
    scouting?: boolean; // true when deals are being fetched in the background
}

/**
 * Supabase database row types
 */
export interface Database {
    public: {
        Tables: {
            wing_spots: {
                Row: WingSpot;
                Insert: Omit<WingSpot, 'id' | 'created_at'>;
                Update: Partial<Omit<WingSpot, 'id'>>;
            };
            geocode_cache: {
                Row: GeocodedLocation;
                Insert: GeocodedLocation;
                Update: Partial<GeocodedLocation>;
            };
            scrape_queue: {
                Row: ScrapeQueueItem;
                Insert: Omit<ScrapeQueueItem, 'id'>;
                Update: Partial<Omit<ScrapeQueueItem, 'id'>>;
            };
        };
    };
}
