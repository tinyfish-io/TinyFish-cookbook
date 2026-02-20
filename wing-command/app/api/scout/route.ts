import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getWingSpotsByZip, upsertWingSpots, deleteWingSpotsByZip } from '@/lib/supabase';
import { getCachedWingSpots, cacheWingSpots, checkRateLimit, getCachedScrapeResult, cacheScrapeResult, purgeZipCache, setScoutingLock, getCachedMenu } from '@/lib/cache';
import { geocodeZipCode } from '@/lib/geocode';
import { scrapeAllSources } from '@/lib/agentql';
import { generateSeedData } from '@/lib/seed-data';
import { isValidZipCode, cleanZipCode, calculateAvailability } from '@/lib/utils';
import { startBackgroundMenuScrape, getCheapestWingPrice } from '@/lib/menu';
import { ScoutResponse, FlavorPersona, WingSpot, MenuSection } from '@/lib/types';
import { getChainPriceEstimate } from '@/lib/chain-prices';

// Render.com: No timeout limit for Web Services (unlimited runtime)
// Setting Node.js runtime explicitly
export const runtime = 'nodejs';

// Render Web Services have no timeout constraint — we set a generous max here
// for Next.js route handler purposes. Render won't kill long-running requests.
export const maxDuration = 300;

// In-flight request deduplication
const inFlightRequests = new Map<string, Promise<ScoutResponse>>();
const INFLIGHT_CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupInFlightRequests() {
    const now = Date.now();
    if (now - lastCleanup > INFLIGHT_CLEANUP_INTERVAL) {
        inFlightRequests.clear();
        lastCleanup = now;
    }
}

const VALID_FLAVORS: FlavorPersona[] = ['face-melter', 'classicist', 'sticky-finger'];
const MAX_AUTO_SCRAPES = 10; // Auto-scrape top 10 spots for price data

/**
 * Enrich spots with wing prices from multiple sources:
 * 1. Redis menu cache (fastest)
 * 2. Supabase menus table (if Redis misses)
 * 3. Supabase wing_spots table (if background scrape already wrote price_per_wing)
 */
async function enrichSpotsWithPrices(spots: WingSpot[]): Promise<WingSpot[]> {
    const enriched = [...spots];
    const allIds = enriched.map((s, i) => ({ id: s.id, idx: i }));
    const missingPriceIds = allIds.filter(({ idx }) => enriched[idx].price_per_wing === null && enriched[idx].cheapest_item_price === null);
    const missingPhoneIds = allIds.filter(({ idx }) => !enriched[idx].phone);

    if (missingPriceIds.length === 0 && missingPhoneIds.length === 0) return enriched;

    // Step 1: Try Redis menu cache first for prices (parallel)
    if (missingPriceIds.length > 0) {
        const redisPromises = missingPriceIds.map(async ({ id, idx }) => {
            try {
                const cachedMenu = await getCachedMenu(id);
                if (cachedMenu?.sections) {
                    const result = getCheapestWingPrice(cachedMenu.sections);
                    if (result.price_per_wing !== null || result.cheapest_item_price !== null) {
                        enriched[idx] = {
                            ...enriched[idx],
                            price_per_wing: result.price_per_wing ?? enriched[idx].price_per_wing,
                            cheapest_item_price: result.cheapest_item_price ?? enriched[idx].cheapest_item_price,
                        };
                    }
                }
            } catch { /* ignore */ }
        });
        await Promise.all(redisPromises);
    }

    // Step 2: Check Supabase wing_spots for prices AND phone numbers
    const needsPriceFromDb = missingPriceIds.filter(({ idx }) => enriched[idx].price_per_wing === null && enriched[idx].cheapest_item_price === null);
    const idsToQuery = new Set([
        ...needsPriceFromDb.map(m => m.id),
        ...missingPhoneIds.map(m => m.id),
    ]);

    if (idsToQuery.size > 0) {
        try {
            const supabase = createServerClient();
            const { data: dbRows } = await supabase
                .from('wing_spots')
                .select('id, price_per_wing, phone, address')
                .in('id', Array.from(idsToQuery));

            if (dbRows) {
                const dbMap = new Map(dbRows.map(d => [d.id, d]));
                for (const { id, idx } of allIds) {
                    const dbRow = dbMap.get(id);
                    if (!dbRow) continue;
                    // Enrich per-wing price
                    if (enriched[idx].price_per_wing === null && dbRow.price_per_wing !== null) {
                        enriched[idx] = { ...enriched[idx], price_per_wing: dbRow.price_per_wing };
                    }
                    // Enrich phone
                    if (!enriched[idx].phone && dbRow.phone) {
                        enriched[idx] = { ...enriched[idx], phone: dbRow.phone };
                    }
                    // Enrich address (if currently empty)
                    if (!enriched[idx].address && dbRow.address) {
                        enriched[idx] = { ...enriched[idx], address: dbRow.address };
                    }
                }
            }
        } catch { /* ignore */ }
    }

    // Step 3: For STILL remaining price nulls, check Supabase menus table
    const stillMissing2 = missingPriceIds.filter(({ idx }) => enriched[idx].price_per_wing === null && enriched[idx].cheapest_item_price === null);
    if (stillMissing2.length > 0 && stillMissing2.length <= 10) {
        try {
            const supabase = createServerClient();
            const { data: dbMenus } = await supabase
                .from('menus')
                .select('spot_id, sections')
                .in('spot_id', stillMissing2.map(m => m.id));

            if (dbMenus) {
                for (const dbMenu of dbMenus) {
                    const match = stillMissing2.find(m => m.id === dbMenu.spot_id);
                    if (match && dbMenu.sections) {
                        const result = getCheapestWingPrice(dbMenu.sections as MenuSection[]);
                        if (result.price_per_wing !== null || result.cheapest_item_price !== null) {
                            enriched[match.idx] = {
                                ...enriched[match.idx],
                                price_per_wing: result.price_per_wing ?? enriched[match.idx].price_per_wing,
                                cheapest_item_price: result.cheapest_item_price ?? enriched[match.idx].cheapest_item_price,
                            };
                        }
                    }
                }
            }
        } catch { /* ignore */ }
    }

    return enriched;
}

/**
 * Fire-and-forget: trigger background menu scrapes for top non-red spots.
 * Uses Redis SET NX lock to prevent duplicates.
 */
function autoTriggerMenuScrapes(spots: WingSpot[]): void {
    const eligible = spots
        .filter(s => s.status !== 'red')
        .slice(0, MAX_AUTO_SCRAPES);

    for (const spot of eligible) {
        (async () => {
            try {
                const gotLock = await setScoutingLock(spot.id);
                if (gotLock) {
                    console.log(`Auto-triggering menu scrape for ${spot.id}: ${spot.name}`);
                    startBackgroundMenuScrape(spot.id, spot.name, spot.address, spot.platform_ids);
                }
            } catch {
                // Ignore lock/scrape errors — non-critical
            }
        })();
    }
}

/**
 * Estimate prices for spots that still have no price data after enrichment.
 * Hybrid approach:
 *   1. Chain lookup: if the restaurant is a known chain, use hardcoded price midpoint
 *   2. Zip-code average: for unknowns, average all real + chain prices in this batch
 */
function estimateMissingPrices(spots: WingSpot[]): WingSpot[] {
    const result = [...spots];

    // Step 1: Collect real per-wing prices
    const realPrices: number[] = [];
    for (const spot of result) {
        if (spot.price_per_wing != null) {
            realPrices.push(spot.price_per_wing);
        }
    }

    // Step 2: For spots with no price data, try chain lookup
    for (let i = 0; i < result.length; i++) {
        const spot = result[i];
        if (spot.price_per_wing != null || spot.cheapest_item_price != null) continue;

        const chainEst = getChainPriceEstimate(spot.name);
        if (chainEst) {
            const midpoint = Math.round(((chainEst.min + chainEst.max) / 2) * 100) / 100;
            result[i] = { ...spot, estimated_price_per_wing: midpoint, is_price_estimated: true };
            realPrices.push(midpoint); // Include in zip average
        }
    }

    // Step 3: Calculate zip average (need >= 2 data points)
    if (realPrices.length >= 2) {
        const avg = Math.round(
            (realPrices.reduce((sum, p) => sum + p, 0) / realPrices.length) * 100
        ) / 100;

        // Step 4: For remaining no-price spots, use zip average
        for (let i = 0; i < result.length; i++) {
            const spot = result[i];
            if (
                spot.price_per_wing == null &&
                spot.cheapest_item_price == null &&
                spot.estimated_price_per_wing == null
            ) {
                result[i] = { ...spot, estimated_price_per_wing: avg, is_price_estimated: true };
            }
        }
    }

    return result;
}

export async function GET(request: NextRequest) {
    const t0 = Date.now();
    const log = (msg: string) => console.log(`[scout ${Date.now() - t0}ms] ${msg}`);

    const searchParams = request.nextUrl.searchParams;
    const rawZip = searchParams.get('zip');
    const rawFlavor = searchParams.get('flavor');
    const forceRefresh = searchParams.get('refresh') === 'true';
    const purge = searchParams.get('purge') === 'true';

    log(`START zip=${rawZip} flavor=${rawFlavor}${purge ? ' PURGE=true' : ''}`);

    // Validate zip code
    if (!rawZip || !isValidZipCode(rawZip)) {
        return NextResponse.json<ScoutResponse>(
            { success: false, spots: [], cached: false, message: 'Valid 5-digit US zip code required' },
            { status: 400 }
        );
    }

    const zipCode = cleanZipCode(rawZip);
    const flavor: FlavorPersona | undefined = rawFlavor && VALID_FLAVORS.includes(rawFlavor as FlavorPersona)
        ? rawFlavor as FlavorPersona
        : undefined;

    // Rate limiting
    log('checking rate limit...');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimit = await checkRateLimit(ip, 20, 60);
    log(`rate limit: allowed=${rateLimit.allowed} remaining=${rateLimit.remaining}`);

    if (!rateLimit.allowed) {
        return NextResponse.json<ScoutResponse>(
            { success: false, spots: [], cached: false, message: `Rate limited. Try again in ${rateLimit.resetIn}s` },
            { status: 429 }
        );
    }

    cleanupInFlightRequests();

    // Skip in-flight deduplication — it can cause deadlocks in dev mode
    // where HMR restarts leave stale promises in memory

    try {
        // 0. Purge stale/incorrect data if requested
        if (purge) {
            log('PURGE: clearing Redis cache + Supabase data for zip...');
            const supabasePurge = createServerClient();
            await Promise.all([
                purgeZipCache(zipCode),
                deleteWingSpotsByZip(supabasePurge, zipCode),
            ]);
            log('PURGE: done');
        }

        // 1. Check Redis cache first (skip if purging or force-refreshing)
        if (!forceRefresh && !purge) {
            log('checking Redis scrapeResult cache...');
            const cachedResult = await getCachedScrapeResult(zipCode);
            if (cachedResult) {
                log(`HIT scrapeResult cache: ${cachedResult.spots.length} spots`);
                const enrichedSpots = estimateMissingPrices(await enrichSpotsWithPrices(cachedResult.spots));
                return NextResponse.json<ScoutResponse>({
                    ...cachedResult,
                    spots: enrichedSpots,
                    cached: true,
                    flavor,
                    message: `Cached data (${cachedResult.spots.length} spots)`,
                });
            }
            log('MISS scrapeResult cache');

            log('checking Redis wingSpots cache...');
            const cachedSpots = await getCachedWingSpots(zipCode);
            if (cachedSpots && cachedSpots.length > 0) {
                log(`HIT wingSpots cache: ${cachedSpots.length} spots`);
                const enrichedSpots = estimateMissingPrices(await enrichSpotsWithPrices(cachedSpots));
                const stats = calculateAvailability(enrichedSpots);
                return NextResponse.json<ScoutResponse>({
                    success: true,
                    spots: enrichedSpots,
                    cached: true,
                    flavor,
                    message: `Cached ${cachedSpots.length} spots (${stats.percentage}% available)`,
                });
            }
            log('MISS wingSpots cache');
        }

        // 2. Check Supabase for recent data
        log('checking Supabase...');
        const supabase = createServerClient();
        const { data: dbSpots } = await getWingSpotsByZip(supabase, zipCode);
        log(`Supabase: ${dbSpots?.length ?? 0} rows`);

        if (dbSpots && dbSpots.length > 0 && !forceRefresh && !purge) {
            const timestamps = dbSpots.map(s => new Date(s.last_updated).getTime()).filter(t => !isNaN(t));
            if (timestamps.length === 0) timestamps.push(0);
            const latestUpdate = new Date(Math.max(...timestamps));
            const ageMinutes = (Date.now() - latestUpdate.getTime()) / (1000 * 60);
            log(`Supabase data age: ${ageMinutes.toFixed(1)} min`);

            if (ageMinutes < 60) { // 1 hour — restaurant data (hours, menu, location) doesn't change fast
                const enrichedDbSpots = estimateMissingPrices(await enrichSpotsWithPrices(dbSpots));
                await cacheWingSpots(zipCode, enrichedDbSpots);
                const stats = calculateAvailability(enrichedDbSpots);
                return NextResponse.json<ScoutResponse>({
                    success: true,
                    spots: enrichedDbSpots,
                    cached: true,
                    flavor,
                    message: `Fresh data: ${enrichedDbSpots.length} spots (${stats.percentage}% available)`,
                });
            }
        }

        // 3. Geocode zip code
        log('geocoding...');
        const location = await geocodeZipCode(zipCode);
        log(`geocode: ${location ? `${location.city}, ${location.state}` : 'FAILED'}`);

        if (!location) {
            if (dbSpots && dbSpots.length > 0) {
                const estimated = estimateMissingPrices(await enrichSpotsWithPrices(dbSpots));
                return NextResponse.json<ScoutResponse>({
                    success: true,
                    spots: estimated,
                    cached: true,
                    flavor,
                    message: 'Could not geocode zip, showing cached data',
                });
            }
            return NextResponse.json<ScoutResponse>(
                { success: false, spots: [], cached: false, message: 'Could not geocode zip code. Please try again.' },
                { status: 502 }
            );
        }

        // 4. Scrape all sources in parallel
        log('starting scrapers...');
        let scrapedSpots = await scrapeAllSources(zipCode, location.lat, location.lng, flavor, location.city, location.state);
        log(`scrapers done: ${scrapedSpots.length} spots`);

        if (scrapedSpots.length === 0) {
            if (dbSpots && dbSpots.length > 0) {
                log('using stale DB data as fallback');
                const estimated = estimateMissingPrices(await enrichSpotsWithPrices(dbSpots));
                return NextResponse.json<ScoutResponse>({
                    success: true,
                    spots: estimated,
                    cached: true,
                    flavor,
                    message: 'No new data found, showing cached results',
                });
            }

            // Fallback: Generate seed data so the app has something to display
            log('generating seed data...');
            scrapedSpots = generateSeedData(
                zipCode,
                location.lat,
                location.lng,
                location.city,
                location.state,
                flavor,
            );
            log(`seed data: ${scrapedSpots.length} spots`);
        }

        // 5. Save to Supabase
        log('saving to Supabase...');
        await upsertWingSpots(supabase, scrapedSpots);
        log('saved');

        // 6. Cache results + estimate missing prices
        log('caching results...');
        await cacheWingSpots(zipCode, scrapedSpots);
        const estimatedSpots = estimateMissingPrices(await enrichSpotsWithPrices(scrapedSpots));

        const result: ScoutResponse = {
            success: true,
            spots: estimatedSpots,
            cached: false,
            flavor,
            message: `Found ${scrapedSpots.length} wing spots`,
            location,
        };

        await cacheScrapeResult(zipCode, result);
        log(`DONE: ${scrapedSpots.length} spots in ${Date.now() - t0}ms`);

        // 7. Auto-trigger background menu scrapes for top spots (any non-red spot)
        // This populates price_per_wing data without the user needing to open menus
        autoTriggerMenuScrapes(scrapedSpots);
        log(`Auto-triggered menu scrapes for up to ${MAX_AUTO_SCRAPES} spots`);

        return NextResponse.json<ScoutResponse>(result);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`ERROR: ${errorMessage}`);
        console.error('Scout API error:', errorMessage);

        // Fallback to stale data
        try {
            const supabase = createServerClient();
            const { data: fallbackSpots } = await getWingSpotsByZip(supabase, zipCode);
            if (fallbackSpots && fallbackSpots.length > 0) {
                const estimated = estimateMissingPrices(await enrichSpotsWithPrices(fallbackSpots));
                return NextResponse.json<ScoutResponse>({
                    success: true,
                    spots: estimated,
                    cached: true,
                    flavor,
                    message: 'Error occurred, showing cached data',
                });
            }
        } catch (fallbackError) {
            console.error('Fallback error:', fallbackError instanceof Error ? fallbackError.message : 'Unknown');
        }

        return NextResponse.json<ScoutResponse>(
            { success: false, spots: [], cached: false, message: 'An error occurred while fetching data' },
            { status: 500 }
        );
    }
}
