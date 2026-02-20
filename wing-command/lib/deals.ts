// ===========================================
// Wing Scout — Super Bowl Deals Scraper
// Aggregator-first approach: scrape deal roundup pages for ALL chains
// then fuzzy-match to specific WingSpots
// Falls back to website-only scrape for local restaurants
// ===========================================

import { SuperBowlDeal, AggregatorDeal, PlatformIds, AgentQLResponse } from './types';
import { runMinoScrape } from './agentql';
import {
    cacheDeals,
    cacheAggregatorDeals,
    clearAggregatorScoutingLock,
    clearDealsScoutingLock,
} from './cache';

// Railway has no runtime limit — generous timeout for aggregator pages
const AGGREGATOR_SCRAPE_TIMEOUT = 180000; // 3 minutes per aggregator page
const FALLBACK_SCRAPE_TIMEOUT = 360000; // 6 minutes for direct website scrape (slow sites)

// ===========================================
// Aggregator Sources — scraped in parallel
// ===========================================

const AGGREGATOR_SOURCES = [
    {
        name: 'KrazyCouponLady',
        url: 'https://thekrazycouponlady.com/tips/money/super-bowl-restaurant-freebies',
    },
    {
        name: 'TODAY',
        url: 'https://www.today.com/food/restaurants/super-bowl-food-deals-2026-rcna255970',
    },
    {
        name: 'BrandEating',
        url: 'https://www.brandeating.com/2026/02/2026-super-bowl-deals-and-specials.html',
    },
];

// ===========================================
// Aggregator Mino Goal Prompt
// ===========================================

const AGGREGATOR_GOAL = `Extract ALL restaurant Super Bowl deals and specials from this page.

Return a JSON object with a "deals" array where each entry has:
- restaurant_name (the restaurant/chain name, e.g. "Buffalo Wild Wings", "Hooters", "Domino's")
- description (full deal text, e.g. "Get 20 free boneless wings with $40 purchase")
- promo_code (any promo/coupon code mentioned, e.g. "KICKOFF26")
- pre_order_deadline (any ordering deadline or validity dates, e.g. "Valid Feb 6-9")

Extract EVERY restaurant deal listed on the page. Include all chains and restaurants mentioned.
If a restaurant has multiple deals, create a separate entry for each deal.
Return the JSON object ONLY, no other text.

If no deals found on this page, return {"deals": []}.`;

// ===========================================
// Name Normalization & Fuzzy Matching
// ===========================================

/**
 * Normalize a restaurant name for fuzzy matching.
 * "Buffalo Wild Wings - Downtown #1234" → "buffalo wild wings"
 * "Hooters of Tampa"                    → "hooters"
 * "Wingstop #456"                       → "wingstop"
 * "Domino's Pizza"                      → "dominos pizza"
 */
export function normalizeRestaurantName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s*#\d+.*$/, '')           // Strip "#1234" store numbers
        .replace(/\s*-\s*.*$/, '')            // Strip " - Downtown" suffixes
        .replace(/\s+of\s+\w+.*$/i, '')      // Strip "of Tampa", "of Chicago"
        .replace(/^the\s+/i, '')             // Strip leading "The"
        .replace(/['''`]/g, '')              // Strip apostrophes (Domino's → Dominos)
        .replace(/[^\w\s]/g, '')             // Strip non-alphanumeric (keep spaces)
        .replace(/\s+/g, ' ')               // Collapse whitespace
        .trim();
}

/**
 * Match aggregator deals to a specific WingSpot by restaurant name.
 * Uses a 2-pass approach:
 * 1. Exact normalized match
 * 2. Substring containment (aggregator "Hooters" matches spot "Hooters of Tampa")
 */
export function matchDealsToSpot(
    spotName: string,
    aggregatorDeals: AggregatorDeal[]
): SuperBowlDeal[] {
    const normalizedSpot = normalizeRestaurantName(spotName);
    if (!normalizedSpot) return [];

    // Pass 1: exact normalized match
    for (const entry of aggregatorDeals) {
        const normalizedAgg = normalizeRestaurantName(entry.restaurant_name);
        if (normalizedAgg === normalizedSpot) {
            return entry.deals;
        }
    }

    // Pass 2: substring containment (either direction)
    for (const entry of aggregatorDeals) {
        const normalizedAgg = normalizeRestaurantName(entry.restaurant_name);
        if (normalizedSpot.includes(normalizedAgg) || normalizedAgg.includes(normalizedSpot)) {
            return entry.deals;
        }
    }

    return [];
}

// ===========================================
// Aggregator Page Scraping
// ===========================================

/**
 * Scrape a single aggregator page and parse into AggregatorDeal[].
 */
async function scrapeAggregatorPage(
    sourceName: string,
    url: string,
): Promise<AggregatorDeal[]> {
    try {
        console.log(`Aggregator: scraping ${sourceName}: ${url}`);
        const result = await runMinoScrape(url, AGGREGATOR_GOAL, AGGREGATOR_SCRAPE_TIMEOUT);
        return parseAggregatorResponse(result);
    } catch (error) {
        console.error(`Aggregator scrape error for ${sourceName}:`, error);
        return [];
    }
}

/**
 * Parse Mino response from aggregator page into AggregatorDeal[].
 * Groups deals by restaurant_name.
 */
function parseAggregatorResponse(result: AgentQLResponse): AggregatorDeal[] {
    if (!result.success || !result.data) return [];

    try {
        const data = result.data as {
            deals?: Array<{
                restaurant_name?: string;
                description?: string;
                promo_code?: string;
                pre_order_deadline?: string;
            }>;
        };

        const rawDeals = data.deals || [];
        if (rawDeals.length === 0) return [];

        // Group by restaurant name
        const grouped = new Map<string, SuperBowlDeal[]>();

        for (const d of rawDeals) {
            const restaurantName = d.restaurant_name ? String(d.restaurant_name).trim() : '';
            const description = d.description ? String(d.description).trim() : '';

            if (!restaurantName || !description) continue;

            if (!grouped.has(restaurantName)) {
                grouped.set(restaurantName, []);
            }

            grouped.get(restaurantName)!.push({
                description,
                source: 'aggregator',
                promo_code: d.promo_code ? String(d.promo_code).trim() : undefined,
                pre_order_deadline: d.pre_order_deadline ? String(d.pre_order_deadline).trim() : undefined,
            });
        }

        // Convert to AggregatorDeal array
        const aggregatorDeals: AggregatorDeal[] = [];
        grouped.forEach((deals, restaurant_name) => {
            aggregatorDeals.push({ restaurant_name, deals });
        });

        console.log(`Aggregator: parsed ${rawDeals.length} deals across ${aggregatorDeals.length} restaurants`);
        return aggregatorDeals;
    } catch (error) {
        console.error('Failed to parse aggregator response:', error);
        return [];
    }
}

/**
 * Merge AggregatorDeal[] from multiple sources.
 * Deduplicates by normalized restaurant name, merging deals.
 */
function mergeAggregatorResults(sources: AggregatorDeal[][]): AggregatorDeal[] {
    const merged = new Map<string, AggregatorDeal>();

    for (const deals of sources) {
        for (const entry of deals) {
            const key = normalizeRestaurantName(entry.restaurant_name);
            if (!key) continue;

            if (merged.has(key)) {
                // Merge deals from this source into existing entry
                const existing = merged.get(key)!;
                const existingDescs = new Set(
                    existing.deals.map(d => d.description.toLowerCase().substring(0, 50))
                );

                // Add non-duplicate deals
                for (const deal of entry.deals) {
                    const descKey = deal.description.toLowerCase().substring(0, 50);
                    if (!existingDescs.has(descKey)) {
                        existing.deals.push(deal);
                        existingDescs.add(descKey);
                    }
                }
            } else {
                merged.set(key, { ...entry });
            }
        }
    }

    return Array.from(merged.values());
}

// ===========================================
// Background Aggregator Scrape (fire-and-forget)
// ===========================================

/**
 * Scrape all 3 aggregator pages in parallel, merge results, cache globally.
 * Called once per 2-hour window — covers ALL chain restaurants.
 */
export function startBackgroundAggregatorScrape(): void {
    console.log('Starting background aggregator deals scrape (3 sources in parallel)');

    (async () => {
        try {
            // Scrape all 3 aggregator pages simultaneously
            const results = await Promise.allSettled(
                AGGREGATOR_SOURCES.map(src => scrapeAggregatorPage(src.name, src.url))
            );

            // Collect successful results
            const successfulResults: AggregatorDeal[][] = [];
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                if (result.status === 'fulfilled' && result.value.length > 0) {
                    console.log(`Aggregator ${AGGREGATOR_SOURCES[i].name}: ${result.value.length} restaurants found`);
                    successfulResults.push(result.value);
                } else if (result.status === 'rejected') {
                    console.error(`Aggregator ${AGGREGATOR_SOURCES[i].name}: failed`, result.reason);
                } else {
                    console.log(`Aggregator ${AGGREGATOR_SOURCES[i].name}: 0 results`);
                }
            }

            // Merge + deduplicate across all sources
            const merged = mergeAggregatorResults(successfulResults);
            console.log(`Aggregator merge: ${merged.length} unique restaurants total`);

            // Cache globally (2-hour TTL) — even empty to prevent re-scraping
            await cacheAggregatorDeals(merged);

            console.log(`Background aggregator scrape SUCCESS: ${merged.length} restaurants cached`);
        } catch (err) {
            console.error('Background aggregator scrape error:', err);
        } finally {
            await clearAggregatorScoutingLock();
        }
    })();
}

// ===========================================
// Per-Restaurant Website-Only Fallback
// ===========================================

/**
 * Scrape a restaurant's website for Super Bowl specials.
 * Used as fallback for local restaurants not found in aggregator data.
 * Website-only (no Instagram) — 1 Mino call instead of 2.
 */
async function scrapeWebsiteForDeals(
    name: string,
    address: string,
    websiteUrl?: string,
): Promise<SuperBowlDeal[]> {
    const url = websiteUrl || `https://www.google.com/search?q=${encodeURIComponent(`${name} ${address} super bowl specials game day deals`)}`;

    const goal = websiteUrl
        ? `Visit this restaurant website and look for ANY Super Bowl specials, game day deals, pre-order information, party platters, catering specials, or limited-time promotions for Super Bowl Sunday (February 8, 2026).
Check: Homepage banners, popups, hero sections, Special/Events/Promotions pages, Catering or Party pages.
Look for: "Super Bowl", "game day", "big game", "SB", "special", "deal", "pre-order", "catering", "party platter", "wings special", "game day bundle".

Return a JSON object with a "deals" array. Each deal should have:
- description (the full deal text, e.g. "$49.99 Big Game Special: 3 large pizzas + 20 wings")
- promo_code (any promo/coupon code if mentioned)
- pre_order_deadline (ordering deadline if mentioned, e.g. "Available through Sunday night")
- pre_order_url (URL to pre-order page if found)
- special_items (array of special menu item names if listed)

If NO Super Bowl or game day deals are found, return {"deals": []}.
Return the JSON object ONLY, no other text.`
        : `Search for Super Bowl deals, game day specials, or promotions for this restaurant.

IMPORTANT: First, read the CURRENT page carefully — look at ALL visible content including:
- Google search result snippets and descriptions
- Social media post previews (Facebook, Instagram) visible in search results
- News article headlines and summaries
- Any mention of deals, specials, promo codes, party platters, or game day offers

If you can see deal information on this page (even in snippets/previews), extract it immediately.
Only click through to another page if NO deal info is visible on the current page.

DO NOT click on Facebook or Instagram links (they require login).
If clicking through, prefer the restaurant's own website, news articles, or food blogs.

Return a JSON object with a "deals" array. Each deal should have:
- description (the full deal text, e.g. "$49.99 Big Game Special: 3 large pizzas + 20 wings")
- promo_code (any promo/coupon code if mentioned)
- pre_order_deadline (ordering deadline if mentioned, e.g. "Available through Sunday night")
- pre_order_url (URL to pre-order page if found)
- special_items (array of special menu item names if listed)

If NO Super Bowl or game day deals are found, return {"deals": []}.
Return the JSON object ONLY, no other text.`;

    try {
        console.log(`Deals fallback: scraping website for ${name}: ${url}`);
        const result = await runMinoScrape(url, goal, FALLBACK_SCRAPE_TIMEOUT);
        return parseFallbackDeals(result);
    } catch (error) {
        console.error(`Website deals fallback error for ${name}:`, error);
        return [];
    }
}

/**
 * Parse deals from a per-restaurant Mino scrape result.
 */
function parseFallbackDeals(result: AgentQLResponse): SuperBowlDeal[] {
    if (!result.success || !result.data) return [];

    try {
        const data = result.data as { deals?: Array<Record<string, unknown>> };
        const rawDeals = data.deals || [];

        return rawDeals
            .filter(d => d.description && String(d.description).trim().length > 0)
            .map(d => ({
                description: String(d.description).trim(),
                source: 'website' as const,
                promo_code: d.promo_code ? String(d.promo_code).trim() : undefined,
                pre_order_deadline: d.pre_order_deadline ? String(d.pre_order_deadline).trim() : undefined,
                pre_order_url: d.pre_order_url && String(d.pre_order_url).startsWith('http')
                    ? String(d.pre_order_url).trim()
                    : undefined,
                special_menu_items: Array.isArray(d.special_items)
                    ? (d.special_items as string[]).map(s => String(s).trim()).filter(Boolean)
                    : undefined,
            }));
    } catch (error) {
        console.error('Failed to parse fallback deals:', error);
        return [];
    }
}

/**
 * Fire-and-forget background website-only scrape for a single restaurant.
 * Used as fallback for local restaurants not found in aggregator data.
 */
export function startBackgroundDealsScrape(
    spotId: string,
    name: string,
    address: string,
    platformIds?: PlatformIds
): void {
    console.log(`Starting background website-only deals scrape for ${spotId}: ${name}`);

    (async () => {
        try {
            const websiteUrl = platformIds?.website_url;
            const deals = await scrapeWebsiteForDeals(name, address, websiteUrl);

            // Cache in Redis (30-min TTL) — even empty arrays to prevent re-scraping
            await cacheDeals(spotId, deals);

            console.log(`Background deals fallback SUCCESS for ${spotId}: ${deals.length} deal(s) cached`);
        } catch (err) {
            console.error(`Background deals fallback error for ${spotId}:`, err);
        } finally {
            await clearDealsScoutingLock(spotId);
        }
    })();
}
