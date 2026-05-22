import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk';
import { geocodeZipCode } from '@/lib/geocode';
import type { WingSpot, WingSource } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

function deriveStatus(spot: Partial<WingSpot>): 'green' | 'yellow' | 'red' {
  if (!spot.isOpen) return 'red';
  if (spot.rating && spot.rating >= 4.0) return 'green';
  return 'yellow';
}

function parseSpots(raw: unknown[], source: string, siteName: string): WingSpot[] {
  return (raw || [])
    .map((r: unknown, i: number) => {
      const item = r as Record<string, unknown>;
      const spot: WingSpot = {
        id: `${source}-${Date.now()}-${i}`,
        name: String(item.name || ''),
        address: String(item.address || ''),
        rating: item.rating ? Number(item.rating) : undefined,
        deliveryTime: item.deliveryTime ? String(item.deliveryTime) : undefined,
        deliveryFee: item.deliveryFee ? String(item.deliveryFee) : undefined,
        isOpen: item.isOpen !== false,
        imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
        sourceUrl: item.sourceUrl ? String(item.sourceUrl) : undefined,
        phone: item.phone ? String(item.phone) : undefined,
        priceRange: item.priceRange ? String(item.priceRange) : undefined,
        source: (source || 'google') as WingSource,
        siteName,
        status: 'yellow',
      };
      spot.status = deriveStatus(spot);
      return spot;
    })
    .filter((s) => s.name && s.name.trim() !== '');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zip = searchParams.get('zip') || '';
  const flavor = searchParams.get('flavor') || '';

  if (!zip || zip.length !== 5) {
    return NextResponse.json({ success: false, spots: [], message: 'Invalid zip code.' });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const send = (data: object) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Run everything in the background — return the stream immediately
  (async () => {
    try {
      // Step 1 — geocode
      const geo = await geocodeZipCode(zip);
      if (!geo) {
        send({ type: 'ERROR', message: `Could not geocode zip ${zip}` });
        writer.close();
        return;
      }

      const locationHint = `${geo.city}, ${geo.state}`;
      send({ type: 'LOCATION', location: { city: geo.city, state: geo.state } });

      // Step 2 — Gemini discovers URLs (init inside handler)
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Find 5-7 real URLs of pages listing chicken wing restaurants for ${locationHint}.${flavor ? ` User prefers "${flavor}" wings.` : ''}

Return ONLY a JSON array:
[{ "url": "https://...", "siteName": "Site Name", "source": "doordash|ubereats|grubhub|google|yelp" }]

Rules:
- Real currently active search result pages (not homepages)
- Mix of DoorDash, UberEats, Grubhub city chicken-wings pages + a Google search URL
- DoorDash: https://www.doordash.com/food-delivery/CITY-STATE-restaurants/chicken-wings/
- Google: https://www.google.com/search?q=best+chicken+wings+near+${zip}
- JSON only, no markdown`;

      let urls: { url: string; siteName: string; source: string }[] = [];
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text() || '[]';
        const match = text.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/);
        if (match) urls = JSON.parse(match[0]);
      } catch { urls = []; }

      if (!urls.length) {
        send({ type: 'DONE', spots: [], message: 'No sources found.' });
        writer.close();
        return;
      }

      send({ type: 'SOURCES', count: urls.length });

      // Step 3 — TinyFish agents in parallel
      const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });

      const goal = `Scout chicken wing restaurants in ${locationHint}.${flavor ? ` Flavor: "${flavor}".` : ''}

Extract all chicken wing restaurants visible on this page.
RULES: No scrolling beyond one scroll. No navigation. Up to 8 restaurants. Wings only.

Return ONLY valid JSON: { "restaurants": [{ "name", "address", "rating", "deliveryTime", "deliveryFee", "isOpen", "imageUrl", "sourceUrl", "phone", "priceRange" }] }`;

      const agentPromises = urls.map(async ({ url, siteName, source }) => {
        try {
          const tfStream = await client.agent.stream({ url, goal });
          for await (const evt of tfStream) {
            const e = evt as Record<string, unknown>;
            if (e.type === EventType.COMPLETE) {
              if (e.status === RunStatus.COMPLETED) {
                const result = e.result as Record<string, unknown> | null;
                let restaurants: unknown[] = [];
                if (Array.isArray(result?.restaurants)) {
                  restaurants = result.restaurants;
                }
                const spots = parseSpots(restaurants, source, siteName);
                if (spots.length > 0) send({ type: 'SPOTS', spots });
              }
              break;
            }
          }
        } catch (agentErr) {
          send({ type: 'AGENT_ERROR', siteName, message: agentErr instanceof Error ? agentErr.message : 'Agent failed' });
        }
      });

      await Promise.allSettled(agentPromises);
      send({ type: 'DONE', message: `Scouted ${urls.length} sources near ${locationHint}` });

    } catch (err) {
      send({ type: 'ERROR', message: err instanceof Error ? err.message : 'Search failed' });
    } finally {
      writer.close();
    }
  })();

  // Return immediately — stream stays open while background async runs
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
