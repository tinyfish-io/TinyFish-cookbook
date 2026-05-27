const { TinyFish, RunStatus } = require("@tiny-fish/sdk");

async function runAgent(url, goal) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) throw new Error("TINYFISH_API_KEY not set");

  console.log(`  -> Agent: ${url.slice(0, 70)}...`);

  const client = new TinyFish({ apiKey });

  const run = await client.agent.run({
    url,
    goal,
    browser_profile: "stealth",
  });

  if (run.status !== RunStatus.COMPLETED) {
    console.log(`  -> Agent failed: ${run.error?.message || "unknown"}`);
    return null;
  }

  console.log(`  -> Agent done`);
  return run.result || null;
}

// Check all services in parallel
async function checkServices(services) {
  console.log(`Checking ${services.length} services in parallel...`);
  const checks = services.map((service) => checkOneService(service));
  const results = await Promise.allSettled(checks);
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    console.error(`Failed to check ${services[i]}:`, r.reason?.message);
    return { service: services[i], score: null, error: r.reason?.message || "Check failed", signals: {} };
  });
}

async function checkOneService(service) {
  console.log(`Checking: ${service}`);

  const [statusResult, blogResult, hnResult, pricingResult] = await Promise.allSettled([
    // Agent 1 — Status page
    runAgent(
      `https://www.google.com/search?q=${encodeURIComponent(service + " status page")}`,
      `You are on Google search results. Read only visible titles and snippets — do NOT click, do NOT scroll.
Find the official ${service} status page URL. Navigate to it.
On the status page: read current status and last 2 visible incidents only. Do NOT click anything. Stop immediately.
Return ONLY valid JSON: {"current_status": "operational|degraded|outage|unknown", "recent_incidents": ["..."], "incident_count_visible": 0}`
    ),

    // Agent 2 — Deprecation/blog signals
    runAgent(
      `https://www.google.com/search?q=${encodeURIComponent(service + " deprecated OR shutdown OR pricing change OR end of life 2024 OR 2025 OR 2026")}`,
      `You are on Google search results. Read only visible titles and snippets — do NOT click anything.
Look for: price increases, tier removals, deprecations, shutdown notices, API version EOL. Ignore unrelated posts. Cap at 8 results. Stop immediately.
Return ONLY valid JSON: {"deprecation_found": false, "signals": [{"title": "...", "summary": "...", "severity": "low|medium|high"}]}`
    ),

    // Agent 3 — Hacker News sentiment
    runAgent(
      `https://hn.algolia.com/?q=${encodeURIComponent(service + " dying OR shutdown OR alternative OR pricing")}&dateRange=pastYear&type=story`,
      `You are on Hacker News Algolia search results. Read only visible story titles and point counts — do NOT click, do NOT scroll.
Look for: shutdown rumours, pricing complaints, people asking for alternatives. Cap at 10 results. Stop immediately.
Return ONLY valid JSON: {"sentiment": "positive|neutral|negative", "negative_stories": [{"title": "...", "points": 0}]}`
    ),

    // Agent 4 — Pricing page
    runAgent(
      `https://www.google.com/search?q=${encodeURIComponent(service + " pricing")}`,
      `You are on Google search results. Read only visible results — do NOT click, do NOT scroll.
Find the official ${service} pricing page URL. Navigate to it.
Read only visible plan names and prices. Look for: "free tier removed", "price increase", "plan discontinued". Do NOT scroll, do NOT click. Stop immediately.
Return ONLY valid JSON: {"free_tier_exists": true, "pricing_change_signals": [], "plans_visible": ["..."]}`
    ),
  ]);

  const status = statusResult.status === "fulfilled" ? statusResult.value : null;
  const blog = blogResult.status === "fulfilled" ? blogResult.value : null;
  const hn = hnResult.status === "fulfilled" ? hnResult.value : null;
  const pricing = pricingResult.status === "fulfilled" ? pricingResult.value : null;

  console.log(`Done: ${service} — status=${!!status} blog=${!!blog} hn=${!!hn} pricing=${!!pricing}`);

  return { service, score: scoreService({ status, blog, hn, pricing }), signals: { status, blog, hn, pricing } };
}

function scoreService({ status, blog, hn, pricing }) {
  let score = 10;
  if (status) {
    if (status.current_status === "outage") score -= 3;
    else if (status.current_status === "degraded") score -= 1.5;
    if (status.incident_count_visible > 3) score -= 0.5;
  }
  if (blog) {
    if (blog.deprecation_found) score -= 4;
    else {
      score -= (blog.signals || []).filter(s => s.severity === "high").length * 1.5;
      score -= (blog.signals || []).filter(s => s.severity === "medium").length * 0.5;
    }
  }
  if (hn) {
    if (hn.sentiment === "negative") score -= 2;
    else if (hn.sentiment === "neutral") score -= 0.5;
    score -= (hn.negative_stories || []).filter(s => s.points > 100).length * 0.5;
  }
  if (pricing) {
    if (!pricing.free_tier_exists) score -= 1;
    score -= Math.min((pricing.pricing_change_signals || []).length * 0.5, 2);
  }
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

module.exports = { checkServices };
