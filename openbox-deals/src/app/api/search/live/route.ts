export const runtime = 'nodejs';
export const maxDuration = 300;

import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk';
import { SITES } from '@/lib/sites';
import { extractProducts, filterByPrice } from '@/lib/helpers';

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

function validateQuery(q: string): string {
  if (q.length > 100) throw new Error('Query too long (max 100 chars)');
  const sanitized = q.replace(/[<>"';\\]/g, '').trim();
  if (!/[a-zA-Z0-9]/.test(sanitized)) throw new Error('Query must contain alphanumeric characters');
  return sanitized;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q') ?? '';
  const maxPriceParam = searchParams.get('max_price');
  const maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : null;

  if (rawQuery.length < 2) {
    return Response.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }

  let query: string;
  try {
    query = validateQuery(rawQuery);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Missing TINYFISH_API_KEY' }, { status: 500 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (payload: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(sseData(payload)));
      };
      const close = () => {
        if (!closed) { closed = true; controller.close(); }
      };

      const startTime = Date.now();

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        enqueue({ type: 'heartbeat', elapsed: ((Date.now() - startTime) / 1000).toFixed(1) });
      }, 5000);

      enqueue({
        type: 'search_start',
        query,
        sites: Object.keys(SITES),
        search_id: Math.random().toString(36).slice(2, 10),
      });

      // Send initial STANDBY status for all sites
      for (const [siteKey, siteConfig] of Object.entries(SITES)) {
        enqueue({ type: 'session_status', site: siteKey, site_name: siteConfig.name, status: 'connecting' });
      }

      // Run all sites in parallel — emit results as each one finishes
      const tasks = Object.entries(SITES).map(([siteKey, siteConfig]) =>
        (async () => {
          const encodedQuery = encodeURIComponent(query);
          const searchUrl = siteConfig.searchUrl.replace('{query}', encodedQuery);
          const goal = siteConfig.goal.replace(/\{query\}/g, query);

          try {
            const client = new TinyFish({ apiKey });
            let resultData: unknown = null;
            let streamingUrlSent = false;

            const tfStream = await client.agent.stream(
              {
                url: searchUrl,
                goal,
                browser_profile: siteConfig.browserProfile ?? 'lite',
                ...(siteConfig.proxyConfig ? { proxy_config: siteConfig.proxyConfig } : {}),
              },
              {
                onStreamingUrl: (event) => {
                  if (!streamingUrlSent) {
                    streamingUrlSent = true;
                    enqueue({
                      type: 'session_start',
                      site: siteKey,
                      site_name: siteConfig.name,
                      streaming_url: event.streaming_url,
                      searchUrl,
                    });
                  }
                },
                onComplete: (event) => {
                  if (event.status === RunStatus.COMPLETED && event.result != null) {
                    resultData = event.result;
                  }
                },
              }
            );

            // Drain stream so callbacks fire; break on COMPLETE
            for await (const event of tfStream) {
              if (event.type === EventType.COMPLETE) {
                if (event.status === RunStatus.COMPLETED && event.result != null && !resultData) {
                  resultData = event.result;
                }
                break; // stop iterating after COMPLETE
              }
            }

            // Extract and emit products immediately — don't wait for other agents
            let products = extractProducts(resultData);
            if (maxPrice !== null && !isNaN(maxPrice)) {
              products = filterByPrice(products, maxPrice);
            }

            enqueue({
              type: products.length > 0 ? 'session_result' : 'session_error',
              site: siteKey,
              site_name: siteConfig.name,
              products,
              count: products.length,
              ...(products.length === 0 ? { error: 'No results found' } : {}),
            });

          } catch (err) {
            enqueue({
              type: 'session_error',
              site: siteKey,
              site_name: siteConfig.name,
              products: [],
              count: 0,
              error: (err instanceof Error ? err.message : 'Unknown error').slice(0, 80),
            });
          }
        })()
      );

      await Promise.allSettled(tasks);

      clearInterval(heartbeat);
      enqueue({ type: 'complete', total_time: ((Date.now() - startTime) / 1000).toFixed(2) });
      close();
    },

    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
