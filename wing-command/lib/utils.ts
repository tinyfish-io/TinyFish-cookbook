// ===========================================
// Wing Scout v3 — Utility Functions
// "Wing-plosion" Comic Book Edition
// ===========================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { WingSpot, WingStatus, CountdownTime, AvailabilityStats, PopularCity, FlavorPersona, FlavorPersonaInfo } from './types';

/**
 * Merge class names with Tailwind conflict resolution
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

// ===========================================
// Flavor Personas
// ===========================================

export const FLAVOR_PERSONAS: FlavorPersonaInfo[] = [
    {
        id: 'face-melter',
        label: 'The Face-Melter',
        subtitle: 'Habanero / Ghost Pepper',
        keywords: ['habanero', 'ghost pepper', 'carolina reaper', 'scorpion', 'inferno', 'atomic', 'blazin', 'nuclear', 'fire', 'extra hot', 'xxx hot', 'insanity', 'mango habanero', 'spicy', 'hot'],
        emoji: '🔥',
        color: '#ff4136',
    },
    {
        id: 'classicist',
        label: 'The Classicist',
        subtitle: 'Buffalo / Hot / Mild',
        keywords: ['buffalo', 'hot', 'mild', 'medium', 'traditional', 'classic', 'plain', 'original', 'cayenne', 'frank', 'new york', 'anchor bar'],
        emoji: '🦬',
        color: '#ff851b',
    },
    {
        id: 'sticky-finger',
        label: 'The Sticky Finger',
        subtitle: 'Honey BBQ / Garlic Parm',
        keywords: ['honey', 'bbq', 'barbecue', 'garlic', 'parmesan', 'teriyaki', 'sweet', 'sticky', 'glazed', 'korean', 'sesame', 'maple', 'brown sugar', 'asian', 'thai', 'lemon pepper'],
        emoji: '🍯',
        color: '#ffdc00',
    },
];

export function getFlavorPersona(id: FlavorPersona): FlavorPersonaInfo {
    return FLAVOR_PERSONAS.find(p => p.id === id) || FLAVOR_PERSONAS[1];
}

/**
 * Score a menu item name against a flavor persona (0-100)
 */
export function scoreFlavorMatch(itemName: string, persona: FlavorPersonaInfo): number {
    const lower = itemName.toLowerCase();
    let score = 0;
    let matchCount = 0;

    for (const keyword of persona.keywords) {
        if (lower.includes(keyword)) {
            matchCount++;
            score += Math.min(keyword.length * 5, 30);
        }
    }

    if (matchCount === 0) return 0;
    return Math.min(100, score);
}

/**
 * Score a wing spot against a flavor persona based on its flavor_tags and menu_json
 */
export function scoreSpotFlavor(spot: WingSpot, persona: FlavorPersonaInfo): number {
    let bestScore = 0;

    if (spot.flavor_tags) {
        for (const tag of spot.flavor_tags) {
            const tagScore = scoreFlavorMatch(tag, persona);
            if (tagScore > bestScore) bestScore = tagScore;
        }
    }

    if (spot.menu_json) {
        for (const item of spot.menu_json) {
            const itemScore = scoreFlavorMatch(item.name, persona);
            if (itemScore > bestScore) bestScore = itemScore;
            if (item.description) {
                const descScore = scoreFlavorMatch(item.description, persona);
                if (descScore > bestScore) bestScore = descScore;
            }
        }
    }

    if (!spot.flavor_tags?.length && !spot.menu_json?.length) {
        bestScore = 30;
    }

    return bestScore;
}

// ===========================================
// Super Bowl LX
// ===========================================

export const SUPER_BOWL_DATE = new Date('2026-02-08T18:30:00-05:00');

export function getCountdown(targetDate: Date = SUPER_BOWL_DATE): CountdownTime {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }

    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isPast: false,
    };
}

export function formatCountdown(countdown: CountdownTime): string {
    if (countdown.isPast) return 'GAME TIME!';
    const parts: string[] = [];
    if (countdown.days > 0) parts.push(`${countdown.days}d`);
    parts.push(`${countdown.hours.toString().padStart(2, '0')}h`);
    parts.push(`${countdown.minutes.toString().padStart(2, '0')}m`);
    parts.push(`${countdown.seconds.toString().padStart(2, '0')}s`);
    return parts.join(' ');
}

// ===========================================
// Validation
// ===========================================

export function isValidZipCode(zip: string): boolean {
    return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

export function cleanZipCode(zip: string): string {
    return zip.trim().substring(0, 5);
}

// ===========================================
// Status
// ===========================================

export function calculateStatus(spot: Partial<WingSpot>): WingStatus {
    if (!spot.is_in_stock || !spot.is_open_now) return 'red';

    const hasGoodPrice = spot.price_per_wing != null && spot.price_per_wing <= 1.50;
    const hasDeal = !!spot.deal_text;
    const hasFastDelivery =
        (spot.delivery_time_mins != null && spot.delivery_time_mins < 45) ||
        (spot.wait_time_mins != null && spot.wait_time_mins < 45);
    const openDuringGame = spot.opens_during_game !== false;

    if ((hasGoodPrice || hasDeal) && hasFastDelivery && openDuringGame) return 'green';
    return 'yellow';
}

export function calculateAvailability(spots: WingSpot[]): AvailabilityStats {
    const total = spots.length;
    const green = spots.filter(s => s.status === 'green').length;
    const yellow = spots.filter(s => s.status === 'yellow').length;
    const red = spots.filter(s => s.status === 'red').length;
    const percentage = total > 0 ? Math.round((green / total) * 100) : 0;
    return { total, green, yellow, red, percentage };
}

// ===========================================
// Formatting
// ===========================================

export function formatPrice(price: number | null): string {
    if (price === null) return 'Price N/A';
    return `$${price.toFixed(2)}`;
}

export function formatPricePerWing(price: number | null): string {
    if (price === null) return '';
    return `$${price.toFixed(2)}/wing`;
}

export function formatDeliveryTime(mins: number | null): string {
    if (mins === null) return 'Time N/A';
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
}

export function getStatusEmoji(status: WingStatus): string {
    switch (status) {
        case 'green': return '🟢';
        case 'yellow': return '🟡';
        case 'red': return '🔴';
        default: return '⚪';
    }
}

export function getStatusColorClass(status: WingStatus): string {
    switch (status) {
        case 'green': return 'text-wing-green bg-wing-green/20';
        case 'yellow': return 'text-amber-800 bg-amber-100';
        case 'red': return 'text-wing-red bg-wing-red/20';
        default: return 'text-gray-400 bg-gray-400/20';
    }
}

export function getStatusBorderClass(status: WingStatus): string {
    switch (status) {
        case 'green': return 'border-wing-green';
        case 'yellow': return 'border-wing-yellow';
        case 'red': return 'border-wing-red';
        default: return 'border-gray-500';
    }
}

export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}

export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

export function getGoogleMapsUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function getOrderSearchUrl(name: string, address: string): string {
    return `https://www.google.com/search?q=${encodeURIComponent(`${name} near ${address} order online`)}`;
}

export function getTelLink(phone: string): string {
    return `tel:+1${phone.replace(/\D/g, '')}`;
}

/**
 * Get the best order URL for a spot — prefers platform URL over Google search
 */
export function getOrderUrl(spot: WingSpot): string {
    if (spot.platform_ids?.source_url) return spot.platform_ids.source_url;
    return getOrderSearchUrl(spot.name, spot.address);
}

/**
 * Get human-readable platform label from a URL
 */
export function getPlatformLabel(url: string): string {
    if (url.includes('doordash')) return 'DoorDash';
    if (url.includes('ubereats')) return 'Uber Eats';
    if (url.includes('grubhub')) return 'Grubhub';
    if (url.includes('google.com/search')) return 'Order Online';
    return 'Order Online';
}

export function randomDelay(minMs = 2000, maxMs = 5000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.random() * (maxMs - minMs) + minMs));
}

// ===========================================
// Popular Cities
// ===========================================

export const POPULAR_CITIES: PopularCity[] = [
    { name: 'New York', state: 'NY', zip: '10001' },
    { name: 'Los Angeles', state: 'CA', zip: '90001' },
    { name: 'Chicago', state: 'IL', zip: '60601' },
    { name: 'Houston', state: 'TX', zip: '77001' },
    { name: 'Phoenix', state: 'AZ', zip: '85001' },
    { name: 'Philadelphia', state: 'PA', zip: '19101' },
    { name: 'San Antonio', state: 'TX', zip: '78201' },
    { name: 'San Diego', state: 'CA', zip: '92101' },
    { name: 'Dallas', state: 'TX', zip: '75201' },
    { name: 'San Jose', state: 'CA', zip: '95101' },
    { name: 'Austin', state: 'TX', zip: '78701' },
    { name: 'Jacksonville', state: 'FL', zip: '32099' },
    { name: 'Fort Worth', state: 'TX', zip: '76101' },
    { name: 'Columbus', state: 'OH', zip: '43085' },
    { name: 'Indianapolis', state: 'IN', zip: '46201' },
    { name: 'Charlotte', state: 'NC', zip: '28201' },
    { name: 'San Francisco', state: 'CA', zip: '94102' },
    { name: 'Seattle', state: 'WA', zip: '98101' },
    { name: 'Denver', state: 'CO', zip: '80201' },
    { name: 'Boston', state: 'MA', zip: '02101' },
    { name: 'Las Vegas', state: 'NV', zip: '89101' },
    { name: 'Miami', state: 'FL', zip: '33101' },
    { name: 'Atlanta', state: 'GA', zip: '30301' },
    { name: 'Kansas City', state: 'MO', zip: '64101' },
    { name: 'New Orleans', state: 'LA', zip: '70112' },
    { name: 'Tampa', state: 'FL', zip: '33601' },
    { name: 'Minneapolis', state: 'MN', zip: '55401' },
    { name: 'Glendale', state: 'AZ', zip: '85301' },
    { name: 'Inglewood', state: 'CA', zip: '90301' },
    { name: 'Arlington', state: 'TX', zip: '76010' },
];

// ===========================================
// Deduplication
// ===========================================

export function normalizeRestaurantName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s*-\s*(doordash|uber\s*eats|grubhub|yelp|delivery|pickup|order\s*online).*$/i, '')
        .replace(/\s*\((doordash|uber\s*eats|grubhub|yelp)\)$/i, '')
        .replace(/[''`]/g, "'")
        .replace(/[^\w\s'-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeAddress(address: string): string {
    return address
        .toLowerCase()
        .trim()
        .replace(/\bstreet\b/g, 'st')
        .replace(/\bavenue\b/g, 'ave')
        .replace(/\bboulevard\b/g, 'blvd')
        .replace(/\bdrive\b/g, 'dr')
        .replace(/\broad\b/g, 'rd')
        .replace(/\blane\b/g, 'ln')
        .replace(/\bcourt\b/g, 'ct')
        .replace(/\bplace\b/g, 'pl')
        .replace(/\bapartment\b/g, 'apt')
        .replace(/\bsuite\b/g, 'ste')
        .replace(/\bnorth\b/g, 'n')
        .replace(/\bsouth\b/g, 's')
        .replace(/\beast\b/g, 'e')
        .replace(/\bwest\b/g, 'w')
        .replace(/[,#.]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getRestaurantDedupeKey(name: string, address: string): string {
    return `${normalizeRestaurantName(name)}|${normalizeAddress(address).substring(0, 30)}`;
}

export function deduplicateWingSpots(spots: WingSpot[]): WingSpot[] {
    const seen = new Map<string, WingSpot>();
    const statusPriority: Record<WingStatus, number> = { green: 3, yellow: 2, red: 1 };

    for (const spot of spots) {
        const key = getRestaurantDedupeKey(spot.name, spot.address);
        const existing = seen.get(key);

        if (!existing) {
            seen.set(key, spot);
            continue;
        }

        const existingP = statusPriority[existing.status] || 0;
        const newP = statusPriority[spot.status] || 0;
        let shouldReplace = false;

        if (newP > existingP) {
            shouldReplace = true;
        } else if (newP === existingP) {
            const ep = existing.price_per_wing ?? Infinity;
            const np = spot.price_per_wing ?? Infinity;
            if (np < ep) {
                shouldReplace = true;
            } else if (np === ep) {
                if ((spot.delivery_time_mins ?? Infinity) < (existing.delivery_time_mins ?? Infinity)) {
                    shouldReplace = true;
                }
            }
        }

        if (shouldReplace) {
            seen.set(key, { ...spot, deal_text: spot.deal_text || existing.deal_text });
        }
    }

    return Array.from(seen.values());
}

export const TOP_ZIP_CODES: string[] = [
    '10001', '10002', '10003', '10004', '10005', '10006', '10007', '10011', '10012', '10013',
    '10014', '10016', '10017', '10018', '10019', '10020', '10021', '10022', '10023', '10024',
    '11201', '11211', '11215', '11217', '11222', '11225', '11226', '11229', '11230', '11231',
    '90001', '90002', '90003', '90004', '90005', '90006', '90007', '90008', '90010', '90011',
    '90012', '90013', '90014', '90015', '90016', '90017', '90018', '90019', '90020', '90021',
    '90210', '90024', '90025', '90034', '90035', '90036', '90038', '90046', '90048', '90049',
    '60601', '60602', '60603', '60604', '60605', '60606', '60607', '60608', '60609', '60610',
    '60611', '60612', '60613', '60614', '60615', '60616', '60617', '60618', '60619', '60620',
    '77001', '77002', '77003', '77004', '77005', '77006', '77007', '77008', '77009', '77010',
    '85001', '85002', '85003', '85004', '85005', '85006', '85007', '85008', '85009', '85010',
    '19101', '19102', '19103', '19104', '19106', '19107', '19109', '19111', '19114', '19115',
    '78201', '78202', '78203', '78204', '78205', '78207', '78208', '78209', '78210', '78211',
    '92101', '92102', '92103', '92104', '92105', '92106', '92107', '92108', '92109', '92110',
    '75201', '75202', '75203', '75204', '75205', '75206', '75207', '75208', '75209', '75210',
    '94102', '94103', '94104', '94105', '94107', '94108', '94109', '94110', '94111', '94112',
    '98101', '98102', '98103', '98104',
    '80201', '80202', '80203', '80204',
    '02101', '02102', '02103', '02108',
    '33101', '33109', '33125', '33126',
    '30301', '30303', '30305', '30306',
];
