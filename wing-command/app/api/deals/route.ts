// ===========================================
// Wing Scout — Super Bowl Deals API Endpoint
// Aggregator-first: check global deals cache → fuzzy match → fallback
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
    getCachedDeals,
    cacheDeals,
    getCachedAggregatorDeals,
    setAggregatorScoutingLock,
    isAggregatorScoutingInProgress,
    setDealsScoutingLock,
    isDealsScoutingInProgress,
} from '@/lib/cache';
import {
    startBackgroundAggregatorScrape,
    startBackgroundDealsScrape,
    matchDealsToSpot,
} from '@/lib/deals';
import { DealsResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes — Railway has no limit, but set generous max

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const spotId = searchParams.get('spot_id');
    const isPoll = searchParams.get('poll') === 'true';

    if (!spotId) {
        return NextResponse.json<DealsResponse>(
            { success: false, deals: [], cached: false, message: 'spot_id is required' },
            { status: 400 }
        );
    }

    try {
        // ===========================================
        // Stage 1: Check per-spot Redis cache (30-min TTL)
        // ===========================================
        const cachedDeals = await getCachedDeals(spotId);
        if (cachedDeals) {
            console.log(`Deals cache hit for ${spotId}: ${cachedDeals.length} deals`);
            return NextResponse.json<DealsResponse>({
                success: true,
                deals: cachedDeals,
                cached: true,
                message: cachedDeals.length > 0
                    ? `${cachedDeals.length} Super Bowl deal(s) (cached)`
                    : 'No Super Bowl specials found (cached)',
            });
        }

        // ===========================================
        // Stage 2: Look up spot details from Supabase
        // ===========================================
        const supabase = createServerClient();
        const { data: spot, error: spotError } = await supabase
            .from('wing_spots')
            .select('name, address, platform_ids')
            .eq('id', spotId)
            .single();

        if (!spot || spotError) {
            console.log(`Deals: spot not found: ${spotId}`);
            return NextResponse.json<DealsResponse>(
                { success: false, deals: [], cached: false, message: 'Spot not found' },
                { status: 404 }
            );
        }

        // ===========================================
        // Stage 3: Check global aggregator cache → fuzzy match
        // ===========================================
        const aggregatorDeals = await getCachedAggregatorDeals();
        if (aggregatorDeals && aggregatorDeals.length > 0) {
            // Aggregator data exists — try to match this spot
            const matchedDeals = matchDealsToSpot(spot.name, aggregatorDeals);

            if (matchedDeals.length > 0) {
                // Chain match found — cache per-spot and return
                console.log(`Aggregator match for ${spotId} (${spot.name}): ${matchedDeals.length} deals`);
                await cacheDeals(spotId, matchedDeals);
                return NextResponse.json<DealsResponse>({
                    success: true,
                    deals: matchedDeals,
                    cached: false,
                    message: `${matchedDeals.length} Super Bowl deal(s) found`,
                });
            }

            // No aggregator match — this is likely a local restaurant.
            // Fall through to Stage 5 (website-only fallback) below.
            console.log(`No aggregator match for ${spotId} (${spot.name}) — trying website fallback`);
        }

        // ===========================================
        // Stage 4: Poll handling
        // ===========================================
        if (isPoll) {
            // Check if either aggregator or per-spot scouting is in progress
            const aggScouting = await isAggregatorScoutingInProgress();
            const spotScouting = await isDealsScoutingInProgress(spotId);
            const anyScouting = aggScouting || spotScouting;

            return NextResponse.json<DealsResponse>({
                success: false,
                deals: [],
                cached: false,
                scouting: anyScouting,
                message: anyScouting
                    ? 'Still scouting Super Bowl deals...'
                    : 'No Super Bowl specials found',
            });
        }

        // ===========================================
        // Stage 5: Trigger background scrapes
        // ===========================================

        // If no aggregator cache at all → trigger global aggregator scrape
        if (!aggregatorDeals) {
            const gotAggLock = await setAggregatorScoutingLock();
            if (gotAggLock) {
                console.log('Launching background aggregator scrape (first request)');
                startBackgroundAggregatorScrape();
            } else {
                console.log('Aggregator scrape already in progress');
            }

            return NextResponse.json<DealsResponse>({
                success: false,
                deals: [],
                cached: false,
                scouting: true,
                message: 'Scouting Super Bowl deals...',
            });
        }

        // Aggregator cache exists but no match (local restaurant)
        // → trigger website-only fallback for this specific spot
        const gotSpotLock = await setDealsScoutingLock(spotId);
        if (gotSpotLock) {
            console.log(`Launching website-only fallback for ${spotId}: ${spot.name}`);
            startBackgroundDealsScrape(spotId, spot.name, spot.address, spot.platform_ids);
        } else {
            console.log(`Website fallback already in progress for ${spotId}`);
        }

        return NextResponse.json<DealsResponse>({
            success: false,
            deals: [],
            cached: false,
            scouting: true,
            message: 'Scouting website for deals...',
        });
    } catch (error) {
        console.error('Deals API error:', error);
        return NextResponse.json<DealsResponse>(
            { success: false, deals: [], cached: false, message: 'Failed to fetch deals' },
            { status: 500 }
        );
    }
}
