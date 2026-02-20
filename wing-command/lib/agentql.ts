// ===========================================
// Wing Scout v2 — Mino AI Web Scraper
// Flavor-aware parallel scraping engine
// Uses agent.tinyfish.ai sync endpoint (mino.ai CloudFront blocks POST)
// ===========================================

import { ScrapedRestaurant, WingSpot, AgentQLResponse, PlatformIds, FlavorPersona } from './types';
import { calculateStatus, deduplicateWingSpots, getFlavorPersona, scoreSpotFlavor } from './utils';

// Mino API Configuration — agent.tinyfish.ai is the actual API server
// mino.ai/v1 redirects there but CloudFront blocks POST, so we hit the origin directly
const MINO_API_URL = process.env.AGENTQL_API_URL || 'https://agent.tinyfish.ai/v1/automation/run';
const MINO_API_KEY = process.env.AGENTQL_API_KEY || '';

if (!MINO_API_KEY) {
    console.warn('Warning: MINO API KEY (AGENTQL_API_KEY) not set. Scraping will be disabled.');
}

// Timeout helper
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
            console.warn(`Operation timed out after ${timeoutMs}ms`);
            resolve(fallback);
        }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

// Render has unlimited runtime, but individual scraper calls still need per-source limits
const SCRAPER_TIMEOUT = 120000; // 120 seconds per source (restaurant discovery)
const MENU_SCRAPER_TIMEOUT = 45000; // 45 seconds for menu fetch (must fit inside maxDuration=60)

interface MinoSyncResponse {
    run_id: string;
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
    started_at: string;
    finished_at: string;
    num_of_steps: number;
    result: unknown;
    error: string | null;
}

/**
 * Core Mino scrape function with configurable timeout
 * Exported for use by deals scraper
 */
export async function runMinoScrape(url: string, goal: string, timeoutMs: number): Promise<AgentQLResponse> {
    if (!MINO_API_KEY) {
        console.error('Mino API key not configured');
        return { success: false, data: null, error: 'MINO API KEY not configured' };
    }

    try {
        console.log(`Mino scraping (${timeoutMs}ms timeout): ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(MINO_API_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': MINO_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, goal }),
            signal: controller.signal,
            cache: 'no-store',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Mino HTTP ${response.status}:`, errText.substring(0, 200));
            return { success: false, data: null, error: `HTTP ${response.status}: ${errText.substring(0, 200)}` };
        }

        const data = await response.json() as MinoSyncResponse;

        if (data.error) {
            console.error('Mino error:', data.error);
            return { success: false, data: null, error: data.error };
        }

        if (data.status === 'COMPLETED' && data.result) {
            console.log(`Mino COMPLETED (${data.num_of_steps} steps, ${data.run_id})`);
            return { success: true, data: data.result };
        }

        console.error(`Mino status: ${data.status}, no result`);
        return { success: false, data: null, error: `Mino status: ${data.status}` };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('abort')) {
            console.error(`Mino timeout after ${timeoutMs}ms for: ${url}`);
        } else {
            console.error('Mino API error:', errorMessage);
        }
        return { success: false, data: null, error: errorMessage };
    }
}

/**
 * Execute Mino scrape for restaurant discovery (120s timeout)
 */
export async function executeMinoScrape(url: string, goal: string): Promise<AgentQLResponse> {
    return runMinoScrape(url, goal, SCRAPER_TIMEOUT);
}

/**
 * Execute Mino scrape for menu extraction (45s timeout)
 * Shorter timeout to fit within the /api/menu maxDuration=60s limit
 */
export async function executeMinoMenuScrape(url: string, goal: string): Promise<AgentQLResponse> {
    return runMinoScrape(url, goal, MENU_SCRAPER_TIMEOUT);
}

// ===== DOORDASH SCRAPER =====
export async function scrapeDoorDash(zipCode: string, city?: string, state?: string): Promise<ScrapedRestaurant[]> {
    const restaurants: ScrapedRestaurant[] = [];
    const locationHint = city && state ? ` in ${city}, ${state}` : '';

    try {
        const citySlug = city ? city.toLowerCase().replace(/\s+/g, '-') : '';
        const searchUrl = citySlug && state
            ? `https://www.doordash.com/food-delivery/${citySlug}-${state.toLowerCase()}-restaurants/chicken-wings/`
            : `https://www.doordash.com/search/store/chicken%20wings%20near%20${zipCode}/?pickup=false`;
        const goal = `Find chicken wings restaurants that deliver to zip code ${zipCode}${locationHint}. IMPORTANT: Only include restaurants located in or delivering to ${city || 'this area'}, ${state || 'US'}. Ignore any results from other cities. Extract a JSON array of restaurants with these fields for each: name, address (full street address if visible, or neighborhood/area name), delivery_time (as string like "25-35 min"), rating (number), image_url, is_open (boolean), store_url (the DoorDash URL path like /store/12345/). Return as JSON array called "restaurants".`;

        const result = await executeMinoScrape(searchUrl, goal);
        if (!result.success || !result.data) return restaurants;

        const data = result.data as { restaurants?: Array<Record<string, unknown>> };
        for (const r of data.restaurants || []) {
            const storeUrl = String(r.store_url || '');
            const storeIdMatch = storeUrl.match(/\/store\/(\d+)/);

            restaurants.push({
                name: String(r.name || 'Unknown'),
                address: String(r.address || ''),
                delivery_time: String(r.delivery_time || ''),
                rating: Number(r.rating) || undefined,
                image_url: String(r.image_url || ''),
                is_open: Boolean(r.is_open),
                source: 'doordash',
                menu_items: [],
                store_id: storeIdMatch ? storeIdMatch[1] : undefined,
                source_url: storeUrl ? `https://www.doordash.com${storeUrl}` : undefined,
            });
        }
        console.log(`DoorDash: Found ${restaurants.length} restaurants`);
    } catch (error) {
        console.error('DoorDash scrape error:', error);
    }

    return restaurants;
}

// ===== UBEREATS SCRAPER =====
export async function scrapeUberEats(zipCode: string, city?: string, state?: string): Promise<ScrapedRestaurant[]> {
    const restaurants: ScrapedRestaurant[] = [];
    const locationHint = city && state ? ` in ${city}, ${state}` : '';

    try {
        const citySlug = city ? city.toLowerCase().replace(/\s+/g, '-') : '';
        const searchUrl = citySlug && state
            ? `https://www.ubereats.com/city/${citySlug}-${state.toLowerCase()}/food-delivery/chicken-wings`
            : `https://www.ubereats.com/search?q=chicken%20wings%20near%20${zipCode}`;
        const goal = `Find chicken wings restaurants that deliver to zip code ${zipCode}${locationHint}. IMPORTANT: Only include restaurants in ${city || 'this area'}, ${state || 'US'}. Ignore results from other cities. Extract a JSON array of stores with these fields for each: name, address, eta (delivery time as string), rating (number), image (image URL), is_available (boolean), store_url (the UberEats URL path like /store/restaurant-name/uuid). Return as JSON array called "stores".`;

        const result = await executeMinoScrape(searchUrl, goal);
        if (!result.success || !result.data) return restaurants;

        const data = result.data as { stores?: Array<Record<string, unknown>> };
        for (const s of data.stores || []) {
            const storeUrl = String(s.store_url || '');
            const uuidMatch = storeUrl.match(/\/store\/[^/]+\/([a-f0-9-]{36})/i);

            restaurants.push({
                name: String(s.name || 'Unknown'),
                address: String(s.address || ''),
                delivery_time: String(s.eta || ''),
                rating: Number(s.rating) || undefined,
                image_url: String(s.image || ''),
                is_open: Boolean(s.is_available),
                source: 'ubereats',
                menu_items: [],
                store_uuid: uuidMatch ? uuidMatch[1] : undefined,
                source_url: storeUrl ? `https://www.ubereats.com${storeUrl}` : undefined,
            });
        }
        console.log(`UberEats: Found ${restaurants.length} restaurants`);
    } catch (error) {
        console.error('UberEats scrape error:', error);
    }

    return restaurants;
}

// ===== GRUBHUB SCRAPER =====
export async function scrapeGrubhub(zipCode: string, city?: string, state?: string): Promise<ScrapedRestaurant[]> {
    const restaurants: ScrapedRestaurant[] = [];
    const locationHint = city && state ? ` in ${city}, ${state}` : '';

    try {
        const searchUrl = city && state
            ? `https://www.grubhub.com/delivery/${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}/chicken-wings`
            : `https://www.grubhub.com/search?query=chicken+wings+near+${zipCode}&locationMode=DELIVERY`;
        const goal = `Find chicken wings restaurants that deliver to zip code ${zipCode}${locationHint}. IMPORTANT: Only include restaurants in ${city || 'this area'}, ${state || 'US'}. Ignore results from other cities. Extract a JSON array of restaurants with these fields for each: name, address, delivery_time (as string), rating (number), image (image URL), is_open (boolean), restaurant_url (the Grubhub URL path like /restaurant/name/12345). Return as JSON array called "restaurants".`;

        const result = await executeMinoScrape(searchUrl, goal);
        if (!result.success || !result.data) return restaurants;

        const data = result.data as { restaurants?: Array<Record<string, unknown>> };
        for (const r of data.restaurants || []) {
            const restaurantUrl = String(r.restaurant_url || '');
            const idMatch = restaurantUrl.match(/\/restaurant\/[^/]+\/(\d+)/);

            restaurants.push({
                name: String(r.name || 'Unknown'),
                address: String(r.address || ''),
                delivery_time: String(r.delivery_time || ''),
                rating: Number(r.rating) || undefined,
                image_url: String(r.image || ''),
                is_open: Boolean(r.is_open),
                source: 'grubhub',
                menu_items: [],
                restaurant_id: idMatch ? idMatch[1] : undefined,
                source_url: restaurantUrl ? `https://www.grubhub.com${restaurantUrl}` : undefined,
            });
        }
        console.log(`Grubhub: Found ${restaurants.length} restaurants`);
    } catch (error) {
        console.error('Grubhub scrape error:', error);
    }

    return restaurants;
}

// ===== GOOGLE SCRAPER (Hidden Gem Detection) =====
export async function scrapeGoogle(zipCode: string, city?: string, state?: string): Promise<ScrapedRestaurant[]> {
    const restaurants: ScrapedRestaurant[] = [];
    const locationQuery = city && state ? `+${city.replace(/\s/g, '+')}+${state}` : '';

    try {
        const searchUrl = `https://www.google.com/search?q=best+chicken+wings+local+sports+bar+${zipCode}${locationQuery}`;
        const goal = `Extract ALL chicken wings restaurants visible on this Google search results page.
IMPORTANT: Only include restaurants located in or near ${city || `zip code ${zipCode}`}, ${state || 'US'}. Ignore any results from other cities or states.
Include local establishments like:
- Family-owned restaurants and pizzerias with wings
- Sports bars and dive bars serving wings
- Local BBQ joints and wing shops
- Small independent restaurants
- Any place serving chicken wings
NOT just major chains like Buffalo Wild Wings, Wingstop, or Hooters.
Return a JSON array called "businesses" with these fields for each restaurant:
- name (restaurant name)
- address (full street address including city and state)
- rating (number like 4.2)
- phone (phone number if visible)
- hours (like "Closed - Opens 11 am" or "Open - Closes 10 pm")
- image (image URL if visible)
- website (the restaurant's official website URL if shown in the Google listing, not a Google link)
Scroll down and extract every restaurant listing. Aim for 10-20+ diverse results including hidden gems and local favorites.`;

        const result = await executeMinoScrape(searchUrl, goal);
        if (!result.success || !result.data) return restaurants;

        const data = result.data as { businesses?: Array<Record<string, unknown>> };
        for (const b of data.businesses || []) {
            const hoursStr = String(b.hours || '');
            const isOpen = !hoursStr.toLowerCase().includes('closed');

            const websiteUrl = String(b.website || '');
            restaurants.push({
                name: String(b.name || 'Unknown'),
                address: String(b.address || ''),
                phone: String(b.phone || ''),
                hours: hoursStr,
                rating: Number(b.rating) || undefined,
                image_url: String(b.image || ''),
                is_open: isOpen,
                source: 'google',
                menu_items: [],
                website_url: websiteUrl && websiteUrl.startsWith('http') ? websiteUrl : undefined,
            });
        }
        console.log(`Google: Found ${restaurants.length} restaurants`);
    } catch (error) {
        console.error('Google scrape error:', error);
    }

    return restaurants;
}

// ===== PROCESS RESTAURANTS INTO WING SPOTS =====
function processRestaurants(
    restaurants: ScrapedRestaurant[],
    zipCode: string,
    lat: number,
    lng: number
): WingSpot[] {
    const wingSpots: WingSpot[] = [];

    for (const restaurant of restaurants) {
        const pricePerWing: number | null = null;
        const cheapestItemPrice: number | null = null;
        const dealText: string | null = null;

        let deliveryMins: number | null = null;
        if (restaurant.delivery_time) {
            const match = restaurant.delivery_time.match(/(\d+)/);
            if (match) deliveryMins = parseInt(match[1], 10);
        }

        const platformIds: PlatformIds = {};
        if (restaurant.store_id) platformIds.doordash_store_id = restaurant.store_id;
        if (restaurant.store_uuid) platformIds.ubereats_store_uuid = restaurant.store_uuid;
        if (restaurant.restaurant_id) platformIds.grubhub_restaurant_id = restaurant.restaurant_id;
        if (restaurant.source_url) platformIds.source_url = restaurant.source_url;
        if (restaurant.website_url) platformIds.website_url = restaurant.website_url;
        if (restaurant.instagram_url) platformIds.instagram_url = restaurant.instagram_url;

        const spot: Omit<WingSpot, 'status'> & { status?: WingSpot['status'] } = {
            id: `${restaurant.source}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: restaurant.name,
            address: restaurant.address,
            lat: lat + (Math.random() - 0.5) * 0.02,
            lng: lng + (Math.random() - 0.5) * 0.02,
            price_per_wing: pricePerWing,
            cheapest_item_price: cheapestItemPrice,
            deal_text: dealText,
            delivery_time_mins: deliveryMins,
            wait_time_mins: null,
            is_in_stock: true,
            is_open_now: restaurant.is_open ?? true,
            opens_during_game: true,
            hours_today: restaurant.hours || '11AM - 11PM',
            phone: restaurant.phone || null,
            image_url: restaurant.image_url && restaurant.image_url.startsWith('http') ? restaurant.image_url : null,
            source: restaurant.source,
            zip_code: zipCode,
            last_updated: new Date().toISOString(),
            platform_ids: Object.keys(platformIds).length > 0 ? platformIds : undefined,
        };

        spot.status = calculateStatus(spot);
        wingSpots.push(spot as WingSpot);
    }

    return wingSpots;
}

// ===== FLAVOR SCORING =====
// Apply flavor persona scoring to all spots
function applyFlavorScoring(spots: WingSpot[], flavorId: FlavorPersona): WingSpot[] {
    const persona = getFlavorPersona(flavorId);
    return spots.map(spot => ({
        ...spot,
        flavor_match: scoreSpotFlavor(spot, persona),
    }));
}

// ===== STATE VALIDATION =====
// Extract a 2-letter state abbreviation from a US address string
function extractStateFromAddress(address: string): string | null {
    if (!address) return null;
    // Match ", CA 90028" or ", NY 10001" pattern
    const matchWithZip = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
    if (matchWithZip) return matchWithZip[1];
    // Match ", CA" at end of string
    const matchEnd = address.match(/,\s*([A-Z]{2})\s*$/);
    if (matchEnd) return matchEnd[1];
    // Match ", California" or ", New York" (full state name → abbreviation)
    const stateNames: Record<string, string> = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
        'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
        'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
        'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
        'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
        'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
        'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
        'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
        'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
        'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
        'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
    };
    const lower = address.toLowerCase();
    for (const [name, abbr] of Object.entries(stateNames)) {
        if (lower.includes(name)) return abbr;
    }
    return null;
}

// Get the state abbreviation for a given state name or abbreviation
function normalizeStateAbbreviation(state: string): string {
    if (state.length === 2) return state.toUpperCase();
    const stateNames: Record<string, string> = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
        'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
        'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
        'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
        'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
        'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
        'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
        'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
        'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
        'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
        'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
    };
    return stateNames[state.toLowerCase()] || state.toUpperCase();
}

// ===== MAIN PARALLEL SCRAPER =====
export async function scrapeAllSources(
    zipCode: string,
    lat: number,
    lng: number,
    flavor?: FlavorPersona,
    city?: string,
    state?: string,
): Promise<WingSpot[]> {
    console.log(`Starting parallel scrape for zip: ${zipCode}${city ? ` (${city}, ${state})` : ''}${flavor ? ` flavor: ${flavor}` : ''}`);

    // Fire all scrapers in parallel with Promise.allSettled
    const results = await Promise.allSettled([
        withTimeout(scrapeGoogle(zipCode, city, state), SCRAPER_TIMEOUT, []),
        withTimeout(scrapeDoorDash(zipCode, city, state), SCRAPER_TIMEOUT, []),
        withTimeout(scrapeGrubhub(zipCode, city, state), SCRAPER_TIMEOUT, []),
        withTimeout(scrapeUberEats(zipCode, city, state), SCRAPER_TIMEOUT, []),
    ]);

    const allRestaurants: ScrapedRestaurant[] = [];
    const sourceNames = ['Google', 'DoorDash', 'Grubhub', 'UberEats'];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`${sourceNames[index]}: ${result.value.length} results`);
            allRestaurants.push(...result.value);
        } else {
            console.error(`${sourceNames[index]} failed:`, result.reason);
        }
    });

    // Process + deduplicate
    let wingSpots = processRestaurants(allRestaurants, zipCode, lat, lng);
    wingSpots = deduplicateWingSpots(wingSpots);

    // Post-scrape state validation: reject results from wrong states/cities
    if (state) {
        const targetState = normalizeStateAbbreviation(state);
        const targetCity = city?.toLowerCase().replace(/\s+/g, '-') || '';
        const beforeCount = wingSpots.length;
        wingSpots = wingSpots.filter(spot => {
            // 1. Check address for state mismatch
            if (spot.address) {
                const spotState = extractStateFromAddress(spot.address);
                if (spotState && spotState !== targetState) {
                    console.warn(`Rejected out-of-state result: "${spot.name}" address="${spot.address}" (${spotState}) — expected ${targetState}`);
                    return false;
                }
                if (spotState === targetState) return true; // Confirmed correct state
            }

            // 2. Check source_url for wrong-city hints (DoorDash URLs contain city like /store/name-los-angeles/)
            const sourceUrl = spot.platform_ids?.source_url || '';
            if (sourceUrl && targetCity) {
                // Known major cities to cross-check against
                const majorCities = [
                    'los-angeles', 'new-york', 'chicago', 'houston', 'phoenix', 'philadelphia',
                    'san-antonio', 'san-diego', 'dallas', 'san-jose', 'austin', 'jacksonville',
                    'fort-worth', 'columbus', 'charlotte', 'san-francisco', 'indianapolis', 'seattle',
                    'denver', 'washington', 'nashville', 'oklahoma-city', 'el-paso', 'boston',
                    'portland', 'las-vegas', 'memphis', 'louisville', 'baltimore', 'milwaukee',
                    'albuquerque', 'tucson', 'fresno', 'mesa', 'sacramento', 'atlanta', 'miami',
                    'detroit', 'minneapolis', 'tampa', 'pittsburgh', 'st-louis', 'orlando',
                ];
                const urlLower = sourceUrl.toLowerCase();
                for (const wrongCity of majorCities) {
                    if (wrongCity !== targetCity && urlLower.includes(wrongCity)) {
                        console.warn(`Rejected wrong-city result: "${spot.name}" URL contains "${wrongCity}" — expected "${targetCity}"`);
                        return false;
                    }
                }
            }

            // 3. No address and no URL city mismatch — keep it (benefit of the doubt)
            return true;
        });
        const rejected = beforeCount - wingSpots.length;
        if (rejected > 0) {
            console.log(`Location validation: rejected ${rejected}/${beforeCount} out-of-area results (target: ${city}, ${targetState})`);
        }
    }

    // Apply flavor scoring if persona selected
    if (flavor) {
        wingSpots = applyFlavorScoring(wingSpots, flavor);
    }

    console.log(`Total: ${allRestaurants.length} raw, ${wingSpots.length} unique after dedup + validation`);

    return wingSpots;
}

// ===== MENU DEDUPLICATION =====
// Normalizes menu item names to intelligently merge across platforms
export function normalizeMenuItem(name: string): string {
    return name
        .toLowerCase()
        .replace(/\d+\s*-?\s*(pc|pcs|piece|pieces|ct|count)/i, '')
        .replace(/\s*(traditional|boneless|bone-in|classic|original)\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function dedupeMenu(
    items: Array<{ name: string; price?: number | null; source?: string }>
): Array<{ name: string; price: number | null; source: string }> {
    const seen = new Map<string, { name: string; price: number | null; source: string }>();

    for (const item of items) {
        const key = normalizeMenuItem(item.name);
        const existing = seen.get(key);

        if (!existing) {
            seen.set(key, { name: item.name, price: item.price ?? null, source: item.source || 'unknown' });
            continue;
        }

        // Keep the entry with the lowest price (win condition)
        const existingPrice = existing.price ?? Infinity;
        const newPrice = item.price ?? Infinity;
        if (newPrice < existingPrice) {
            seen.set(key, { name: item.name, price: item.price ?? null, source: item.source || 'unknown' });
        }
    }

    return Array.from(seen.values());
}
