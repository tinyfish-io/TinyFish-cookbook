// ===========================================
// Wing Scout - Menu Fetching Service
// Wings-only scraping with background fetch
// Resilient parser for non-standard Mino responses
// ===========================================

import axios from 'axios';
import { Menu, MenuSection, MenuItem, PlatformIds, AgentQLResponse, WingPriceResult } from './types';
import { executeMinoMenuScrape, executeMinoScrape } from './agentql';
import { cacheMenu, cacheChainMenu, clearScoutingLock } from './cache';
import { createServerClient } from './supabase';

/**
 * Result from a menu scrape, including contact info extracted from the page.
 * phone/address are only available when scraping direct platform URLs (DoorDash, etc.)
 */
export interface MenuScrapeResult {
    sections: MenuSection[];
    phone?: string;
    address?: string;
}

/**
 * Main menu fetching function with fallback chain
 * Priority: 1. Yelp Fusion API  2. Mino scraping (45s timeout)
 */
export async function fetchMenu(
    spotId: string,
    name: string,
    address: string,
    platformIds?: PlatformIds
): Promise<Menu | null> {
    // 1. Try Yelp Fusion API (5k/day free tier)
    const yelpMenu = await fetchYelpMenu(name, address);
    if (yelpMenu) {
        return buildMenu(spotId, yelpMenu, 'yelp', platformIds?.source_url);
    }

    // 2. Fallback to Mino scraping (wings-only, 45s timeout)
    const scrapeResult = await scrapeMenuWithMino(name, address, platformIds);
    if (scrapeResult) {
        return buildMenu(spotId, scrapeResult.sections, 'mino_scrape', platformIds?.source_url);
    }

    return null;
}

/**
 * Fetch menu from Yelp Fusion API
 * Note: Yelp free API doesn't include menu items directly,
 * but provides business info and menu_url for potential scraping
 */
async function fetchYelpMenu(
    name: string,
    address: string
): Promise<MenuSection[] | null> {
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
        console.log('Yelp API key not configured, skipping Yelp menu fetch');
        return null;
    }

    try {
        // Search for the business
        const searchResponse = await axios.get('https://api.yelp.com/v3/businesses/search', {
            params: {
                term: name,
                location: address,
                limit: 1,
            },
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            timeout: 5000,
        });

        const business = searchResponse.data.businesses?.[0];
        if (!business?.id) {
            console.log('Yelp: Business not found');
            return null;
        }

        // Note: Yelp Fusion free API doesn't include menu items directly
        // The menu_url field can be used for scraping if needed
        console.log(`Yelp: Found business ${business.id}, but menu data not available in free API`);
        return null;
    } catch (error) {
        console.error('Yelp menu fetch error:', error);
        return null;
    }
}

// ===========================================
// Wings-Only Mino Goal Prompts (strict JSON)
// ===========================================

function getWingsOnlyGoal(hasDirectUrl: boolean): string {
    if (hasDirectUrl) {
        return `Navigate to this restaurant page. Find the menu and extract chicken wing items with prices.

IMPORTANT: Return ONLY a JSON object in this EXACT format:
{"sections": [{"name": "Wings", "items": [{"name": "10pc Wings", "price": 12.99, "quantity": 10}]}], "phone": "+11234567890", "address": "123 Main St"}

Look for these items (in priority order):
1. Wings, buffalo wings, boneless wings, bone-in wings, hot wings, wing combo, wing bucket, wing platter
2. Tenders, chicken tenders, chicken strips, chicken fingers, nuggets, drumettes
3. ANY chicken item with a price (chicken sandwich, fried chicken, chicken basket, etc.)
4. If still nothing, get the cheapest appetizer or starter with a price

Each item needs: name (string), price (number without $), quantity (number if mentioned like "10 pc").
Group into sections by type (e.g. "Wings", "Tenders", "Chicken", "Appetizers").

For phone: Look for a phone number on the page. Include country code.
For address: Look for the restaurant's street address.
If phone/address not visible, omit those fields.

If the menu is not visible at all, return: {"sections": [], "phone": "", "address": ""}
Return ONLY the JSON object. No notes, no descriptions.`;
    }

    return `Find this restaurant on Google Maps. Click on it, look for a Menu tab/section or Overview with prices.

Return ONLY a JSON object:
{"sections": [{"name": "Wings", "items": [{"name": "Buffalo Wings", "price": 12.99, "quantity": 10}]}]}

Look for (priority order):
1. Wing items: wings, buffalo, boneless, bone-in, hot wings, wing platter
2. Chicken items: tenders, strips, nuggets, drumettes, fried chicken
3. ANY food item with a visible price

Each item: name (string), price (number without $), quantity (number if listed).
If no menu/prices found, return: {"sections": []}
Return ONLY the JSON. Be fast.`;
}

// ===========================================
// Resilient Mino Response Parser
// ===========================================

/**
 * Wing-related keywords for item detection
 */
const WING_ITEM_KEYWORDS = [
    'wing', 'wings', 'buffalo', 'boneless', 'bone-in', 'bone in',
    'drumette', 'drumettes', 'tender', 'tenders', 'nugget', 'nuggets',
    'mcnugget', 'mcnuggets',
];

function isWingRelatedText(text: string): boolean {
    const lower = text.toLowerCase();
    return WING_ITEM_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Try to extract menu sections from non-standard Mino response formats.
 * Handles: flat items array, nested menu objects, descriptive summaries, etc.
 */
function extractFromAlternativeFormat(data: unknown): MenuSection[] | null {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;

    // Format B: { items: [{ name, price }] } — flat items array
    if (Array.isArray(obj.items) && obj.items.length > 0) {
        console.log('Mino wing scrape: alternative format — flat items array');
        return [{ name: 'Wings', items: parseItemsArray(obj.items) }];
    }

    // Format B2: { menu_items: [...] } or { menu: [...] }
    const menuItems = obj.menu_items || obj.menu;
    if (Array.isArray(menuItems) && menuItems.length > 0) {
        console.log('Mino wing scrape: alternative format — menu_items/menu array');
        return [{ name: 'Wings', items: parseItemsArray(menuItems) }];
    }

    // Format B3: { menu: { items: [...] } } or { menu: { sections: [...] } }
    if (obj.menu && typeof obj.menu === 'object' && !Array.isArray(obj.menu)) {
        const menuObj = obj.menu as Record<string, unknown>;
        if (Array.isArray(menuObj.sections) && menuObj.sections.length > 0) {
            console.log('Mino wing scrape: alternative format — nested menu.sections');
            return parseSectionsArray(menuObj.sections);
        }
        if (Array.isArray(menuObj.items) && menuObj.items.length > 0) {
            console.log('Mino wing scrape: alternative format — nested menu.items');
            return [{ name: 'Wings', items: parseItemsArray(menuObj.items) }];
        }
    }

    // Format C: Descriptive summary like { restrictions: ["Chicken McNuggets", ...], ... }
    // Try to extract wing-related items from any string arrays in the object
    const wingItems: MenuItem[] = [];
    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            for (const entry of value) {
                if (typeof entry === 'string' && isWingRelatedText(entry)) {
                    wingItems.push({
                        name: entry,
                        price: null,
                        is_deal: detectDeal(entry, ''),
                    });
                } else if (typeof entry === 'object' && entry !== null) {
                    const entryObj = entry as Record<string, unknown>;
                    if (entryObj.name && typeof entryObj.name === 'string' && isWingRelatedText(String(entryObj.name))) {
                        wingItems.push({
                            name: String(entryObj.name),
                            description: entryObj.description ? String(entryObj.description) : undefined,
                            price: entryObj.price ? parseFloat(String(entryObj.price)) : null,
                            quantity: entryObj.quantity ? parseInt(String(entryObj.quantity)) : undefined,
                            is_deal: detectDeal(String(entryObj.name), String(entryObj.description || '')),
                        });
                    }
                }
            }
        }
        // Also check string values that mention wing items
        if (typeof value === 'string' && isWingRelatedText(value) && key !== 'status' && key !== 'note') {
            // Could be "extracted_items": "Chicken McNuggets 10pc - $8.99"
            const priceMatch = value.match(/\$?([\d.]+)/);
            const qtyMatch = value.match(/(\d+)\s*(pc|piece|ct|count)/i);
            wingItems.push({
                name: value.split(/[-–—,]/).map(s => s.trim()).filter(s => isWingRelatedText(s))[0] || value,
                price: priceMatch ? parseFloat(priceMatch[1]) : null,
                quantity: qtyMatch ? parseInt(qtyMatch[1]) : undefined,
                is_deal: detectDeal(value, ''),
            });
        }
    }

    if (wingItems.length > 0) {
        console.log(`Mino wing scrape: alternative format — extracted ${wingItems.length} wing items from descriptive response`);
        return [{ name: 'Wings', items: wingItems }];
    }

    // Format D: Check for any array property with objects that have a "name" field
    for (const value of Object.values(obj)) {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
            const firstItem = value[0] as Record<string, unknown>;
            if ('name' in firstItem) {
                console.log('Mino wing scrape: alternative format — generic named items array');
                const items = parseItemsArray(value);
                if (items.length > 0) return [{ name: 'Wings', items }];
            }
        }
    }

    return null;
}

/**
 * Parse an array of unknown items into MenuItem[]
 */
function parseItemsArray(items: unknown[]): MenuItem[] {
    return items.map((item: unknown) => {
        if (typeof item === 'string') {
            return {
                name: item,
                price: null,
                is_deal: detectDeal(item, ''),
            };
        }
        const itemObj = item as Record<string, unknown>;
        return {
            name: String(itemObj.name || 'Unknown Item'),
            description: itemObj.description ? String(itemObj.description) : undefined,
            price: itemObj.price ? parseFloat(String(itemObj.price)) : null,
            quantity: itemObj.quantity ? parseInt(String(itemObj.quantity)) : undefined,
            price_per_wing: calculatePricePerWing(itemObj.price, itemObj.quantity, String(itemObj.name || '')),
            is_deal: detectDeal(String(itemObj.name || ''), String(itemObj.description || '')),
        };
    });
}

/**
 * Parse a sections array from alternative format
 */
function parseSectionsArray(sections: unknown[]): MenuSection[] {
    return sections.map((section: unknown) => {
        const sectionObj = section as Record<string, unknown>;
        return {
            name: String(sectionObj.name || 'Wings'),
            items: Array.isArray(sectionObj.items) ? parseItemsArray(sectionObj.items) : [],
        };
    });
}

/**
 * Try to extract items from a free-form text string
 */
function extractItemsFromText(text: string): MenuItem[] {
    const items: MenuItem[] = [];
    // Split by common delimiters
    const lines = text.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

    for (const line of lines) {
        if (isWingRelatedText(line)) {
            const priceMatch = line.match(/\$?([\d]+\.[\d]{2})/);
            const qtyMatch = line.match(/(\d+)\s*(pc|piece|ct|count|wings?)/i);
            items.push({
                name: line.replace(/\$[\d.]+/g, '').trim() || line,
                price: priceMatch ? parseFloat(priceMatch[1]) : null,
                quantity: qtyMatch ? parseInt(qtyMatch[1]) : undefined,
                is_deal: detectDeal(line, ''),
            });
        }
    }
    return items;
}

// ===========================================
// Main Mino Scraper
// ===========================================

/**
 * Extract phone and address from a parsed Mino response object.
 * Returns cleaned values or undefined if not found.
 */
function extractContactInfo(data: unknown): { phone?: string; address?: string } {
    if (!data || typeof data !== 'object') return {};
    const obj = data as Record<string, unknown>;

    let phone: string | undefined;
    let address: string | undefined;

    // Extract phone
    if (obj.phone && typeof obj.phone === 'string') {
        const rawPhone = obj.phone.trim();
        // Must look like a phone number (at least 7 digits)
        const digits = rawPhone.replace(/\D/g, '');
        if (digits.length >= 7) {
            phone = rawPhone;
        }
    }

    // Extract address
    if (obj.address && typeof obj.address === 'string') {
        const rawAddr = obj.address.trim();
        // Must be a real address (not empty, not a placeholder)
        if (rawAddr.length > 5 && rawAddr.toLowerCase() !== 'n/a' && rawAddr !== '') {
            address = rawAddr;
        }
    }

    return { phone, address };
}

/**
 * Single scrape attempt: call Mino, parse the response using all available formats.
 * Returns MenuScrapeResult (sections may be empty []) or null on API failure.
 * Also extracts phone and address when available in the response.
 */
async function attemptScrape(
    scrape: (url: string, goal: string) => Promise<AgentQLResponse>,
    url: string,
    goal: string
): Promise<MenuScrapeResult | null> {
    console.log(`Mino wing scrape: ${url}`);
    const result = await scrape(url, goal);

    if (!result.success || !result.data) {
        console.log('Mino wing scrape: No results');
        return null;
    }

    // Mino can return result as a JSON string or a parsed object — handle both
    let parsed: unknown = result.data;
    console.log(`Mino wing scrape: result.data type = ${typeof parsed}`);

    if (typeof parsed === 'string') {
        const trimmed = (parsed as string).trim();
        try {
            parsed = JSON.parse(trimmed);
            console.log('Mino wing scrape: Parsed string result to object');
        } catch {
            // Not valid JSON — try to extract items from the text
            console.log('Mino wing scrape: String is not JSON, trying text extraction');
            const textItems = extractItemsFromText(trimmed);
            if (textItems.length > 0) {
                console.log(`Mino wing scrape: Extracted ${textItems.length} items from text`);
                return { sections: [{ name: 'Wings', items: textItems }] };
            }
            console.log('Mino wing scrape: No extractable items from text response');
            return { sections: [] }; // Empty = "no wings found" (not null = "failed")
        }
    }

    // Extract contact info from the parsed response (phone, address)
    const contact = extractContactInfo(parsed);
    if (contact.phone) console.log(`Mino wing scrape: Found phone: ${contact.phone}`);
    if (contact.address) console.log(`Mino wing scrape: Found address: ${contact.address.substring(0, 50)}`);

    // Standard format: { sections: [...] }
    const data = parsed as { sections?: Array<{ name: string; items: unknown[] }> };
    if (data.sections && Array.isArray(data.sections)) {
        if (data.sections.length === 0) {
            console.log('Mino wing scrape: Returned empty sections array (no wings at this restaurant)');
            return { sections: [], ...contact }; // Mino explicitly said no wings
        }

        // Parse and structure the menu sections
        const sections: MenuSection[] = data.sections.map(section => ({
            name: String(section.name || 'Wings'),
            items: (section.items || []).map((item: unknown) => {
                const itemObj = item as Record<string, unknown>;
                return {
                    name: String(itemObj.name || 'Unknown Item'),
                    description: itemObj.description ? String(itemObj.description) : undefined,
                    price: itemObj.price ? parseFloat(String(itemObj.price)) : null,
                    quantity: itemObj.quantity ? parseInt(String(itemObj.quantity)) : undefined,
                    price_per_wing: calculatePricePerWing(itemObj.price, itemObj.quantity, String(itemObj.name || '')),
                    is_deal: detectDeal(String(itemObj.name || ''), String(itemObj.description || '')),
                };
            }),
        }));

        console.log(`Mino wing scrape: Found ${sections.length} sections (standard format)`);
        return { sections, ...contact };
    }

    // Non-standard format — try alternative extraction
    console.log('Mino wing scrape: No sections found, trying alternative formats...',
        JSON.stringify(data).substring(0, 300));
    const altSections = extractFromAlternativeFormat(parsed);
    if (altSections && altSections.length > 0) {
        return { sections: altSections, ...contact };
    }

    // Mino returned data but nothing we can parse into wing items
    console.log('Mino wing scrape: Could not extract wing items from response');
    return { sections: [], ...contact }; // Empty = "no wings found at this restaurant"
}

/**
 * Scrape wing items from restaurant using Mino.
 * Accepts optional scrape function for timeout flexibility:
 * - Default: executeMinoMenuScrape (45s timeout) for fast path
 * - Background: executeMinoScrape (120s timeout) for background scrape
 *
 * Fallback chain:
 * 1. Try platform URL (Grubhub/DoorDash/UberEats) if available
 * 2. If platform URL returns empty → try Google search for "[name] menu wings"
 * 3. If already on Google (no platform URL) → single attempt only (no loop)
 *
 * Returns MenuScrapeResult (with sections, phone, address) or null on total failure.
 * sections may be empty [] meaning "no wings found" vs null meaning "API failure".
 */
export async function scrapeMenuWithMino(
    name: string,
    address: string,
    platformIds?: PlatformIds,
    scrapeFn?: (url: string, goal: string) => Promise<AgentQLResponse>
): Promise<MenuScrapeResult | null> {
    const scrape = scrapeFn || executeMinoMenuScrape;

    // Determine best URL to scrape: platform URL > website URL > Google Maps fallback
    const hasDirectUrl = !!platformIds?.source_url;
    const hasWebsiteUrl = !!platformIds?.website_url;
    const scrapeUrl = hasDirectUrl
        ? platformIds!.source_url!
        : hasWebsiteUrl
            ? platformIds!.website_url!
            : `https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + address)}`;
    const goal = getWingsOnlyGoal(hasDirectUrl || hasWebsiteUrl);

    try {
        // First attempt: platform URL or Google Maps
        const result = await attemptScrape(scrape, scrapeUrl, goal);

        // If platform URL returned empty sections, try Google search as fallback
        // Only when we used a direct URL (don't loop if already on Google)
        // But preserve contact info from the first attempt
        if (result !== null && result.sections.length === 0 && (hasDirectUrl || hasWebsiteUrl)) {
            console.log(`Mino wing scrape: platform URL returned empty, trying Google search for "${name}"...`);
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(name + ' menu wings')}`;
            const googleGoal = getWingsOnlyGoal(false);
            const googleResult = await attemptScrape(scrape, googleUrl, googleGoal);
            if (googleResult && googleResult.sections.length > 0) {
                console.log(`Mino wing scrape: Google fallback found ${googleResult.sections.length} sections!`);
                // Merge: use Google's sections but keep contact info from platform page
                return {
                    sections: googleResult.sections,
                    phone: result.phone || googleResult.phone,
                    address: result.address || googleResult.address,
                };
            }
            console.log('Mino wing scrape: Google fallback also empty — genuinely no wings');
        }

        return result;
    } catch (error) {
        console.error('Mino wing scrape error:', error);
        return null; // null = actual failure, can retry
    }
}

/**
 * Build a complete Menu object from sections
 */
function buildMenu(
    spotId: string,
    sections: MenuSection[],
    source: 'yelp' | 'mino_scrape',
    sourceUrl?: string
): Menu {
    return {
        spot_id: spotId,
        sections,
        fetched_at: new Date().toISOString(),
        source,
        has_wings: detectWingItems(sections),
        wing_section_index: findWingSectionIndex(sections),
        source_url: sourceUrl,
    };
}

/**
 * Detect if menu sections contain wing items
 */
function detectWingItems(sections: MenuSection[]): boolean {
    const wingKeywords = ['wing', 'wings', 'buffalo', 'boneless', 'drumette'];

    for (const section of sections) {
        for (const item of section.items) {
            const itemText = (item.name + ' ' + (item.description || '')).toLowerCase();
            if (wingKeywords.some(kw => itemText.includes(kw))) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Find the index of the section most likely to contain wings
 */
function findWingSectionIndex(sections: MenuSection[]): number | undefined {
    const wingKeywords = ['wing', 'wings', 'buffalo'];

    // First, look for a section named "Wings" or similar
    for (let i = 0; i < sections.length; i++) {
        if (wingKeywords.some(kw => sections[i].name.toLowerCase().includes(kw))) {
            return i;
        }
    }

    // Otherwise, find section with most wing items
    let maxWingItems = 0;
    let bestIndex: number | undefined;

    for (let i = 0; i < sections.length; i++) {
        const wingCount = sections[i].items.filter(item =>
            wingKeywords.some(kw => item.name.toLowerCase().includes(kw))
        ).length;

        if (wingCount > maxWingItems) {
            maxWingItems = wingCount;
            bestIndex = i;
        }
    }

    return bestIndex;
}

/**
 * Calculate price per wing from item data
 */
function calculatePricePerWing(
    price: unknown,
    quantity: unknown,
    name: string
): number | undefined {
    const priceNum = typeof price === 'string' ? parseFloat(price) : (typeof price === 'number' ? price : undefined);
    let quantityNum = typeof quantity === 'string' ? parseInt(quantity) : (typeof quantity === 'number' ? quantity : undefined);

    // Try to extract quantity from name if not provided
    if (!quantityNum) {
        const match = name.match(/(\d+)\s*(pc|piece|wing|ct|count)/i);
        if (match) {
            quantityNum = parseInt(match[1]);
        }
    }

    if (priceNum && quantityNum && quantityNum > 0) {
        return Math.round((priceNum / quantityNum) * 100) / 100;
    }

    return undefined;
}

/**
 * Detect if item appears to be a deal
 */
function detectDeal(name: string, description?: string): boolean {
    const dealKeywords = ['deal', 'special', 'combo', 'bundle', 'meal', 'discount', 'off', 'save', 'value'];
    const text = (name + ' ' + (description || '')).toLowerCase();
    return dealKeywords.some(kw => text.includes(kw));
}

/**
 * Get the cheapest price per wing AND cheapest raw item price from menu sections.
 * Returns both so we can display per-wing price when available, or raw item price as fallback.
 */
export function getCheapestWingPrice(sections: MenuSection[]): WingPriceResult {
    const WING_KEYWORDS = ['wing', 'wings', 'buffalo', 'boneless', 'drumette', 'tender', 'nugget', 'chicken'];
    let cheapestPerWing: number | null = null;
    let cheapestItem: number | null = null;

    for (const section of sections) {
        for (const item of section.items) {
            // Track cheapest per-wing price (pre-calculated)
            if (item.price_per_wing && item.price_per_wing > 0) {
                if (cheapestPerWing === null || item.price_per_wing < cheapestPerWing) {
                    cheapestPerWing = item.price_per_wing;
                }
            }

            // Track any item with a price
            if (item.price && item.price > 0 && item.price < 100) {
                // For wing-related items, try quantity extraction for per-wing calc
                const text = (item.name + ' ' + (item.description || '')).toLowerCase();
                if (WING_KEYWORDS.some(kw => text.includes(kw))) {
                    const match = item.name.match(/(\d+)\s*(pc|piece|wing|ct|count|pk)/i);
                    if (match) {
                        const qty = parseInt(match[1]);
                        if (qty > 0) {
                            const ppw = Math.round((item.price / qty) * 100) / 100;
                            if (ppw > 0 && ppw < 10) {
                                if (cheapestPerWing === null || ppw < cheapestPerWing) {
                                    cheapestPerWing = ppw;
                                }
                            }
                        }
                    }
                }

                // Always track raw item price as fallback
                if (cheapestItem === null || item.price < cheapestItem) {
                    cheapestItem = item.price;
                }
            }
        }
    }

    return { price_per_wing: cheapestPerWing, cheapest_item_price: cheapestItem };
}

// ===========================================
// Background Menu Scraping
// ===========================================

/**
 * Fire-and-forget background wing scrape.
 * Uses the full 120s Mino timeout via executeMinoScrape.
 * On success, caches the result in Redis + chain cache + Supabase.
 * Redis scouting lock prevents duplicates across serverless instances.
 *
 * Now also caches empty results (no wings) to prevent re-scraping
 * restaurants that genuinely don't have wing items.
 */
export function startBackgroundMenuScrape(
    spotId: string,
    name: string,
    address: string,
    platformIds?: PlatformIds
): void {
    console.log(`Starting background wing scrape for ${spotId}: ${name}`);

    // Fire-and-forget — reuses scrapeMenuWithMino with full 120s timeout
    (async () => {
        try {
            const scrapeResult = await scrapeMenuWithMino(name, address, platformIds, executeMinoScrape);

            // null = total failure (API error, timeout, etc.) — don't cache, allow retry
            if (scrapeResult === null) {
                console.log(`Background scrape: failed for ${spotId} (will allow retry)`);
                return;
            }

            const { sections, phone: scrapedPhone, address: scrapedAddress } = scrapeResult;

            // Empty array = Mino found no wing items at this restaurant — cache to prevent re-scraping
            const menu = buildMenu(spotId, sections, 'mino_scrape', platformIds?.source_url);

            // Cache in Redis (per-spot + chain)
            await cacheMenu(spotId, menu);
            await cacheChainMenu(name, menu);

            // Persist to Supabase
            try {
                const supabase = createServerClient();
                await supabase
                    .from('menus')
                    .upsert({
                        spot_id: spotId,
                        sections: menu.sections,
                        source: menu.source,
                        has_wings: menu.has_wings,
                        wing_section_index: menu.wing_section_index,
                        fetched_at: menu.fetched_at,
                    }, { onConflict: 'spot_id' });

                // Build update payload for wing_spots: prices + phone + address
                const priceResult = getCheapestWingPrice(sections);
                const updatePayload: Record<string, unknown> = {};

                if (priceResult.price_per_wing !== null) {
                    updatePayload.price_per_wing = priceResult.price_per_wing;
                }
                // Note: cheapest_item_price is computed on-the-fly from menu cache,
                // not persisted to Supabase (column may not exist yet)
                if (scrapedPhone) {
                    updatePayload.phone = scrapedPhone;
                }
                if (scrapedAddress) {
                    updatePayload.address = scrapedAddress;
                }

                if (Object.keys(updatePayload).length > 0) {
                    await supabase
                        .from('wing_spots')
                        .update(updatePayload)
                        .eq('id', spotId);
                    const fields = Object.keys(updatePayload).join(', ');
                    console.log(`Background scrape: Updated ${fields} for ${spotId}${priceResult.price_per_wing !== null ? ` (ppw=$${priceResult.price_per_wing.toFixed(2)})` : ''}${scrapedPhone ? ` (phone=${scrapedPhone})` : ''}`);
                }
            } catch (dbErr) {
                console.error('Background scrape: Supabase persist error:', dbErr);
            }

            console.log(`Background scrape SUCCESS for ${spotId}: ${sections.length} sections cached (has_wings: ${menu.has_wings})`);
        } catch (err) {
            console.error(`Background scrape error for ${spotId}:`, err);
        } finally {
            // ALWAYS clear the Redis scouting lock, even on failure
            await clearScoutingLock(spotId);
        }
    })();
}
