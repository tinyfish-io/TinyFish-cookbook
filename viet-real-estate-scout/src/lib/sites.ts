// Vietnamese real-estate site definitions and goal prompt builder

export interface SearchParams {
  location: string;
  listingType: 'rent' | 'buy';
  propertyType: 'apartment' | 'house' | 'land' | 'room' | 'all';
  priceMin?: number;
  priceMax?: number;
}

export interface SiteConfig {
  name: string;
  baseUrl: string;
}

// All 5 VN real estate sites — TinyFish navigates via goal, not URL params
export const SITES: SiteConfig[] = [
  { name: 'Batdongsan.com.vn', baseUrl: 'https://batdongsan.com.vn' },
  { name: 'Nha.vn', baseUrl: 'https://nha.vn' },
  { name: 'Cho Tot', baseUrl: 'https://www.nhatot.com/mua-ban-bat-dong-san' },
  { name: 'Muaban.net', baseUrl: 'https://muaban.net/bat-dong-san' },
  { name: 'Alonhadat', baseUrl: 'https://alonhadat.com.vn' },
];

// Build the TinyFish goal prompt for real estate scraping
export function buildGoalPrompt(params: SearchParams): string {
  const listingVN = params.listingType === 'rent' ? 'cho thuê' : 'mua bán';
  const typeMap: Record<string, string> = {
    apartment: 'căn hộ/chung cư',
    house: 'nhà phố/nhà riêng',
    land: 'đất nền/đất thổ cư',
    room: 'phòng trọ',
    all: 'tất cả loại',
  };
  const propertyVN = typeMap[params.propertyType] || 'tất cả loại';

  let priceInstruction = '';
  if (params.priceMin || params.priceMax) {
    const min = params.priceMin ? `${(params.priceMin / 1_000_000).toFixed(0)} triệu` : '0';
    const max = params.priceMax ? `${(params.priceMax / 1_000_000).toFixed(0)} triệu` : 'không giới hạn';
    priceInstruction = `Price range: ${min} - ${max} VND.`;
  }

  return `You are extracting real estate listings from this Vietnamese website.

Steps:
1. Navigate to the main page or search page
2. Handle any popups, cookie banners, or overlays by dismissing them
3. Search for "${params.location}" using the location/search field
4. If filters available, select: ${listingVN} (${params.listingType}), ${propertyVN}
5. ${priceInstruction ? priceInstruction : 'No price filter needed.'}
6. Wait for results to load
7. Extract the first 10-15 listings from the results

Return a JSON object with this exact structure:
{
  "source": "Name of the website",
  "website": "The URL you scraped",
  "location_searched": "${params.location}",
  "listings": [
    {
      "title": "Listing title",
      "price_vnd": 5000000000,
      "price_display": "5 tỷ",
      "area_sqm": 80,
      "address": "Full address including district and city",
      "bedrooms": 3,
      "bathrooms": 2,
      "property_type": "apartment",
      "listing_type": "${params.listingType}",
      "image_url": "https://...",
      "detail_url": "https://...",
      "posted_date": "2026-03-20"
    }
  ]
}

Important:
- price_vnd must be a number in VND (e.g. 5000000000 for 5 tỷ, 8000000 for 8 triệu)
- price_display is the human-readable price string from the website
- area_sqm must be a number in square meters
- property_type must be one of: apartment, house, land, room
- If a field is not available, set it to null
- Return at least the title, price, and address for each listing`;
}
