// ===========================================
// Wing Scout — Seed Data Generator
// Realistic wing spot data for demo / fallback
// ===========================================

import { WingSpot, FlavorPersona } from './types';
import { calculateStatus, getFlavorPersona, scoreSpotFlavor } from './utils';

interface SeedRestaurant {
    name: string;
    type: 'chain' | 'local';
    source: 'doordash' | 'ubereats' | 'grubhub' | 'google';
    price_per_wing: number | null;
    deal_text: string | null;
    delivery_time_mins: number | null;
    phone: string | null;
    image_url: string | null;
    flavor_tags: string[];
    is_open_now: boolean;
    is_in_stock: boolean;
}

// Pool of realistic restaurants — these get picked randomly per zip
const RESTAURANT_POOL: SeedRestaurant[] = [
    {
        name: 'Buffalo Wild Wings',
        type: 'chain',
        source: 'doordash',
        price_per_wing: 1.49,
        deal_text: 'BOGO Wings on Game Day',
        delivery_time_mins: 25,
        phone: '(555) 100-2000',
        image_url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',
        flavor_tags: ['buffalo', 'hot', 'mild', 'blazin', 'honey bbq', 'garlic parmesan', 'mango habanero'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: 'Wingstop',
        type: 'chain',
        source: 'ubereats',
        price_per_wing: 1.29,
        deal_text: '70¢ Boneless Wings Thursday',
        delivery_time_mins: 20,
        phone: '(555) 200-3000',
        image_url: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400&h=300&fit=crop',
        flavor_tags: ['atomic', 'mango habanero', 'cajun', 'lemon pepper', 'garlic parmesan', 'hickory smoked bbq'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: "Tony's Sports Bar & Grill",
        type: 'local',
        source: 'google',
        price_per_wing: 0.99,
        deal_text: 'Game Day Special: 50 Wings for $39.99',
        delivery_time_mins: null,
        phone: '(555) 300-4000',
        image_url: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=400&h=300&fit=crop',
        flavor_tags: ['buffalo', 'hot', 'garlic', 'bbq', 'teriyaki'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: 'Atomic Wings',
        type: 'local',
        source: 'grubhub',
        price_per_wing: 1.59,
        deal_text: null,
        delivery_time_mins: 35,
        phone: '(555) 400-5000',
        image_url: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop',
        flavor_tags: ['atomic', 'nuclear', 'ghost pepper', 'carolina reaper', 'inferno', 'habanero'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: "Hooters",
        type: 'chain',
        source: 'doordash',
        price_per_wing: 1.69,
        deal_text: 'All You Can Eat Wings $19.99',
        delivery_time_mins: 30,
        phone: '(555) 500-6000',
        image_url: 'https://images.unsplash.com/photo-1614398751058-56b6c5e1c85b?w=400&h=300&fit=crop',
        flavor_tags: ['buffalo', 'hot', 'mild', 'daytona beach', 'samurai', 'caribbean jerk'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: "Firehouse Wings",
        type: 'local',
        source: 'google',
        price_per_wing: 1.15,
        deal_text: '$1 Wings Happy Hour 4-7pm',
        delivery_time_mins: null,
        phone: '(555) 600-7000',
        image_url: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=400&h=300&fit=crop',
        flavor_tags: ['fire', 'extra hot', 'scorpion', 'honey', 'garlic butter', 'classic buffalo'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: 'Dominos Pizza',
        type: 'chain',
        source: 'ubereats',
        price_per_wing: 1.39,
        deal_text: '8pc Wings + Large Pizza $19.99',
        delivery_time_mins: 22,
        phone: '(555) 700-8000',
        image_url: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop',
        flavor_tags: ['plain', 'hot buffalo', 'sweet mango habanero', 'bbq', 'garlic parmesan'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: "Big Mike's Wing Shack",
        type: 'local',
        source: 'google',
        price_per_wing: 0.89,
        deal_text: 'Best Wings in Town — $8.99/dozen',
        delivery_time_mins: null,
        phone: '(555) 800-9000',
        image_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
        flavor_tags: ['honey bbq', 'garlic parm', 'lemon pepper', 'sticky', 'glazed', 'korean'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: "Raising Cane's",
        type: 'chain',
        source: 'doordash',
        price_per_wing: null,
        deal_text: null,
        delivery_time_mins: 18,
        phone: '(555) 900-1000',
        image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
        flavor_tags: ['classic', 'original'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: "Wing Zone",
        type: 'chain',
        source: 'grubhub',
        price_per_wing: 1.35,
        deal_text: 'Free delivery over $20',
        delivery_time_mins: 28,
        phone: '(555) 110-2200',
        image_url: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&h=300&fit=crop',
        flavor_tags: ['nuclear', 'inferno', 'blazin', 'honey mustard', 'teriyaki', 'thai chili', 'sesame'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: "The Angry Chicken",
        type: 'local',
        source: 'google',
        price_per_wing: 1.10,
        deal_text: '20% off for Super Bowl Sunday',
        delivery_time_mins: null,
        phone: '(555) 330-4400',
        image_url: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&h=300&fit=crop',
        flavor_tags: ['ghost pepper', 'carolina reaper', 'habanero', 'extra hot', 'fire'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: "Papa's Pizza & Wings",
        type: 'local',
        source: 'ubereats',
        price_per_wing: 1.45,
        deal_text: null,
        delivery_time_mins: 40,
        phone: '(555) 550-6600',
        image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
        flavor_tags: ['buffalo', 'plain', 'bbq', 'garlic', 'mild'],
        is_open_now: false,
        is_in_stock: true,
    },
    {
        name: "Golden Dragon Chinese",
        type: 'local',
        source: 'grubhub',
        price_per_wing: 0.95,
        deal_text: 'Lunch combo: 10 wings + fried rice $10.99',
        delivery_time_mins: 32,
        phone: '(555) 770-8800',
        image_url: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&h=300&fit=crop',
        flavor_tags: ['sweet chili', 'sesame', 'teriyaki', 'honey garlic', 'korean', 'asian', 'sticky'],
        is_open_now: true,
        is_in_stock: true,
    },
    {
        name: "Popeyes Louisiana Kitchen",
        type: 'chain',
        source: 'doordash',
        price_per_wing: 1.25,
        deal_text: '5pc Wings $4.99 Tuesday',
        delivery_time_mins: 15,
        phone: '(555) 990-1100',
        image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop',
        flavor_tags: ['cajun', 'spicy', 'mild', 'classic', 'original'],
        is_open_now: true,
        is_in_stock: true,
    },
];

// Realistic street name parts
const STREETS = [
    'Main St', 'Broadway', 'Oak Ave', 'Elm St', 'Park Blvd', 'Market St',
    'Washington Ave', 'Lincoln Hwy', 'Maple Dr', 'Cedar Ln', 'Pine St',
    'Jackson Blvd', 'Lake Shore Dr', 'Highland Ave', 'Roosevelt Rd',
];

/**
 * Generate seed wing spots for a given zip code
 * Picks 8-12 random restaurants, assigns them addresses near the geocoded location
 */
export function generateSeedData(
    zipCode: string,
    lat: number,
    lng: number,
    cityName: string,
    stateName: string,
    flavor?: FlavorPersona
): WingSpot[] {
    // Deterministic shuffle based on zip for consistency
    const seed = parseInt(zipCode, 10);
    const shuffled = [...RESTAURANT_POOL].sort((a, b) => {
        const hashA = ((seed * 31 + a.name.charCodeAt(0)) % 1000) / 1000;
        const hashB = ((seed * 31 + b.name.charCodeAt(0)) % 1000) / 1000;
        return hashA - hashB;
    });

    // Pick 8-12 restaurants
    const count = 8 + (seed % 5); // 8-12
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    const spots: WingSpot[] = selected.map((r, idx) => {
        const streetNum = 100 + ((seed * (idx + 1)) % 9900);
        const street = STREETS[(seed + idx) % STREETS.length];
        const address = `${streetNum} ${street}, ${cityName}, ${stateName}`;

        // Jitter lat/lng slightly for each spot
        const jitterLat = (((seed * (idx + 3)) % 100) - 50) * 0.0004;
        const jitterLng = (((seed * (idx + 7)) % 100) - 50) * 0.0004;

        const spot: WingSpot = {
            id: `seed-${zipCode}-${idx}-${r.source}`,
            name: r.name,
            address,
            lat: lat + jitterLat,
            lng: lng + jitterLng,
            price_per_wing: r.price_per_wing,
            cheapest_item_price: null,
            deal_text: r.deal_text,
            delivery_time_mins: r.delivery_time_mins,
            wait_time_mins: null,
            is_in_stock: r.is_in_stock,
            is_open_now: r.is_open_now,
            opens_during_game: true,
            hours_today: r.is_open_now ? '11:00 AM - 11:00 PM' : 'Closed - Opens 11 AM',
            phone: r.phone,
            image_url: r.image_url,
            source: r.source,
            status: 'yellow', // will be recalculated
            zip_code: zipCode,
            last_updated: new Date().toISOString(),
            flavor_tags: r.flavor_tags,
        };

        spot.status = calculateStatus(spot);

        return spot;
    });

    // Apply flavor scoring if provided
    if (flavor) {
        const persona = getFlavorPersona(flavor);
        return spots.map(spot => ({
            ...spot,
            flavor_match: scoreSpotFlavor(spot, persona),
        }));
    }

    return spots;
}
