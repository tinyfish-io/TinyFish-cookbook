import type { District } from "./types";

export const DISTRICT_SITES: Record<District, string[]> = {
  d1: [
    "https://pasteurstreet.com/events/",
    "https://heartofdarknessbrewery.com/",
    "https://www.chillsaigon.com/",
    "https://momentorooftop.com/happy-hour-momento-rooftop/",
    "https://www.miasaigon.com/offers/rooftop-happy-hour-at-the-muse/",
  ],
  thao_dien: [
    "https://www.thedecksaigon.com/bar/",
    "https://www.saigonoutcast.com/",
    "https://biacraft.com/",
  ],
  d3: [
    "https://pasteurstreet.com/",
    "https://biacraft.com/",
  ],
};

export const DISTRICT_LABELS: Record<District, string> = {
  d1: "🏙️ District 1",
  thao_dien: "🌴 Thao Dien",
  d3: "🍜 District 3",
};

export const GOAL_PROMPT = `Navigate to this venue's website. Dismiss any popups, cookie banners, or age verification dialogs.

Find ALL current promotions, happy hours, weekly specials, ladies' nights, live music events, and brunch deals. Look on pages labeled "Events", "Promotions", "Happy Hour", "Menu", "What's On", or similar. If the page is in Vietnamese, extract the information and translate deal descriptions to English.

For each deal found, extract:
- deal_name: Name of the promotion
- type: One of "happy_hour", "ladies_night", "brunch", "live_music", "daily_special"
- day_of_week: Array of days (e.g., ["Monday", "Tuesday"]) or "Every day"
- time_start: Start time in "HH:MM" 24h format (or null if all day)
- time_end: End time in "HH:MM" 24h format (or null if open-ended)
- description: Brief description of the deal in English
- items: Array of {item, promo_price, regular_price} — prices in VND
- conditions: Any restrictions or fine print

Return as JSON:
{
  "venue_name": "...",
  "district": "...",
  "address": "...",
  "website": "...",
  "deals": [...]
}

If no promotions are found on the website, return with an empty deals array.`;

export const REQUEST_TIMEOUT_MS = 780_000;
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
