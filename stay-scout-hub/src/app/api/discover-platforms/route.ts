export const runtime = "nodejs";
export const maxDuration = 60;

import { TinyFish } from "@tiny-fish/sdk";

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

function generateFallbackPlatforms(city: string, guests: number, checkIn?: string, checkOut?: string) {
  const enc = encodeURIComponent(city);
  const ci = formatDate(checkIn);
  const co = formatDate(checkOut);
  return [
    { id: "booking", name: "Booking.com", searchUrl: `https://www.booking.com/searchresults.html?ss=${enc}&group_adults=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` },
    { id: "expedia", name: "Expedia", searchUrl: `https://www.expedia.com/Hotel-Search?destination=${enc}&adults=${guests}${ci ? `&startDate=${ci}` : ""}${co ? `&endDate=${co}` : ""}` },
    { id: "hotels", name: "Hotels.com", searchUrl: `https://www.hotels.com/search.do?destination=${enc}&adults=${guests}${ci ? `&checkIn=${ci}` : ""}${co ? `&checkOut=${co}` : ""}` },
    { id: "airbnb", name: "Airbnb", searchUrl: `https://www.airbnb.com/s/${enc}/homes?adults=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` },
    { id: "agoda", name: "Agoda", searchUrl: `https://www.agoda.com/search?city=${enc}&adults=${guests}${ci ? `&checkIn=${ci}` : ""}${co ? `&checkOut=${co}` : ""}` },
  ];
}

export async function POST(request: Request) {
  const { city, guests, checkIn, checkOut } = await request.json();

  if (!city || !guests) return Response.json({ error: "City and guests are required" }, { status: 400 });

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });

  const ci = formatDate(checkIn);
  const co = formatDate(checkOut);

  try {
    const client = new TinyFish({ apiKey });

    // Search for which booking platforms operate in this city/region
    const searchQuery = `hotel booking sites ${city} best platforms where to book hotels`;
    const searchResults = await client.search.query({ query: searchQuery });

    const results = searchResults.results || [];

    // Extract platform names and URLs from search results
    const knownPlatforms: Record<string, { id: string; name: string; baseUrl: string }> = {
      "booking.com": { id: "booking", name: "Booking.com", baseUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&group_adults=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` },
      "expedia.com": { id: "expedia", name: "Expedia", baseUrl: `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(city)}&adults=${guests}${ci ? `&startDate=${ci}` : ""}${co ? `&endDate=${co}` : ""}` },
      "hotels.com": { id: "hotels", name: "Hotels.com", baseUrl: `https://www.hotels.com/search.do?destination=${encodeURIComponent(city)}&adults=${guests}${ci ? `&checkIn=${ci}` : ""}${co ? `&checkOut=${co}` : ""}` },
      "airbnb.com": { id: "airbnb", name: "Airbnb", baseUrl: `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?adults=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` },
      "agoda.com": { id: "agoda", name: "Agoda", baseUrl: `https://www.agoda.com/search?city=${encodeURIComponent(city)}&adults=${guests}${ci ? `&checkIn=${ci}` : ""}${co ? `&checkOut=${co}` : ""}` },
      "trip.com": { id: "trip", name: "Trip.com", baseUrl: `https://www.trip.com/hotels/list?city=${encodeURIComponent(city)}&adult=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` },
      "makemytrip.com": { id: "makemytrip", name: "MakeMyTrip", baseUrl: `https://www.makemytrip.com/hotels/hotel-listing/?city=${encodeURIComponent(city)}&guests=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` },
      "kayak.com": { id: "kayak", name: "Kayak", baseUrl: `https://www.kayak.com/hotels/${encodeURIComponent(city)}/${guests}guests${ci ? `/${ci}` : ""}${co ? `/${co}` : ""}` },
    };

    const seenIds = new Set<string>();
    const platforms: { id: string; name: string; searchUrl: string }[] = [];

    // Match search result domains to known platforms
    for (const result of results) {
      try {
        const domain = new URL(result.url).hostname.replace("www.", "");
        for (const [key, platform] of Object.entries(knownPlatforms)) {
          if (domain.includes(key) && !seenIds.has(platform.id)) {
            seenIds.add(platform.id);
            platforms.push({ id: platform.id, name: platform.name, searchUrl: platform.baseUrl });
          }
        }
      } catch { /* skip malformed URLs */ }
    }

    // Always ensure core global platforms are included
    for (const [, platform] of Object.entries(knownPlatforms)) {
      if (!seenIds.has(platform.id) && ["booking", "expedia", "airbnb"].includes(platform.id)) {
        seenIds.add(platform.id);
        platforms.push({ id: platform.id, name: platform.name, searchUrl: platform.baseUrl });
      }
    }

    if (!platforms.length) {
      return Response.json({ platforms: generateFallbackPlatforms(city, guests, checkIn, checkOut) });
    }

    return Response.json({ platforms: platforms.slice(0, 8) });
  } catch {
    return Response.json({ platforms: generateFallbackPlatforms(city, guests, checkIn, checkOut) });
  }
}
