// ===========================================
// Wing Scout - Geocoding Service
// Fallback chain: Nominatim → Hardcoded → Zippopotam.us
// ===========================================

import axios from 'axios';
import { GeocodedLocation } from './types';
import { getCachedGeocode as getCachedGeocodeRedis, cacheGeocode as cacheGeocodeRedis } from './cache';
import { createServerClient, getCachedGeocode as getCachedGeocodeSupabase, cacheGeocode as cacheGeocodeSupabase } from './supabase';

// Nominatim API (OpenStreetMap - free, no key required)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// User agent for Nominatim (required by their policy)
const USER_AGENT = 'WingScout/1.0 (super-bowl-wing-tracker)';

// ─── Hardcoded zip lookup table ────────────────────────────────────────────
// Covers Super Bowl host cities, top US metros, and known-failing zips.
// Zero external dependency, instant response.
const ZIP_COORDS: Record<string, { city: string; state: string; lat: number; lng: number }> = {
    // Super Bowl LX & recent host cities
    '70112': { city: 'New Orleans', state: 'Louisiana', lat: 29.9544, lng: -90.0703 },
    '70113': { city: 'New Orleans', state: 'Louisiana', lat: 29.9486, lng: -90.0812 },
    '70116': { city: 'New Orleans', state: 'Louisiana', lat: 29.9621, lng: -90.0589 },
    '70119': { city: 'New Orleans', state: 'Louisiana', lat: 29.9782, lng: -90.0888 },
    '70130': { city: 'New Orleans', state: 'Louisiana', lat: 29.9348, lng: -90.0854 },
    '33101': { city: 'Miami', state: 'Florida', lat: 25.7751, lng: -80.1947 },
    '33109': { city: 'Miami Beach', state: 'Florida', lat: 25.7617, lng: -80.1340 },
    '33130': { city: 'Miami', state: 'Florida', lat: 25.7672, lng: -80.2042 },
    '33139': { city: 'Miami Beach', state: 'Florida', lat: 25.7828, lng: -80.1342 },
    '85001': { city: 'Phoenix', state: 'Arizona', lat: 33.4484, lng: -112.0773 },
    '85003': { city: 'Phoenix', state: 'Arizona', lat: 33.4510, lng: -112.0820 },
    '85281': { city: 'Tempe', state: 'Arizona', lat: 33.4148, lng: -111.9093 },
    '85284': { city: 'Tempe', state: 'Arizona', lat: 33.3831, lng: -111.9093 },
    '91301': { city: 'Agoura Hills', state: 'California', lat: 34.1362, lng: -118.7606 },
    '90001': { city: 'Los Angeles', state: 'California', lat: 33.9425, lng: -118.2551 },
    '90012': { city: 'Los Angeles', state: 'California', lat: 34.0622, lng: -118.2406 },
    '90015': { city: 'Los Angeles', state: 'California', lat: 34.0393, lng: -118.2650 },
    '90210': { city: 'Beverly Hills', state: 'California', lat: 34.0901, lng: -118.4065 },
    '90301': { city: 'Inglewood', state: 'California', lat: 33.9562, lng: -118.3468 },
    '90401': { city: 'Santa Monica', state: 'California', lat: 34.0171, lng: -118.4964 },

    // Top US metros
    '10001': { city: 'New York', state: 'New York', lat: 40.7484, lng: -73.9967 },
    '10019': { city: 'New York', state: 'New York', lat: 40.7654, lng: -73.9855 },
    '10036': { city: 'New York', state: 'New York', lat: 40.7590, lng: -73.9891 },
    '11201': { city: 'Brooklyn', state: 'New York', lat: 40.6934, lng: -73.9893 },
    '60601': { city: 'Chicago', state: 'Illinois', lat: 41.8862, lng: -87.6186 },
    '60614': { city: 'Chicago', state: 'Illinois', lat: 41.9219, lng: -87.6490 },
    '60657': { city: 'Chicago', state: 'Illinois', lat: 41.9400, lng: -87.6530 },
    '77001': { city: 'Houston', state: 'Texas', lat: 29.7543, lng: -95.3536 },
    '77002': { city: 'Houston', state: 'Texas', lat: 29.7545, lng: -95.3596 },
    '77030': { city: 'Houston', state: 'Texas', lat: 29.7071, lng: -95.4013 },
    '75201': { city: 'Dallas', state: 'Texas', lat: 32.7875, lng: -96.7985 },
    '75202': { city: 'Dallas', state: 'Texas', lat: 32.7830, lng: -96.7998 },
    '78201': { city: 'San Antonio', state: 'Texas', lat: 29.4654, lng: -98.5253 },
    '78205': { city: 'San Antonio', state: 'Texas', lat: 29.4241, lng: -98.4936 },
    '92101': { city: 'San Diego', state: 'California', lat: 32.7199, lng: -117.1628 },
    '94102': { city: 'San Francisco', state: 'California', lat: 37.7793, lng: -122.4193 },
    '94103': { city: 'San Francisco', state: 'California', lat: 37.7726, lng: -122.4113 },
    '94110': { city: 'San Francisco', state: 'California', lat: 37.7488, lng: -122.4153 },
    '95101': { city: 'San Jose', state: 'California', lat: 37.3361, lng: -121.8906 },
    '78701': { city: 'Austin', state: 'Texas', lat: 30.2672, lng: -97.7431 },
    '32801': { city: 'Orlando', state: 'Florida', lat: 28.5383, lng: -81.3792 },
    '32803': { city: 'Orlando', state: 'Florida', lat: 28.5560, lng: -81.3560 },
    '33602': { city: 'Tampa', state: 'Florida', lat: 27.9516, lng: -82.4588 },
    '30301': { city: 'Atlanta', state: 'Georgia', lat: 33.7627, lng: -84.3892 },
    '30303': { city: 'Atlanta', state: 'Georgia', lat: 33.7527, lng: -84.3904 },
    '30309': { city: 'Atlanta', state: 'Georgia', lat: 33.7890, lng: -84.3833 },
    '98101': { city: 'Seattle', state: 'Washington', lat: 47.6101, lng: -122.3421 },
    '98109': { city: 'Seattle', state: 'Washington', lat: 47.6319, lng: -122.3472 },
    '80202': { city: 'Denver', state: 'Colorado', lat: 39.7530, lng: -105.0001 },
    '80203': { city: 'Denver', state: 'Colorado', lat: 39.7312, lng: -104.9827 },
    '02101': { city: 'Boston', state: 'Massachusetts', lat: 42.3601, lng: -71.0589 },
    '02116': { city: 'Boston', state: 'Massachusetts', lat: 42.3503, lng: -71.0775 },
    '19101': { city: 'Philadelphia', state: 'Pennsylvania', lat: 39.9526, lng: -75.1652 },
    '19103': { city: 'Philadelphia', state: 'Pennsylvania', lat: 39.9529, lng: -75.1727 },
    '55401': { city: 'Minneapolis', state: 'Minnesota', lat: 44.9858, lng: -93.2690 },
    '55402': { city: 'Minneapolis', state: 'Minnesota', lat: 44.9758, lng: -93.2748 },
    '48201': { city: 'Detroit', state: 'Michigan', lat: 42.3389, lng: -83.0500 },
    '48226': { city: 'Detroit', state: 'Michigan', lat: 42.3297, lng: -83.0454 },
    '63101': { city: 'St. Louis', state: 'Missouri', lat: 38.6270, lng: -90.1994 },
    '21201': { city: 'Baltimore', state: 'Maryland', lat: 39.2904, lng: -76.6122 },
    '20001': { city: 'Washington', state: 'District of Columbia', lat: 38.9072, lng: -77.0169 },
    '20003': { city: 'Washington', state: 'District of Columbia', lat: 38.8818, lng: -76.9905 },
    '28201': { city: 'Charlotte', state: 'North Carolina', lat: 35.2271, lng: -80.8431 },
    '37201': { city: 'Nashville', state: 'Tennessee', lat: 36.1627, lng: -86.7816 },
    '46201': { city: 'Indianapolis', state: 'Indiana', lat: 39.7684, lng: -86.1581 },
    '64101': { city: 'Kansas City', state: 'Missouri', lat: 39.1006, lng: -94.5783 },
    '89101': { city: 'Las Vegas', state: 'Nevada', lat: 36.1699, lng: -115.1398 },
    '89109': { city: 'Las Vegas', state: 'Nevada', lat: 36.1281, lng: -115.1614 },
    '89119': { city: 'Las Vegas', state: 'Nevada', lat: 36.0840, lng: -115.1499 },
    '15201': { city: 'Pittsburgh', state: 'Pennsylvania', lat: 40.4783, lng: -79.9550 },
    '15222': { city: 'Pittsburgh', state: 'Pennsylvania', lat: 40.4498, lng: -80.0000 },
    '45201': { city: 'Cincinnati', state: 'Ohio', lat: 39.1031, lng: -84.5120 },
    '53201': { city: 'Milwaukee', state: 'Wisconsin', lat: 43.0389, lng: -87.9065 },
    '84101': { city: 'Salt Lake City', state: 'Utah', lat: 40.7608, lng: -111.8910 },
    '44101': { city: 'Cleveland', state: 'Ohio', lat: 41.4993, lng: -81.6944 },
    '43201': { city: 'Columbus', state: 'Ohio', lat: 39.9862, lng: -83.0032 },

    // Known-failing zip: Portland, OR
    '97201': { city: 'Portland', state: 'Oregon', lat: 45.5189, lng: -122.6868 },
    '97202': { city: 'Portland', state: 'Oregon', lat: 45.4834, lng: -122.6370 },
    '97210': { city: 'Portland', state: 'Oregon', lat: 45.5267, lng: -122.7003 },
    '97214': { city: 'Portland', state: 'Oregon', lat: 45.5134, lng: -122.6430 },
};

// ─── Nominatim geocoder with retry ─────────────────────────────────────────

async function geocodeWithNominatim(zipCode: string): Promise<GeocodedLocation | null> {
    const MAX_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
                params: {
                    postalcode: zipCode,
                    country: 'United States',
                    format: 'json',
                    addressdetails: 1,
                    limit: 1,
                },
                headers: { 'User-Agent': USER_AGENT },
                timeout: 10000,
            });

            if (!response.data || response.data.length === 0) {
                // Valid response, just no results — don't retry
                console.warn(`No Nominatim results for zip: ${zipCode}`);
                return null;
            }

            const result = response.data[0];
            return {
                zip_code: zipCode,
                city: result.address?.city
                    || result.address?.town
                    || result.address?.village
                    || result.address?.hamlet
                    || result.address?.municipality
                    || 'Unknown',
                state: result.address?.state || 'Unknown',
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                cached_at: new Date().toISOString(),
            };
        } catch (error) {
            // Log full error details for debugging
            if (axios.isAxiosError(error)) {
                console.error(`Nominatim attempt ${attempt}/${MAX_ATTEMPTS} failed for ${zipCode}:`, {
                    message: error.message || '(empty)',
                    code: error.code,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                });
            } else {
                console.error(`Nominatim attempt ${attempt}/${MAX_ATTEMPTS} failed for ${zipCode}:`, error);
            }

            if (attempt < MAX_ATTEMPTS) {
                console.warn(`Retrying Nominatim for ${zipCode} in 1.5s...`);
                await new Promise(r => setTimeout(r, 1500));
            }
            // On final attempt, fall through to return null
        }
    }
    return null;
}

// ─── Hardcoded zip lookup ──────────────────────────────────────────────────

function lookupHardcodedZip(zipCode: string): GeocodedLocation | null {
    const entry = ZIP_COORDS[zipCode];
    if (!entry) return null;
    return {
        zip_code: zipCode,
        city: entry.city,
        state: entry.state,
        lat: entry.lat,
        lng: entry.lng,
        cached_at: new Date().toISOString(),
    };
}

// ─── Zippopotam.us fallback (free, no key, zip-code-optimized) ─────────────

async function geocodeWithZippopotamus(zipCode: string): Promise<GeocodedLocation | null> {
    try {
        const response = await axios.get(`https://api.zippopotam.us/us/${zipCode}`, {
            timeout: 10000,
            headers: { 'User-Agent': USER_AGENT },
        });

        const place = response.data?.places?.[0];
        if (!place) {
            console.warn(`No Zippopotam.us results for zip: ${zipCode}`);
            return null;
        }

        return {
            zip_code: zipCode,
            city: place['place name'] || 'Unknown',
            state: place.state || 'Unknown',
            lat: parseFloat(place.latitude),
            lng: parseFloat(place.longitude),
            cached_at: new Date().toISOString(),
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`Zippopotam.us failed for ${zipCode}:`, {
                message: error.message || '(empty)',
                code: error.code,
                status: error.response?.status,
            });
        } else {
            console.error(`Zippopotam.us failed for ${zipCode}:`, error);
        }
        return null;
    }
}

// ─── Main geocoding function with fallback chain ────────────────────────────

/**
 * Geocode a US zip code using fallback chain:
 * 1. Redis cache
 * 2. Supabase cache
 * 3. Nominatim (with 1 retry)
 * 4. Hardcoded ZIP_COORDS table
 * 5. Zippopotam.us API
 */
export async function geocodeZipCode(zipCode: string): Promise<GeocodedLocation | null> {
    // 1. Check Redis cache
    const redisCache = await getCachedGeocodeRedis(zipCode);
    if (redisCache) {
        console.log(`Geocode cache hit (Redis): ${zipCode}`);
        return redisCache;
    }

    // 2. Check Supabase cache
    try {
        const supabase = createServerClient();
        const { data: supabaseCache } = await getCachedGeocodeSupabase(supabase, zipCode);
        if (supabaseCache) {
            console.log(`Geocode cache hit (Supabase): ${zipCode}`);
            await cacheGeocodeRedis(supabaseCache);
            return supabaseCache;
        }
    } catch (error) {
        console.error('Supabase geocode cache check failed:', error);
    }

    // 3. Cache miss — run fallback chain
    console.log(`Geocoding zip code: ${zipCode} (cache miss — trying providers)`);

    // Attempt 1: Nominatim (with retry)
    let geocoded = await geocodeWithNominatim(zipCode);
    if (geocoded) {
        console.log(`Nominatim success for ${zipCode}: ${geocoded.city}, ${geocoded.state}`);
    }

    // Attempt 2: Hardcoded lookup table
    if (!geocoded) {
        console.log(`Trying hardcoded lookup for ${zipCode}...`);
        geocoded = lookupHardcodedZip(zipCode);
        if (geocoded) console.log(`Hardcoded hit: ${geocoded.city}, ${geocoded.state}`);
    }

    // Attempt 3: Zippopotam.us
    if (!geocoded) {
        console.log(`Trying Zippopotam.us for ${zipCode}...`);
        geocoded = await geocodeWithZippopotamus(zipCode);
        if (geocoded) console.log(`Zippopotam.us hit: ${geocoded.city}, ${geocoded.state}`);
    }

    // All providers failed
    if (!geocoded) {
        console.error(`All geocoding providers failed for ${zipCode}`);
        return null;
    }

    // Cache the result regardless of which provider succeeded
    await cacheGeocodeRedis(geocoded);
    try {
        const supabase = createServerClient();
        await cacheGeocodeSupabase(supabase, geocoded);
    } catch (error) {
        console.error('Failed to cache geocode in Supabase:', error);
    }

    return geocoded;
}

/**
 * Batch geocode multiple zip codes
 * Respects Nominatim rate limit (1 req/sec)
 */
export async function batchGeocodeZipCodes(
    zipCodes: string[],
    delayMs: number = 1100
): Promise<Map<string, GeocodedLocation>> {
    const results = new Map<string, GeocodedLocation>();

    for (const zip of zipCodes) {
        const geocoded = await geocodeZipCode(zip);
        if (geocoded) {
            results.set(zip, geocoded);
        }
        // Rate limit - wait between requests
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    return results;
}

/**
 * Get city name for a zip code (cached)
 */
export async function getCityForZip(zipCode: string): Promise<string> {
    const geocoded = await geocodeZipCode(zipCode);
    if (geocoded) {
        return `${geocoded.city}, ${geocoded.state}`;
    }
    return 'Unknown Location';
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in miles
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Get bounding box for a radius around a point
 */
export function getBoundingBox(
    lat: number,
    lng: number,
    radiusMiles: number
): { north: number; south: number; east: number; west: number } {
    // Approximate degrees per mile at given latitude
    const latDegPerMile = 1 / 69.0;
    const lngDegPerMile = 1 / (69.0 * Math.cos(toRad(lat)));

    return {
        north: lat + (radiusMiles * latDegPerMile),
        south: lat - (radiusMiles * latDegPerMile),
        east: lng + (radiusMiles * lngDegPerMile),
        west: lng - (radiusMiles * lngDegPerMile),
    };
}
