import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk';
import { geocodeZipCode } from '@/lib/geocode';
import type { WingSpot, WingSource, ScoutResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

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

// SSE GET — streams spots as each agent completes
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zip = searchParams.get('zip') || '';
  const flavor = searchParams.get('flavor') || '';

  if (!zip || zip.length !== 5) {
    return NextResponse.json({ success: false, spots: [], cached: false, message: 'Invalid zip code.' });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Step 1 — geocode
        const geo = await geocodeZipCode(zip);
        if (!geo) {
          send({ type: 'ERROR', message: `Could not geocode zip ${zip}` });
          controller.close();
          return;
        }

        const locationHint = `${geo.city}, ${geo.state}`;
        send({ type: 'LOCATION', location: { city: geo.city, state: geo.state } });

        // Step 2 — Groq discovers URLs
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const prompt = `Find 5-7 real URLs of pages listing chicken wing restaurants for ${locationHint}.${flavor ? ` User prefers "${flavor}" wings.` : ''}

Return ONLY a JSON array:
[{ "url": "https://...", "siteName": "Site Name", "source": "doordash|ubereats|grubhub|google|yelp" }]

Rules:
- Real currently active search result pages (not homepages)
- Mix of DoorDash, UberEats, Grubhub city chicken-wings pages + a Google search URL
- DoorDash: https://www.doordash.com/food-delivery/CITY-STATE-restaurants/chicken-wings/
- Google: https://www.google.com/search?q=best+chicken+wings+near+${zip}
- JSON only, no markdown`;

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 800,
        });

        const text = completion.choices[0].message.content || '[]';
        let urls: { url: string; siteName: string; source: string }[] = [];
        try {
          const match = text.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/);
          if (match) urls = JSON.parse(match[0]);
        } catch { urls = []; }

        if (!urls.length) {
          send({ type: 'DONE', spots: [], message: 'No sources found.' });
          controller.close();
          return;
        }

        send({ type: 'SOURCES', count: urls.length });

        // Step 3 — fire all TinyFish agents in parallel, stream spots as each finishes
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
                  } else if (typeof result === 'string') {
                    try {
                      const p = JSON.parse((result as string).replace(/```json|```/g, '').trim());
                      restaurants = p.restaurants || [];
                    } catch { restaurants = []; }
                  }
                  const spots = parseSpots(restaurants, source, siteName);
                  // Send spots immediately as this agent finishes
                  if (spots.length > 0) {
                    send({ type: 'SPOTS', spots });
                  }
                }
                break;
              }
            }
          } catch { /* agent failed silently */ }
        });

        await Promise.allSettled(agentPromises);
        send({ type: 'DONE', message: `Scouted ${urls.length} sources near ${locationHint}` });

      } catch (err) {
        send({ type: 'ERROR', message: err instanceof Error ? err.message : 'Search failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
