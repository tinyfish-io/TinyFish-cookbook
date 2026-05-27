// =============================================
// Wing Command v4 — Geocoding
// No Redis. No Supabase. Pure fetch.
// Fallback chain: hardcoded table → Nominatim → Zippopotam.us
// =============================================

export interface GeocodedLocation {
  zip_code: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

// ─── Hardcoded fast-path ──────────────────────────────────────────────────
const ZIP_COORDS: Record<string, { city: string; state: string; lat: number; lng: number }> = {
  '70112': { city: 'New Orleans', state: 'Louisiana', lat: 29.9544, lng: -90.0703 },
  '70130': { city: 'New Orleans', state: 'Louisiana', lat: 29.9348, lng: -90.0854 },
  '33101': { city: 'Miami', state: 'Florida', lat: 25.7751, lng: -80.1947 },
  '33130': { city: 'Miami', state: 'Florida', lat: 25.7672, lng: -80.2042 },
  '85001': { city: 'Phoenix', state: 'Arizona', lat: 33.4484, lng: -112.0773 },
  '85281': { city: 'Tempe', state: 'Arizona', lat: 33.4148, lng: -111.9093 },
  '90001': { city: 'Los Angeles', state: 'California', lat: 33.9425, lng: -118.2551 },
  '90015': { city: 'Los Angeles', state: 'California', lat: 34.0393, lng: -118.2650 },
  '90210': { city: 'Beverly Hills', state: 'California', lat: 34.0901, lng: -118.4065 },
  '90301': { city: 'Inglewood', state: 'California', lat: 33.9562, lng: -118.3468 },
  '10001': { city: 'New York', state: 'New York', lat: 40.7484, lng: -73.9967 },
  '10019': { city: 'New York', state: 'New York', lat: 40.7654, lng: -73.9855 },
  '11201': { city: 'Brooklyn', state: 'New York', lat: 40.6934, lng: -73.9893 },
  '60601': { city: 'Chicago', state: 'Illinois', lat: 41.8862, lng: -87.6186 },
  '60614': { city: 'Chicago', state: 'Illinois', lat: 41.9219, lng: -87.6490 },
  '77001': { city: 'Houston', state: 'Texas', lat: 29.7543, lng: -95.3536 },
  '75201': { city: 'Dallas', state: 'Texas', lat: 32.7875, lng: -96.7985 },
  '78701': { city: 'Austin', state: 'Texas', lat: 30.2672, lng: -97.7431 },
  '78201': { city: 'San Antonio', state: 'Texas', lat: 29.4654, lng: -98.5253 },
  '92101': { city: 'San Diego', state: 'California', lat: 32.7199, lng: -117.1628 },
  '94102': { city: 'San Francisco', state: 'California', lat: 37.7793, lng: -122.4193 },
  '94110': { city: 'San Francisco', state: 'California', lat: 37.7488, lng: -122.4153 },
  '95101': { city: 'San Jose', state: 'California', lat: 37.3361, lng: -121.8906 },
  '32801': { city: 'Orlando', state: 'Florida', lat: 28.5383, lng: -81.3792 },
  '33602': { city: 'Tampa', state: 'Florida', lat: 27.9516, lng: -82.4588 },
  '30301': { city: 'Atlanta', state: 'Georgia', lat: 33.7627, lng: -84.3892 },
  '30309': { city: 'Atlanta', state: 'Georgia', lat: 33.7890, lng: -84.3833 },
  '98101': { city: 'Seattle', state: 'Washington', lat: 47.6101, lng: -122.3421 },
  '80202': { city: 'Denver', state: 'Colorado', lat: 39.7530, lng: -105.0001 },
  '02101': { city: 'Boston', state: 'Massachusetts', lat: 42.3601, lng: -71.0589 },
  '02116': { city: 'Boston', state: 'Massachusetts', lat: 42.3503, lng: -71.0775 },
  '19101': { city: 'Philadelphia', state: 'Pennsylvania', lat: 39.9526, lng: -75.1652 },
  '55401': { city: 'Minneapolis', state: 'Minnesota', lat: 44.9858, lng: -93.2690 },
  '48201': { city: 'Detroit', state: 'Michigan', lat: 42.3389, lng: -83.0500 },
  '20001': { city: 'Washington', state: 'District of Columbia', lat: 38.9072, lng: -77.0169 },
  '28201': { city: 'Charlotte', state: 'North Carolina', lat: 35.2271, lng: -80.8431 },
  '37201': { city: 'Nashville', state: 'Tennessee', lat: 36.1627, lng: -86.7816 },
  '46201': { city: 'Indianapolis', state: 'Indiana', lat: 39.7684, lng: -86.1581 },
  '89101': { city: 'Las Vegas', state: 'Nevada', lat: 36.1699, lng: -115.1398 },
  '89109': { city: 'Las Vegas', state: 'Nevada', lat: 36.1281, lng: -115.1614 },
  '15201': { city: 'Pittsburgh', state: 'Pennsylvania', lat: 40.4783, lng: -79.9550 },
  '43201': { city: 'Columbus', state: 'Ohio', lat: 39.9862, lng: -83.0032 },
  '97201': { city: 'Portland', state: 'Oregon', lat: 45.5189, lng: -122.6868 },
  '97214': { city: 'Portland', state: 'Oregon', lat: 45.5134, lng: -122.6430 },
  '84101': { city: 'Salt Lake City', state: 'Utah', lat: 40.7608, lng: -111.8910 },
};

// ─── Nominatim ────────────────────────────────────────────────────────────
async function geocodeWithNominatim(zipCode: string): Promise<GeocodedLocation | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('postalcode', zipCode);
    url.searchParams.set('country', 'United States');
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'WingCommand/4.0' },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!data?.length) return null;

    const r = data[0];
    return {
      zip_code: zipCode,
      city: r.address?.city || r.address?.town || r.address?.village || 'Unknown',
      state: r.address?.state || 'Unknown',
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    };
  } catch {
    return null;
  }
}

// ─── Zippopotam.us ────────────────────────────────────────────────────────
async function geocodeWithZippopotamus(zipCode: string): Promise<GeocodedLocation | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zipCode}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) return null;
    return {
      zip_code: zipCode,
      city: place['place name'] || 'Unknown',
      state: place.state || 'Unknown',
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
    };
  } catch {
    return null;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────
export async function geocodeZipCode(zipCode: string): Promise<GeocodedLocation | null> {
  // 1. Hardcoded table (instant)
  const entry = ZIP_COORDS[zipCode];
  if (entry) return { zip_code: zipCode, ...entry };

  // 2. Nominatim
  const nominatim = await geocodeWithNominatim(zipCode);
  if (nominatim) return nominatim;

  // 3. Zippopotam.us
  return geocodeWithZippopotamus(zipCode);
}
