// ===========================================
// Wing Scout - Supabase Client
// ===========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WingSpot, GeocodedLocation } from './types';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SupabaseClientAny = SupabaseClient<any, any, any>;

/**
 * Create browser-side Supabase client
 */
export function createBrowserClient(): SupabaseClientAny {
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
    });
}

/**
 * Create server-side Supabase client
 */
export function createServerClient(): SupabaseClientAny {
    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/**
 * Singleton browser client
 */
let browserClient: SupabaseClientAny | null = null;

export function getSupabaseBrowserClient(): SupabaseClientAny {
    if (!browserClient) {
        browserClient = createBrowserClient();
    }
    return browserClient;
}

/**
 * Get wing spots by zip code
 */
export async function getWingSpotsByZip(
    client: SupabaseClientAny,
    zipCode: string
): Promise<{ data: WingSpot[] | null; error: Error | null }> {
    const { data, error } = await client
        .from('wing_spots')
        .select('*')
        .eq('zip_code', zipCode)
        .order('status', { ascending: true })
        .order('price_per_wing', { ascending: true, nullsFirst: false });

    return { data, error: error as Error | null };
}

/**
 * Delete all wing spots for a zip code (for purging stale/incorrect data)
 */
export async function deleteWingSpotsByZip(
    client: SupabaseClientAny,
    zipCode: string
): Promise<{ error: Error | null }> {
    const { error } = await client
        .from('wing_spots')
        .delete()
        .eq('zip_code', zipCode);

    if (error) {
        console.error(`Failed to delete wing spots for zip ${zipCode}:`, error);
    } else {
        console.log(`Deleted wing spots for zip: ${zipCode}`);
    }

    return { error: error as Error | null };
}

/**
 * Get wing spots near a location (bounding box query)
 */
export async function getWingSpotsNearLocation(
    client: SupabaseClientAny,
    lat: number,
    lng: number,
    radiusMiles: number = 10
): Promise<{ data: WingSpot[] | null; error: Error | null }> {
    const latDegPerMile = 1 / 69.0;
    const lngDegPerMile = 1 / (69.0 * Math.cos((lat * Math.PI) / 180));

    const latRange = radiusMiles * latDegPerMile;
    const lngRange = radiusMiles * lngDegPerMile;

    const { data, error } = await client
        .from('wing_spots')
        .select('*')
        .gte('lat', lat - latRange)
        .lte('lat', lat + latRange)
        .gte('lng', lng - lngRange)
        .lte('lng', lng + lngRange)
        .order('status', { ascending: true });

    return { data, error: error as Error | null };
}

/**
 * Upsert wing spots
 */
export async function upsertWingSpots(
    client: SupabaseClientAny,
    spots: Omit<WingSpot, 'created_at'>[]
): Promise<{ error: Error | null }> {
    // Strip in-memory-only fields that don't have Supabase columns
    const sanitized = spots.map(({ cheapest_item_price: _cip, estimated_price_per_wing: _epw, is_price_estimated: _ipe, ...rest }) => rest);
    const { error } = await client
        .from('wing_spots')
        .upsert(sanitized, { onConflict: 'id', ignoreDuplicates: false });

    return { error: error as Error | null };
}

/**
 * Get cached geocode data
 */
export async function getCachedGeocode(
    client: SupabaseClientAny,
    zipCode: string
): Promise<{ data: GeocodedLocation | null; error: Error | null }> {
    const { data, error } = await client
        .from('geocode_cache')
        .select('*')
        .eq('zip_code', zipCode)
        .single();

    return { data, error: error as Error | null };
}

/**
 * Cache geocode data
 */
export async function cacheGeocode(
    client: SupabaseClientAny,
    geocode: GeocodedLocation
): Promise<{ error: Error | null }> {
    const { error } = await client
        .from('geocode_cache')
        .upsert(geocode, { onConflict: 'zip_code' });

    return { error: error as Error | null };
}

/**
 * Add to scrape queue
 */
export async function addToScrapeQueue(
    client: SupabaseClientAny,
    zipCode: string
): Promise<{ data: { id: string } | null; error: Error | null }> {
    const { data, error } = await client
        .from('scrape_queue')
        .insert({ zip_code: zipCode, status: 'pending', created_at: new Date().toISOString() })
        .select('id')
        .single();

    return { data, error: error as Error | null };
}

/**
 * Get pending scrape queue count
 */
export async function getPendingScrapeCount(
    client: SupabaseClientAny
): Promise<number> {
    const { count } = await client
        .from('scrape_queue')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'processing']);

    return count || 0;
}

/**
 * Check if data is stale
 */
export function isDataStale(lastUpdated: string, maxAgeMinutes: number = 60): boolean {
    const updated = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = diffMs / (1000 * 60);
    return diffMins > maxAgeMinutes;
}
