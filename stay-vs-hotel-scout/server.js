import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk';
import { PLATFORMS } from './lib/platforms.js';
import { extractListings, sanitizeInput, calcNights, isValidDate } from './lib/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, 'public')));

app.get('/api/config', (_req, res) => {
  res.json({ googleMapsKey: process.env.GOOGLE_MAPS_KEY || '' });
});

app.get('/api/sites', (_req, res) => {
  const sites = Object.entries(PLATFORMS).map(([key, p]) => ({
    key,
    name: p.name,
    type: p.type,
  }));
  res.json({ sites });
});

app.get('/api/search/live', async (req, res) => {
  const city    = sanitizeInput(req.query.city ?? '', 80);
  const checkIn  = sanitizeInput(req.query.check_in ?? '', 12);
  const checkOut = sanitizeInput(req.query.check_out ?? '', 12);
  const guests   = Math.min(16, Math.max(1, parseInt(req.query.guests ?? '2', 10)));

  if (!city)                   return res.status(400).send('Missing city');
  if (!isValidDate(checkIn))   return res.status(400).send('Invalid check_in date (YYYY-MM-DD)');
  if (!isValidDate(checkOut))  return res.status(400).send('Invalid check_out date (YYYY-MM-DD)');
  if (new Date(checkOut) <= new Date(checkIn)) {
    return res.status(400).send('check_out must be after check_in');
  }

  const tinyfishApiKey = process.env.TINYFISH_API_KEY;
  if (!tinyfishApiKey) return res.status(500).send('TINYFISH_API_KEY is not set');

  const nights = calcNights(checkIn, checkOut);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
  };

  const platformKeys = Object.keys(PLATFORMS);

  send('search_start', { city, check_in: checkIn, check_out: checkOut, guests, nights, platforms: platformKeys });

  const heartbeat = setInterval(() => send('heartbeat', { ts: Date.now() }), 5000);

  const client = new TinyFish({ apiKey: tinyfishApiKey });

  const agentTasks = platformKeys.map(async (key) => {
    const platform = PLATFORMS[key];
    const url = platform.searchUrl(city, checkIn, checkOut, guests);
    const goal = platform.goal(city, checkIn, checkOut, guests);

    send('platform_status', { platform: key, name: platform.name, status: 'connecting' });

    try {
      const agentStream = await client.agent.stream(
        {
          url,
          goal,
          ...(platform.browserProfile && { browser_profile: platform.browserProfile }),
          ...(platform.proxyConfig && { proxy_config: platform.proxyConfig }),
        },
        {
          onStreamingUrl: (event) => {
            send('platform_live', {
              platform: key,
              name: platform.name,
              streaming_url: event.streaming_url,
            });
          },
          onComplete: (event) => {
            console.log(`[${key}] raw result:`, JSON.stringify(event.result, null, 2));
            if (event.status === RunStatus.COMPLETED) {
              const listings = extractListings(event.result);
              const enriched = listings.map((l) => ({
                ...l,
                platform: platform.name,
                platform_key: key,
                platform_type: platform.type,
              }));
              send('platform_result', { platform: key, name: platform.name, listings: enriched, nights });
            } else {
              send('platform_error', {
                platform: key,
                name: platform.name,
                error: `Agent status: ${event.status}`,
              });
            }
          },
        }
      );

      for await (const event of agentStream) {
        if (event.type === EventType.COMPLETE) break;
      }
    } catch (err) {
      send('platform_error', {
        platform: key,
        name: platform.name,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  await Promise.allSettled(agentTasks);
  clearInterval(heartbeat);
  send('complete', { ts: Date.now() });
  res.end();
});

app.listen(PORT, () => {
  console.log(`Stay vs Hotel Scout running at http://localhost:${PORT}`);
});
