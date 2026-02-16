// ============================================================
// AI COST MODELER
// Synthesizes data from all three scanners using OpenAI
// to generate the final cost intelligence report
// ============================================================

import OpenAI from "openai";

export class CostModeler {
  constructor(config) {
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || "gpt-4o";
  }

  async analyze(infraData, buildData, buyerData, targetInfo) {
    const [infraRes, buildRes, buyerRes] = await Promise.allSettled([
      this.analyzeInfraCosts(infraData, targetInfo),
      this.analyzeBuildCosts(buildData, targetInfo),
      this.analyzeBuyerCosts(buyerData, targetInfo),
    ]);

    const infraCost = infraRes.status === "fulfilled" ? infraRes.value : this.getDefaultInfraCost();
    const buildCost = buildRes.status === "fulfilled" ? buildRes.value : this.getDefaultBuildCost();
    const buyerCost = buyerRes.status === "fulfilled" ? buyerRes.value : this.getDefaultBuyerCost();
    const crossValidation = this.crossValidateAgainstSignals({
      infraCost,
      buildCost,
      buyerCost,
      infraData,
      buildData,
      buyerData,
    });

    infraCost.validationWarnings = [...new Set([...(infraCost.validationWarnings || []), ...crossValidation.infraWarnings])];
    buildCost.validationWarnings = [...new Set([...(buildCost.validationWarnings || []), ...crossValidation.buildWarnings])];
    buyerCost.validationWarnings = [...new Set([...(buyerCost.validationWarnings || []), ...crossValidation.buyerWarnings])];
    const anomalies = this.detectAnomalies({ infraCost, buildCost, buyerCost, crossValidationWarnings: crossValidation.anomalies });

    return {
      infraCost,
      buildCost,
      buyerCost,
      quality: {
        modelErrors: {
          infra: infraRes.status === "rejected" ? this.errorMessage(infraRes.reason) : null,
          build: buildRes.status === "rejected" ? this.errorMessage(buildRes.reason) : null,
          buyer: buyerRes.status === "rejected" ? this.errorMessage(buyerRes.reason) : null,
        },
        modelWarnings: {
          infra: Array.isArray(infraCost?.validationWarnings) ? infraCost.validationWarnings : [],
          build: Array.isArray(buildCost?.validationWarnings) ? buildCost.validationWarnings : [],
          buyer: Array.isArray(buyerCost?.validationWarnings) ? buyerCost.validationWarnings : [],
        },
        anomalies,
      },
    };
  }

  async analyzeInfraCosts(data, target) {
    const parsed = await this.requestJsonWithRetry({
      messages: [
        {
          role: "system",
          content: `You are an expert cloud infrastructure cost analyst. Given technical signals from a SaaS product, estimate monthly infrastructure costs.
Return strict JSON only:
{
  "monthlyEstimate": { "low": number, "mid": number, "high": number },
  "perUserEstimate": { "low": number, "mid": number, "high": number },
  "revenueEstimate": number,
  "grossMargin": { "low": number, "mid": number, "high": number },
  "breakdown": [{ "category": string, "estimate": string, "confidence": "high"|"medium"|"low", "evidence": string, "pct": number }],
  "signals": [{ "icon": string, "text": string }]
}
If data is sparse, return conservative values and explain uncertainty in evidence text.`,
        },
        {
          role: "user",
          content: `Analyze infrastructure costs for ${target.name} (${target.url}):
Tech Stack: ${JSON.stringify(data?.techStack || {})}
Traffic Data: ${JSON.stringify(data?.traffic || {})}
Third-Party Services: ${JSON.stringify(data?.thirdParty || [])}
Engineering Headcount: ${JSON.stringify(data?.headcount || {})}`,
        },
      ],
      maxTokens: 2000,
    });

    return this.normalizeInfraCost(parsed);
  }

  async analyzeBuildCosts(data, target) {
    const parsed = await this.requestJsonWithRetry({
      messages: [
        {
          role: "system",
          content: `You are an expert software development cost estimator. Given detected features and tech stack, estimate build cost from scratch.
Return strict JSON only:
{
  "totalEstimate": { "low": number, "mid": number, "high": number },
  "timeEstimate": { "low": number, "mid": number, "high": number },
  "teamSize": { "min": number, "optimal": number, "max": number },
  "breakdown": [{ "module": string, "effort": string, "cost": string, "complexity": "extreme"|"hard"|"medium", "notes": string }],
  "techStack": [{ "layer": string, "tech": string, "detected": boolean, "confidence": "high"|"medium"|"low" }]
}
Use conservative assumptions if source data is weak.`,
        },
        {
          role: "user",
          content: `Estimate build cost for ${target.name} (${target.url}):
Detected Features: ${JSON.stringify(data?.features || {})}
Open Source Components: ${JSON.stringify(data?.openSource || [])}
Market Salary Data: ${JSON.stringify(data?.hiring || {})}`,
        },
      ],
      maxTokens: 2500,
    });

    return this.normalizeBuildCost(parsed);
  }

  async analyzeBuyerCosts(data, target) {
    const parsed = await this.requestJsonWithRetry({
      messages: [
        {
          role: "system",
          content: `You are a SaaS procurement analyst uncovering hidden costs.
Return strict JSON only:
{
  "plans": [{ "name": string, "listed": string, "actualMonthly": string, "gotchas": [string], "hiddenCosts": [{ "item": string, "cost": string, "note": string }] }],
  "tcoComparison": [{ "scenario": string, "monthlyListed": string, "monthlyActual": string, "annualDelta": string, "note": string }],
  "competitorComparison": [{ "name": string, "cost": string, "features": string }]
}
If competitor data is unavailable, still provide a reasonable comparison set with explicit uncertainty in notes.`,
        },
        {
          role: "user",
          content: `Analyze true buyer costs for ${target.name} (${target.url}):
Pricing Data: ${JSON.stringify(data?.pricing || {})}
Review Insights: ${JSON.stringify(data?.reviewInsights || {})}
Documented Limits: ${JSON.stringify(data?.limits || [])}
Competitor Insights: ${JSON.stringify(data?.competitors || [])}`,
        },
      ],
      maxTokens: 2000,
    });

    return this.normalizeBuyerCost(parsed);
  }

  async requestJsonWithRetry({ messages, maxTokens, retries = 2 }) {
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages,
          temperature: 0.3,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        });

        const content = response?.choices?.[0]?.message?.content;
        if (!content || typeof content !== "string") {
          throw new Error("Model returned empty content.");
        }
        return JSON.parse(content);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Model generation failed.");
  }

  normalizeInfraCost(value) {
    const fallback = this.getDefaultInfraCost();
    const input = this.asObject(value);
    const monthly = this.normalizeTriad(input.monthlyEstimate, { low: 200000, mid: 450000, high: 900000 });
    const perUser = this.normalizeTriad(input.perUserEstimate, { low: 0.2, mid: 0.45, high: 0.9 });
    const margin = this.normalizeTriad(input.grossMargin, { low: 70, mid: 82, high: 90 });
    const breakdown = Array.isArray(input.breakdown)
      ? input.breakdown.map((item) => ({
          category: this.asString(item?.category, "Unknown category"),
          estimate: this.asString(item?.estimate, "Unknown"),
          confidence: this.normalizeConfidence(item?.confidence),
          evidence: this.asString(item?.evidence, "Derived from limited public signals."),
          pct: this.asNumber(item?.pct, 0),
        }))
      : fallback.breakdown;
    const signals = Array.isArray(input.signals)
      ? input.signals.map((item) => ({
          icon: this.asString(item?.icon, "•"),
          text: this.asString(item?.text, "Signal data unavailable"),
        }))
      : fallback.signals;

    const evidenceSources = this.getEvidenceSources(input, ["techStack", "trafficSignals", "thirdParty", "headcount"]);
    const validationWarnings = this.validateInfraCost({
      monthlyEstimate: monthly,
      perUserEstimate: perUser,
      revenueEstimate: this.asNumber(input.revenueEstimate, 0),
      grossMargin: margin,
      breakdown,
    });

    return {
      monthlyEstimate: monthly,
      perUserEstimate: perUser,
      revenueEstimate: this.asNumber(input.revenueEstimate, 0),
      grossMargin: margin,
      breakdown: breakdown.length > 0 ? breakdown : fallback.breakdown,
      signals: signals.length > 0 ? signals : fallback.signals,
      evidenceSources,
      confidence: this.buildConfidence({
        sourceCount: evidenceSources.length,
        warningCount: validationWarnings.length,
        fallbackPenalty: breakdown.length === 0 || signals.length === 0 ? 10 : 0,
      }),
      validationWarnings,
    };
  }

  normalizeBuildCost(value) {
    const fallback = this.getDefaultBuildCost();
    const input = this.asObject(value);
    const totalEstimate = this.normalizeTriad(input.totalEstimate, { low: 1500000, mid: 3500000, high: 7000000 });
    const timeEstimate = this.normalizeTriad(input.timeEstimate, { low: 8, mid: 14, high: 24 });
    const teamSize = this.normalizeTeamSize(input.teamSize, fallback.teamSize);
    const breakdown = Array.isArray(input.breakdown)
      ? input.breakdown.map((item) => ({
          module: this.asString(item?.module, "Unknown module"),
          effort: this.asString(item?.effort, "Unknown"),
          cost: this.asString(item?.cost, "Unknown"),
          complexity: this.normalizeComplexity(item?.complexity),
          notes: this.asString(item?.notes, "Evidence limited; estimate uses conservative assumptions."),
        }))
      : fallback.breakdown;
    const techStack = Array.isArray(input.techStack)
      ? input.techStack.map((item) => ({
          layer: this.asString(item?.layer, "Unknown layer"),
          tech: this.asString(item?.tech, "Unknown"),
          detected: Boolean(item?.detected),
          confidence: this.normalizeConfidence(item?.confidence),
        }))
      : fallback.techStack;

    const evidenceSources = this.getEvidenceSources(input, ["features", "openSource", "hiringBenchmarks"]);
    const validationWarnings = this.validateBuildCost({
      totalEstimate,
      timeEstimate,
      teamSize,
      breakdown,
      techStack,
    });

    return {
      totalEstimate,
      timeEstimate,
      teamSize,
      breakdown: breakdown.length > 0 ? breakdown : fallback.breakdown,
      techStack: techStack.length > 0 ? techStack : fallback.techStack,
      evidenceSources,
      confidence: this.buildConfidence({
        sourceCount: evidenceSources.length,
        warningCount: validationWarnings.length,
        fallbackPenalty: breakdown.length === 0 || techStack.length === 0 ? 10 : 0,
      }),
      validationWarnings,
    };
  }

  normalizeBuyerCost(value) {
    const fallback = this.getDefaultBuyerCost();
    const input = this.asObject(value);
    const plans = Array.isArray(input.plans)
      ? input.plans.map((plan) => ({
          name: this.asString(plan?.name, "Unknown"),
          listed: this.asString(plan?.listed, "Unknown"),
          actualMonthly: this.asString(plan?.actualMonthly, "Unknown"),
          gotchas: Array.isArray(plan?.gotchas) ? plan.gotchas.map((x) => this.asString(x, "Unknown limitation")) : [],
          hiddenCosts: Array.isArray(plan?.hiddenCosts)
            ? plan.hiddenCosts.map((hc) => ({
                item: this.asString(hc?.item, "Unknown"),
                cost: this.asString(hc?.cost, "Unknown"),
                note: this.asString(hc?.note, "Estimate based on partial evidence."),
              }))
            : [],
        }))
      : fallback.plans;

    const tcoComparison = Array.isArray(input.tcoComparison)
      ? input.tcoComparison.map((row) => ({
          scenario: this.asString(row?.scenario, "Unknown scenario"),
          monthlyListed: this.asString(row?.monthlyListed, "Unknown"),
          monthlyActual: this.asString(row?.monthlyActual, "Unknown"),
          annualDelta: this.asString(row?.annualDelta, "Unknown"),
          note: this.asString(row?.note, "Estimate based on limited information."),
        }))
      : fallback.tcoComparison;

    const competitorComparison = Array.isArray(input.competitorComparison)
      ? input.competitorComparison.map((row) => ({
          name: this.asString(row?.name, "Unknown competitor"),
          cost: this.asString(row?.cost, "Unknown"),
          features: this.asString(row?.features, "N/A"),
        }))
      : fallback.competitorComparison;

    const evidenceSources = this.getEvidenceSources(input, ["pricing", "pricingFinePrint", "reviews", "limitsDocs", "competitors"]);
    const validationWarnings = this.validateBuyerCost({ plans, tcoComparison, competitorComparison });

    return {
      plans: plans.length > 0 ? plans : fallback.plans,
      tcoComparison: tcoComparison.length > 0 ? tcoComparison : fallback.tcoComparison,
      competitorComparison: competitorComparison.length > 0 ? competitorComparison : fallback.competitorComparison,
      evidenceSources,
      confidence: this.buildConfidence({
        sourceCount: evidenceSources.length,
        warningCount: validationWarnings.length,
        fallbackPenalty: plans.length === 0 || tcoComparison.length === 0 ? 10 : 0,
      }),
      validationWarnings,
    };
  }

  getDefaultInfraCost() {
    return {
      monthlyEstimate: { low: 200000, mid: 450000, high: 900000 },
      perUserEstimate: { low: 0.2, mid: 0.45, high: 0.9 },
      revenueEstimate: 0,
      grossMargin: { low: 70, mid: 82, high: 90 },
      breakdown: [
        {
          category: "Infrastructure baseline",
          estimate: "Insufficient external evidence",
          confidence: "low",
          evidence: "Public data was limited during this run.",
          pct: 100,
        },
      ],
      signals: [{ icon: "•", text: "Limited signal quality. Treat estimates as directional." }],
      evidenceSources: [],
      confidence: { overall: 35, level: "low" },
      validationWarnings: ["Using fallback infra defaults due to limited model output."],
    };
  }

  getDefaultBuildCost() {
    return {
      totalEstimate: { low: 1500000, mid: 3500000, high: 7000000 },
      timeEstimate: { low: 8, mid: 14, high: 24 },
      teamSize: { min: 6, optimal: 10, max: 18 },
      breakdown: [
        {
          module: "Core platform",
          effort: "Unknown",
          cost: "Unknown",
          complexity: "medium",
          notes: "Insufficient feature evidence to generate module-level confidence.",
        },
      ],
      techStack: [{ layer: "Application", tech: "Unknown", detected: false, confidence: "low" }],
      evidenceSources: [],
      confidence: { overall: 35, level: "low" },
      validationWarnings: ["Using fallback build defaults due to limited model output."],
    };
  }

  getDefaultBuyerCost() {
    return {
      plans: [
        {
          name: "Unknown",
          listed: "Unknown",
          actualMonthly: "Unknown",
          gotchas: ["Pricing evidence was limited in this scan."],
          hiddenCosts: [],
        },
      ],
      tcoComparison: [
        {
          scenario: "Typical team",
          monthlyListed: "Unknown",
          monthlyActual: "Unknown",
          annualDelta: "Unknown",
          note: "Insufficient pricing data to quantify delta.",
        },
      ],
      competitorComparison: [{ name: "Peer SaaS", cost: "Unknown", features: "Comparable feature set" }],
      evidenceSources: [],
      confidence: { overall: 35, level: "low" },
      validationWarnings: ["Using fallback buyer-cost defaults due to limited model output."],
    };
  }

  getEvidenceSources(input, fallback) {
    const sourceCandidates = Array.isArray(input?.evidenceSources) ? input.evidenceSources : input?._meta?.sourceFamilies;
    if (Array.isArray(sourceCandidates) && sourceCandidates.length > 0) {
      return [...new Set(sourceCandidates.map((x) => this.asString(x)).filter(Boolean))];
    }
    return fallback;
  }

  buildConfidence({ sourceCount = 0, warningCount = 0, fallbackPenalty = 0 }) {
    let score = 45 + sourceCount * 10 - warningCount * 12 - fallbackPenalty;
    score = Math.max(10, Math.min(95, Math.round(score)));
    const level = score >= 80 ? "high" : score >= 60 ? "medium" : "low";
    return { overall: score, level };
  }

  validateInfraCost(value) {
    const warnings = [];
    const margin = value?.grossMargin || {};
    if (margin.high > 99 || margin.low < 5) warnings.push("Gross margin looks outside realistic SaaS ranges.");
    if ((value?.monthlyEstimate?.high || 0) > 200000000) warnings.push("Monthly infra high estimate exceeds expected bounds.");
    if ((value?.perUserEstimate?.high || 0) > 1000) warnings.push("Per-user infra estimate appears unusually high.");
    if ((value?.revenueEstimate || 0) < 0) warnings.push("Revenue estimate was negative and may be unreliable.");
    return warnings;
  }

  validateBuildCost(value) {
    const warnings = [];
    if ((value?.teamSize?.max || 0) > 500 || (value?.teamSize?.min || 0) < 1) warnings.push("Team size range appears unrealistic.");
    if ((value?.timeEstimate?.high || 0) > 120) warnings.push("Timeline high estimate is unusually long.");
    if ((value?.totalEstimate?.high || 0) > 1000000000) warnings.push("Build high estimate exceeds expected bounds.");
    return warnings;
  }

  validateBuyerCost(value) {
    const warnings = [];
    if (!Array.isArray(value?.plans) || value.plans.length === 0) warnings.push("Plan-level pricing evidence is missing.");
    if (!Array.isArray(value?.tcoComparison) || value.tcoComparison.length === 0) warnings.push("TCO comparison evidence is limited.");
    if (!Array.isArray(value?.competitorComparison) || value.competitorComparison.length === 0) warnings.push("Competitor benchmarks are missing.");
    return warnings;
  }

  detectAnomalies({ infraCost, buildCost, buyerCost, crossValidationWarnings = [] }) {
    const anomalies = [];
    const monthlyMid = this.asNumber(infraCost?.monthlyEstimate?.mid, 0);
    const revenue = this.asNumber(infraCost?.revenueEstimate, 0);
    if (revenue > 0 && monthlyMid > revenue * 2) {
      anomalies.push("Infra monthly midpoint is over 2x the inferred monthly revenue.");
    }
    const teamOptimal = this.asNumber(buildCost?.teamSize?.optimal, 0);
    const buildMonths = this.asNumber(buildCost?.timeEstimate?.mid, 0);
    if (teamOptimal > 0 && buildMonths > 0 && teamOptimal * buildMonths > 1000) {
      anomalies.push("Build staffing-month load appears unusually high.");
    }
    const buyerPlans = Array.isArray(buyerCost?.plans) ? buyerCost.plans : [];
    if (buyerPlans.length > 0 && buyerPlans.every((x) => this.asString(x?.actualMonthly, "Unknown") === "Unknown")) {
      anomalies.push("Buyer actual monthly pricing remained unknown across detected plans.");
    }
    return [...new Set([...anomalies, ...crossValidationWarnings])];
  }

  crossValidateAgainstSignals({ infraCost, buildCost, buyerCost, infraData, buildData, buyerData }) {
    const infraWarnings = [];
    const buildWarnings = [];
    const buyerWarnings = [];
    const anomalies = [];

    const hasTrafficSignal = Boolean(infraData?.traffic && Object.keys(infraData.traffic).length > 0);
    if (!hasTrafficSignal && this.asNumber(infraCost?.revenueEstimate, 0) > 0) {
      infraWarnings.push("Revenue estimate inferred without concrete traffic signals.");
      anomalies.push("Revenue estimate exists but traffic evidence was missing.");
    }
    const hasInfraSignals = Boolean(infraData?.techStack && Object.keys(infraData.techStack).length > 0);
    if (!hasInfraSignals && this.asNumber(infraCost?.monthlyEstimate?.mid, 0) > 0) {
      infraWarnings.push("Infrastructure estimate inferred with sparse technical evidence.");
    }

    const featureCount = Array.isArray(buildData?.features?.detected) ? buildData.features.detected.length : 0;
    if (featureCount === 0 && this.asNumber(buildCost?.totalEstimate?.mid, 0) > 20000000) {
      buildWarnings.push("High build estimate inferred without detected feature evidence.");
      anomalies.push("Build estimate appears high relative to detected feature count.");
    }
    const hiringSignals = buildData?.hiring && typeof buildData.hiring === "object" ? Object.keys(buildData.hiring).length : 0;
    if (hiringSignals === 0 && this.asNumber(buildCost?.teamSize?.optimal, 0) >= 20) {
      buildWarnings.push("Large team recommendation inferred without hiring benchmark signals.");
    }

    const pricingPlans = Array.isArray(buyerData?.pricing?.plans) ? buyerData.pricing.plans.length : 0;
    const extractedPlans = Array.isArray(buyerCost?.plans) ? buyerCost.plans.length : 0;
    if (pricingPlans === 0 && extractedPlans > 0) {
      buyerWarnings.push("Buyer plans were inferred without direct pricing-page plan extraction.");
      anomalies.push("Buyer plan output exceeds source pricing evidence.");
    }
    const knownActualPlans = Array.isArray(buyerCost?.plans)
      ? buyerCost.plans.filter((p) => this.asString(p?.actualMonthly, "Unknown") !== "Unknown").length
      : 0;
    if (knownActualPlans > 0 && pricingPlans === 0) {
      buyerWarnings.push("Actual monthly plan values may be speculative due to missing source pricing plans.");
    }

    return { infraWarnings, buildWarnings, buyerWarnings, anomalies };
  }

  normalizeTriad(value, fallback) {
    const source = this.asObject(value);
    const low = this.asNumber(source.low, fallback.low);
    const mid = this.asNumber(source.mid, fallback.mid);
    const high = this.asNumber(source.high, fallback.high);
    const sorted = [low, mid, high].sort((a, b) => a - b);
    return { low: sorted[0], mid: sorted[1], high: sorted[2] };
  }

  normalizeTeamSize(value, fallback) {
    const source = this.asObject(value);
    const min = this.asNumber(source.min, fallback.min);
    const optimal = this.asNumber(source.optimal, fallback.optimal);
    const max = this.asNumber(source.max, fallback.max);
    const sorted = [min, optimal, max].sort((a, b) => a - b);
    return { min: sorted[0], optimal: sorted[1], max: sorted[2] };
  }

  normalizeConfidence(value) {
    return ["high", "medium", "low"].includes(value) ? value : "low";
  }

  normalizeComplexity(value) {
    return ["extreme", "hard", "medium"].includes(value) ? value : "medium";
  }

  asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  asNumber(value, fallback = 0) {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  asString(value, fallback = "") {
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
  }

  // ── Feature 1: Executive Summary ────────────────────────────
  async generateExecutiveSummary(infraCost, buildCost, buyerCost, targetInfo) {
    try {
      const parsed = await this.requestJsonWithRetry({
        messages: [
          {
            role: "system",
            content: `You are an executive SaaS analyst. Given three cost pillars for a SaaS product, produce a concise executive summary.
Return strict JSON only:
{
  "summary": "1-2 paragraph plain-English overview of the product's cost profile, margins, build complexity, and buyer value.",
  "keyFindings": ["string (3-5 key findings from the analysis)"],
  "recommendations": [{ "title": "string", "detail": "string", "priority": "high"|"medium"|"low" }],
  "verdictLabel": "string (one of: Strong Value, Fair Market, Overpriced, Insufficient Data)"
}
Be factual. If data is sparse, set verdictLabel to "Insufficient Data" and note limitations in recommendations.`,
          },
          {
            role: "user",
            content: `Executive summary for ${targetInfo.name} (${targetInfo.url}):
Infrastructure Cost: ${JSON.stringify(infraCost || {})}
Build Cost: ${JSON.stringify(buildCost || {})}
Buyer Cost: ${JSON.stringify(buyerCost || {})}`,
          },
        ],
        maxTokens: 1500,
      });
      return this.normalizeExecutiveSummary(parsed);
    } catch (error) {
      console.error("[CostLens] Executive summary generation failed:", error);
      return null;
    }
  }

  normalizeExecutiveSummary(value) {
    const input = this.asObject(value);
    const summary = this.asString(input.summary, "");
    if (!summary) return null;
    return {
      summary,
      keyFindings: Array.isArray(input.keyFindings)
        ? input.keyFindings.map((x) => this.asString(x)).filter(Boolean)
        : [],
      recommendations: Array.isArray(input.recommendations)
        ? input.recommendations.map((r) => ({
            title: this.asString(r?.title, "Recommendation"),
            detail: this.asString(r?.detail, ""),
            priority: ["high", "medium", "low"].includes(r?.priority) ? r.priority : "medium",
          })).filter((r) => r.detail)
        : [],
      verdictLabel: this.asString(input.verdictLabel, "Insufficient Data"),
    };
  }

  // ── Feature 2: Negotiation Playbook ───────────────────────
  async generateNegotiationPlaybook(infraCost, buyerCost, targetInfo) {
    try {
      const parsed = await this.requestJsonWithRetry({
        messages: [
          {
            role: "system",
            content: `You are a SaaS procurement negotiation expert. Given a vendor's estimated infrastructure costs (their margins) and buyer pricing data, generate a negotiation playbook.
Return strict JSON only:
{
  "leverageFactors": [{ "factor": "string", "explanation": "string" }],
  "talkingPoints": ["string"],
  "counterOffers": [{ "plan": "string", "currentPrice": "string", "suggestedTarget": "string", "rationale": "string" }],
  "riskWarnings": ["string"]
}
Base suggestions on data. If margin or pricing data is sparse, say so in riskWarnings and be conservative.`,
          },
          {
            role: "user",
            content: `Negotiation playbook for ${targetInfo.name} (${targetInfo.url}):
Vendor Infra Costs & Margins: ${JSON.stringify(infraCost || {})}
Buyer Pricing & Plans: ${JSON.stringify(buyerCost || {})}`,
          },
        ],
        maxTokens: 1500,
      });
      return this.normalizeNegotiationPlaybook(parsed);
    } catch (error) {
      console.error("[CostLens] Negotiation playbook generation failed:", error);
      return null;
    }
  }

  normalizeNegotiationPlaybook(value) {
    const input = this.asObject(value);
    const leverageFactors = Array.isArray(input.leverageFactors)
      ? input.leverageFactors.map((f) => ({
          factor: this.asString(f?.factor, ""),
          explanation: this.asString(f?.explanation, ""),
        })).filter((f) => f.factor && f.explanation)
      : [];
    const talkingPoints = Array.isArray(input.talkingPoints)
      ? input.talkingPoints.map((x) => this.asString(x)).filter(Boolean)
      : [];
    if (leverageFactors.length === 0 && talkingPoints.length === 0) return null;
    return {
      leverageFactors,
      talkingPoints,
      counterOffers: Array.isArray(input.counterOffers)
        ? input.counterOffers.map((c) => ({
            plan: this.asString(c?.plan, "Unknown"),
            currentPrice: this.asString(c?.currentPrice, "Unknown"),
            suggestedTarget: this.asString(c?.suggestedTarget, "Unknown"),
            rationale: this.asString(c?.rationale, ""),
          })).filter((c) => c.rationale)
        : [],
      riskWarnings: Array.isArray(input.riskWarnings)
        ? input.riskWarnings.map((x) => this.asString(x)).filter(Boolean)
        : [],
    };
  }

  // ── Feature 3: Risk Profile Analysis ──────────────────────
  async analyzeRiskProfile(riskData, targetInfo) {
    try {
      const parsed = await this.requestJsonWithRetry({
        messages: [
          {
            role: "system",
            content: `You are a cybersecurity and compliance analyst. Given security, privacy, and tracker signals from a SaaS product, generate a risk/compliance profile.
Return strict JSON only:
{
  "overallRiskLevel": "low"|"medium"|"high"|"critical",
  "securityScore": number (0-100),
  "complianceBadges": [{ "name": "string", "status": "verified"|"claimed"|"missing" }],
  "findings": [{ "category": "string", "severity": "info"|"warning"|"critical", "detail": "string" }],
  "trackerSummary": { "total": number, "categories": {} },
  "recommendations": ["string"]
}
If signals are sparse, set overallRiskLevel to "medium" and note data gaps in findings.`,
          },
          {
            role: "user",
            content: `Risk profile for ${targetInfo.name} (${targetInfo.url}):
Security Headers: ${JSON.stringify(riskData?.securityHeaders || {})}
Privacy & Compliance: ${JSON.stringify(riskData?.privacyCompliance || {})}
Third-Party Trackers: ${JSON.stringify(riskData?.trackers || [])}`,
          },
        ],
        maxTokens: 1500,
      });
      return this.normalizeRiskProfile(parsed);
    } catch (error) {
      console.error("[CostLens] Risk profile analysis failed:", error);
      return this.getDefaultRiskProfile();
    }
  }

  normalizeRiskProfile(value) {
    const input = this.asObject(value);
    return {
      overallRiskLevel: ["low", "medium", "high", "critical"].includes(input.overallRiskLevel) ? input.overallRiskLevel : "medium",
      securityScore: Math.max(0, Math.min(100, this.asNumber(input.securityScore, 50))),
      complianceBadges: Array.isArray(input.complianceBadges)
        ? input.complianceBadges.map((b) => ({
            name: this.asString(b?.name, "Unknown"),
            status: ["verified", "claimed", "missing"].includes(b?.status) ? b.status : "missing",
          }))
        : [],
      findings: Array.isArray(input.findings)
        ? input.findings.map((f) => ({
            category: this.asString(f?.category, "General"),
            severity: ["info", "warning", "critical"].includes(f?.severity) ? f.severity : "info",
            detail: this.asString(f?.detail, ""),
          })).filter((f) => f.detail)
        : [],
      trackerSummary: {
        total: this.asNumber(input.trackerSummary?.total, 0),
        categories: this.asObject(input.trackerSummary?.categories),
      },
      recommendations: Array.isArray(input.recommendations)
        ? input.recommendations.map((x) => this.asString(x)).filter(Boolean)
        : [],
    };
  }

  getDefaultRiskProfile() {
    return {
      overallRiskLevel: "medium",
      securityScore: 0,
      complianceBadges: [],
      findings: [{ category: "Data Quality", severity: "info", detail: "Risk scan data was insufficient for a full profile." }],
      trackerSummary: { total: 0, categories: {} },
      recommendations: ["Re-run with a full scan for more comprehensive risk analysis."],
    };
  }

  // ── Feature: Competitor Landscape Analysis ─────────────────
  async generateCompetitorAnalysis(competitorsRaw, buyerCost, targetInfo) {
    try {
      const rawCompetitors = competitorsRaw?.competitors || [];
      if (rawCompetitors.length === 0) return null;

      const parsed = await this.requestJsonWithRetry({
        messages: [
          {
            role: "system",
            content: `You are a SaaS competitive intelligence analyst. Given a target product and its discovered competitors, produce a competitive landscape analysis.
Return strict JSON only:
{
  "landscape": "1-2 paragraph overview of the competitive landscape and market dynamics.",
  "competitors": [{ "name": "string", "url": "string", "description": "string", "startingPrice": "string", "positioning": { "priceLevel": number (1-5, 1=cheapest), "featureRichness": number (1-5, 1=simplest) }, "prosVsTarget": ["string (1-3 advantages over the target)"], "consVsTarget": ["string (1-3 disadvantages vs the target)"] }],
  "targetPositioning": { "priceLevel": number (1-5), "featureRichness": number (1-5) },
  "verdict": "string — one sentence on where the target stands competitively"
}
Be factual and concise. Limit to the top 5 competitors.`,
          },
          {
            role: "user",
            content: `Competitor analysis for ${targetInfo.name} (${targetInfo.url}):
Discovered Competitors: ${JSON.stringify(rawCompetitors)}
Target Buyer Pricing: ${JSON.stringify(buyerCost || {})}`,
          },
        ],
        maxTokens: 2000,
      });
      return this.normalizeCompetitorAnalysis(parsed);
    } catch (error) {
      console.error("[CostLens] Competitor analysis generation failed:", error);
      return null;
    }
  }

  normalizeCompetitorAnalysis(value) {
    const input = this.asObject(value);
    const landscape = this.asString(input.landscape, "");
    const competitors = Array.isArray(input.competitors)
      ? input.competitors.map((c) => ({
          name: this.asString(c?.name, "Unknown"),
          url: this.asString(c?.url, ""),
          description: this.asString(c?.description, ""),
          startingPrice: this.asString(c?.startingPrice, "Unknown"),
          positioning: {
            priceLevel: Math.max(1, Math.min(5, this.asNumber(c?.positioning?.priceLevel, 3))),
            featureRichness: Math.max(1, Math.min(5, this.asNumber(c?.positioning?.featureRichness, 3))),
          },
          prosVsTarget: Array.isArray(c?.prosVsTarget) ? c.prosVsTarget.map((x) => this.asString(x)).filter(Boolean).slice(0, 3) : [],
          consVsTarget: Array.isArray(c?.consVsTarget) ? c.consVsTarget.map((x) => this.asString(x)).filter(Boolean).slice(0, 3) : [],
        })).filter((c) => c.name !== "Unknown")
      : [];
    if (competitors.length === 0) return null;
    const targetPositioning = {
      priceLevel: Math.max(1, Math.min(5, this.asNumber(input.targetPositioning?.priceLevel, 3))),
      featureRichness: Math.max(1, Math.min(5, this.asNumber(input.targetPositioning?.featureRichness, 3))),
    };
    return {
      landscape,
      competitors,
      targetPositioning,
      verdict: this.asString(input.verdict, "Competitive positioning data insufficient."),
    };
  }

  errorMessage(error) {
    if (!error) return "Unknown model error";
    if (typeof error === "string") return error;
    return error.message || "Unknown model error";
  }
}
