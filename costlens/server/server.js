// ============================================================
// COSTLENS BACKEND — Analyze Any SaaS Down to Its True Cost
// Three pillars: Infra cost, Build cost, Buyer cost
// ============================================================

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { TinyFishWebAgentClient } from "./tinyfish/tinyfish-web-agent-client.js";
import { InfraCostScanner } from "./services/infra-cost-scanner.js";
import { BuildCostEstimator } from "./services/build-cost-estimator.js";
import { BuyerCostAnalyzer } from "./services/buyer-cost-analyzer.js";
import { TechRiskScanner } from "./services/tech-risk-scanner.js";
import { CostModeler } from "./analysis/cost-modeler.js";
import { config, getMissingRuntimeEnv } from "./config/index.js";

const STREAM_TIMEOUT_MS = 120000; // 2 min — keep under Vercel/server limits
const HEARTBEAT_INTERVAL_MS = 25000; // send progress every 25s
const MAX_URL_LENGTH = 2048;

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
function getAllowedProdOrigins() {
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  return new Set([...configuredOrigins, vercelUrl].filter(Boolean));
}

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProduction ? 120 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please retry in a minute." },
});

function corsDeniedError(origin) {
  const err = new Error(`Origin not allowed by CORS${origin ? `: ${origin}` : ""}`);
  err.statusCode = 403;
  return err;
}

const corsOrigin = (origin, callback) => {
  // Allow non-browser clients and same-origin requests with no Origin header.
  if (!origin) {
    callback(null, true);
    return;
  }

  if (!isProduction) {
    // In dev, allow any localhost origin so fallback ports (3001, 3002...) work.
    callback(null, /^https?:\/\/localhost(:\d+)?$/.test(origin));
    return;
  }

  // In production, allow configured origins and the current Vercel deployment URL.
  // On Vercel, auto-allow any *.vercel.app origin (deployment URLs, aliases, previews).
  const isVercelDeployment = Boolean(process.env.VERCEL);
  if (isVercelDeployment && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    callback(null, true);
    return;
  }

  const allowedProdOrigins = getAllowedProdOrigins();
  if (allowedProdOrigins.size === 0) {
    callback(corsDeniedError(origin));
    return;
  }
  if (!allowedProdOrigins.has(origin)) {
    callback(corsDeniedError(origin));
    return;
  }
  callback(null, true);
};

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "256kb" }));
app.use("/api", apiRateLimiter);

app.get("/api/health", (_, res) => {
  const missingEnv = getMissingRuntimeEnv();
  res.json({
    status: "ok",
    engine: "tinyfish",
    version: "1.0.0",
    envReady: missingEnv.length === 0,
    missingEnv,
  });
});

function normalizeTargetUrl(input) {
  if (!input || typeof input !== "string") {
    const err = new Error("URL required");
    err.statusCode = 400;
    throw err;
  }
  const trimmed = input.trim();
  if (trimmed.length > MAX_URL_LENGTH) {
    const err = new Error("URL too long");
    err.statusCode = 400;
    throw err;
  }
  try {
    const targetUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      const err = new Error("Invalid URL format");
      err.statusCode = 400;
      throw err;
    }
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      const err = new Error("Invalid URL format");
      err.statusCode = 400;
      throw err;
    }
    return { targetUrl, domain: parsed.hostname };
  } catch (e) {
    if (e.statusCode === 400) throw e;
    const err = new Error("Invalid URL format");
    err.statusCode = 400;
    throw err;
  }
}

function assertRuntimeEnvReady() {
  const missingEnv = getMissingRuntimeEnv();
  if (missingEnv.length > 0) {
    const err = new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
    err.statusCode = 400;
    err.missingEnv = missingEnv;
    throw err;
  }
}

function assertValidAsyncPollPayload(body) {
  const { runIds, domain, name } = body || {};
  if (!runIds || typeof runIds !== "object" || Array.isArray(runIds)) {
    const err = new Error("runIds must be an object.");
    err.statusCode = 400;
    throw err;
  }
  if (typeof domain !== "string" || !domain.includes(".") || domain.length > 255) {
    const err = new Error("domain must be a valid hostname.");
    err.statusCode = 400;
    throw err;
  }
  if (typeof name !== "string" || name.trim().length < 1 || name.length > 100) {
    const err = new Error("name must be a non-empty string.");
    err.statusCode = 400;
    throw err;
  }
  const keys = ["infra", "build", "buyer", "risk", "competitors"];
  for (const key of keys) {
    const id = runIds[key];
    if (id !== undefined && id !== null && typeof id !== "string") {
      const err = new Error(`runIds.${key} must be a string when provided.`);
      err.statusCode = 400;
      throw err;
    }
  }
}

function normalizePillarMeta(value, fallbackPillar) {
  const meta = value && typeof value === "object" ? value._meta : null;
  return {
    pillar: meta?.pillar || fallbackPillar,
    extractedAt: meta?.extractedAt || new Date().toISOString(),
    sourceFamilies: Array.isArray(meta?.sourceFamilies) ? [...new Set(meta.sourceFamilies)] : [],
    sourceCount: Number.isFinite(Number(meta?.sourceCount))
      ? Number(meta.sourceCount)
      : Array.isArray(meta?.sourceFamilies)
        ? meta.sourceFamilies.length
        : 0,
  };
}

function freshnessBucket(extractedAt) {
  const ts = Date.parse(extractedAt || "");
  if (!Number.isFinite(ts)) return "unknown";
  const ageHours = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60));
  if (ageHours <= 6) return "fresh";
  if (ageHours <= 24) return "stale";
  return "old";
}

function buildQualityMeta({ scannerErrors, modelErrors, modelWarnings, anomalies, pillarMeta, timedOut, fastMode }) {
  const expectedSources = {
    infra: fastMode ? 2 : 4,
    build: fastMode ? 1 : 3,
    buyer: fastMode ? 1 : 5,
    risk: fastMode ? 1 : 3,
    competitors: fastMode ? 1 : 1,
  };
  const expectedTasks = {
    infra: fastMode ? 1 : 4,
    build: fastMode ? 1 : 3,
    buyer: fastMode ? 1 : 4,
    risk: fastMode ? 1 : 3,
    competitors: fastMode ? 1 : 1,
  };
  const perPillar = {};
  const sourceCoverage = {};
  const dataFreshness = {};
  const pillarCoverage = {};
  const confidenceScore = {};
  const pillars = ["infra", "build", "buyer", "risk", "competitors"];
  for (const pillar of pillars) {
    const meta = pillarMeta[pillar] || normalizePillarMeta(null, pillar);
    const uniqueFamilies = Array.isArray(meta.sourceFamilies) ? [...new Set(meta.sourceFamilies.filter(Boolean))] : [];
    const safeSourceCount = Math.max(0, Math.min(expectedSources[pillar], Math.min(meta.sourceCount, uniqueFamilies.length || meta.sourceCount)));
    const scannerFailed = Boolean(scannerErrors?.[pillar]);
    const modelFailed = Boolean(modelErrors?.[pillar]);
    const warningCount = Array.isArray(modelWarnings?.[pillar]) ? modelWarnings[pillar].length : 0;
    const coverageScore = Math.round((safeSourceCount / expectedSources[pillar]) * 100);
    const reliabilityScore = Math.max(
      0,
      100 - (scannerFailed ? 45 : 0) - (modelFailed ? 35 : 0) - warningCount * 8 - (timedOut ? 10 : 0)
    );
    const score = Math.max(0, Math.min(100, Math.round(coverageScore * 0.45 + reliabilityScore * 0.55)));
    perPillar[pillar] = {
      score,
      level: score >= 80 ? "high" : score >= 60 ? "medium" : "low",
      scoreComponents: { coverageScore, reliabilityScore, warningCount, scannerFailed, modelFailed },
    };
    confidenceScore[pillar] = score;
    sourceCoverage[pillar] = {
      sourceFamilies: uniqueFamilies,
      sourceCount: safeSourceCount,
      expectedSources: expectedSources[pillar],
    };
    dataFreshness[pillar] = {
      extractedAt: meta.extractedAt,
      freshness: freshnessBucket(meta.extractedAt),
    };
    pillarCoverage[pillar] = {
      tasksSucceeded: scannerFailed ? 0 : expectedTasks[pillar],
      tasksExpected: expectedTasks[pillar],
    };
  }
  const global = Math.round(pillars.reduce((sum, p) => sum + (confidenceScore[p] || 0), 0) / pillars.length);
  confidenceScore.global = global;
  confidenceScore.level = global >= 80 ? "high" : global >= 60 ? "medium" : "low";
  const crossChecks = (Array.isArray(anomalies) ? anomalies : []).map((note, idx) => ({
    id: `anomaly_${idx + 1}`,
    status: "conflict",
    note,
  }));
  return { pillarCoverage, sourceCoverage, dataFreshness, crossChecks, confidenceScore, perPillar };
}

async function runInvestigation({ targetUrl, domain, onProgress }) {
  const name = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
  const tinyfish = new TinyFishWebAgentClient(config.tinyfish);
  const emit = onProgress || (() => {});
  const scannerErrors = { infra: null, build: null, buyer: null, risk: null, competitors: null };
  const fastOpt = { fast: config.fastMode };

  const runScanner = async (key, scannerPromiseFactory, fallback) => {
    try {
      return await scannerPromiseFactory();
    } catch (error) {
      scannerErrors[key] = error?.message || `Failed ${key} scanner`;
      console.error(`[CostLens] ${key} scanner failed:`, error);
      return fallback;
    }
  };

  emit({ step: "init", message: "Initializing TinyFish engine...", progress: 5, platformsScanned: config.platformsScanned });

  // Run all four pillars in parallel to stay under time limit
  const partial = { infra: null, build: null, buyer: null, risk: null };
  const infraP = runScanner(
    "infra",
    () => new InfraCostScanner(tinyfish).scan(targetUrl, fastOpt),
    {}
  ).then((r) => {
    partial.infra = r;
    return r;
  });
  const buildP = runScanner(
    "build",
    () => new BuildCostEstimator(tinyfish).scan(targetUrl, fastOpt),
    { features: [], openSource: [], hiring: null }
  ).then((r) => {
    partial.build = r;
    return r;
  });
  const buyerP = runScanner(
    "buyer",
    () => new BuyerCostAnalyzer(tinyfish).scan(targetUrl, fastOpt),
    { pricing: null, reviewInsights: [], limits: [], competitors: [] }
  ).then((r) => {
    partial.buyer = r;
    return r;
  });
  const riskP = runScanner(
    "risk",
    () => new TechRiskScanner(tinyfish).scan(targetUrl, fastOpt),
    { securityHeaders: null, privacyCompliance: null, trackers: [] }
  ).then((r) => {
    partial.risk = r;
    return r;
  });

  const timeoutMs = config.investigationTimeoutMs || 100000;
  const timeoutP = new Promise((_, rej) =>
    setTimeout(() => rej({ _timeout: true }), timeoutMs)
  );

  let timedOut = false;
  try {
    await Promise.race([
      Promise.allSettled([infraP, buildP, buyerP, riskP]),
      timeoutP,
    ]);
  } catch (e) {
    if (e?._timeout) {
      timedOut = true;
      console.warn("[CostLens] Investigation timeout; using partial results.");
    } else {
      throw e;
    }
  }

  const infraRaw = partial.infra ?? {};
  const buildRaw = partial.build ?? { features: [], openSource: [], hiring: null };
  const buyerRaw = partial.buyer ?? { pricing: null, reviewInsights: [], limits: [], competitors: [] };
  const riskRaw = partial.risk ?? { securityHeaders: null, privacyCompliance: null, trackers: [] };

  emit({ step: "infra_done", message: "Infrastructure analysis complete", progress: 35 });
  emit({ step: "build_done", message: "Build cost estimation complete", progress: 55 });
  emit({ step: "buyer_done", message: "Buyer cost analysis complete", progress: 70 });
  emit({ step: "risk_done", message: "Risk scan complete", progress: 80 });
  emit({ step: "ai", message: "AI synthesizing cost intelligence report...", progress: 85 });

  let report;
  const modeler = new CostModeler(config.openai);
  try {
    report = await modeler.analyze(infraRaw, buildRaw, buyerRaw, { name, url: domain });
  } catch (error) {
    console.error("[CostLens] Cost modeler failed:", error);
    throw new Error(error?.message || "AI report synthesis failed");
  }

  emit({ step: "ai_extra", message: "Generating executive summary and risk analysis...", progress: 92 });

  // Run executive summary, negotiation playbook, and risk analysis in parallel
  const targetInfo = { name, url: domain };
  const [execSummaryRes, negotiationRes, riskProfileRes] = await Promise.allSettled([
    modeler.generateExecutiveSummary(report.infraCost, report.buildCost, report.buyerCost, targetInfo),
    modeler.generateNegotiationPlaybook(report.infraCost, report.buyerCost, targetInfo),
    modeler.analyzeRiskProfile(riskRaw, targetInfo),
  ]);

  const executiveSummary = execSummaryRes.status === "fulfilled" ? execSummaryRes.value : null;
  const negotiation = negotiationRes.status === "fulfilled" ? negotiationRes.value : null;
  const riskProfile = riskProfileRes.status === "fulfilled" ? riskProfileRes.value : modeler.getDefaultRiskProfile();

  emit({ step: "complete", message: "Investigation complete", progress: 100 });
  const failedPillars = Object.entries(scannerErrors).filter(([, v]) => Boolean(v)).map(([k]) => k);
  if (timedOut) {
    failedPillars.push("timeout");
  }
  const modelErrors = report?.quality?.modelErrors || {};
  const modelWarnings = report?.quality?.modelWarnings || {};
  const anomalies = report?.quality?.anomalies || [];
  const degradedByModel = Object.entries(modelErrors).filter(([, v]) => Boolean(v)).map(([k]) => k);
  const degradedByWarnings = Object.entries(modelWarnings).filter(([, v]) => Array.isArray(v) && v.length > 0).map(([k]) => k);
  const degradedPillars = [...new Set([...failedPillars, ...degradedByModel, ...degradedByWarnings])];
  const pillarMeta = {
    infra: normalizePillarMeta(infraRaw, "infra"),
    build: normalizePillarMeta(buildRaw, "build"),
    buyer: normalizePillarMeta(buyerRaw, "buyer"),
    risk: normalizePillarMeta(riskRaw, "risk"),
    competitors: normalizePillarMeta(null, "competitors"),
  };
  const qualityMeta = buildQualityMeta({
    scannerErrors,
    modelErrors,
    modelWarnings,
    anomalies,
    pillarMeta,
    timedOut,
    fastMode: Boolean(config.fastMode),
  });
  const totalPillars = 5;
  const legacyCompleteness = Math.max(0, Math.round(((totalPillars - Math.min(totalPillars, degradedPillars.length)) / totalPillars) * 100));

  return {
    target: { name, url: domain, logo: name[0] },
    scannedAt: new Date().toISOString(),
    platformsScanned: config.platformsScanned,
    ...report,
    executiveSummary: executiveSummary || null,
    negotiation: negotiation || null,
    riskProfile: riskProfile || modeler.getDefaultRiskProfile(),
    infraCost: {
      ...report.infraCost,
      confidence: {
        overall: qualityMeta.perPillar.infra.score,
        level: qualityMeta.perPillar.infra.level,
      },
    },
    buildCost: {
      ...report.buildCost,
      confidence: {
        overall: qualityMeta.perPillar.build.score,
        level: qualityMeta.perPillar.build.level,
      },
    },
    buyerCost: {
      ...report.buyerCost,
      confidence: {
        overall: qualityMeta.perPillar.buyer.score,
        level: qualityMeta.perPillar.buyer.level,
      },
    },
    provenance: {
      infra: {
        evidenceSources: report?.infraCost?.evidenceSources || [],
        extractedAt: pillarMeta.infra.extractedAt,
      },
      build: {
        evidenceSources: report?.buildCost?.evidenceSources || [],
        extractedAt: pillarMeta.build.extractedAt,
      },
      buyer: {
        evidenceSources: report?.buyerCost?.evidenceSources || [],
        extractedAt: pillarMeta.buyer.extractedAt,
      },
      risk: {
        evidenceSources: [],
        extractedAt: pillarMeta.risk.extractedAt,
      },
      competitors: {
        evidenceSources: [],
        extractedAt: pillarMeta.competitors.extractedAt,
      },
    },
    quality: {
      partialData: degradedPillars.length > 0 || qualityMeta.confidenceScore.global < 80,
      degradedPillars,
      scannerErrors: timedOut ? { ...scannerErrors, timeout: "Investigation time limit reached; partial report." } : scannerErrors,
      modelErrors,
      modelWarnings,
      anomalies,
      completenessScore: legacyCompleteness,
      qualityMeta,
    },
  };
}

function sendStructuredError(res, error) {
  const status = error.statusCode || 500;
  const body = { error: error.message };
  if (error.missingEnv) body.missingEnv = error.missingEnv;
  res.status(status).json(body);
}

// ---- Async investigation (TinyFish run-async + poll). Stays under Vercel limits. ----
function getFastAsyncGoals(targetUrl, domain) {
  const name = domain.split(".")[0];
  return {
    infra: {
      url: targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`,
      goal: [
        `Analyze ${domain} and infer infrastructure + traffic signals in one pass.`,
        'Return strict JSON only: { "techStack": { "signals": {}, "cloudProvider": {}, "framework": "string", "cdn": "string" }, "traffic": { "cloudflareRadar": {}, "similarWeb": {}, "confidence": "high|medium|low", "notes": [] } }',
        "Be concise. If uncertain, use conservative values.",
      ].join(" "),
    },
    build: {
      url: targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`,
      goal: [
        "Analyze the product site and return detected build-relevant features.",
        'Output strict JSON only: { "detected": [{ "name": "string", "complexity": "extreme|hard|medium", "evidence": "string" }], "pricingPageFeatures": ["string"] }',
      ].join(" "),
    },
    buyer: {
      url: targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`,
      goal: [
        "Find and extract pricing page details including plan cards and fine print.",
        'Return strict JSON only: { "plans": [{ "name": "string", "price": "string", "features": ["string"], "limits": ["string"] }], "finePrint": ["string"] }',
      ].join(" "),
    },
    risk: {
      url: targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`,
      goal: [
        `Analyze ${domain} for security and compliance signals.`,
        'Return strict JSON only: { "securityHeaders": { "https": true, "hsts": true, "csp": true, "xFrameOptions": "string|null", "xContentTypeOptions": true }, "privacyCompliance": { "privacyPolicyUrl": "string|null", "termsUrl": "string|null", "complianceBadges": ["string"], "cookieConsent": true }, "trackers": [{ "tracker": "string", "category": "analytics|advertising|social|functional|other", "dataShared": "string" }] }',
        "Be conservative. Only list compliance badges if evidence exists on the site.",
      ].join(" "),
    },
    competitors: {
      url: targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`,
      goal: [
        `Find the top 3-5 competitors or alternatives to ${name}. Visit comparison/alternatives pages, G2, Capterra, or similar sites if helpful.`,
        `For each competitor return their name, website URL, a one-line description, and approximate starting price.`,
        'Return strict JSON only: { "competitors": [{ "name": "string", "url": "string", "description": "string", "startingPrice": "string", "keyDifferentiator": "string" }] }',
        "Only include competitors you are confident about. If unsure, return fewer.",
      ].join(" "),
    },
  };
}

function coerceRunResultToInfra(result) {
  if (!result || typeof result !== "object") {
    return { techStack: null, traffic: null, thirdParty: null, headcount: null, _meta: normalizePillarMeta(null, "infra") };
  }
  const t = result.techStack ?? result;
  const tr = result.traffic ?? null;
  const data = {
    techStack: t && typeof t === "object" ? t : null,
    traffic: tr && typeof tr === "object" ? tr : null,
    thirdParty: null,
    headcount: null,
  };
  return {
    ...data,
    _meta: normalizePillarMeta(
      {
        _meta: {
          pillar: "infra",
          extractedAt: new Date().toISOString(),
          sourceFamilies: [data.techStack ? "techStack" : null, data.traffic ? "trafficSignals" : null].filter(Boolean),
        },
      },
      "infra"
    ),
  };
}

function coerceRunResultToBuild(result) {
  if (!result || typeof result !== "object") {
    return { features: { detected: [], pricingPageFeatures: [] }, openSource: [], hiring: null, _meta: normalizePillarMeta(null, "build") };
  }
  const data = {
    features: {
      detected: Array.isArray(result.detected) ? result.detected : [],
      pricingPageFeatures: Array.isArray(result.pricingPageFeatures) ? result.pricingPageFeatures : [],
    },
    openSource: [],
    hiring: null,
  };
  return {
    ...data,
    _meta: normalizePillarMeta(
      {
        _meta: {
          pillar: "build",
          extractedAt: new Date().toISOString(),
          sourceFamilies:
            data.features.detected.length > 0 || data.features.pricingPageFeatures.length > 0 ? ["features"] : [],
        },
      },
      "build"
    ),
  };
}

function coerceRunResultToBuyer(result) {
  if (!result || typeof result !== "object") {
    return { pricing: null, reviewInsights: [], limits: [], competitors: [], _meta: normalizePillarMeta(null, "buyer") };
  }
  const p = result.plans;
  const data = {
    pricing: result.plans !== undefined ? { plans: Array.isArray(p) ? p : [], finePrint: result.finePrint || [] } : null,
    reviewInsights: [],
    limits: [],
    competitors: [],
  };
  const sourceFamilies = [];
  if (data.pricing?.plans?.length) sourceFamilies.push("pricing");
  if (data.pricing?.finePrint?.length) sourceFamilies.push("pricingFinePrint");
  return {
    ...data,
    _meta: normalizePillarMeta(
      { _meta: { pillar: "buyer", extractedAt: new Date().toISOString(), sourceFamilies } },
      "buyer"
    ),
  };
}

function coerceRunResultToRisk(result) {
  if (!result || typeof result !== "object") {
    return { securityHeaders: null, privacyCompliance: null, trackers: [], _meta: normalizePillarMeta(null, "risk") };
  }
  const data = {
    securityHeaders: result.securityHeaders && typeof result.securityHeaders === "object" ? result.securityHeaders : null,
    privacyCompliance: result.privacyCompliance && typeof result.privacyCompliance === "object" ? result.privacyCompliance : null,
    trackers: Array.isArray(result.trackers) ? result.trackers : [],
  };
  const sourceFamilies = [];
  if (data.securityHeaders) sourceFamilies.push("securityHeaders");
  if (data.privacyCompliance) sourceFamilies.push("privacyCompliance");
  if (data.trackers.length) sourceFamilies.push("trackers");
  return {
    ...data,
    _meta: normalizePillarMeta(
      { _meta: { pillar: "risk", extractedAt: new Date().toISOString(), sourceFamilies } },
      "risk"
    ),
  };
}

function coerceRunResultToCompetitors(result) {
  if (!result || typeof result !== "object") {
    return { competitors: [] };
  }
  const competitors = Array.isArray(result.competitors) ? result.competitors : [];
  return {
    competitors: competitors.filter((c) => c && typeof c === "object" && typeof c.name === "string" && c.name.trim()),
  };
}

app.post("/api/investigate/async", async (req, res) => {
  try {
    assertRuntimeEnvReady();
    const { targetUrl, domain } = normalizeTargetUrl(req.body?.url);
    const name = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
    const goals = getFastAsyncGoals(targetUrl, domain);
    const tinyfish = new TinyFishWebAgentClient(config.tinyfish);

    const [infraRun, buildRun, buyerRun, riskRun, competitorsRun] = await Promise.allSettled([
      tinyfish.runAsync(goals.infra),
      tinyfish.runAsync(goals.build),
      tinyfish.runAsync(goals.buyer),
      tinyfish.runAsync(goals.risk),
      tinyfish.runAsync(goals.competitors),
    ]);

    const infraRes = infraRun.status === "fulfilled" ? infraRun.value : { error: { message: infraRun.reason?.message || "infra run failed" } };
    const buildRes = buildRun.status === "fulfilled" ? buildRun.value : { error: { message: buildRun.reason?.message || "build run failed" } };
    const buyerRes = buyerRun.status === "fulfilled" ? buyerRun.value : { error: { message: buyerRun.reason?.message || "buyer run failed" } };
    const riskRes = riskRun.status === "fulfilled" ? riskRun.value : { error: { message: riskRun.reason?.message || "risk run failed" } };
    const competitorsRes = competitorsRun.status === "fulfilled" ? competitorsRun.value : { error: { message: competitorsRun.reason?.message || "competitors run failed" } };
    const runIds = {
      infra: infraRes?.run_id ?? null,
      build: buildRes?.run_id ?? null,
      buyer: buyerRes?.run_id ?? null,
      risk: riskRes?.run_id ?? null,
      competitors: competitorsRes?.run_id ?? null,
    };
    if (infraRes?.error?.message) runIds._infraError = infraRes.error.message;
    if (buildRes?.error?.message) runIds._buildError = buildRes.error.message;
    if (buyerRes?.error?.message) runIds._buyerError = buyerRes.error.message;
    if (riskRes?.error?.message) runIds._riskError = riskRes.error.message;
    if (competitorsRes?.error?.message) runIds._competitorsError = competitorsRes.error.message;
    if (!runIds.infra && !runIds.build && !runIds.buyer && !runIds.risk) {
      return res.status(502).json({ error: "Failed to start async investigation runs.", runIds, domain, name });
    }
    const partial = [runIds._infraError, runIds._buildError, runIds._buyerError, runIds._riskError, runIds._competitorsError].some(Boolean);
    res.status(partial ? 207 : 200).json({ runIds, domain, name, partial });
  } catch (error) {
    console.error("[CostLens] Async start error:", error);
    sendStructuredError(res, error);
  }
});

app.post("/api/investigate/async/poll", async (req, res) => {
  try {
    assertRuntimeEnvReady();
    assertValidAsyncPollPayload(req.body);
    const { runIds, domain, name } = req.body || {};
    const tinyfish = new TinyFishWebAgentClient(config.tinyfish);

    const safeGetRun = async (runId) => {
      if (!runId) return { status: "FAILED", error: { message: "Missing run id" }, result: null };
      try {
        return await tinyfish.getRun(runId);
      } catch (error) {
        return { status: "FAILED", error: { message: error?.message || "Run lookup failed" }, result: null };
      }
    };

    const [infraRun, buildRun, buyerRun, riskRun, competitorsRun] = await Promise.all([
      safeGetRun(runIds.infra),
      safeGetRun(runIds.build),
      safeGetRun(runIds.buyer),
      safeGetRun(runIds.risk),
      safeGetRun(runIds.competitors),
    ]);

    const statuses = {
      infra: infraRun?.status ?? "FAILED",
      build: buildRun?.status ?? "FAILED",
      buyer: buyerRun?.status ?? "FAILED",
      risk: riskRun?.status ?? "FAILED",
      competitors: competitorsRun?.status ?? "FAILED",
    };
    const running = ["PENDING", "RUNNING"].some((s) => Object.values(statuses).includes(s));
    if (running) {
      return res.json({ status: "running", runs: statuses });
    }

    const infraRaw = coerceRunResultToInfra(infraRun?.result);
    const buildRaw = coerceRunResultToBuild(buildRun?.result);
    const buyerRaw = coerceRunResultToBuyer(buyerRun?.result);
    const riskRaw = coerceRunResultToRisk(riskRun?.result);
    const competitorsRaw = coerceRunResultToCompetitors(competitorsRun?.result);

    const modeler = new CostModeler(config.openai);
    const report = await modeler.analyze(infraRaw, buildRaw, buyerRaw, { name, url: domain });

    // Generate executive summary, negotiation playbook, risk profile, and competitor analysis
    const targetInfo = { name, url: domain };
    const [execSummaryRes, negotiationRes, riskProfileRes, competitorAnalysisRes] = await Promise.allSettled([
      modeler.generateExecutiveSummary(report.infraCost, report.buildCost, report.buyerCost, targetInfo),
      modeler.generateNegotiationPlaybook(report.infraCost, report.buyerCost, targetInfo),
      modeler.analyzeRiskProfile(riskRaw, targetInfo),
      modeler.generateCompetitorAnalysis(competitorsRaw, report.buyerCost, targetInfo),
    ]);
    const executiveSummary = execSummaryRes.status === "fulfilled" ? execSummaryRes.value : null;
    const negotiation = negotiationRes.status === "fulfilled" ? negotiationRes.value : null;
    const riskProfile = riskProfileRes.status === "fulfilled" ? riskProfileRes.value : modeler.getDefaultRiskProfile();
    const competitorAnalysis = competitorAnalysisRes.status === "fulfilled" ? competitorAnalysisRes.value : null;

    const scannerErrors = {
      infra: infraRun?.status === "COMPLETED" ? null : infraRun?.error?.message ?? "Run failed",
      build: buildRun?.status === "COMPLETED" ? null : buildRun?.error?.message ?? "Run failed",
      buyer: buyerRun?.status === "COMPLETED" ? null : buyerRun?.error?.message ?? "Run failed",
      risk: riskRun?.status === "COMPLETED" ? null : riskRun?.error?.message ?? "Run failed",
      competitors: competitorsRun?.status === "COMPLETED" ? null : competitorsRun?.error?.message ?? "Run failed",
    };
    const failedPillars = Object.entries(scannerErrors).filter(([, v]) => Boolean(v)).map(([k]) => k);
    const modelErrors = report?.quality?.modelErrors || {};
    const modelWarnings = report?.quality?.modelWarnings || {};
    const anomalies = report?.quality?.anomalies || [];
    const degradedByModel = Object.entries(modelErrors).filter(([, v]) => Boolean(v)).map(([k]) => k);
    const degradedByWarnings = Object.entries(modelWarnings).filter(([, v]) => Array.isArray(v) && v.length > 0).map(([k]) => k);
    const degradedPillars = [...new Set([...failedPillars, ...degradedByModel, ...degradedByWarnings])];
    const pillarMeta = {
      infra: normalizePillarMeta(infraRaw, "infra"),
      build: normalizePillarMeta(buildRaw, "build"),
      buyer: normalizePillarMeta(buyerRaw, "buyer"),
      risk: normalizePillarMeta(riskRaw, "risk"),
      competitors: normalizePillarMeta(competitorsRaw, "competitors"),
    };
    const qualityMeta = buildQualityMeta({
      scannerErrors,
      modelErrors,
      modelWarnings,
      anomalies,
      pillarMeta,
      timedOut: false,
      fastMode: true,
    });
    const totalPillars = 5;
  const legacyCompleteness = Math.max(0, Math.round(((totalPillars - Math.min(totalPillars, degradedPillars.length)) / totalPillars) * 100));

    res.json({
      status: "complete",
      report: {
        target: { name, url: domain, logo: name[0] },
        scannedAt: new Date().toISOString(),
        platformsScanned: config.platformsScanned,
        ...report,
        executiveSummary: executiveSummary || null,
        negotiation: negotiation || null,
        riskProfile: riskProfile || modeler.getDefaultRiskProfile(),
        competitorAnalysis: competitorAnalysis || null,
        infraCost: {
          ...report.infraCost,
          confidence: {
            overall: qualityMeta.perPillar.infra.score,
            level: qualityMeta.perPillar.infra.level,
          },
        },
        buildCost: {
          ...report.buildCost,
          confidence: {
            overall: qualityMeta.perPillar.build.score,
            level: qualityMeta.perPillar.build.level,
          },
        },
        buyerCost: {
          ...report.buyerCost,
          confidence: {
            overall: qualityMeta.perPillar.buyer.score,
            level: qualityMeta.perPillar.buyer.level,
          },
        },
        provenance: {
          infra: {
            evidenceSources: report?.infraCost?.evidenceSources || [],
            extractedAt: pillarMeta.infra.extractedAt,
          },
          build: {
            evidenceSources: report?.buildCost?.evidenceSources || [],
            extractedAt: pillarMeta.build.extractedAt,
          },
          buyer: {
            evidenceSources: report?.buyerCost?.evidenceSources || [],
            extractedAt: pillarMeta.buyer.extractedAt,
          },
          risk: {
            evidenceSources: [],
            extractedAt: pillarMeta.risk.extractedAt,
          },
          competitors: {
            evidenceSources: [],
            extractedAt: pillarMeta.competitors.extractedAt,
          },
        },
        quality: {
          partialData: degradedPillars.length > 0 || qualityMeta.confidenceScore.global < 80,
          degradedPillars,
          scannerErrors,
          modelErrors,
          modelWarnings,
          anomalies,
          completenessScore: legacyCompleteness,
          qualityMeta,
        },
      },
    });
  } catch (error) {
    console.error("[CostLens] Async poll error:", error);
    sendStructuredError(res, error);
  }
});

// Main scan endpoint
app.post("/api/investigate", async (req, res) => {
  try {
    assertRuntimeEnvReady();
    const { targetUrl, domain } = normalizeTargetUrl(req.body?.url);
    const report = await runInvestigation({ targetUrl, domain });
    res.json(report);
  } catch (error) {
    console.error("[CostLens] Error:", error);
    sendStructuredError(res, error);
  }
});

// SSE streaming endpoint
app.post("/api/investigate/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  req.setTimeout(STREAM_TIMEOUT_MS);
  res.setTimeout(STREAM_TIMEOUT_MS);

  let ended = false;
  const send = (event, data) => {
    if (ended) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (_) {}
  };

  const sendErrorAndEnd = (error) => {
    if (ended) return;
    ended = true;
    send("error", {
      message: error.message,
      ...(error.missingEnv ? { missingEnv: error.missingEnv } : {}),
    });
    try {
      res.end();
    } catch (_) {}
  };

  res.on("timeout", () => {
    sendErrorAndEnd(new Error("Investigation timed out on the server. Try again or use a shorter run."));
  });

  let lastProgress = { message: "Starting...", progress: 0, platformsScanned: config.platformsScanned };
  const heartbeatId = setInterval(() => {
    send("progress", { ...lastProgress, message: lastProgress.message + " — still running" });
  }, HEARTBEAT_INTERVAL_MS);

  try {
    assertRuntimeEnvReady();
    const { targetUrl, domain } = normalizeTargetUrl(req.body?.url);
    const report = await runInvestigation({
      targetUrl,
      domain,
      onProgress: (payload) => {
        lastProgress = payload;
        send("progress", payload);
      },
    });
    if (!ended) {
      ended = true;
      send("result", report);
      try {
        res.end();
      } catch (_) {}
    }
  } catch (error) {
    console.error("[CostLens] Stream error:", error);
    sendErrorAndEnd(error);
  } finally {
    clearInterval(heartbeatId);
  }
});

app.use((error, _req, res, _next) => {
  const status = error?.statusCode || 500;
  const payload = {
    error: status >= 500 ? "Internal server error" : error.message || "Request failed",
  };
  const originHint = [...getAllowedProdOrigins()];
  if (status < 500 && originHint.length > 0 && error?.message?.includes("CORS")) {
    payload.allowedOrigins = originHint;
  }
  if (error?.missingEnv) payload.missingEnv = error.missingEnv;
  if (!res.headersSent) {
    res.status(status).json(payload);
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("[CostLens] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[CostLens] Uncaught exception:", error);
});

// Serve client: Vite dev middleware in dev, static files in production
if (!process.env.VERCEL) {
  const isDev = process.env.NODE_ENV !== "production";
  const PORT = config.port || 3000;

  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const { default: path } = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.resolve(__dirname, "../dist");
    app.use(express.static(distPath));
    app.get("*", (_, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  function tryListen(port) {
    const numPort = Number(port);
    const server = app.listen(numPort, () => {
      console.log(`[CostLens] Running on http://localhost:${numPort}`);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[CostLens] Port ${numPort} in use, trying ${numPort + 1}...`);
        tryListen(numPort + 1);
      } else {
        throw err;
      }
    });
  }
  tryListen(PORT);
}

export default app;
export const __testUtils = {
  normalizePillarMeta,
  buildQualityMeta,
  freshnessBucket,
  assertValidAsyncPollPayload,
};
