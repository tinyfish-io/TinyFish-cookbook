export const runtime = "nodejs";
export const maxDuration = 60;

import { TinyFish } from "@tiny-fish/sdk";

function getPurposeDescription(purpose: string, customPurpose?: string): string {
  if (customPurpose) return customPurpose;
  const purposes: Record<string, string> = {
    business: "Business trip - meetings, conferences, or professional work",
    exam_interview: "Exam or interview preparation - needs quiet, good sleep, stress-free environment",
    family_visit: "Visiting family - needs comfortable space, family-friendly area",
    sightseeing: "Sightseeing and tourism - exploring attractions, good transport access",
    late_night: "Late night schedule - nightlife, late check-in, flexible timing",
    airport_transit: "Airport transit - early flight, layover, needs proximity to airport",
  };
  return purposes[purpose] || "General travel";
}

function generateFallbackAreas(city: string, purpose: string) {
  return [
    { id: "city-center", name: `${city} City Center`, type: "neighborhood", description: "The central business and commercial district", whyRecommended: "Central location with easy access to transport, restaurants, and main attractions", keyLocations: ["Main Train Station", "Central Business District"] },
    { id: "near-airport", name: `${city} Airport Area`, type: "area", description: "Hotels near the main airport", whyRecommended: "Convenient for early flights or late arrivals, shuttle services available", keyLocations: ["International Airport", "Airport Express"] },
    { id: "tourist-district", name: `${city} Tourist District`, type: "neighborhood", description: "Popular area for visitors with attractions nearby", whyRecommended: "Walking distance to major attractions, lots of dining and entertainment options", keyLocations: ["Major Attractions", "Shopping District"] },
    { id: "business-hub", name: `${city} Business Hub`, type: "neighborhood", description: "Corporate offices and convention centers area", whyRecommended: "Ideal for business travelers with proximity to offices and meeting venues", keyLocations: ["Convention Center", "Financial District"] },
    { id: "residential-quiet", name: `${city} Quiet Residential Area`, type: "neighborhood", description: "Peaceful residential neighborhood away from the bustle", whyRecommended: "Perfect for those seeking quiet, restful stays with local charm", keyLocations: ["Local Parks", "Residential Streets"] },
  ];
}

export async function POST(request: Request) {
  const { city, purpose, customPurpose, checkIn, checkOut } = await request.json();

  if (!city) return Response.json({ error: "City is required" }, { status: 400 });

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });

  const purposeDescription = getPurposeDescription(purpose, customPurpose);

  try {
    const client = new TinyFish({ apiKey });

    // Step 1 — Search for real travel guides about neighborhoods in this city
    const searchQuery = `best neighborhoods to stay in ${city} ${purpose === "business" ? "for business travelers" : "travel guide"} ${checkIn ? new Date(checkIn).getFullYear() : ""}`.trim();
    const searchResults = await client.search.query({ query: searchQuery });

    const urls = (searchResults.results || [])
      .map((r: { url: string }) => r.url)
      .slice(0, 4);

    if (!urls.length) {
      return Response.json({ areas: generateFallbackAreas(city, purpose) });
    }

    // Step 2 — Fetch content from the travel guides
    const fetchResult = await client.fetch.get_contents({ urls, format: "markdown" });
    const pagesContent = (fetchResult.results || [])
      .map((r: { content?: string; text?: string }) => r.content || r.text || "")
      .filter(Boolean)
      .join("\n\n---\n\n")
      .slice(0, 6000); // cap to avoid token blowout

    if (!pagesContent) {
      return Response.json({ areas: generateFallbackAreas(city, purpose) });
    }

    // Step 3 — Extract structured neighborhood recommendations from the fetched content
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are an expert travel advisor. Based ONLY on the travel guide content below, extract 5-8 specific neighborhood or area recommendations for someone staying in ${city}.

TRAVELER'S PURPOSE: ${purposeDescription}
${checkIn ? `Check-in: ${checkIn}` : ""}
${checkOut ? `Check-out: ${checkOut}` : ""}

TRAVEL GUIDE CONTENT:
${pagesContent}

Extract real neighborhoods mentioned in the content. For each, explain why it suits the traveler's purpose.

Return ONLY valid JSON — no markdown, no code blocks:
[
  {
    "id": "unique-area-id",
    "name": "Area/Neighborhood Name",
    "type": "neighborhood",
    "description": "Brief description of this area",
    "whyRecommended": "Why this area suits their specific purpose",
    "keyLocations": ["Nearby landmark 1", "Nearby landmark 2"]
  }
]`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const text = completion.choices[0]?.message?.content || "";
    let areas = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) areas = JSON.parse(jsonMatch[0]);
      else throw new Error("No JSON array found");
    } catch {
      areas = generateFallbackAreas(city, purpose);
    }

    return Response.json({ areas });
  } catch {
    return Response.json({ areas: generateFallbackAreas(city, purpose) });
  }
}
