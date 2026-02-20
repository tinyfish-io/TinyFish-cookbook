#!/usr/bin/env npx tsx
// ===========================================
// Wing Command — Cache Warmer Script
// Pre-caches wing data for high-demand ZIP codes
//
// Usage:
//   npx tsx scripts/cache-warmer.ts                    # Default: top 30 cities, all flavors
//   npx tsx scripts/cache-warmer.ts --tier=1            # Tier 1 only (Super Bowl host + NFL cities)
//   npx tsx scripts/cache-warmer.ts --tier=2            # Tier 1 + Tier 2 (top 30 metros)
//   npx tsx scripts/cache-warmer.ts --tier=3            # All tiers (396 ZIPs — full blast)
//   npx tsx scripts/cache-warmer.ts --zip=19101,10001   # Specific ZIPs only
//   npx tsx scripts/cache-warmer.ts --flavor=face-melter # Single flavor only
//   npx tsx scripts/cache-warmer.ts --dry-run            # Preview what would be cached
//   npx tsx scripts/cache-warmer.ts --concurrency=3      # Max parallel scrapes (default: 2)
//   npx tsx scripts/cache-warmer.ts --loop               # Run continuously (every 12 min)
//   npx tsx scripts/cache-warmer.ts --loop --interval=10  # Custom interval (minutes)
// ===========================================

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local before anything else
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import { geocodeZipCode } from '../lib/geocode';
import { scrapeAllSources } from '../lib/agentql';
import { cacheWingSpots, cacheScrapeResult, getCachedScrapeResult } from '../lib/cache';
import { createServerClient, upsertWingSpots } from '../lib/supabase';
import { calculateAvailability } from '../lib/utils';
import { FlavorPersona, ScoutResponse, WingSpot, GeocodedLocation } from '../lib/types';

// ===========================================
// High-Demand ZIP Tiers
// ===========================================

/** Tier 1: Super Bowl LX host city (Glendale/Phoenix) + NFL championship cities + party hotspots */
const TIER_1_SUPER_BOWL: Array<{ zip: string; city: string; reason: string }> = [
    // Super Bowl LX host — Glendale, AZ (State Farm Stadium)
    { zip: '85301', city: 'Glendale, AZ', reason: 'SB LX Host City' },
    { zip: '85302', city: 'Glendale, AZ', reason: 'SB LX Host City (North)' },
    { zip: '85304', city: 'Glendale, AZ', reason: 'SB LX Host City (West)' },
    { zip: '85001', city: 'Phoenix, AZ', reason: 'SB LX Metro — Downtown Phoenix' },
    { zip: '85003', city: 'Phoenix, AZ', reason: 'SB LX Metro — Midtown' },
    { zip: '85004', city: 'Phoenix, AZ', reason: 'SB LX Metro — Central' },
    { zip: '85008', city: 'Phoenix, AZ', reason: 'SB LX Metro — East Phoenix' },
    { zip: '85281', city: 'Tempe, AZ', reason: 'SB LX Metro — ASU/Tempe' },
    { zip: '85251', city: 'Scottsdale, AZ', reason: 'SB LX Metro — Old Town Scottsdale' },

    // KC Chiefs (defending champs) — home market
    { zip: '64101', city: 'Kansas City, MO', reason: 'Chiefs HQ — Downtown KC' },
    { zip: '64108', city: 'Kansas City, MO', reason: 'Chiefs HQ — Crossroads' },
    { zip: '64129', city: 'Kansas City, MO', reason: 'Arrowhead Stadium Area' },

    // Philadelphia Eagles (SB contender) — home market
    { zip: '19101', city: 'Philadelphia, PA', reason: 'Eagles HQ — Center City' },
    { zip: '19148', city: 'Philadelphia, PA', reason: 'Eagles — South Philly / Stadium' },
    { zip: '19104', city: 'Philadelphia, PA', reason: 'Eagles — University City' },

    // Top Super Bowl party cities
    { zip: '10001', city: 'New York, NY', reason: '#1 Party Market — Midtown' },
    { zip: '90001', city: 'Los Angeles, CA', reason: '#2 Party Market — LA' },
    { zip: '60601', city: 'Chicago, IL', reason: '#3 Party Market — Loop' },
    { zip: '77001', city: 'Houston, TX', reason: '#4 Party Market — Downtown' },
    { zip: '33101', city: 'Miami, FL', reason: '#5 Party Market — Downtown Miami' },
    { zip: '30301', city: 'Atlanta, GA', reason: '#6 Party Market — Downtown ATL' },
    { zip: '75201', city: 'Dallas, TX', reason: '#7 Party Market — Downtown' },
    { zip: '94102', city: 'San Francisco, CA', reason: '#8 Party Market — Downtown SF' },
    { zip: '98101', city: 'Seattle, WA', reason: '#9 Party Market — Downtown' },
    { zip: '80201', city: 'Denver, CO', reason: '#10 Party Market — Denver' },

    // Las Vegas — massive SB watch party scene
    { zip: '89101', city: 'Las Vegas, NV', reason: 'Vegas Strip Watch Parties' },
    { zip: '89109', city: 'Las Vegas, NV', reason: 'Vegas Strip Central' },

    // New Orleans — wing capital
    { zip: '70112', city: 'New Orleans, LA', reason: 'Wing Capital — French Quarter' },
    { zip: '70130', city: 'New Orleans, LA', reason: 'Wing Capital — CBD' },
];

/** Tier 2: Top 30 US metros — downtown ZIPs (high density, lots of delivery) */
const TIER_2_METROS: Array<{ zip: string; city: string; reason: string }> = [
    { zip: '78201', city: 'San Antonio, TX', reason: 'Top 10 Metro' },
    { zip: '92101', city: 'San Diego, CA', reason: 'Top 10 Metro' },
    { zip: '95101', city: 'San Jose, CA', reason: 'Top 10 Metro' },
    { zip: '78701', city: 'Austin, TX', reason: 'Top 15 Metro' },
    { zip: '32099', city: 'Jacksonville, FL', reason: 'Top 15 Metro' },
    { zip: '76101', city: 'Fort Worth, TX', reason: 'Top 15 Metro' },
    { zip: '43085', city: 'Columbus, OH', reason: 'Top 15 Metro' },
    { zip: '46201', city: 'Indianapolis, IN', reason: 'Top 15 Metro' },
    { zip: '28201', city: 'Charlotte, NC', reason: 'Top 20 Metro' },
    { zip: '33601', city: 'Tampa, FL', reason: 'Top 20 Metro' },
    { zip: '55401', city: 'Minneapolis, MN', reason: 'Top 20 Metro' },
    { zip: '90301', city: 'Inglewood, CA', reason: 'SoFi Stadium Area' },
    { zip: '02101', city: 'Boston, MA', reason: 'Top 15 Metro' },
    { zip: '48201', city: 'Detroit, MI', reason: 'Top 20 Metro' },
    { zip: '37201', city: 'Nashville, TN', reason: 'Top 25 Metro' },
    { zip: '21201', city: 'Baltimore, MD', reason: 'Ravens Market' },
    { zip: '15201', city: 'Pittsburgh, PA', reason: 'Steelers Market' },
    { zip: '14201', city: 'Buffalo, NY', reason: 'WING CAPITAL OF THE WORLD' },
    { zip: '53201', city: 'Milwaukee, WI', reason: 'Packers Overflow' },
    { zip: '44101', city: 'Cleveland, OH', reason: 'Browns Market' },
];

/** Tier 3: All 396 ZIPs from TOP_ZIP_CODES — neighborhood-level coverage */
// Imported from utils at runtime

const ALL_FLAVORS: FlavorPersona[] = ['face-melter', 'classicist', 'sticky-finger'];

// ===========================================
// CLI Argument Parsing
// ===========================================

interface CliArgs {
    tier: 1 | 2 | 3;
    zips: string[] | null;
    flavors: FlavorPersona[];
    dryRun: boolean;
    concurrency: number;
    loop: boolean;
    intervalMinutes: number;
    skipCached: boolean;
}

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);
    const flags: Record<string, string> = {};

    for (const arg of args) {
        if (arg.startsWith('--')) {
            const [key, val] = arg.slice(2).split('=');
            flags[key] = val ?? 'true';
        }
    }

    const tier = parseInt(flags['tier'] || '1', 10) as 1 | 2 | 3;
    const zips = flags['zip'] ? flags['zip'].split(',').map(z => z.trim()) : null;
    const flavors = flags['flavor']
        ? [flags['flavor'] as FlavorPersona]
        : ALL_FLAVORS;
    const dryRun = flags['dry-run'] === 'true';
    const concurrency = parseInt(flags['concurrency'] || '2', 10);
    const loop = flags['loop'] === 'true';
    const intervalMinutes = parseInt(flags['interval'] || '12', 10);
    const skipCached = flags['skip-cached'] !== 'false'; // default true

    return { tier, zips, flavors, dryRun, concurrency, loop, intervalMinutes, skipCached };
}

// ===========================================
// Logging
// ===========================================

const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgRed: '\x1b[41m',
};

function log(msg: string) {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`${COLORS.dim}[${ts}]${COLORS.reset} ${msg}`);
}

function logSuccess(msg: string) { log(`${COLORS.green}✓${COLORS.reset} ${msg}`); }
function logWarn(msg: string) { log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`); }
function logError(msg: string) { log(`${COLORS.red}✗${COLORS.reset} ${msg}`); }
function logInfo(msg: string) { log(`${COLORS.cyan}ℹ${COLORS.reset} ${msg}`); }

function banner(text: string) {
    const line = '═'.repeat(60);
    console.log(`\n${COLORS.bold}${COLORS.cyan}╔${line}╗${COLORS.reset}`);
    console.log(`${COLORS.bold}${COLORS.cyan}║${COLORS.reset} ${COLORS.bold}${text.padEnd(58)}${COLORS.cyan}║${COLORS.reset}`);
    console.log(`${COLORS.bold}${COLORS.cyan}╚${line}╝${COLORS.reset}\n`);
}

// ===========================================
// Core Warming Logic
// ===========================================

interface WarmResult {
    zip: string;
    city: string;
    flavor: FlavorPersona;
    spots: number;
    cached: boolean;
    durationMs: number;
    error?: string;
}

async function warmZip(
    zip: string,
    city: string,
    flavor: FlavorPersona,
    skipCached: boolean,
): Promise<WarmResult> {
    const t0 = Date.now();

    try {
        // Check if already cached
        if (skipCached) {
            const existing = await getCachedScrapeResult(zip);
            if (existing && existing.spots.length > 0) {
                return {
                    zip, city, flavor, spots: existing.spots.length,
                    cached: true, durationMs: Date.now() - t0,
                };
            }
        }

        // Step 1: Geocode
        const location = await geocodeZipCode(zip);
        if (!location) {
            return {
                zip, city, flavor, spots: 0,
                cached: false, durationMs: Date.now() - t0,
                error: 'Geocode failed',
            };
        }

        // Step 2: Scrape all sources
        const spots = await scrapeAllSources(zip, location.lat, location.lng, flavor);

        if (spots.length === 0) {
            return {
                zip, city, flavor, spots: 0,
                cached: false, durationMs: Date.now() - t0,
                error: 'No spots found',
            };
        }

        // Step 3: Cache in Redis (extended TTL for pre-warmed data — 4 hours)
        const PRE_WARM_TTL = 4 * 60 * 60;
        await cacheWingSpots(zip, spots, PRE_WARM_TTL);

        // Step 4: Build ScoutResponse and cache it
        const stats = calculateAvailability(spots);
        const result: ScoutResponse = {
            success: true,
            spots,
            cached: false,
            flavor,
            message: `Pre-warmed: ${spots.length} spots (${stats.percentage}% available)`,
            location,
        };
        await cacheScrapeResult(zip, result, PRE_WARM_TTL);

        // Step 5: Persist to Supabase
        const supabase = createServerClient();
        await upsertWingSpots(supabase, spots);

        return {
            zip, city, flavor, spots: spots.length,
            cached: false, durationMs: Date.now() - t0,
        };
    } catch (error) {
        return {
            zip, city, flavor, spots: 0,
            cached: false, durationMs: Date.now() - t0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Process a batch of ZIPs with controlled concurrency.
 * Each ZIP × flavor combo is a unit of work.
 */
async function processBatch(
    targets: Array<{ zip: string; city: string; reason: string }>,
    flavors: FlavorPersona[],
    concurrency: number,
    skipCached: boolean,
): Promise<WarmResult[]> {
    // Build the full work queue: each zip × each flavor
    const queue: Array<{ zip: string; city: string; reason: string; flavor: FlavorPersona }> = [];
    for (const target of targets) {
        for (const flavor of flavors) {
            queue.push({ ...target, flavor });
        }
    }

    const total = queue.length;
    let completed = 0;
    let skipped = 0;
    let errors = 0;
    const results: WarmResult[] = [];

    log(`${COLORS.bold}Processing ${total} jobs (${targets.length} ZIPs × ${flavors.length} flavors) with concurrency ${concurrency}${COLORS.reset}\n`);

    // Semaphore-style concurrency control
    let active = 0;
    let idx = 0;

    async function runNext(): Promise<void> {
        while (idx < queue.length) {
            const job = queue[idx++];
            const jobNum = idx;
            active++;

            const progressBar = `[${completed + skipped}/${total}]`;
            logInfo(`${progressBar} ${job.city} (${job.zip}) — ${job.flavor} — ${job.reason}`);

            const result = await warmZip(job.zip, job.city, job.flavor, skipCached);
            results.push(result);

            if (result.cached) {
                skipped++;
                logWarn(`${progressBar} SKIP (cached) ${job.zip} — ${result.spots} spots already warm`);
            } else if (result.error) {
                errors++;
                logError(`${progressBar} FAIL ${job.zip}/${job.flavor}: ${result.error} (${(result.durationMs / 1000).toFixed(1)}s)`);
            } else {
                completed++;
                const secs = (result.durationMs / 1000).toFixed(1);
                logSuccess(`${progressBar} DONE ${job.zip} ${job.city} — ${result.spots} spots — ${secs}s`);
            }

            active--;

            // Small delay between jobs to avoid hammering APIs
            await sleep(2000);
        }
    }

    // Launch `concurrency` workers
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => runNext());
    await Promise.all(workers);

    return results;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===========================================
// Report
// ===========================================

function printReport(results: WarmResult[], durationMs: number) {
    const line = '─'.repeat(60);
    console.log(`\n${COLORS.cyan}${line}${COLORS.reset}`);
    console.log(`${COLORS.bold}  CACHE WARMER REPORT${COLORS.reset}`);
    console.log(`${COLORS.cyan}${line}${COLORS.reset}\n`);

    const fresh = results.filter(r => !r.cached && !r.error);
    const cached = results.filter(r => r.cached);
    const errored = results.filter(r => !!r.error);

    console.log(`  ${COLORS.green}✓ Freshly cached:${COLORS.reset}  ${fresh.length}`);
    console.log(`  ${COLORS.yellow}⚡ Already warm:${COLORS.reset}    ${cached.length}`);
    console.log(`  ${COLORS.red}✗ Errors:${COLORS.reset}           ${errored.length}`);
    console.log(`  Total spots cached: ${fresh.reduce((sum, r) => sum + r.spots, 0)}`);
    console.log(`  Total duration:     ${(durationMs / 1000 / 60).toFixed(1)} minutes`);

    if (errored.length > 0) {
        console.log(`\n  ${COLORS.red}${COLORS.bold}Errors:${COLORS.reset}`);
        for (const r of errored) {
            console.log(`    ${COLORS.red}•${COLORS.reset} ${r.zip} (${r.city}) ${r.flavor}: ${r.error}`);
        }
    }

    // Top results
    const top = fresh.sort((a, b) => b.spots - a.spots).slice(0, 10);
    if (top.length > 0) {
        console.log(`\n  ${COLORS.green}${COLORS.bold}Top Results:${COLORS.reset}`);
        for (const r of top) {
            console.log(`    ${COLORS.green}•${COLORS.reset} ${r.zip} ${r.city} — ${r.spots} spots (${r.flavor}) in ${(r.durationMs / 1000).toFixed(1)}s`);
        }
    }

    console.log(`\n${COLORS.cyan}${line}${COLORS.reset}\n`);
}

// ===========================================
// Main
// ===========================================

async function main() {
    const args = parseArgs();

    banner('🏈  WING COMMAND — CACHE WARMER  🍗');
    logInfo(`Tier: ${args.tier} | Flavors: ${args.flavors.join(', ')} | Concurrency: ${args.concurrency}`);
    logInfo(`Skip cached: ${args.skipCached} | Loop: ${args.loop}${args.loop ? ` (every ${args.intervalMinutes}m)` : ''}`);

    // Validate env vars
    const requiredEnvVars = [
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
    ];
    const missing = requiredEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        logError(`Missing environment variables: ${missing.join(', ')}`);
        logInfo('Make sure .env.local has all required keys');
        process.exit(1);
    }
    logSuccess('Environment variables loaded');

    // Build target list
    let targets: Array<{ zip: string; city: string; reason: string }>;

    if (args.zips) {
        // Custom ZIP list
        targets = args.zips.map(zip => ({
            zip,
            city: 'Custom',
            reason: 'Manual warm',
        }));
        logInfo(`Custom ZIPs: ${args.zips.join(', ')}`);
    } else if (args.tier === 3) {
        // Full blast: all 396 ZIPs
        const { TOP_ZIP_CODES } = await import('../lib/utils');
        targets = TOP_ZIP_CODES.map(zip => ({ zip, city: 'Metro', reason: 'Tier 3 — Full Coverage' }));
        logInfo(`Tier 3: ${targets.length} ZIPs (FULL BLAST)`);
    } else if (args.tier === 2) {
        targets = [...TIER_1_SUPER_BOWL, ...TIER_2_METROS];
        logInfo(`Tier 2: ${targets.length} ZIPs (SB host + NFL + Top 30 metros)`);
    } else {
        targets = [...TIER_1_SUPER_BOWL];
        logInfo(`Tier 1: ${targets.length} ZIPs (SB host + top party cities)`);
    }

    if (args.dryRun) {
        console.log(`\n${COLORS.bold}DRY RUN — would warm these targets:${COLORS.reset}\n`);
        for (const t of targets) {
            console.log(`  ${t.zip}  ${t.city.padEnd(25)} ${COLORS.dim}${t.reason}${COLORS.reset}`);
        }
        console.log(`\n  Total jobs: ${targets.length} ZIPs × ${args.flavors.length} flavors = ${targets.length * args.flavors.length} scrape runs`);
        console.log(`  Est. time: ~${Math.ceil((targets.length * args.flavors.length * 90) / args.concurrency / 60)} minutes (at ~90s/scrape avg)\n`);
        return;
    }

    // Execute (with optional loop)
    do {
        const runStart = Date.now();
        banner(`Run starting at ${new Date().toLocaleTimeString()}`);

        const results = await processBatch(targets, args.flavors, args.concurrency, args.skipCached);
        printReport(results, Date.now() - runStart);

        if (args.loop) {
            const waitMs = args.intervalMinutes * 60 * 1000;
            logInfo(`Next run in ${args.intervalMinutes} minutes. Press Ctrl+C to stop.`);
            await sleep(waitMs);
        }
    } while (args.loop);
}

// Run
main().catch(err => {
    logError(`Fatal: ${err.message || err}`);
    process.exit(1);
});
