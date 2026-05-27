import { CONFIG, sendDiscordAlert } from "./config";

const API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

/**
 * Call TinyFish Web Agent API with SSE streaming.
 * Returns the parsed result on completion.
 */
export async function callAgent(url, goal, onProgress) {
  const apiKey = CONFIG.TINYFISH_API_KEY;
  if (!apiKey) throw new Error("TinyFish API key not configured");

  console.log(`[TinyFish] Starting agent for ${url}`);
  console.log(`[TinyFish] Goal: ${goal}`);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      goal,
      browser_profile: "stealth",
      proxy_config: { enabled: false },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`TinyFish HTTP ${response.status}: ${text}`);
  }

  console.log(`[TinyFish] SSE stream opened for ${url}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;
  let lastEvent = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;

      try {
        const event = JSON.parse(jsonStr);
        lastEvent = event;
        if (onProgress) onProgress(event);

        // Log status updates
        if (event.status) {
          console.log(`[TinyFish] ${url} status: ${event.status}`);
        }

        // Check for completion — accept multiple field names
        const isComplete =
          event.type === "COMPLETE" ||
          event.type === "complete" ||
          event.status === "COMPLETED" ||
          event.status === "completed" ||
          event.status === "DONE" ||
          event.status === "done";

        if (isComplete) {
          let raw = event.resultJson || event.result || event.data || event.output;
          console.log(`[TinyFish] COMPLETED for ${url}`, JSON.stringify(raw).slice(0, 500));
          if (raw) {
            // Strip markdown code fences if present
            if (typeof raw === "string") {
              raw = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();
            }
            try {
              result = typeof raw === "string" ? JSON.parse(raw) : raw;
            } catch {
              result = raw;
            }
          }
        }

        if (event.type === "ERROR" || event.status === "FAILED") {
          console.error(`[TinyFish] FAILED for ${url}`, event);
          throw new Error(event.message || event.error || "Agent failed");
        }
      } catch (e) {
        if (e.message && !e.message.includes("JSON")) throw e;
      }
    }
  }

  // Fallback: if we never matched a completion event but the stream ended,
  // try to extract result from the last event
  if (!result && lastEvent) {
    console.warn(`[TinyFish] No explicit COMPLETE event for ${url}, checking last event:`, JSON.stringify(lastEvent).slice(0, 500));
    let raw = lastEvent.resultJson || lastEvent.result || lastEvent.data || lastEvent.output;
    if (raw) {
      if (typeof raw === "string") {
        raw = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();
      }
      try {
        result = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        result = raw;
      }
    }
  }

  console.log(`[TinyFish] Final result for ${url}:`, JSON.stringify(result).slice(0, 500));
  return result;
}

/**
 * Extract a numeric price from an item object.
 * TinyFish returns prices under many different field names.
 */
function extractPrice(item) {
  // Direct price fields (in priority order)
  const priceFields = [
    "price_usd", "price", "list_price", "sale_price", "current_price",
    "asking_price", "buy_price", "starting_bid", "cost", "amount",
    "retail_price", "selling_price", "final_price", "total_price",
    "monthly_rent", "bid",
  ];

  for (const field of priceFields) {
    if (item[field] != null) {
      const val = Number(item[field]);
      if (!isNaN(val) && val > 0) return val;
    }
  }

  // Try to find any field containing "price" in its name
  for (const key of Object.keys(item)) {
    if (key.toLowerCase().includes("price") || key.toLowerCase().includes("cost")) {
      const val = Number(item[key]);
      if (!isNaN(val) && val > 0) return val;
    }
  }

  // Try parsing a price string like "$1,234.56" from any field
  for (const key of Object.keys(item)) {
    if (typeof item[key] === "string") {
      const match = item[key].match(/\$?([\d,]+\.?\d*)/);
      if (match) {
        const val = Number(match[1].replace(/,/g, ""));
        if (!isNaN(val) && val > 0) return val;
      }
    }
  }

  return 0;
}

/**
 * Extract a URL from an item object.
 */
function extractUrl(item) {
  const urlFields = ["url", "link", "listing_url", "product_url", "page_url", "href", "detail_url"];
  for (const field of urlFields) {
    if (item[field] && typeof item[field] === "string" && item[field].startsWith("http")) {
      return item[field];
    }
  }
  // Try any field that looks like a URL
  for (const key of Object.keys(item)) {
    if (typeof item[key] === "string" && item[key].startsWith("http")) {
      return item[key];
    }
  }
  return "";
}

/**
 * Extract condition from an item object.
 */
function extractCondition(item) {
  return item.condition || item.psa_or_bgs_grade || item.grade || item.state || item.quality || "N/A";
}

/**
 * Normalize an array of raw listing objects into our standard format.
 */
function normalizeListings(arr, sourceName) {
  return arr.map(item => ({
    name: sourceName,
    price: extractPrice(item),
    condition: extractCondition(item),
    url: extractUrl(item),
    listingUrl: extractUrl(item),
    raw: item,
  })).filter(s => s.price > 0);
}

/**
 * Parse TinyFish result into normalized source entries.
 * TinyFish returns free-form text/JSON — we extract what we can.
 */
export function parseAgentResult(raw, sourceName) {
  if (!raw) {
    console.warn(`[Parse] raw is null/undefined for ${sourceName}`);
    return null;
  }

  console.log(`[Parse] Parsing result for ${sourceName}, type: ${typeof raw}, isArray: ${Array.isArray(raw)}`);

  let data = raw;

  // If it's a string, try to extract JSON
  if (typeof data === "string") {
    // Strip markdown code fences: ```json ... ``` or ``` ... ```
    data = data.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();

    console.log(`[Parse] Raw string after fence strip (first 300 chars): ${data.slice(0, 300)}`);

    // Try parsing the whole thing first (most common case after stripping fences)
    try {
      data = JSON.parse(data);
    } catch {
      // Try to find a JSON array in the string
      const arrMatch = data.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try { data = JSON.parse(arrMatch[0]); } catch { /* fall through */ }
      }

      // Try to find a JSON object in the string
      if (typeof data === "string") {
        const objMatch = data.match(/\{[\s\S]*\}/);
        if (objMatch) {
          try { data = JSON.parse(objMatch[0]); } catch { /* fall through */ }
        }
      }
    }
  }

  // If it's an array of listings
  if (Array.isArray(data)) {
    console.log(`[Parse] Found array with ${data.length} items`);
    const results = normalizeListings(data, sourceName);
    console.log(`[Parse] Normalized to ${results.length} priced listings`);
    return results.length > 0 ? results : null;
  }

  // If it's an object, look for nested arrays
  if (data && typeof data === "object" && !Array.isArray(data)) {
    console.log(`[Parse] Found object with keys: ${Object.keys(data).join(", ")}`);

    // Check all known wrapper keys for listing arrays
    const wrapperKeys = [
      "listings", "results", "items", "data", "products",
      "properties", "entries", "records", "matches",
      "search_results", "found", "output", "response",
    ];

    // First try known keys
    for (const key of wrapperKeys) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        console.log(`[Parse] Found array under key "${key}" with ${data[key].length} items`);
        const results = normalizeListings(data[key], sourceName);
        console.log(`[Parse] Normalized to ${results.length} priced listings`);
        if (results.length > 0) return results;
      }
    }

    // Then try ANY key that holds an array of objects
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === "object") {
        console.log(`[Parse] Found array under unknown key "${key}" with ${data[key].length} items`);
        const results = normalizeListings(data[key], sourceName);
        console.log(`[Parse] Normalized to ${results.length} priced listings`);
        if (results.length > 0) return results;
      }
    }

    // Maybe it's a single listing object with a price
    const singlePrice = extractPrice(data);
    if (singlePrice > 0) {
      console.log(`[Parse] Single listing with price: $${singlePrice}`);
      return [{
        name: sourceName,
        price: singlePrice,
        condition: extractCondition(data),
        url: extractUrl(data),
        listingUrl: extractUrl(data),
        raw: data,
      }];
    }
  }

  console.warn(`[Parse] Could not parse result for ${sourceName}:`, JSON.stringify(data).slice(0, 500));
  return null;
}

/**
 * Scan all sources for a watchlist item — IN PARALLEL.
 * Returns updated item with real prices.
 */
export async function scanItem(item, sources, generatePrompt, onSourceUpdate) {
  console.log(`[Scan] Starting parallel scan for "${item.name}" across ${sources.length} sources`);

  // Fire all sources in parallel
  const promises = sources.map(async (src) => {
    try {
      if (onSourceUpdate) onSourceUpdate(src, "scanning");

      const { url, prompt } = generatePrompt(item.category, src, item.name, item.targetBuy, item.targetMargin);

      const raw = await callAgent(url, prompt, (evt) => {
        if (onSourceUpdate && evt.status) onSourceUpdate(src, evt.status);
      });

      console.log(`[Scan] ${src} raw result type: ${typeof raw}, keys: ${raw ? Object.keys(raw).join(",") : "null"}`);

      const parsed = parseAgentResult(raw, src);
      if (parsed && parsed.length > 0) {
        const best = parsed.reduce((a, b) => a.price < b.price ? a : b);
        console.log(`[Scan] ${src} best price: $${best.price}, condition: ${best.condition}, url: ${best.url}`);
        if (onSourceUpdate) onSourceUpdate(src, "done");
        return best;
      } else {
        console.log(`[Scan] ${src} — no parseable listings`);
        if (onSourceUpdate) onSourceUpdate(src, "done");
        return {
          name: src,
          price: null,
          condition: "No listings found",
          url: "",
          listingUrl: "",
          raw,
        };
      }
    } catch (err) {
      console.error(`[Scan] ${src} error:`, err);
      if (onSourceUpdate) onSourceUpdate(src, "error");
      return {
        name: src,
        price: null,
        condition: "Error",
        url: "",
        listingUrl: "",
        error: err.message,
      };
    }
  });

  const results = await Promise.all(promises);
  console.log(`[Scan] All sources done for "${item.name}":`, results);

  // Calculate best price and market avg from successful results
  const priced = results.filter(r => r.price && r.price > 0);
  const bestPrice = priced.length > 0 ? Math.min(...priced.map(r => r.price)) : null;
  const avgPrice = priced.length > 0 ? Math.round(priced.reduce((a, b) => a + b.price, 0) / priced.length) : null;

  const status = bestPrice && bestPrice <= item.targetBuy ? "target_hit" : "watching";
  const prevBest = item.currentBest;
  const trend = !prevBest || !bestPrice ? "stable" : bestPrice < prevBest ? "down" : bestPrice > prevBest ? "up" : "stable";

  console.log(`[Scan] "${item.name}" — best: $${bestPrice}, avg: $${avgPrice}, status: ${status}`);

  const updated = {
    ...item,
    sources: results,
    currentBest: bestPrice,
    marketAvg: avgPrice,
    status,
    trend,
    lastScanned: new Date().toISOString(),
  };

  // Send Discord alert whenever scan completes with results
  if (priced.length > 0) {
    const bestSource = priced.reduce((a, b) => a.price < b.price ? a : b);
    console.log(`[Discord] Sending alert for "${item.name}" — best: $${bestPrice}, target: $${item.targetBuy}, status: ${status}, source: ${bestSource.name}`);
    try {
      const ok = await sendDiscordAlert(updated, bestSource);
      console.log(`[Discord] Alert result: ${ok}`);
    } catch (err) {
      console.error("[Discord] Alert failed:", err);
    }
  } else {
    console.warn(`[Discord] No priced results for "${item.name}" — skipping alert`);
  }

  return updated;
}
