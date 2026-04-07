// =============================================
// Wing Command v4 — /api/discover
// Uses Groq to find real wing-spot sources
// for a given zip code / city.
// Mirrors the scholarship-finder discover route.
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { zipCode, city, state, flavor } = await req.json();

  const locationHint = city && state ? `${city}, ${state}` : `zip code ${zipCode}`;
  const flavorHint = flavor ? ` The user prefers "${flavor}" style wings.` : '';

  const prompt = `You are a food research expert. Find 5-7 real URLs of pages that list chicken wing restaurants for ${locationHint}.${flavorHint}

Return ONLY a JSON array of objects with this shape:
[{ "url": "https://...", "siteName": "Site Name", "source": "doordash|ubereats|grubhub|google|yelp" }]

Rules:
- Use real, currently active pages (search result pages, not homepages)
- Mix of DoorDash, UberEats, Grubhub city-level chicken-wings pages AND a Google search URL
- For delivery platforms: use their city/category search URLs like https://www.doordash.com/food-delivery/CITY-STATE-restaurants/chicken-wings/
- For Google: use https://www.google.com/search?q=best+chicken+wings+near+${zipCode}
- No markdown, no explanation — just the JSON array`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 800,
  });

  const text = completion.choices[0].message.content || '[]';
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    const urls = JSON.parse(clean);
    return NextResponse.json({ urls });
  } catch {
    return NextResponse.json({ urls: [] });
  }
}
