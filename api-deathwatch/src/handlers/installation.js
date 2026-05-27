const { githubRequest } = require("../github-auth");
const { checkServices } = require("../health-check");
const { createIssue } = require("../issue-creator");
const fs = require("fs");
const path = require("path");

// Track last-run times per repo to enforce 7-day minimum between checks
const LAST_RUN_FILE = path.join(__dirname, "../../.last-runs.json");

function getLastRuns() {
  try {
    return JSON.parse(fs.readFileSync(LAST_RUN_FILE, "utf8"));
  } catch {
    return {};
  }
}

function setLastRun(repoFullName) {
  const runs = getLastRuns();
  runs[repoFullName] = Date.now();
  fs.writeFileSync(LAST_RUN_FILE, JSON.stringify(runs, null, 2));
}

function shouldSkip(repoFullName) {
  const runs = getLastRuns();
  const last = runs[repoFullName];
  if (!last) return false;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - last;
  if (elapsed < sevenDays) {
    const daysLeft = Math.ceil((sevenDays - elapsed) / (24 * 60 * 60 * 1000));
    console.log(`Skipping ${repoFullName} — checked ${Math.floor(elapsed / 86400000)}d ago, next check in ${daysLeft}d`);
    return true;
  }
  return false;
}

async function handleInstallation(installationId, repoFullName, force = false) {
  console.log(`Running health check for: ${repoFullName}`);

  // Enforce 7-day minimum between checks (unless forced)
  if (!force && shouldSkip(repoFullName)) return;

  try {
    const [owner, repo] = repoFullName.split("/");
    let services = [];

    try {
      const fileData = await githubRequest(
        `/repos/${owner}/${repo}/contents/package.json`,
        installationId
      );
      const content = Buffer.from(fileData.content, "base64").toString("utf8");
      const pkg = JSON.parse(content);
      services = extractServices(pkg);
    } catch (err) {
      console.log(`Error reading package.json in ${repoFullName}: ${err.message}`);
      return;
    }

    if (services.length === 0) {
      console.log(`No monitored services found in ${repoFullName}`);
      return;
    }

    console.log(`Found ${services.length} services: ${services.join(", ")}`);

    // Mark as run NOW (before checks) so re-installs don't double-fire
    setLastRun(repoFullName);

    // Run checks in batches of 2 to avoid hammering TinyFish credits
    const results = await checkServices(services);

    const warnings = results.filter((r) => r.score !== null && r.score < 7);
    await createIssue(installationId, owner, repo, results, warnings.length === 0);

    console.log(`Done with ${repoFullName}. ${warnings.length} warnings.`);
  } catch (err) {
    console.error(`Error processing ${repoFullName}:`, err.message);
  }
}

// Map: package name pattern → clean service name for TinyFish search
// Key = substring to match in package name, Value = clean search name
const SERVICE_MAP = {
  // Cloud platforms
  "heroku":        "Heroku",
  "railway":       "Railway",
  "render":        "Render",
  "fly.io":        "Fly.io",
  // Auth
  "auth0":         "Auth0",
  "clerk":         "Clerk",
  "supabase":      "Supabase",
  "firebase":      "Firebase",
  // Databases
  "mongoose":      "MongoDB",
  "mongodb":       "MongoDB",
  "prisma":        "Prisma",
  "planetscale":   "PlanetScale",
  "neon":          "Neon",
  "turso":         "Turso",
  // Email
  "sendgrid":      "SendGrid",
  "mailchimp":     "Mailchimp",
  "resend":        "Resend",
  "postmark":      "Postmark",
  // Payments
  "stripe":        "Stripe",
  "paypal":        "PayPal",
  "square":        "Square",
  // Communication
  "twilio":        "Twilio",
  "vonage":        "Vonage",
  "pusher":        "Pusher",
  "ably":          "Ably",
  // AI / ML
  "openai":        "OpenAI",
  "anthropic":     "Anthropic",
  "replicate":     "Replicate",
  "huggingface":   "Hugging Face",
  "groq":          "Groq",
  // Storage / CDN
  "cloudinary":    "Cloudinary",
  "aws-sdk":       "AWS",
  "@aws-sdk":      "AWS",
  "azure":         "Azure",
  // Monitoring / Analytics
  "sentry":        "Sentry",
  "datadog":       "Datadog",
  "newrelic":      "New Relic",
  "posthog":       "PostHog",
  "mixpanel":      "Mixpanel",
  "segment":       "Segment",
  // Search
  "algolia":       "Algolia",
  "typesense":     "Typesense",
  "meilisearch":   "Meilisearch",
  // CMS
  "contentful":    "Contentful",
  "sanity":        "Sanity",
  "strapi":        "Strapi",
  // Maps
  "mapbox":        "Mapbox",
  "@googlemaps":   "Google Maps",
};

function extractServices(pkg) {
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const found = new Map(); // use Map to deduplicate by clean name

  for (const dep of Object.keys(allDeps)) {
    const depLower = dep.toLowerCase();
    for (const [pattern, cleanName] of Object.entries(SERVICE_MAP)) {
      if (depLower.includes(pattern) && !found.has(cleanName)) {
        found.set(cleanName, true);
        break;
      }
    }
  }

  // Cap at 6 services per run to keep credit usage reasonable
  return Array.from(found.keys()).slice(0, 6);
}

module.exports = { handleInstallation };