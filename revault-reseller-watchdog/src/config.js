// =============================================================================
// Revault Configuration
// =============================================================================
// For your own deployment, replace these values with your own keys.
// See README.md for setup instructions.
// =============================================================================

export const CONFIG = {
  // TinyFish API key
  TINYFISH_API_KEY: import.meta.env.VITE_TINYFISH_API_KEY || "",

  // Discord webhook URL
  DISCORD_WEBHOOK_URL: import.meta.env.VITE_DISCORD_WEBHOOK_URL || "",

  // How often TinyFish agents scan (in minutes) — override via VITE_SCAN_INTERVAL_MINUTES in Vercel
  SCAN_INTERVAL_MINUTES: parseInt(import.meta.env.VITE_SCAN_INTERVAL_MINUTES) || 15,
};

// Send a Discord alert when a watchlist target is hit
export async function sendDiscordAlert(item, bestSource) {
  const margin = item.marketAvg && item.currentBest
    ? Math.round(((item.marketAvg - item.currentBest) / item.currentBest) * 100)
    : 0;

  const listingUrl = bestSource.listingUrl || bestSource.url || "";
  const linkField = listingUrl
    ? { name: "Buy Now", value: `[View on ${bestSource.name}](${listingUrl})`, inline: false }
    : { name: "Platform", value: bestSource.name, inline: true };

  const isHit = item.status === "target_hit";
  const payload = {
    embeds: [{
      title: isHit ? "TARGET HIT -- Revault" : "Scan Complete -- Revault",
      color: isHit ? 2278429 : 16761095,
      fields: [
        { name: "Item", value: item.name, inline: false },
        { name: "Best Price", value: `$${item.currentBest.toLocaleString()}`, inline: true },
        { name: "Platform", value: bestSource.name, inline: true },
        { name: "Condition", value: bestSource.condition || "--", inline: true },
        { name: "Your Max Buy", value: `$${item.targetBuy.toLocaleString()}`, inline: true },
        { name: "Market Avg", value: `$${(item.marketAvg || 0).toLocaleString()}`, inline: true },
        { name: "Potential Margin", value: `${margin}%`, inline: true },
        linkField,
      ],
      footer: { text: "Revault -- Powered by TinyFish Browser Agents" },
    }],
  };

  // In dev: Vite proxy rewrites /api/discord -> Discord webhook (avoids CORS)
  // In prod: Vercel serverless function at /api/discord proxies the call
  try {
    console.log("[Discord] Sending alert via /api/discord proxy...");
    const res = await fetch("/api/discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status === 204) {
      console.log("[Discord] Alert sent successfully!");
      return true;
    }
    console.warn("[Discord] Proxy returned", res.status);
  } catch (e) {
    console.warn("[Discord] Proxy failed:", e.message);
  }

  // Fallback: try direct webhook (may be blocked by CORS in browser)
  try {
    console.log("[Discord] Trying direct webhook...");
    const res = await fetch(CONFIG.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status === 204) {
      console.log("[Discord] Alert sent via direct webhook!");
      return true;
    }
    console.warn("[Discord] Direct webhook returned", res.status);
  } catch (e) {
    console.warn("[Discord] Direct webhook failed:", e.message);
  }

  console.error("[Discord] All methods failed");
  return false;
}
