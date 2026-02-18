import "dotenv/config";

export const config = {
  port: process.env.PORT || 3000,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  tinyfish: {
    endpoint: process.env.TINYFISH_ENDPOINT || "https://agent.tinyfish.ai",
    apiKey: process.env.TINYFISH_API_KEY || "",
    browserProfile: process.env.TINYFISH_BROWSER_PROFILE || "stealth",
    proxyEnabled: process.env.TINYFISH_PROXY_ENABLED === "true",
    proxyCountryCode: process.env.TINYFISH_PROXY_COUNTRY_CODE || "",
    retryAttempts: 3,
    requestTimeoutMs: Number(process.env.TINYFISH_REQUEST_TIMEOUT_MS) || 25000,
    sseTimeoutMs: Number(process.env.TINYFISH_SSE_TIMEOUT_MS) || 130000,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o",
  },
  platformsScanned: [
    "Target Site", "GitHub", "LinkedIn", "Glassdoor", "Levels.fyi",
    "AWS Calculator", "Cloudflare Radar", "SimilarWeb", "G2", "Reddit",
  ],
  // Keep investigation under Vercel/server limits (e.g. 60s on Hobby)
  investigationTimeoutMs: Number(process.env.INVESTIGATION_TIMEOUT_MS) || 60000, // 60s
  fastMode: process.env.INVESTIGATION_FAST_MODE !== "false", // default true to stay under 2 min on Vercel
};

export function getMissingRuntimeEnv() {
  const missing = [];
  if (!config.tinyfish.apiKey) missing.push("TINYFISH_API_KEY");
  if (!config.openai.apiKey) missing.push("OPENAI_API_KEY");
  return missing;
}
