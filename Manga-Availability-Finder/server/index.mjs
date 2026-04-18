import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import express from "express";
import { TinyFish } from "@tiny-fish/sdk";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 8787);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/discover-manga-sites", async (req, res) => {
  const { mangaTitle } = req.body ?? {};
  if (!mangaTitle || typeof mangaTitle !== "string") {
    return res.status(400).json({ error: "mangaTitle is required" });
  }

  const title = mangaTitle.trim();

  const defaultSites = [
    { name: "MangaDex", url: `https://mangadex.org/search?q=${encodeURIComponent(title)}` },
    {
      name: "MangaKakalot",
      url: `https://mangakakalot.com/search/story/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "_"))}`,
    },
    { name: "MangaReader", url: `https://mangareader.to/search?keyword=${encodeURIComponent(title)}` },
    { name: "Webtoon", url: `https://www.webtoons.com/en/search?keyword=${encodeURIComponent(title)}` },
    {
      name: "Manganato",
      url: `https://manganato.com/search/story/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "_"))}`,
    },
    { name: "Tapas", url: `https://tapas.io/search?q=${encodeURIComponent(title)}` },
  ];

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.json({ sites: defaultSites });
  }

  const prompt = `You are a manga/webtoon site discovery assistant. Given a manga or webtoon title, return a JSON array of 5-6 popular manga/webtoon reading websites where users can potentially find and read this title.

For the manga/webtoon: "${title}"

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "sites": [
    {"name": "Site Name", "url": "https://example.com/search?q=${encodeURIComponent(title)}"},
    ...
  ]
}

Include sites like:
- MangaDex (mangadex.org)
- MangaKakalot (mangakakalot.com)
- MangaReader (mangareader.to)
- Webtoon (webtoons.com)
- Tapas (tapas.io)
- Manganato (manganato.com)

Make sure the URLs include a search query for the manga title where possible. Return exactly 5-6 sites.`;

  try {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!resp.ok) {
      return res.json({ sites: defaultSites });
    }

    const data = await resp.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = typeof textContent === "string" ? textContent.match(/\{[\s\S]*\}/) : null;
    if (!jsonMatch) return res.json({ sites: defaultSites });

    const parsed = JSON.parse(jsonMatch[0]);
    const sites = Array.isArray(parsed?.sites) ? parsed.sites : defaultSites;
    return res.json({ sites: sites.length ? sites : defaultSites });
  } catch {
    return res.json({ sites: defaultSites });
  }
});

app.post("/api/search-manga", async (req, res) => {
  const { url, mangaTitle } = req.body ?? {};
  if (!url || !mangaTitle) {
    return res.status(400).json({ error: "url and mangaTitle are required" });
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "TINYFISH_API_KEY is not configured" });
  }

  const goal = `You are searching for a manga/webtoon called "${mangaTitle}" on this website.

STEP 1 - NAVIGATION:
If there's a search bar or search input, enter "${mangaTitle}" and submit the search.
If there's no search bar visible, look for a search icon or link to a search page.

STEP 2 - ANALYZE RESULTS:
Look at the search results or page content carefully.
Check if "${mangaTitle}" appears in the results (exact match or very close match).

STEP 3 - RETURN RESULT:
Return a JSON object:
{
  "found": true or false,
  "manga_title": "${mangaTitle}",
  "site_url": "current page URL",
  "match_confidence": "high" or "medium" or "low",
  "notes": "brief explanation of what you found or didn't find"
}

IMPORTANT: Only return "found": true if you see a clear match for "${mangaTitle}" in the results.`;

  // SSE headers
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  let streamingUrlSent = false;

  try {
    const client = new TinyFish({ apiKey });
    const stream = await client.agent.stream({ url, goal });

    for await (const rawEvent of stream) {
      const event = rawEvent ?? {};

      if (event.streamingUrl && !streamingUrlSent) {
        streamingUrlSent = true;
        send({ type: "stream", streamingUrl: event.streamingUrl });
      }

      if (event.type === "COMPLETE" && event.status === "COMPLETED") {
        const payload = event.resultJson ?? event.result;
        let found = false;
        try {
          const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
          found = parsed?.found === true;
        } catch {
          const s = JSON.stringify(payload ?? "").toLowerCase();
          found = s.includes('"found": true') || s.includes('"found":true');
        }
        send({ type: "complete", found });
        res.end();
        return;
      }

      if (event.type === "ERROR" || event.status === "FAILED") {
        send({ type: "error", error: event.message || "Search failed" });
        res.end();
        return;
      }
    }

    send({ type: "error", error: "Stream ended without completion signal" });
    res.end();
  } catch (err) {
    send({ type: "error", error: err instanceof Error ? err.message : "Search failed" });
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});

