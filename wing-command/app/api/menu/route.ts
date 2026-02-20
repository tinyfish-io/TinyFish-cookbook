// ===========================================
// Wing Scout - Menu API Endpoint
// Redis-based dedup, background scraping, poll support
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
    getCachedMenu, cacheMenu,
    getCachedChainMenu, cacheChainMenu,
    setScoutingLock, isScoutingInProgress,
} from '@/lib/cache';
import { startBackgroundMenuScrape } from '@/lib/menu';
import { MenuResponse, Menu } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const spotId = searchParams.get('spot_id');
    const isPoll = searchParams.get('poll') === 'true';

    // Validate spot_id parameter
    if (!spotId) {
        return NextResponse.json<MenuResponse>(
            { success: false, menu: null, cached: false, message: 'spot_id is required' },
            { status: 400 }
        );
    }

    // Seed data spots have no real restaurants — skip Mino entirely
    if (spotId.startsWith('seed-')) {
        return NextResponse.json<MenuResponse>({
            success: false,
            menu: null,
            cached: false,
            message: 'Menu not available for demo restaurants. Search with a real zip code to see live menus!',
        });
    }

    try {
        // 1. Check Redis cache first (1-hour TTL)
        const cachedMenu = await getCachedMenu(spotId);
        if (cachedMenu) {
            console.log(`Menu cache hit for ${spotId}`);
            return NextResponse.json<MenuResponse>({
                success: true,
                menu: { ...cachedMenu, source: 'cached' } as Menu,
                cached: true,
                message: 'Menu loaded from cache',
                source_url: cachedMenu.source_url,
            });
        }

        // 2. Check Supabase for persisted menu
        const supabase = createServerClient();
        const { data: dbMenu, error: dbError } = await supabase
            .from('menus')
            .select('*')
            .eq('spot_id', spotId)
            .single();

        if (dbMenu && !dbError) {
            // Check if menu is fresh (less than 24 hours old)
            const fetchedAt = new Date(dbMenu.fetched_at);
            const ageHours = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);

            if (ageHours < 24) {
                const menu: Menu = {
                    spot_id: dbMenu.spot_id,
                    sections: dbMenu.sections,
                    fetched_at: dbMenu.fetched_at,
                    source: 'cached',
                    has_wings: dbMenu.has_wings,
                    wing_section_index: dbMenu.wing_section_index,
                    source_url: dbMenu.source_url,
                };
                await cacheMenu(spotId, menu);
                console.log(`Menu loaded from database for ${spotId}`);
                return NextResponse.json<MenuResponse>({
                    success: true,
                    menu,
                    cached: true,
                    message: 'Menu loaded from database',
                    source_url: menu.source_url,
                });
            }
        }

        // 3. Fetch spot details for menu lookup
        const { data: spot, error: spotError } = await supabase
            .from('wing_spots')
            .select('name, address, platform_ids')
            .eq('id', spotId)
            .single();

        if (!spot || spotError) {
            console.log(`Spot not found: ${spotId}`);
            return NextResponse.json<MenuResponse>(
                { success: false, menu: null, cached: false, message: 'Spot not found' },
                { status: 404 }
            );
        }

        const sourceUrl = spot.platform_ids?.source_url || undefined;

        // 4. Check chain-level cache (shared across all locations of same restaurant)
        const chainMenu = await getCachedChainMenu(spot.name);
        if (chainMenu) {
            console.log(`Chain cache hit for "${spot.name}" (spot ${spotId})`);
            const spotMenu: Menu = { ...chainMenu, spot_id: spotId, source: 'cached', source_url: sourceUrl };
            await cacheMenu(spotId, spotMenu);
            return NextResponse.json<MenuResponse>({
                success: true,
                menu: spotMenu,
                cached: true,
                message: `Menu loaded from chain cache (${spot.name})`,
                source_url: sourceUrl,
            });
        }

        // 5. If this is a POLL request, just check if scouting is still running
        //    Poll requests NEVER trigger new scrapes — only cache checks above
        if (isPoll) {
            const scouting = await isScoutingInProgress(spotId);
            return NextResponse.json<MenuResponse>({
                success: false,
                menu: null,
                cached: false,
                scouting,
                message: scouting
                    ? 'Still scouting wing items...'
                    : 'Menu not available. Try again.',
                source_url: sourceUrl,
            });
        }

        // 6. Initial request — acquire Redis scouting lock (atomic SET NX)
        const gotLock = await setScoutingLock(spotId);
        if (!gotLock) {
            // Another Railway instance is already scraping this spot
            console.log(`Scouting lock already held for ${spotId}`);
            return NextResponse.json<MenuResponse>({
                success: false,
                menu: null,
                cached: false,
                scouting: true,
                message: 'Menu is being scouted. Check back in a moment!',
                source_url: sourceUrl,
            });
        }

        // 7. Launch background scrape (fire-and-forget) and return immediately
        //    This responds in <500ms instead of blocking for 45-120s
        console.log(`Launching background wing scrape for ${spotId}: ${spot.name}`);
        startBackgroundMenuScrape(spotId, spot.name, spot.address, spot.platform_ids);

        return NextResponse.json<MenuResponse>({
            success: false,
            menu: null,
            cached: false,
            scouting: true,
            message: 'Scouting wing items from the menu...',
            source_url: sourceUrl,
        });
    } catch (error) {
        console.error('Menu API error:', error);
        return NextResponse.json<MenuResponse>(
            { success: false, menu: null, cached: false, message: 'Failed to fetch menu' },
            { status: 500 }
        );
    }
}
