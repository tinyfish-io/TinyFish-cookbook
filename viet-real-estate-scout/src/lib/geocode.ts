// Nominatim (OpenStreetMap) geocoding utilities for Vietnamese addresses

export interface GeoResult {
  lat: number;
  lng: number;
  display_name: string;
}

// Geocode a Vietnamese address using Nominatim (OSM) — no API key required
export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const query = `${address}, Vietnam`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=vn`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VietRealEstateScout/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lng),
      display_name: data[0].display_name,
    };
  } catch {
    return null;
  }
}

// Batch geocode with rate limiting (Nominatim policy: 1 req/sec max)
// Pass AbortSignal to cancel mid-batch (e.g. when user starts new search)
export async function batchGeocode(
  addresses: string[],
  signal?: AbortSignal,
): Promise<Map<string, GeoResult>> {
  const results = new Map<string, GeoResult>();
  const unique = [...new Set(addresses.filter(Boolean))].slice(0, 15); // Cap at 15

  for (const addr of unique) {
    if (signal?.aborted) break;
    const result = await geocodeAddress(addr);
    if (result) results.set(addr, result);
    await new Promise(r => setTimeout(r, 1100)); // Respect 1 req/sec limit
  }
  return results;
}
