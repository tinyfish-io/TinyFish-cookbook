// ===========================================
// Wing Scout — Chain Wing Price Lookup
// Hardcoded typical per-wing price ranges for major chains.
// Used as estimation when no scraped price is available.
// ===========================================

export interface ChainPriceRange {
    min: number;  // typical low $/wing
    max: number;  // typical high $/wing
}

/**
 * Known chain wing price ranges (per bone-in wing).
 * Keys are lowercase normalized chain identifiers (substrings to match against).
 * Prices reflect typical 2025-2026 US averages for bone-in traditional wings.
 */
const CHAIN_PRICE_MAP: Record<string, ChainPriceRange> = {
    'wingstop':           { min: 1.20, max: 1.60 },
    'buffalo wild wings': { min: 1.40, max: 1.90 },
    'bdubs':              { min: 1.40, max: 1.90 },
    'hooters':            { min: 1.50, max: 1.80 },
    'popeyes':            { min: 1.00, max: 1.40 },
    'kfc':                { min: 1.10, max: 1.50 },
    'raising cane':       { min: 1.30, max: 1.70 },
    'zaxby':              { min: 1.20, max: 1.60 },
    'bonchon':            { min: 1.60, max: 2.20 },
    'bb.q chicken':       { min: 1.50, max: 2.00 },
    'bbq chicken':        { min: 1.50, max: 2.00 },
    'daves hot chicken':  { min: 1.40, max: 1.90 },
    'wing zone':          { min: 1.20, max: 1.60 },
    'slim chickens':      { min: 1.20, max: 1.60 },
    'atomic wings':       { min: 1.30, max: 1.70 },
    'wing it on':         { min: 1.20, max: 1.60 },
    'domino':             { min: 1.20, max: 1.60 },
    'pizza hut':          { min: 1.10, max: 1.50 },
    'papa john':          { min: 1.20, max: 1.50 },
    'applebee':           { min: 1.30, max: 1.70 },
    'chilis':             { min: 1.30, max: 1.70 },
    'pluckers':           { min: 1.40, max: 1.80 },
    'hurricane grill':    { min: 1.50, max: 2.00 },
    'wing shack':         { min: 1.10, max: 1.50 },
    'roosters':           { min: 1.20, max: 1.60 },
    'golden chick':       { min: 1.10, max: 1.50 },
    'churchs chicken':    { min: 1.00, max: 1.40 },
    'el pollo loco':      { min: 1.10, max: 1.50 },
};

/**
 * Look up estimated price range for a restaurant by name.
 * Uses substring matching (same approach as getRestaurantType in ScoutingReportCard).
 * Returns null if no chain match is found.
 */
export function getChainPriceEstimate(restaurantName: string): ChainPriceRange | null {
    const normalized = restaurantName
        .toLowerCase()
        .trim()
        .replace(/\s*#\d+.*$/, '')     // Strip "#1234" store numbers
        .replace(/\s*-\s*.*$/, '')      // Strip suffixes like " - Downtown"
        .replace(/^the\s+/, '')          // Strip leading "The"
        .replace(/['']/g, '')            // Normalize apostrophes
        .replace(/\s+/g, ' ')           // Collapse whitespace
        .trim();

    for (const [chain, priceRange] of Object.entries(CHAIN_PRICE_MAP)) {
        if (normalized.includes(chain)) {
            return priceRange;
        }
    }
    return null;
}
